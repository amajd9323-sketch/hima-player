package com.hima.player;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class HemaWidgetProvider extends AppWidgetProvider {
    public static final String ACTION_COMMAND = "com.hima.player.WIDGET_COMMAND";
    public static final String ACTION_UPDATE = "com.hima.player.WIDGET_UPDATE";
    private static final String PREFS = "hema-widget";

    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName name = new ComponentName(context, HemaWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(name);
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String title = prefs.getString("title", "HEMA ROKSI PLAYER");
        String artist = prefs.getString("artist", "مكتبة الموسيقى والفيديو");
        boolean playing = prefs.getBoolean("playing", false);
        for (int id : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), com.hima.player.R.layout.hema_widget);
            views.setTextViewText(R.id.widget_title, title == null || title.isEmpty() ? "HEMA ROKSI PLAYER" : title);
            views.setTextViewText(R.id.widget_artist, artist == null || artist.isEmpty() ? "Hema" : artist);
            views.setTextViewText(R.id.widget_play, playing ? "Ⅱ" : "▶");
            views.setOnClickPendingIntent(R.id.widget_prev, command(context, "prev", id * 10 + 1));
            views.setOnClickPendingIntent(R.id.widget_play, command(context, "toggle", id * 10 + 2));
            views.setOnClickPendingIntent(R.id.widget_next, command(context, "next", id * 10 + 3));
            Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (launch != null) {
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                views.setOnClickPendingIntent(R.id.widget_open, PendingIntent.getActivity(context, id * 10 + 4, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            }
            manager.updateAppWidget(id, views);
        }
    }

    private static PendingIntent command(Context context, String value, int requestCode) {
        Intent intent = new Intent(context, HemaWidgetProvider.class);
        intent.setAction(ACTION_COMMAND);
        intent.setPackage(context.getPackageName());
        intent.putExtra("command", value);
        return PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        updateAll(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent != null && ACTION_COMMAND.equals(intent.getAction())) {
            String command = intent.getStringExtra("command");
            if ("toggle".equals(command) || "next".equals(command) || "prev".equals(command)) {
                context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                    .putString("command", command)
                    .putLong("command_at", System.currentTimeMillis())
                    .apply();
                Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
                if (launch != null) {
                    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    try { context.startActivity(launch); } catch (Exception ignored) { }
                }
            }
            return;
        }
        if (intent != null && ACTION_UPDATE.equals(intent.getAction())) {
            updateAll(context);
            return;
        }
        super.onReceive(context, intent);
    }
}
