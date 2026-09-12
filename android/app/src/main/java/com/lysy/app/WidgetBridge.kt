package com.lysy.app

import android.content.Context
import android.webkit.JavascriptInterface
import org.json.JSONObject

/**
 * Exposed to the WebView as `window.AndroidWidget` - see src/utils/androidWidgetBridge.ts.
 * The web app calls `AndroidWidget.updateStats(json)` whenever the active trip or its findings
 * change; this persists the snapshot and asks the widget provider to redraw.
 */
class WidgetBridge(private val context: Context) {

    @JavascriptInterface
    fun updateStats(statsJson: String) {
        try {
            val json = JSONObject(statsJson)
            context.getSharedPreferences(WidgetStats.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(WidgetStats.KEY_HAS_ACTIVE_TRIP, json.optBoolean("hasActiveTrip", false))
                .putString(WidgetStats.KEY_TRIP_NAME, json.optString("tripName", ""))
                .putString(WidgetStats.KEY_TRIP_DURATION, json.optString("tripDurationLabel", ""))
                .putInt(WidgetStats.KEY_FINDINGS_COUNT, json.optInt("findingsCount", 0))
                .putInt(WidgetStats.KEY_SPECIES_COUNT, json.optInt("speciesCount", 0))
                .apply()

            StatsWidgetProvider.updateAllWidgets(context)
        } catch (_: org.json.JSONException) {
            // Nieprawidłowy JSON z web appki nie powinien wysadzać WebView ani widgetu -
            // po prostu ignorujemy tę aktualizację, widget zachowuje poprzedni stan.
        }
    }
}
