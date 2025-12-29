package io.diabetactic.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import io.diabetactic.app.MainActivity
import io.diabetactic.app.R
import org.json.JSONObject

class GlucoseWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val prefs = context.getSharedPreferences("CapacitorStorage.group.io.diabetactic.app", Context.MODE_PRIVATE)
        val widgetDataString = prefs.getString("widgetData", null)

        val views = RemoteViews(context.packageName, R.layout.glucose_widget)

        if (widgetDataString != null) {
            val widgetData = JSONObject(widgetDataString)
            views.setTextViewText(R.id.glucose_value, widgetData.getString("glucoseValue"))
            views.setTextViewText(R.id.last_updated, widgetData.getString("lastUpdated"))
            views.setTextViewText(R.id.trend_arrow, widgetData.getString("trendArrow"))
            views.setProgressBar(R.id.time_in_range_bar, 100, widgetData.getInt("timeInRange"), false)

            val status = widgetData.getString("status")
            val color = when (status) {
                "low" -> R.color.glucose_low
                "high" -> R.color.glucose_high
                "critical-low" -> R.color.glucose_critical_low
                "critical-high" -> R.color.glucose_critical_high
                else -> R.color.glucose_normal
            }
            views.setTextColor(R.id.glucose_value, ContextCompat.getColor(context, color))
        } else {
            views.setTextViewText(R.id.glucose_value, "N/A")
            views.setTextViewText(R.id.last_updated, "No data")
            views.setTextViewText(R.id.trend_arrow, "")
            views.setProgressBar(R.id.time_in_range_bar, 100, 0, false)
        }

        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
