package com.lysy.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class StatsWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val stats = WidgetStats.read(context)
        for (id in appWidgetIds) {
            appWidgetManager.updateAppWidget(id, buildRemoteViews(context, stats))
        }
    }

    companion object {
        fun updateAllWidgets(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(android.content.ComponentName(context, StatsWidgetProvider::class.java))
            if (ids.isEmpty()) return
            val stats = WidgetStats.read(context)
            for (id in ids) {
                manager.updateAppWidget(id, buildRemoteViews(context, stats))
            }
        }

        private fun buildRemoteViews(context: Context, stats: WidgetStats): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_stats)

            if (stats.hasActiveTrip) {
                views.setTextViewText(R.id.widget_title, "🥾 ${stats.tripName}")
                val parts = listOfNotNull(
                    stats.tripDurationLabel.takeIf { it.isNotEmpty() },
                    "${stats.findingsCount} znalezisk",
                    "${stats.speciesCount} gatunków",
                )
                views.setTextViewText(R.id.widget_subtitle, parts.joinToString(" · "))
            } else {
                views.setTextViewText(R.id.widget_title, context.getString(R.string.widget_idle_title))
                views.setTextViewText(R.id.widget_subtitle, context.getString(R.string.widget_idle_subtitle))
            }

            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                ?: Intent(context, MainActivity::class.java)
            launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

            return views
        }
    }
}
