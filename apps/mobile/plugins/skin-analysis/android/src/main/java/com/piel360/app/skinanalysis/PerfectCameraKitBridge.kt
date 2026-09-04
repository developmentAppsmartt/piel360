package com.piel360.app.skinanalysis

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.perfectcorp.perfectlib.CameraFrame
import com.perfectcorp.perfectlib.CameraKit
import com.perfectcorp.perfectlib.CameraKitLevel
import com.perfectcorp.perfectlib.CameraKitQualityCheck
import com.perfectcorp.perfectlib.Configuration
import com.perfectcorp.perfectlib.Functionality
import com.perfectcorp.perfectlib.PerfectLib
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Bridge tipado sobre PerfectLib CameraKit v2.5.0.
 *
 * Según Doc-Starting_Guide / API:
 * - [PerfectLib.init] y [CameraKit.create] / [CameraKit.createFromAssets] son **@MainThread**
 * - [CameraKit.onCameraOpened] y [CameraKit.sendCameraBuffer] son **@WorkerThread**
 */
class PerfectCameraKitBridge {

  interface QualityListener {
    fun onQualityChanged(
      ready: Boolean,
      faceAreaOk: Boolean,
      facePoseOk: Boolean,
      lightingOk: Boolean,
      message: String,
    )
  }

  private var cameraKit: CameraKit? = null
  @Volatile private var ready = false
  private var pendingCameraOpen: CameraOpenParams? = null
  private val mainHandler = Handler(Looper.getMainLooper())
  private val sdkExecutor: ExecutorService = Executors.newSingleThreadExecutor { r ->
    Thread(r, "PerfectCameraKit").apply { isDaemon = true }
  }

  private data class CameraOpenParams(
    val isFrontCamera: Boolean,
    val cameraOrientation: Int,
    val previewWidth: Int,
    val previewHeight: Int,
  )

  fun isReady(): Boolean = ready

  /**
   * Inicializa PerfectLib + CameraKit en el hilo principal (requerido por el SDK).
   * [onDone] recibe (ok, errorMessage?).
   */
  fun create(
    context: Context,
    listener: QualityListener,
    onDone: (ok: Boolean, error: String?) -> Unit,
  ) {
    val app = context.applicationContext
    mainHandler.post {
      try {
        if (PerfectLib.isSdkInitialized()) {
          createCameraKitInstance(listener, onDone)
          return@post
        }

        val configuration =
          Configuration.builder()
            .setModelPath(PerfectLib.ModelPath.assets(MODEL_ASSETS_FOLDER))
            .build()

        PerfectLib.init(
          app,
          configuration,
          object : PerfectLib.InitialCallback {
            override fun onInitialized(
              availableFunctionalities: Set<Functionality>,
              preloadErrors: Map<String, Throwable>,
            ) {
              Log.i(
                TAG,
                "PerfectLib init OK. funcs=$availableFunctionalities preloadErrors=${preloadErrors.keys}",
              )
              createCameraKitInstance(listener, onDone)
            }

            override fun onFailure(
              throwable: Throwable,
              preloadErrors: Map<String, Throwable>,
            ) {
              Log.e(TAG, "PerfectLib.init failed: $preloadErrors", throwable)
              // Fallback documentado: createFromAssets tras bootstrap mínimo.
              tryCreateFromAssets(listener, onDone, throwable)
            }
          },
        )
      } catch (t: Throwable) {
        Log.e(TAG, "Perfect CameraKit init error", t)
        ready = false
        cameraKit = null
        onDone(false, t.message ?: t.javaClass.simpleName)
      }
    }
  }

  private fun createCameraKitInstance(
    listener: QualityListener,
    onDone: (Boolean, String?) -> Unit,
  ) {
    CameraKit.create(
      object : CameraKit.CreateCallback {
        override fun onSuccess(kit: CameraKit) {
          bindKit(kit, listener)
          onDone(true, null)
        }

        override fun onFailure(throwable: Throwable) {
          Log.e(TAG, "CameraKit.create failed", throwable)
          tryCreateFromAssets(listener, onDone, throwable)
        }
      },
    )
  }

