package com.lysy.app

import android.content.Context

/**
 * Shared-preferences-backed snapshot of the stats the web app last pushed through WidgetBridge.
 * Read by StatsWidgetProvider to render the home-screen widget.
 */
data class WidgetStats(
    val hasActiveTrip: Boolean,
    val tripName: String,
    val tripDurationLabel: String,
    val findingsCount: Int,
    val speciesCount: Int,
    // Ostatnia znana etykieta prognozy grzybowej (np. "Dobry czas na grzyby") - patrz
    // readCachedMushroomOutlookLabel w src/hooks/useMushroomOutlook.ts. Pusty string = brak
    // (jeszcze nic nie pobrano, albo zawsze offline) - StatsWidgetProvider pomija wtedy tę linię.
    val mushroomOutlookLabel: String,
) {
    companion object {
        const val PREFS_NAME = "lysy_widget_stats"
        const val KEY_HAS_ACTIVE_TRIP = "hasActiveTrip"
        const val KEY_TRIP_NAME = "tripName"
        const val KEY_TRIP_DURATION = "tripDurationLabel"
        const val KEY_FINDINGS_COUNT = "findingsCount"
        const val KEY_SPECIES_COUNT = "speciesCount"
        const val KEY_MUSHROOM_OUTLOOK_LABEL = "mushroomOutlookLabel"

        fun read(context: Context): WidgetStats {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return WidgetStats(
                hasActiveTrip = prefs.getBoolean(KEY_HAS_ACTIVE_TRIP, false),
                tripName = prefs.getString(KEY_TRIP_NAME, "") ?: "",
                tripDurationLabel = prefs.getString(KEY_TRIP_DURATION, "") ?: "",
                findingsCount = prefs.getInt(KEY_FINDINGS_COUNT, 0),
                speciesCount = prefs.getInt(KEY_SPECIES_COUNT, 0),
                mushroomOutlookLabel = prefs.getString(KEY_MUSHROOM_OUTLOOK_LABEL, "") ?: "",
            )
        }
    }
}
