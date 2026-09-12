# WidgetBridge methods are called from JavaScript via addJavascriptInterface reflection -
# must survive minification/shrinking or the WebView -> widget bridge silently breaks.
-keepclassmembers class com.lysy.app.WidgetBridge {
    public *;
}
