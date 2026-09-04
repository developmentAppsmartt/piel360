package com.piel360.app.skinanalysis

import android.Manifest
import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.Size
import android.view.View
import android.view.animation.OvershootInterpolator
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.piel360.app.R
import java.io.File
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Captura guiada con **Perfect Camera Kit** (quality check del AAR).
 *
 * Estados (luz / mirada / posición), mensajes, countdown con sonido y
 * auto-captura salen del callback de calidad. Flip frontal ↔ trasera.
 */
class SkinAnalysisCaptureActivity : AppCompatActivity() {

  private lateinit var previewView: PreviewView
  private lateinit var guideText: TextView
  private lateinit var countdownText: TextView
  private lateinit var captureLoader: CapturePulseLoaderView
  private lateinit var badgeLighting: TextView
  private lateinit var badgePose: TextView
  private lateinit var badgeFace: TextView
  private lateinit var btnCapture: Button
  private lateinit var btnBack: TextView
  private lateinit var btnSwitchCamera: ImageView
  private lateinit var ovalMask: View

  private var imageCapture: ImageCapture? = null
  private var cameraProvider: ProcessCameraProvider? = null
  private var cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
  private val perfectBridge = PerfectCameraKitBridge()
  private val needsFirstFrame = AtomicBoolean(true)
  private var perfectActive = false
  private var perfectInitFailed = false
  private var qualityReady = false
  private var capturing = false
  private var countdownRunning = false
  private var lensFacing = CameraSelector.LENS_FACING_FRONT
  private var lastGuideMessage: String? = null

  private val mainHandler = Handler(Looper.getMainLooper())
  private var countdownRunnable: Runnable? = null
  private var countdownLeft = 0
  private var toneGenerator: ToneGenerator? = null

  private val countdownSeconds = 3

