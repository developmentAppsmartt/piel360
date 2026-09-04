const {
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withMainApplication,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function withSkinAnalysisSources(config) {
  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const pluginRoot = path.join(
        mod.modRequest.projectRoot,
        'plugins/skin-analysis',
      );
      const src = path.join(pluginRoot, 'android/src/main');
      const dest = path.join(
        mod.modRequest.platformProjectRoot,
        'app/src/main',
      );
      copyDir(
        path.join(src, 'java/com/piel360/app/skinanalysis'),
        path.join(dest, 'java/com/piel360/app/skinanalysis'),
      );
      copyDir(path.join(src, 'res'), path.join(dest, 'res'));
      copyDir(path.join(src, 'assets'), path.join(dest, 'assets'));

      // Perfect AAR (opcional pero necesario para quality checks / autocaptura).
      const aarSrc = path.join(
        pluginRoot,
        'android/libs/PerfectLibCameraKit.aar',
      );
      const aarDestDir = path.join(
        mod.modRequest.platformProjectRoot,
        'app/libs',
      );
      if (fs.existsSync(aarSrc)) {
        fs.mkdirSync(aarDestDir, { recursive: true });
        fs.copyFileSync(
          aarSrc,
          path.join(aarDestDir, 'PerfectLibCameraKit.aar'),
        );
      }
      return mod;
    },
  ]);
}

function withSkinAnalysisManifest(config) {
  return withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    if (!app) return mod;
    app.activity = app.activity ?? [];
    const exists = app.activity.some(
      (item) =>
        item.$?.['android:name'] ===
        '.skinanalysis.SkinAnalysisCaptureActivity',
    );
    if (!exists) {
      app.activity.push({
        $: {
          'android:name': '.skinanalysis.SkinAnalysisCaptureActivity',
          'android:exported': 'false',
          'android:screenOrientation': 'portrait',
          'android:theme': '@style/AppTheme',
        },
      });
    }
    return mod;
  });
}

function withSkinAnalysisMainApplication(config) {
  return withMainApplication(config, (mod) => {
    let contents = mod.modResults.contents;
    if (!contents.includes('SkinAnalysisPackage')) {
      contents = contents.replace(
        'import com.facebook.react.PackageList',
        'import com.facebook.react.PackageList\nimport com.piel360.app.skinanalysis.SkinAnalysisPackage',
      );
    }
    if (!contents.includes('SkinAnalysisPackage()')) {
      if (contents.includes('PackageList(this).packages.apply {')) {
        contents = contents.replace(
          'PackageList(this).packages.apply {',
          'PackageList(this).packages.apply {\n          add(SkinAnalysisPackage())',
        );
      } else if (contents.includes('val packages = PackageList(this).packages')) {
        contents = contents.replace(
          'val packages = PackageList(this).packages',
          'val packages = PackageList(this).packages\n    packages.add(SkinAnalysisPackage())',
        );
      } else if (contents.includes('// add(MyReactNativePackage())')) {
        contents = contents.replace(
          '// add(MyReactNativePackage())',
          '// add(MyReactNativePackage())\n          add(SkinAnalysisPackage())',
        );
      }
    }
    mod.modResults.contents = contents;
    return mod;
  });
}

function withSkinAnalysisGradle(config) {
  return withAppBuildGradle(config, (mod) => {
    const cameraMarker = 'androidx.camera:camera-camera2';
    const guavaMarker = 'com.google.guava:guava:33.3.1-android';
    if (
      mod.modResults.contents.includes(cameraMarker) &&
      mod.modResults.contents.includes(guavaMarker) &&
      mod.modResults.contents.includes('PerfectLibCameraKit.aar')
    ) {
      return mod;
    }

    const deps = `
    implementation("androidx.camera:camera-core:1.4.2")
    implementation("androidx.camera:camera-camera2:1.4.2")
    implementation("androidx.camera:camera-lifecycle:1.4.2")
    implementation("androidx.camera:camera-view:1.4.2")
    implementation("androidx.concurrent:concurrent-futures:1.2.0")
    implementation("com.google.guava:guava:33.3.1-android")

    def perfectAar = file("\${projectDir}/libs/PerfectLibCameraKit.aar")
    if (perfectAar.exists()) {
        implementation files(perfectAar)
    }`;

    if (mod.modResults.contents.includes(cameraMarker)) {
      if (!mod.modResults.contents.includes(guavaMarker)) {
        mod.modResults.contents = mod.modResults.contents.replace(
          'implementation("androidx.camera:camera-view:1.4.2")',
          `implementation("androidx.camera:camera-view:1.4.2")
    implementation("androidx.concurrent:concurrent-futures:1.2.0")
    implementation("com.google.guava:guava:33.3.1-android")`,
        );
      }
      if (!mod.modResults.contents.includes('PerfectLibCameraKit.aar')) {
        mod.modResults.contents = mod.modResults.contents.replace(
          'implementation("com.google.guava:guava:33.3.1-android")',
          `implementation("com.google.guava:guava:33.3.1-android")

    def perfectAar = file("\${projectDir}/libs/PerfectLibCameraKit.aar")
    if (perfectAar.exists()) {
        implementation files(perfectAar)
    }`,
        );
      }
      return mod;
    }

    const marker = 'implementation("com.facebook.react:hermes-android")';
    if (!mod.modResults.contents.includes(marker)) return mod;
    mod.modResults.contents = mod.modResults.contents.replace(
      marker,
      `${marker}
${deps}`,
    );
    return mod;
  });
}

module.exports = function withSkinAnalysis(config) {
  config = withSkinAnalysisSources(config);
  config = withSkinAnalysisManifest(config);
  config = withSkinAnalysisMainApplication(config);
  config = withSkinAnalysisGradle(config);
  return config;
};
