package com.piel360.app.skinanalysis

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.util.AttributeSet
import android.view.View
import android.view.animation.LinearInterpolator

/**
 * Loader circular pulsante mostrado durante la captura.
 */
class CapturePulseLoaderView
@JvmOverloads
constructor(
  context: Context,
  attrs: AttributeSet? = null,
  defStyleAttr: Int = 0,
) : View(context, attrs, defStyleAttr) {

  private val ringPaint =
    Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.STROKE
      strokeWidth = 6f * resources.displayMetrics.density
      color = 0xFFFFFFFF.toInt()
    }

  private val fillPaint =
    Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.FILL
      color = 0x66FFFFFF
    }

  private var pulse = 0f
  private var animator: ValueAnimator? = null

  fun start() {
    if (animator?.isRunning == true) return
    animator =
      ValueAnimator.ofFloat(0f, 1f).apply {
        duration = 900L
        repeatCount = ValueAnimator.INFINITE
        interpolator = LinearInterpolator()
        addUpdateListener {
          pulse = it.animatedValue as Float
          invalidate()
        }
        start()
      }
  }

  fun stop() {
    animator?.cancel()
    animator = null
    pulse = 0f
    invalidate()
  }

  override fun onDetachedFromWindow() {
    stop()
    super.onDetachedFromWindow()
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    val cx = width / 2f
    val cy = height / 2f
    val maxR = minOf(cx, cy) * 0.85f
    val r = maxR * (0.55f + 0.45f * pulse)
    ringPaint.alpha = ((1f - pulse) * 220).toInt().coerceIn(40, 220)
    fillPaint.alpha = ((1f - pulse) * 90).toInt().coerceIn(0, 90)
    canvas.drawCircle(cx, cy, r, fillPaint)
    canvas.drawCircle(cx, cy, r, ringPaint)
    ringPaint.alpha = 255
    canvas.drawCircle(cx, cy, maxR * 0.42f, ringPaint)
  }
}
