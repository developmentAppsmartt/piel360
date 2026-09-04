# SkinAnalysis (captura guiada YouCam / Perfect Camera Kit)

Fuentes nativas Android del módulo `NativeModules.SkinAnalysis`.
`android/` generado por Expo está en `.gitignore`; el plugin Expo
`plugins/with-skin-analysis.js` las vuelve a copiar en `prebuild`.

## Qué incluye

- Óvalo de encuadre
- Badges: Iluminación / Mirada recta / Posición de la cara
- Countdown 3s + autocaptura cuando Perfect marca calidad OK
- Flip de cámara y loader de captura
- `PerfectLibCameraKit.aar` (quality checks)

## Requisitos Perfect Camera Kit

1. `plugins/skin-analysis/android/libs/PerfectLibCameraKit.aar`
2. Modelos en `plugins/skin-analysis/android/src/main/assets/model/`:
   - `YMK_Davinci_20200512_fp16.mnn`
   - `YMK_Venus_20210709_fp16_alignmodel.mnn`
   - `exposure_net_20190808.bin`
   - `uneven_lighting_net_20190808.bin`
   - `backlighting_net_20190808.bin`

El plugin los copia a `android/app/` en prebuild.

Sin los modelos: `Cannot copy model. fileName=YMK_Davinci_...` y fallback manual.

Origen: SDK `MobileCameraKit-v2.5.0` → `camerakit-android/main/model/`
(vendor local: `android/vendor/perfect-camerakit/`, gitignored).