  private fun tryCreateFromAssets(
    listener: QualityListener,
    onDone: (Boolean, String?) -> Unit,
    previousError: Throwable?,
  ) {
    try {
      CameraKit.createFromAssets(
        MODEL_ASSETS_FOLDER,
        object : CameraKit.CreateCallback {
          override fun onSuccess(kit: CameraKit) {
            Log.i(TAG, "CameraKit.createFromAssets OK (fallback)")
            bindKit(kit, listener)
            onDone(true, null)
          }

          override fun onFailure(throwable: Throwable) {
            Log.e(TAG, "CameraKit.createFromAssets failed", throwable)
            ready = false
            cameraKit = null
            val msg =
              listOfNotNull(previousError?.message, throwable.message)
                .distinct()
                .joinToString(" | ")
                .ifBlank { throwable.javaClass.simpleName }
            onDone(false, msg)
          }
        },
      )
    } catch (t: Throwable) {
      Log.e(TAG, "createFromAssets threw", t)
      onDone(false, t.message ?: t.javaClass.simpleName)
    }
  }

  private fun bindKit(kit: CameraKit, listener: QualityListener) {
    cameraKit = kit
    ready = true
    kit.setCameraKitLevel(CameraKitLevel.RELAXED)
    kit.setCameraKitQualityCheckCallback { result: CameraKitQualityCheck ->
      val faceAreaOk = result.faceAreaQuality.isOk
      val facePoseOk = result.facePoseQuality.isOk
      val lightingOk = result.lightingQuality.isOk
      val allOk = faceAreaOk && facePoseOk && lightingOk
      val message =
        when {
          !lightingOk -> lightingMessage(result.lightingQuality)
          !faceAreaOk -> faceAreaMessage(result.faceAreaQuality)
          !facePoseOk -> "Mira de frente"
          else -> "La foto se sacará en"
        }
      listener.onQualityChanged(allOk, faceAreaOk, facePoseOk, lightingOk, message)
    }
    flushPendingCameraOpen()
  }

  fun onCameraOpened(
    isFrontCamera: Boolean,
    cameraOrientation: Int,
    previewWidth: Int,
    previewHeight: Int,
  ) {
    val params =
      CameraOpenParams(isFrontCamera, cameraOrientation, previewWidth, previewHeight)
    sdkExecutor.execute {
      pendingCameraOpen = params
      flushPendingCameraOpen()
    }
  }

  private fun flushPendingCameraOpen() {
    val kit = cameraKit ?: return
    val params = pendingCameraOpen ?: return
    sdkExecutor.execute {
      try {
        kit.onCameraOpened(
          params.isFrontCamera,
          params.cameraOrientation,
          params.previewWidth,
          params.previewHeight,
        )
        pendingCameraOpen = null
      } catch (t: Throwable) {
        Log.e(TAG, "onCameraOpened failed", t)
      }
    }
  }

  fun sendPreviewFrame(
    nv21: ByteArray,
    width: Int,
    height: Int,
    rotationDegrees: Int,
    isFirstFrame: Boolean,
  ) {
    if (!ready) return
    val frameCopy = nv21.copyOf()
    sdkExecutor.execute {
      val kit = cameraKit ?: return@execute
      try {
        val frame = CameraFrame(frameCopy, width, height, isFirstFrame)
        try {
          frame.setFrameOrientation(rotationDegrees)
        } catch (_: Throwable) {
          // Algunos builds no exponen setFrameOrientation.
        }
        kit.sendCameraBuffer(frame)
      } catch (t: Throwable) {
        Log.w(TAG, "sendCameraBuffer failed", t)
      }
    }
  }

  fun release() {
    mainHandler.post {
      try {
        cameraKit?.setCameraKitQualityCheckCallback(null)
      } catch (_: Throwable) {
        // ignore
      }
      cameraKit = null
      ready = false
    }
    sdkExecutor.shutdown()
  }

  companion object {
    private const val TAG = "PerfectCameraKitBridge"
    private const val MODEL_ASSETS_FOLDER = "model"

    fun isSdkPresent(): Boolean {
      return try {
        Class.forName("com.perfectcorp.perfectlib.CameraKit")
        Class.forName("com.perfectcorp.perfectlib.PerfectLib")
        true
      } catch (_: Throwable) {
        false
      }
    }

    private fun lightingMessage(q: CameraKitQualityCheck.LightingQuality): String {
      return when (q.name) {
        "OVER_EXPOSED" -> "Demasiada luz"
        "UNDER_EXPOSED" -> "Necesitas más luz"
        "BACKLIGHTING" -> "Evita la contraluz"
        "UNEVEN" -> "Iluminación irregular"
        else -> "Mejora la iluminación"
      }
    }

    private fun faceAreaMessage(q: CameraKitQualityCheck.FaceAreaQuality): String {
      return when (q.name) {
        "TOO_SMALL" -> "Acércate"
        "OUT_OF_BOUNDARY" -> "Aléjate"
        else -> "Centra tu cara"
      }
    }
  }
}
