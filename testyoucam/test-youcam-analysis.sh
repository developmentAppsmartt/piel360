#!/usr/bin/env bash
# Dispara un análisis YouCam real contra la API local, usando una foto de esta carpeta.
# Uso:
#   ./test-youcam-analysis.sh <email> <password> <patientId> [imagen]
#
# Ejemplo:
#   ./test-youcam-analysis.sh doctor@piel360.com secret123 5 original.jpg

set -euo pipefail

API_URL="${API_URL:-http://localhost:3000}"
EMAIL="${1:?Falta el email de login}"
PASSWORD="${2:?Falta el password de login}"
PATIENT_ID="${3:?Falta el patientId}"
IMAGE="${4:-original.jpg}"
IMAGE_PATH="$(dirname "$0")/$IMAGE"

if [ ! -f "$IMAGE_PATH" ]; then
  echo "No existe la imagen: $IMAGE_PATH" >&2
  exit 1
fi

echo "== Login =="
TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | node -e "process.stdin.on('data', d => console.log(JSON.parse(d).accessToken))")

if [ -z "$TOKEN" ] || [ "$TOKEN" = "undefined" ]; then
  echo "No se pudo obtener el token — revisa credenciales/API_URL" >&2
  exit 1
fi

echo "== Creando análisis YouCam (paciente $PATIENT_ID, imagen $IMAGE) =="
curl -s -X POST "$API_URL/youcam/analyses" \
  -H "Authorization: Bearer $TOKEN" \
  -F "patientId=$PATIENT_ID" \
  -F "image=@$IMAGE_PATH" \
  | node -e "process.stdin.on('data', d => console.log(JSON.stringify(JSON.parse(d), null, 2)))"
