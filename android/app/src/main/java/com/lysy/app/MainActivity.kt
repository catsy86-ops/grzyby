package com.lysy.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.GeolocationPermissions
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.webkit.ServiceWorkerClientCompat
import androidx.webkit.ServiceWorkerControllerCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewAssetLoader.AssetsPathHandler
import androidx.webkit.WebViewFeature

/**
 * Hosts the built PWA (bundled directly under assets/, copied from `npm run build`'s dist/
 * output - see android/README.md) inside a plain WebView rather than a Trusted Web Activity. A TWA
 * (Custom Tabs) cannot expose addJavascriptInterface, and the home-screen widget needs a way for
 * the web app to push its stats to native code - see WidgetBridge.
 *
 * Content is served from https://appassets.androidplatform.net (via WebViewAssetLoader) instead
 * of a bare file:// URL: file:// pages get an opaque origin in WebView, which breaks IndexedDB
 * (Dexie) and disallows Service Worker registration - both required by the app.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var pendingGeolocationOrigin: String? = null
    private var pendingGeolocationCallback: GeolocationPermissions.Callback? = null

    private val requestLocationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            val origin = pendingGeolocationOrigin
            val callback = pendingGeolocationCallback
            pendingGeolocationOrigin = null
            pendingGeolocationCallback = null
            if (origin != null && callback != null) {
                callback.invoke(origin, granted, false)
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Prefix "/" (nie "/assets/") - index.html generowany przez Vite odwołuje się do
        // zasobów ścieżkami bezwzględnymi względem roota ("/assets/index-xxx.js"), więc strona
        // musi być serwowana z roota wirtualnej domeny, inaczej te żądania trafiają obok.
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/", AssetsPathHandler(this))
            .build()

        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            setGeolocationEnabled(true)
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest,
            ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)
        }

        // Zapytania Service Workera (rejestracja sw.js, jego fetch/cache) idą osobnym torem niż
        // główna ramka - WebViewClient.shouldInterceptRequest ich nie widzi. Bez tego rejestracja
        // Service Workera kończy się cichym błędem "unknown error occurred when fetching the script".
        if (WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_BASIC_USAGE)) {
            ServiceWorkerControllerCompat.getInstance().setServiceWorkerClient(
                object : ServiceWorkerClientCompat() {
                    override fun shouldInterceptRequest(request: WebResourceRequest): WebResourceResponse? =
                        assetLoader.shouldInterceptRequest(request.url)
                },
            )
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String,
                callback: GeolocationPermissions.Callback,
            ) {
                val hasPermission = ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.ACCESS_FINE_LOCATION,
                ) == PackageManager.PERMISSION_GRANTED

                if (hasPermission) {
                    callback.invoke(origin, true, false)
                } else {
                    pendingGeolocationOrigin = origin
                    pendingGeolocationCallback = callback
                    requestLocationPermission.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                }
            }
        }

        webView.addJavascriptInterface(WidgetBridge(this), "AndroidWidget")
        webView.loadUrl("https://appassets.androidplatform.net/index.html")
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
