package com.airis.mobile

import android.content.pm.ActivityInfo
import android.os.Build
import android.view.WindowManager
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

class AirisOrientationModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AirisOrientation"

    companion object {
        fun resetUnityFoldingFeatures() {
            try {
                val clazz = Class.forName("com.unity3d.player.UnityFoldingFeaturesWrapper")
                val field = clazz.getDeclaredField("s_UnityFoldingFeaturesWrapper")
                field.isAccessible = true
                field.set(null, null)
                android.util.Log.i("AirisOrientation", "Reset s_UnityFoldingFeaturesWrapper successfully")
            } catch (e: Throwable) {
                android.util.Log.w("AirisOrientation", "Could not reset s_UnityFoldingFeaturesWrapper: ${e.message}")
            }
        }
    }

    @ReactMethod
    fun lockLandscape() {
        resetUnityFoldingFeatures()
        UiThreadUtil.runOnUiThread {
            MainActivity.isLandscapeLocked = true
            val activity = reactApplicationContext.currentActivity ?: return@runOnUiThread

            // 1. Request Landscape Orientation
            activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE

            // 2. Configure Window for Fullscreen across Display Cutout
            val window = activity.window
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val lp = window.attributes
                lp.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
                window.attributes = lp
            }

            window.clearFlags(WindowManager.LayoutParams.FLAG_FORCE_NOT_FULLSCREEN)
            window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)

            // 3. Hide System Navigation and Status Bars (Immersive Sticky)
            val insetsController = WindowCompat.getInsetsController(window, window.decorView)
            insetsController.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            insetsController.hide(WindowInsetsCompat.Type.systemBars())
        }
    }

    @ReactMethod
    fun lockPortrait() {
        resetUnityFoldingFeatures()
        UiThreadUtil.runOnUiThread {
            MainActivity.isLandscapeLocked = false
            val activity = reactApplicationContext.currentActivity ?: return@runOnUiThread

            // 1. Restore Portrait Orientation
            activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT

            // 2. Restore Default Window Cutout and Flags
            val window = activity.window
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val lp = window.attributes
                lp.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT
                window.attributes = lp
            }

            window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)

            // 3. Restore System Navigation and Status Bars
            val insetsController = WindowCompat.getInsetsController(window, window.decorView)
            insetsController.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_DEFAULT
            insetsController.show(WindowInsetsCompat.Type.systemBars())

            // 4. Delayed enforcements to ensure Unity teardown does not revert orientation
            val handler = android.os.Handler(android.os.Looper.getMainLooper())
            val retryAction = Runnable {
                try {
                    val act = reactApplicationContext.currentActivity
                    if (act != null && !MainActivity.isLandscapeLocked) {
                        act.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                    }
                } catch (_: Throwable) {}
            }
            handler.postDelayed(retryAction, 150)
            handler.postDelayed(retryAction, 350)
            handler.postDelayed(retryAction, 700)
        }
    }
}
