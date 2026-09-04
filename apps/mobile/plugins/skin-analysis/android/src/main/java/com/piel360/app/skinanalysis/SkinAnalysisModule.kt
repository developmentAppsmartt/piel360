package com.piel360.app.skinanalysis

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = SkinAnalysisModule.NAME)
class SkinAnalysisModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private var capturePromise: Promise? = null

  private val activityListener: ActivityEventListener =
    object : BaseActivityEventListener() {
      override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?,
      ) {
        if (requestCode != REQUEST_CAPTURE) return
        val promise = capturePromise ?: return
        capturePromise = null

        if (resultCode != Activity.RESULT_OK || data == null) {
          promise.reject("E_CANCELLED", "Captura cancelada")
          return
        }

        val uri = data.getStringExtra(SkinAnalysisCaptureActivity.EXTRA_IMAGE_URI)
        if (uri.isNullOrBlank()) {
          promise.reject("E_NO_IMAGE", "No se generó la imagen")
          return
        }

        val map =
          Arguments.createMap().apply {
            putString("uri", uri)
            putInt("width", data.getIntExtra(SkinAnalysisCaptureActivity.EXTRA_WIDTH, 0))
            putInt("height", data.getIntExtra(SkinAnalysisCaptureActivity.EXTRA_HEIGHT, 0))
            putString(
              "qualitySource",
              data.getStringExtra(SkinAnalysisCaptureActivity.EXTRA_QUALITY_SOURCE) ?: "guided",
            )
            putBoolean(
              "perfectSdkAvailable",
              data.getBooleanExtra(SkinAnalysisCaptureActivity.EXTRA_PERFECT_AVAILABLE, false),
            )
          }
        promise.resolve(map)
      }
    }

  init {
    reactContext.addActivityEventListener(activityListener)
  }

  override fun getName(): String = NAME

  @ReactMethod
  fun isAvailable(promise: Promise) {
    promise.resolve(
      Arguments.createMap().apply {
        putBoolean("nativeModule", true)
        // Perfect AAR es opcional: sin él usamos CameraX guiado.
        putBoolean("perfectSdk", PerfectCameraKitBridge.isSdkPresent())
        putBoolean("cameraCapture", true)
        putString("platform", "android")
      },
    )
  }

  @ReactMethod
  fun startGuidedCapture(promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject("E_NO_ACTIVITY", "No hay Activity activa")
      return
    }

    if (capturePromise != null) {
      promise.reject("E_IN_PROGRESS", "Ya hay una captura en curso")
      return
    }

    capturePromise = promise
    activity.startActivityForResult(
      Intent(activity, SkinAnalysisCaptureActivity::class.java),
      REQUEST_CAPTURE,
    )
  }

  companion object {
    const val NAME = "SkinAnalysis"
    private const val REQUEST_CAPTURE = 0x5A11
  }
}
