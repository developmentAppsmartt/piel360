# Fix: captura de YouCam en contenedor de alta definición y umbral HD para iPad

## Contexto

En las pruebas de campo:
- **Samsung Galaxy (Android):** El análisis de piel funciona correctamente.
- **iPad (iOS / Safari - Cámara frontal 12 MP / Retina 10.2"):** Con la configuración `videoQuality: "1080p"`, la cámara del iPad genera una imagen capturada de **`1080 × 1058 px`** (1080px de ancho por 1058px de alto en portrait recortado).
- **Diagnóstico del problema:** Tanto el componente web (`youcam-capture.tsx`) como el servicio API (`youcam-analyses.service.ts`) tenían un chequeo estricto `Math.min(width, height) < 1080`. Dado que el lado corto del iPad fue de **1058px** (solo 22px por debajo de 1080px), la captura fue rechazada erróneamente con el mensaje *"La foto capturada quedó en muy baja resolución (1080 x 1058)"*.

## Solución

1. **Ajuste de Umbral Mínimo de Lado Corto (`1000px`):**
   - **Frontend (`apps/web/src/components/analyses/youcam-capture.tsx`):** Se ajusta `MIN_IDEAL_HEIGHT = 1000;`.
   - **Backend (`apps/api/src/youcam/youcam-analyses.service.ts`):** Se ajusta `YOUCAM_HD_MIN_SHORT_SIDE_PX = 1000;`.
   - Esto permite que capturas 1080p reales en portrait (como los `1080×1058px` del iPad) sean aceptadas limpiamente tanto por el cliente como por el servidor API, mientras sigue rechazando webcams de baja calidad de 480p/640p.

2. **Diseño de Contenedor de Módulo (`h-[480px]`):**
   - El elemento `<div id="YMK-module">` utiliza `h-[480px] w-full relative overflow-hidden` y calcula `width`/`height` desde el contenedor visual (`height ≥ 480px`), evitando que la UI del SDK desborde y ocultando/desplazando la sección de Región o los botones del formulario.

## Verificación

1. Probar la captura en el **iPad**: La imagen de `1080×1058px` ahora pasa la validación sin mostrar alerta y permite continuar al análisis.
2. Probar en **PC con cámara de 1920×1080 (OBS Virtual Camera)** y **Galaxy A50**: Continúan funcionando correctamente.