  private val permissionLauncher =
    registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
      if (granted) startCamera()
      else {
        setResult(RESULT_CANCELED)
        finish()
      }
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_skin_analysis_capture)

    previewView = findViewById(R.id.preview_view)
    guideText = findViewById(R.id.guide_text)
    countdownText = findViewById(R.id.countdown_text)
    captureLoader = findViewById(R.id.capture_loader)
    badgeLighting = findViewById(R.id.badge_lighting)
    badgePose = findViewById(R.id.badge_pose)
    badgeFace = findViewById(R.id.badge_face)
    btnCapture = findViewById(R.id.btn_capture)
    btnBack = findViewById(R.id.btn_back)
    btnSwitchCamera = findViewById(R.id.btn_switch_camera)
    ovalMask = findViewById(R.id.oval_mask)

    findViewById<Button>(R.id.btn_cancel)?.setOnClickListener { cancelCapture() }
    btnBack.setOnClickListener { cancelCapture() }
    btnCapture.setOnClickListener { takePhoto() }
    btnCapture.visibility = View.GONE
    btnSwitchCamera.setOnClickListener { switchCamera() }

    try {
      toneGenerator = ToneGenerator(AudioManager.STREAM_MUSIC, 85)
    } catch (t: Throwable) {
      Log.w(TAG, "ToneGenerator unavailable", t)
    }

    setBadge(badgeLighting, "Iluminación", null, BadgeTone.PENDING)
    setBadge(badgePose, "Mirada recta", null, BadgeTone.PENDING)
    setBadge(badgeFace, "Posición de la cara", null, BadgeTone.PENDING)
    guideText.text = "Inicializando…"
    pulseOvalSoft()

    initPerfectCameraKit()

    when {
      ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
        PackageManager.PERMISSION_GRANTED -> startCamera()
      else -> permissionLauncher.launch(Manifest.permission.CAMERA)
    }
  }

  private fun cancelCapture() {
    cancelCountdown()
    setResult(RESULT_CANCELED)
    finish()
  }

  private fun initPerfectCameraKit() {
    if (!PerfectCameraKitBridge.isSdkPresent()) {
      Log.e(TAG, "PerfectLibCameraKit.aar no está en el classpath")
      perfectInitFailed = true
      enableManualFallback("Camera Kit no disponible en este build")
      return
    }

    perfectBridge.create(
      context = applicationContext,
      listener =
        object : PerfectCameraKitBridge.QualityListener {
          override fun onQualityChanged(
            ready: Boolean,
            faceAreaOk: Boolean,
            facePoseOk: Boolean,
            lightingOk: Boolean,
            message: String,
          ) {
            runOnUiThread {
              if (!perfectActive || capturing) return@runOnUiThread
              qualityReady = ready
              applyPerfectQualityUi(ready, faceAreaOk, facePoseOk, lightingOk, message)
              if (ready) startCountdownIfNeeded() else cancelCountdown()
            }
          }
        },
    ) { ok, error ->
      runOnUiThread {
        if (ok) {
          perfectActive = true
          perfectInitFailed = false
          needsFirstFrame.set(true)
          btnCapture.visibility = View.GONE
          setGuideMessage("Centra tu cara en el óvalo")
          notifyCameraOpenedToKit()
          Log.i(TAG, "Perfect Camera Kit listo")
        } else {
          perfectInitFailed = true
          val detail = error?.take(120)?.let { "\n$it" }.orEmpty()
          enableManualFallback("No se pudo iniciar Camera Kit$detail")
        }
      }
    }
  }

  private fun enableManualFallback(reason: String) {
    perfectActive = false
    Log.w(TAG, "Fallback manual: $reason")
    setGuideMessage("$reason\nCentra el rostro y pulsa Capturar")
    btnCapture.visibility = View.VISIBLE
    btnCapture.isEnabled = true
    setBadge(badgeLighting, "Iluminación", null, BadgeTone.PENDING)
    setBadge(badgePose, "Mirada recta", null, BadgeTone.PENDING)
    setBadge(badgeFace, "Posición de la cara", null, BadgeTone.PENDING)
  }

  private fun applyPerfectQualityUi(
    ready: Boolean,
    faceAreaOk: Boolean,
    facePoseOk: Boolean,
    lightingOk: Boolean,
    message: String,
  ) {
    setBadge(
      badgeLighting,
      "Iluminación",
      if (lightingOk) "Buena" else "Incorrecta",
      if (lightingOk) BadgeTone.OK_GREEN else BadgeTone.BAD,
    )
    setBadge(
      badgePose,
      "Mirada recta",
      if (facePoseOk) "Buena" else "Incorrecta",
      if (facePoseOk) BadgeTone.OK_GREEN else BadgeTone.BAD,
    )
    setBadge(
      badgeFace,
      "Posición de la cara",
      if (faceAreaOk) "Buena" else "Incorrecta",
      if (faceAreaOk) BadgeTone.OK_GREEN else BadgeTone.BAD,
    )

    if (!countdownRunning) {
      countdownText.visibility = View.GONE
      setGuideMessage(if (ready) "La foto se sacará en" else message)
    }
  }

  private enum class BadgeTone { PENDING, OK_GREEN, BAD }

  private fun setBadge(view: TextView, title: String, status: String?, tone: BadgeTone) {
    view.text = if (status.isNullOrBlank()) title else "$title: $status"
    view.setBackgroundResource(
      when (tone) {
        BadgeTone.PENDING -> R.drawable.skin_badge_pending
        BadgeTone.OK_GREEN -> R.drawable.skin_badge_ok_green
        BadgeTone.BAD -> R.drawable.skin_badge_bad
      },
    )
  }

  private fun setGuideMessage(message: String) {
    if (message == lastGuideMessage) return
    lastGuideMessage = message
    guideText.visibility = View.VISIBLE
    guideText.text = message
    guideText.animate().cancel()
    guideText.scaleX = 0.92f
    guideText.scaleY = 0.92f
    guideText.alpha = 0.7f
    guideText
      .animate()
      .scaleX(1f)
      .scaleY(1f)
      .alpha(1f)
      .setDuration(220L)
      .start()
  }

  private fun pulseOvalSoft() {
    ovalMask.animate().cancel()
    ObjectAnimator.ofFloat(ovalMask, View.ALPHA, 0.75f, 1f).apply {
      duration = 900L
      repeatMode = ObjectAnimator.REVERSE
      repeatCount = ObjectAnimator.INFINITE
      start()
    }
  }

  private fun startCountdownIfNeeded() {
    if (capturing || countdownRunning || !qualityReady) return
    countdownRunning = true
    countdownLeft = countdownSeconds
    setGuideMessage("La foto se sacará en")
    countdownText.visibility = View.VISIBLE
    countdownText.text = countdownLeft.toString()
    animateCountdownDigit()
    playTone(ToneGenerator.TONE_PROP_BEEP)

    val tick =
      object : Runnable {
        override fun run() {
          if (!qualityReady || capturing) {
            cancelCountdown()
            return
          }
          countdownLeft -= 1
          if (countdownLeft <= 0) {
            countdownText.visibility = View.GONE
            playTone(ToneGenerator.TONE_PROP_ACK)
            takePhoto()
            return
          }
          countdownText.text = countdownLeft.toString()
          animateCountdownDigit()
          playTone(ToneGenerator.TONE_PROP_BEEP)
          countdownRunnable = this
          mainHandler.postDelayed(this, 1000L)
        }
      }
    countdownRunnable = tick
    mainHandler.postDelayed(tick, 1000L)
  }

  private fun animateCountdownDigit() {
    countdownText.animate().cancel()
    countdownText.scaleX = 0.55f
    countdownText.scaleY = 0.55f
    countdownText.alpha = 0.4f
    val sx = ObjectAnimator.ofFloat(countdownText, View.SCALE_X, 0.55f, 1.12f, 1f)
    val sy = ObjectAnimator.ofFloat(countdownText, View.SCALE_Y, 0.55f, 1.12f, 1f)
    val a = ObjectAnimator.ofFloat(countdownText, View.ALPHA, 0.4f, 1f)
    AnimatorSet().apply {
      playTogether(sx, sy, a)
      duration = 320L
      interpolator = OvershootInterpolator(1.4f)
      start()
    }
  }

  private fun cancelCountdown() {
    val wasRunning = countdownRunning
    countdownRunnable?.let { mainHandler.removeCallbacks(it) }
    countdownRunnable = null
    countdownRunning = false
    countdownText.visibility = View.GONE
    if (wasRunning && !capturing) {
      // El próximo callback de calidad vuelve a poner el mensaje guía.
    }
  }

  private fun playTone(tone: Int) {
    try {
      toneGenerator?.startTone(tone, 120)
    } catch (_: Throwable) {
      // ignore
    }
  }

  private fun switchCamera() {
    if (capturing) return
    cancelCountdown()
    qualityReady = false
    lensFacing =
      if (lensFacing == CameraSelector.LENS_FACING_FRONT) {
        CameraSelector.LENS_FACING_BACK
      } else {
        CameraSelector.LENS_FACING_FRONT
      }
    needsFirstFrame.set(true)
    setGuideMessage("Cambiando cámara…")
    btnSwitchCamera
      .animate()
      .rotationBy(180f)
      .setDuration(280L)
      .withEndAction { bindCameraUseCases() }
      .start()
  }

  private fun startCamera() {
    val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
    cameraProviderFuture.addListener(
      {
        cameraProvider = cameraProviderFuture.get()
        bindCameraUseCases()
      },
      ContextCompat.getMainExecutor(this),
    )
  }

  private fun bindCameraUseCases() {
    val provider = cameraProvider ?: return
    val preview =
      Preview.Builder().build().also {
        it.surfaceProvider = previewView.surfaceProvider
      }

    imageCapture =
      ImageCapture.Builder()
        .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
        .setTargetResolution(Size(1440, 1920))
        .build()

    val analysis =
      ImageAnalysis.Builder()
        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
        .setTargetResolution(Size(480, 640))
        .build()
        .also { analyzer ->
          analyzer.setAnalyzer(cameraExecutor) { image -> processFrame(image) }
        }

    val selector =
      CameraSelector.Builder().requireLensFacing(lensFacing).build()

    try {
      provider.unbindAll()
      provider.bindToLifecycle(this, selector, preview, imageCapture, analysis)
      notifyCameraOpenedToKit()
      if (perfectActive) {
        setGuideMessage("Centra tu cara en el óvalo")
      }
    } catch (e: Exception) {
      Log.e(TAG, "Camera bind failed", e)
      // Si la trasera no está disponible, volver a frontal.
      if (lensFacing == CameraSelector.LENS_FACING_BACK) {
        lensFacing = CameraSelector.LENS_FACING_FRONT
        setGuideMessage("Cámara trasera no disponible")
        bindCameraUseCases()
      } else {
        setGuideMessage("No se pudo abrir la cámara")
      }
    }
  }

  private fun notifyCameraOpenedToKit() {
    val rotation = previewView.display?.rotation ?: 0
    val w = previewView.width.coerceAtLeast(720)
    val h = previewView.height.coerceAtLeast(960)
    val front = lensFacing == CameraSelector.LENS_FACING_FRONT
    cameraExecutor.execute {
      perfectBridge.onCameraOpened(
        isFrontCamera = front,
        cameraOrientation = rotation * 90,
        previewWidth = w,
        previewHeight = h,
      )
    }
  }

  private fun processFrame(image: ImageProxy) {
    try {
      if (!perfectActive) return

      val nv21 = yuv420ToNv21(image)
      val rotation = image.imageInfo.rotationDegrees
      val isFirst = needsFirstFrame.getAndSet(false)

      perfectBridge.sendPreviewFrame(
        nv21 = nv21,
        width = image.width,
        height = image.height,
        rotationDegrees = rotation,
        isFirstFrame = isFirst,
      )
    } catch (e: Exception) {
      Log.w(TAG, "Frame process error", e)
    } finally {
      image.close()
    }
  }

  private fun takePhoto() {
    if (capturing) return
    val capture = imageCapture ?: return
    capturing = true
    cancelCountdown()
    btnCapture.isEnabled = false
    btnSwitchCamera.isEnabled = false
    guideText.visibility = View.VISIBLE
    setGuideMessage("Capturando…")
    countdownText.visibility = View.GONE
    captureLoader.visibility = View.VISIBLE
    captureLoader.start()

    val outFile = File(cacheDir, "youcam_${System.currentTimeMillis()}.jpg")
    val output = ImageCapture.OutputFileOptions.Builder(outFile).build()

    capture.takePicture(
      output,
      ContextCompat.getMainExecutor(this),
      object : ImageCapture.OnImageSavedCallback {
        override fun onImageSaved(outputFileResults: ImageCapture.OutputFileResults) {
          captureLoader.stop()
          captureLoader.visibility = View.GONE
          val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
          BitmapFactory.decodeFile(outFile.absolutePath, bounds)
          val result =
            Intent().apply {
              putExtra(EXTRA_IMAGE_URI, "file://${outFile.absolutePath}")
              putExtra(EXTRA_WIDTH, bounds.outWidth)
              putExtra(EXTRA_HEIGHT, bounds.outHeight)
              putExtra(
                EXTRA_QUALITY_SOURCE,
                if (perfectActive) "perfect_camera_kit" else "guided_camerax",
              )
              putExtra(EXTRA_PERFECT_AVAILABLE, PerfectCameraKitBridge.isSdkPresent())
            }
          setResult(RESULT_OK, result)
          finish()
        }

        override fun onError(exception: ImageCaptureException) {
          Log.e(TAG, "Capture failed", exception)
          capturing = false
          captureLoader.stop()
          captureLoader.visibility = View.GONE
          btnSwitchCamera.isEnabled = true
          setGuideMessage("Error al capturar. Intenta de nuevo.")
          btnCapture.isEnabled = qualityReady || perfectInitFailed
          needsFirstFrame.set(true)
        }
      },
    )
  }

  override fun onDestroy() {
    cancelCountdown()
    captureLoader.stop()
    try {
      toneGenerator?.release()
    } catch (_: Throwable) {
      // ignore
    }
    toneGenerator = null
    perfectBridge.release()
    cameraExecutor.shutdown()
    super.onDestroy()
  }

  companion object {
    private const val TAG = "SkinAnalysisCapture"

    const val EXTRA_IMAGE_URI = "image_uri"
    const val EXTRA_WIDTH = "width"
    const val EXTRA_HEIGHT = "height"
    const val EXTRA_QUALITY_SOURCE = "quality_source"
    const val EXTRA_PERFECT_AVAILABLE = "perfect_available"

    private fun yuv420ToNv21(image: ImageProxy): ByteArray {
      val yBuffer = image.planes[0].buffer
      val uBuffer = image.planes[1].buffer
      val vBuffer = image.planes[2].buffer

      val ySize = yBuffer.remaining()
      val uSize = uBuffer.remaining()
      val vSize = vBuffer.remaining()

      val nv21 = ByteArray(ySize + uSize + vSize)
      yBuffer.get(nv21, 0, ySize)
      vBuffer.get(nv21, ySize, vSize)
      uBuffer.get(nv21, ySize + vSize, uSize)
      return nv21
    }
  }
}
