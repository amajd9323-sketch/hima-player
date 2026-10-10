package com.hima.player;

import android.Manifest;
import android.content.ContentUris;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.content.Intent;
import android.app.PictureInPictureParams;
import android.util.Rational;
import android.view.WindowManager;
import java.io.File;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import android.provider.MediaStore;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(name = "MediaScan", permissions = {
    @Permission(alias = "audio", strings = { Manifest.permission.READ_MEDIA_AUDIO }),
    @Permission(alias = "video", strings = { Manifest.permission.READ_MEDIA_VIDEO }),
    @Permission(alias = "storage", strings = { Manifest.permission.READ_EXTERNAL_STORAGE })
})
public class MediaScanPlugin extends Plugin {

    private static volatile String pendingSharedUrl = "";

    private static boolean isAllowedMediaUrl(String raw) {
        try {
            Uri uri = Uri.parse(raw);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || host == null ||
                !(scheme.equalsIgnoreCase("https") || scheme.equalsIgnoreCase("http"))) return false;
            host = host.toLowerCase(Locale.US);
            return host.equals("youtu.be") || host.equals("youtube.com") || host.endsWith(".youtube.com") ||
                host.equals("youtube-nocookie.com") || host.endsWith(".youtube-nocookie.com") ||
                host.equals("tiktok.com") || host.endsWith(".tiktok.com");
        } catch (Exception ignored) { return false; }
    }

    private static boolean isTikTokHost(String host) {
        if (host == null) return false;
        String h = host.toLowerCase(Locale.US);
        return h.equals("tiktok.com") || h.endsWith(".tiktok.com");
    }

    public static void captureSharedIntent(Intent intent) {
        if (intent == null) return;
        String raw = intent.getDataString();
        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            String shared = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (shared != null && !shared.trim().isEmpty()) raw = shared;
        }
        if (raw == null) return;
        Matcher matcher = Pattern.compile("https?://[^\\s<>\\\"']+", Pattern.CASE_INSENSITIVE).matcher(raw);
        if (!matcher.find()) return;
        String candidate = matcher.group().replaceFirst("[)\\]}>.,!?;:]+$", "");
        if (isAllowedMediaUrl(candidate)) pendingSharedUrl = candidate;
    }

    private static String followTikTokRedirects(String start) {
        String current = start;
        for (int hop = 0; hop < 5; hop++) {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(current);
                if (!isAllowedMediaUrl(current) || !isTikTokHost(Uri.parse(current).getHost())) return current;
                connection = (HttpURLConnection) url.openConnection();
                connection.setInstanceFollowRedirects(false);
                connection.setConnectTimeout(2500);
                connection.setReadTimeout(2500);
                connection.setRequestMethod("GET");
                connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36");
                int status = connection.getResponseCode();
                if (status >= 300 && status < 400) {
                    String location = connection.getHeaderField("Location");
                    if (location == null || location.trim().isEmpty()) return current;
                    String next = new URL(url, location).toString();
                    if (!isAllowedMediaUrl(next) || !isTikTokHost(Uri.parse(next).getHost())) return current;
                    current = next;
                    continue;
                }
                return current;
            } catch (Exception ignored) {
                return current;
            } finally {
                if (connection != null) connection.disconnect();
            }
        }
        return current;
    }
    private String[] aliases() {
        return Build.VERSION.SDK_INT >= 33 ? new String[] { "audio", "video" } : new String[] { "storage" };
    }

    @PluginMethod
    public void scan(PluginCall call) {
        boolean ok = true;
        for (String a : aliases()) if (getPermissionState(a) != PermissionState.GRANTED) ok = false;
        if (ok) doScan(call); else requestPermissionForAliases(aliases(), call, "permCb");
    }

    @PermissionCallback
    private void permCb(PluginCall call) {
        for (String a : aliases()) {
            if (getPermissionState(a) != PermissionState.GRANTED) { call.reject("PERMISSION_DENIED"); return; }
        }
        doScan(call);
    }

    private void doScan(PluginCall call) {
        JSArray out = new JSArray();
        query(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, false, out);
        query(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, true, out);
        JSObject r = new JSObject();
        r.put("items", out);
        call.resolve(r);
    }

    private void query(Uri base, boolean video, JSArray out) {
        String[] proj = video
            ? new String[] { MediaStore.MediaColumns._ID, MediaStore.MediaColumns.DISPLAY_NAME, MediaStore.Video.Media.DURATION, MediaStore.MediaColumns.SIZE, MediaStore.Video.Media.HEIGHT, MediaStore.Video.Media.WIDTH, MediaStore.MediaColumns.DATA }
            : new String[] { MediaStore.MediaColumns._ID, MediaStore.MediaColumns.DISPLAY_NAME, MediaStore.Audio.Media.DURATION, MediaStore.MediaColumns.SIZE, MediaStore.Audio.Media.ARTIST, MediaStore.MediaColumns.DATA };
        String sel = video ? null : MediaStore.Audio.Media.IS_MUSIC + " != 0";
        try (Cursor c = getContext().getContentResolver().query(base, proj, sel, null, MediaStore.MediaColumns.DATE_ADDED + " DESC")) {
            if (c == null) return;
            while (c.moveToNext()) {
                long id = c.getLong(0);
                String name = c.getString(1);
                if (name == null) name = "";
                int dot = name.lastIndexOf('.');
                if (dot > 0) name = name.substring(0, dot);
                JSObject o = new JSObject();
                o.put("id", String.valueOf(id));
                o.put("title", name);
                o.put("uri", ContentUris.withAppendedId(base, id).toString());
                o.put("video", video);
                o.put("duration", c.getLong(2));
                o.put("size", c.getLong(3));
                if (video) {
                    o.put("height", Math.min(c.getInt(4), c.getInt(5)));
                } else {
                    String artist = c.getString(4);
                    o.put("height", 0);
                    o.put("artist", artist);
                }
                String data = c.getString(video ? 6 : 5);
                if (data != null) { File par = new File(data).getParentFile(); if (par != null) o.put("folder", par.getName()); }
                out.put(o);
            }
        } catch (Exception ignored) { }
    }

    @PluginMethod
    public void keepAlive(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        Intent i = new Intent(getContext(), PlaybackService.class);
        i.putExtra("title", call.getString("title", "Hema"));
        try {
            if (on) { if (Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(i); else getContext().startService(i); }
            else getContext().stopService(i);
        } catch (Exception ignored) { }
        call.resolve();
    }

    @PluginMethod
    public void updateWidget(PluginCall call) {
        String title = call.getString("title", "HEMA ROKSI PLAYER");
        String artist = call.getString("artist", "Hema");
        boolean playing = Boolean.TRUE.equals(call.getBoolean("playing", false));
        getContext().getSharedPreferences("hema-widget", android.content.Context.MODE_PRIVATE).edit()
            .putString("title", title == null ? "HEMA ROKSI PLAYER" : title)
            .putString("artist", artist == null ? "Hema" : artist)
            .putBoolean("playing", playing)
            .apply();
        Intent update = new Intent(HemaWidgetProvider.ACTION_UPDATE);
        update.setPackage(getContext().getPackageName());
        getContext().sendBroadcast(update);
        call.resolve();
    }

    @PluginMethod
    public void consumeWidgetCommand(PluginCall call) {
        android.content.SharedPreferences prefs = getContext().getSharedPreferences("hema-widget", android.content.Context.MODE_PRIVATE);
        String command = prefs.getString("command", "");
        long commandAt = prefs.getLong("command_at", 0L);
        prefs.edit().remove("command").remove("command_at").apply();
        if (System.currentTimeMillis() - commandAt > 60000L) command = "";
        JSObject out = new JSObject();
        out.put("command", command);
        call.resolve(out);
    }

    @PluginMethod
    public void requestPip(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.reject("PIP_UNSUPPORTED");
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                PictureInPictureParams params = new PictureInPictureParams.Builder()
                    .setAspectRatio(new Rational(16, 9))
                    .build();
                boolean entered = getActivity().enterPictureInPictureMode(params);
                if (entered) call.resolve(); else call.reject("PIP_NOT_ENTERED");
            } catch (Exception e) {
                call.reject("PIP_FAILED");
            }
        });
    }


    @PluginMethod
    public void consumeSharedUrl(PluginCall call) {
        String url = pendingSharedUrl;
        pendingSharedUrl = "";
        JSObject out = new JSObject();
        out.put("url", url);
        call.resolve(out);
    }

    @PluginMethod
    public void resolveTikTokUrl(PluginCall call) {
        String raw = call.getString("url", "");
        if (!isAllowedMediaUrl(raw) || !isTikTokHost(Uri.parse(raw).getHost())) {
            call.reject("TIKTOK_URL_REQUIRED");
            return;
        }
        new Thread(() -> {
            String resolved = followTikTokRedirects(raw);
            JSObject out = new JSObject();
            out.put("url", resolved);
            call.resolve(out);
        }, "HemaTikTokUrlResolver").start();
    }

    @PluginMethod
    public void brightness(PluginCall call) {
        final float v = call.getFloat("value", -1f);
        getActivity().runOnUiThread(() -> {
            WindowManager.LayoutParams p = getActivity().getWindow().getAttributes();
            p.screenBrightness = v;
            getActivity().getWindow().setAttributes(p);
        });
        call.resolve();
    }
}
