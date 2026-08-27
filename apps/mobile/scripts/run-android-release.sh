#!/usr/bin/env bash
# Release Android con EXPO_PUBLIC_* del .env embebidos en el APK.
# NO lanza Metro ni expo-development-client (eso ignoraba el env de producción).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
export PATH="$SDK/platform-tools:$SDK/emulator:$PATH"

if [[ -z "${JAVA_HOME:-}" || "${JAVA_HOME}" == *jdk-26* ]]; then
  if [[ -x "/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/java" ]]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  elif [[ -x "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home/bin/java" ]]; then
    export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
  else
    echo "Necesitas JDK 17 o 21. Instala Android Studio o: brew install openjdk@17" >&2
    exit 1
  fi
fi
export PATH="$JAVA_HOME/bin:$PATH"
echo "Using JAVA_HOME=$JAVA_HOME ($("$JAVA_HOME/bin/java" -version 2>&1 | head -1))"

# Cargar .env y forzar exports (process.env gana sobre archivos; limpia leftovers del shell)
load_dotenv() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local val="${BASH_REMATCH[2]}"
      # Quitar comillas envolventes
      if [[ "$val" =~ ^\"(.*)\"$ ]]; then val="${BASH_REMATCH[1]}"; fi
      if [[ "$val" =~ ^\'(.*)\'$ ]]; then val="${BASH_REMATCH[1]}"; fi
      export "$key=$val"
    fi
  done < "$file"
}

# Preferir .env.production en release; luego .env
unset EXPO_PUBLIC_API_URL EXPO_PUBLIC_GOOGLE_CLIENT_ID EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || true
load_dotenv "$ROOT/.env"
if [[ -f "$ROOT/.env.production" ]]; then
  load_dotenv "$ROOT/.env.production"
fi

export NODE_ENV=production
export EXPO_NO_METRO_LAZY=1

if [[ -z "${EXPO_PUBLIC_API_URL:-}" ]]; then
  echo "Falta EXPO_PUBLIC_API_URL en .env / .env.production" >&2
  exit 1
fi

echo "════════════════════════════════════════"
echo " EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL"
echo " NODE_ENV=$NODE_ENV"
echo "════════════════════════════════════════"

if [[ "$EXPO_PUBLIC_API_URL" == *"localhost"* || "$EXPO_PUBLIC_API_URL" == *"127.0.0.1"* ]]; then
  echo "AVISO: API_URL es local. Para producción usa https://api.piel360.com/api" >&2
fi

APK_ONLY=0
if [[ "${1:-}" == "--apk-only" ]]; then
  APK_ONLY=1
  shift || true
fi

# Arrancar emulador si hace falta instalar
if [[ "$APK_ONLY" -eq 0 ]]; then
  if ! adb devices 2>/dev/null | awk 'NR>1 && $2=="device"{found=1} END{exit !found}'; then
    AVD="${ANDROID_AVD:-}"
    if [[ -z "$AVD" ]]; then
      if emulator -list-avds 2>/dev/null | grep -qx 'pixel'; then
        AVD=pixel
      else
        AVD="$(emulator -list-avds 2>/dev/null | head -1 || true)"
      fi
    fi
    if [[ -z "$AVD" ]]; then
      echo "No hay dispositivo. Usa --apk-only o crea un AVD." >&2
      exit 1
    fi
    echo "Arrancando emulador: $AVD"
    emulator -avd "$AVD" -netdelay none -netspeed full >/tmp/piel360-emulator.log 2>&1 &
    adb wait-for-device
    for _ in $(seq 1 60); do
      BOOT="$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
      [[ "$BOOT" == "1" ]] && break
      sleep 2
    done
  fi
fi

if [[ -x android/gradlew ]]; then
  (cd android && ./gradlew --stop >/dev/null 2>&1 || true)
fi

echo "Compilando APK release (bundle embebido, sin Metro)…"
# -x lint -x test; limpia assets JS previos para forzar re-bundle con el env actual
rm -rf android/app/build/generated/assets/createBundleReleaseJsAndAssets \
       android/app/build/intermediates/assets/release \
       android/app/src/main/assets/index.android.bundle 2>/dev/null || true

(
  cd android
  ./gradlew app:assembleRelease -x lint -x test --rerun-tasks "$@"
)

APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
if [[ ! -f "$APK" ]]; then
  echo "No se generó el APK en $APK" >&2
  exit 1
fi

# Verificación: la URL de prod debe estar literal en el bundle Hermes
BUNDLE="$ROOT/android/app/build/generated/assets/react/release/index.android.bundle"
if [[ -f "$BUNDLE" ]]; then
  if python3 - "$BUNDLE" "$EXPO_PUBLIC_API_URL" <<'PY'
import sys
from pathlib import Path
data = Path(sys.argv[1]).read_bytes()
needle = sys.argv[2].encode()
sys.exit(0 if needle in data else 1)
PY
  then
    echo "✓ Bundle contiene $EXPO_PUBLIC_API_URL"
  else
    echo "AVISO: no encontré $EXPO_PUBLIC_API_URL en el bundle (revisa el env)." >&2
  fi
fi

echo "APK: $APK"

if [[ "$APK_ONLY" -eq 1 ]]; then
  exit 0
fi

echo "Instalando en dispositivo (sin abrir Metro)…"
adb install -r "$APK"
adb shell am force-stop com.piel360.app >/dev/null 2>&1 || true
# Preferir activity launcher real; monkey a veces sale 251 en emuladores
if ! adb shell am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n com.piel360.app/.MainActivity >/dev/null 2>&1; then
  adb shell monkey -p com.piel360.app -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
fi
echo "Listo. App instalada con API: $EXPO_PUBLIC_API_URL"
