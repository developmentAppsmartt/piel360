const fs = require('fs');
const path = require('path');
const {
  withAppBuildGradle,
  withDangerousMod,
  withGradleProperties,
  withMainApplication,
} = require('@expo/config-plugins');

const DESUGAR_VERSION = '2.1.4';

const BRIDGE_IMPORT =
  'import com.piel360.app.recaptcha.RecaptchaBridgePackage';
const SKIN_IMPORT = 'import com.piel360.app.skinanalysis.SkinAnalysisPackage';

/**
 * reCAPTCHA Enterprise Android:
 * - coreLibraryDesugaring
 * - kotlin-android en el módulo de Google (18.9.x lo quitó)
 * - MainApplication: sustituir Package clásico por RecaptchaBridgePackage
 *   (BaseReactPackage) para New Architecture / bridgeless
 *
 * @see https://github.com/GoogleCloudPlatform/recaptcha-enterprise-react-native/issues/130
 * @see https://docs.cloud.google.com/recaptcha/docs/instrument-android-apps#react-native
 */
function withRecaptchaAndroid(config) {
  config = withGradleProperties(config, (mod) => {
    const props = mod.modResults;
    const ensure = (key, value) => {
      const i = props.findIndex((p) => p.type === 'property' && p.key === key);
      if (i >= 0) props[i].value = value;
      else props.push({ type: 'property', key, value });
    };
    ensure('android.useAndroidX', 'true');
    ensure('android.enableJetifier', 'true');
    return mod;
  });

  config = withDangerousMod(config, [
    'android',
    async (mod) => {
      const candidates = [
        path.join(
          mod.modRequest.projectRoot,
          'node_modules',
          '@google-cloud',
          'recaptcha-enterprise-react-native',
          'android',
          'build.gradle',
        ),
        path.join(
          mod.modRequest.projectRoot,
          '..',
          '..',
          'node_modules',
          '@google-cloud',
          'recaptcha-enterprise-react-native',
          'android',
          'build.gradle',
        ),
      ];
      const gradlePath = candidates.find((p) => fs.existsSync(p));
      if (!gradlePath) return mod;

      let contents = fs.readFileSync(gradlePath, 'utf8');
      if (
        contents.includes('apply plugin: "com.android.library"') &&
        !contents.includes('apply plugin: "kotlin-android"') &&
        !contents.includes('org.jetbrains.kotlin.android')
      ) {
        contents = contents.replace(
          'apply plugin: "com.android.library"',
          `apply plugin: "com.android.library"
apply plugin: "kotlin-android"`,
        );
      }
      if (!contents.includes('-Xskip-metadata-version-check')) {
        contents += `

tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
  compilerOptions {
    freeCompilerArgs.add("-Xskip-metadata-version-check")
  }
}
`;
      }
      fs.writeFileSync(gradlePath, contents);

      // Asegurar BridgePackage en el árbol android (sobrevive prebuild si se regenera).
      const bridgeDir = path.join(
        mod.modRequest.platformProjectRoot,
        'app/src/main/java/com/piel360/app/recaptcha',
      );
      const bridgeFile = path.join(bridgeDir, 'RecaptchaBridgePackage.kt');
      if (!fs.existsSync(bridgeFile)) {
        fs.mkdirSync(bridgeDir, { recursive: true });
        fs.writeFileSync(
          bridgeFile,
          `package com.piel360.app.recaptcha

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.google.recaptchaenterprisereactnative.RecaptchaEnterpriseReactNativeModule

class RecaptchaBridgePackage : BaseReactPackage() {
  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext,
  ): NativeModule? =
    if (name == RecaptchaEnterpriseReactNativeModule.NAME) {
      RecaptchaEnterpriseReactNativeModule(reactContext)
    } else {
      null
    }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider {
      mapOf(
        RecaptchaEnterpriseReactNativeModule.NAME to
          ReactModuleInfo(
            RecaptchaEnterpriseReactNativeModule.NAME,
            RecaptchaEnterpriseReactNativeModule::class.java.name,
            false,
            false,
            false,
            false,
          ),
      )
    }
}
`,
        );
      }
      return mod;
    },
  ]);

  config = withMainApplication(config, (mod) => {
    let contents = mod.modResults.contents;
    if (!contents.includes('RecaptchaBridgePackage')) {
      if (contents.includes(SKIN_IMPORT)) {
        contents = contents.replace(
          SKIN_IMPORT,
          `${BRIDGE_IMPORT}\n${SKIN_IMPORT}`,
        );
      } else if (contents.includes('import com.facebook.react.PackageList')) {
        contents = contents.replace(
          'import com.facebook.react.PackageList',
          `import com.facebook.react.PackageList\n${BRIDGE_IMPORT}`,
        );
      }
    }
    if (
      contents.includes('PackageList(this).packages.apply') &&
      !contents.includes('RecaptchaBridgePackage()')
    ) {
      contents = contents.replace(
        /PackageList\(this\)\.packages\.apply\s*\{/,
        `PackageList(this).packages.apply {
          removeAll {
            it.javaClass.name ==
              "com.google.recaptchaenterprisereactnative.RecaptchaEnterpriseReactNativePackage"
          }
          add(RecaptchaBridgePackage())`,
      );
    }
    mod.modResults.contents = contents;
    return mod;
  });

  return withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;

    if (!contents.includes('coreLibraryDesugaringEnabled')) {
      if (/compileOptions\s*\{/.test(contents)) {
        contents = contents.replace(
          /compileOptions\s*\{/,
          `compileOptions {
        coreLibraryDesugaringEnabled true`,
        );
      } else if (/android\s*\{/.test(contents)) {
        contents = contents.replace(
          /android\s*\{/,
          `android {
    compileOptions {
        coreLibraryDesugaringEnabled true
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }`,
        );
      }
    }

    if (!contents.includes('coreLibraryDesugaring(')) {
      if (/dependencies\s*\{/.test(contents)) {
        contents = contents.replace(
          /dependencies\s*\{/,
          `dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:${DESUGAR_VERSION}")`,
        );
      }
    }

    mod.modResults.contents = contents;
    return mod;
  });
}

module.exports = withRecaptchaAndroid;
