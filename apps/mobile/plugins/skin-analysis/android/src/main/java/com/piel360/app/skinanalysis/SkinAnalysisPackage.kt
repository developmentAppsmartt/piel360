package com.piel360.app.skinanalysis

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * Compatible con New Architecture (interop) y bridge clásico.
 * Expo/RN 0.76+ prefieren BaseReactPackage + ReactModuleInfoProvider
 * frente a createNativeModules() solo.
 */
class SkinAnalysisPackage : BaseReactPackage() {
  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext,
  ): NativeModule? =
    if (name == SkinAnalysisModule.NAME) {
      SkinAnalysisModule(reactContext)
    } else {
      null
    }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider {
      mapOf(
        SkinAnalysisModule.NAME to
          ReactModuleInfo(
            SkinAnalysisModule.NAME,
            SkinAnalysisModule::class.java.name,
            false, // canOverrideExistingModule
            false, // needsEagerInit
            false, // isCxxModule
            false, // isTurboModule → interop layer (ReactContextBaseJavaModule)
          ),
      )
    }
}
