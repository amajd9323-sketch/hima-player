package com.hima.player;

import android.Manifest;
import android.content.ContentUris;
import android.content.ContentValues;
import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.media.MediaScannerConnection;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.content.Intent;
import android.app.PictureInPictureParams;
import android.app.DownloadManager;
import android.os.Environment;
import android.util.Rational;
import android.view.WindowManager;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
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
    @Permission(alias = "storage", strings = { Manifest.permission.READ_EXTERNAL_STORAGE }),
    @Permission(alias = "writeStorage", strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE })
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
    public void downloadMedia(PluginCall call) {
        String raw = call.getString("url");
        String requestedName = call.getString("title", "HEMA_media");
        if (raw == null || raw.trim().isEmpty()) {
            call.reject("أدخل رابط ملف مباشر.");
            return;
        }
        try {
            Uri uri = Uri.parse(raw.trim());
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || !scheme.equalsIgnoreCase("https") || host == null) {
                call.reject("استخدم رابط HTTPS مباشر لملف وسائط.");
                return;
            }
            String h = host.toLowerCase(Locale.US);
            if (h.equals("youtube.com") || h.endsWith(".youtube.com") || h.equals("youtu.be") ||
                h.equals("youtube-nocookie.com") || h.endsWith(".youtube-nocookie.com") ||
                h.equals("tiktok.com") || h.endsWith(".tiktok.com")) {
                call.reject("رابط صفحة YouTube/TikTok ليس ملف تنزيل مباشر. استخدم خيار التنزيل الرسمي أو رابط ملف تملكه.");
                return;
            }
            String name = requestedName == null ? "HEMA_media" : requestedName.trim();
            name = name.replaceAll("[^A-Za-z0-9._-]", "_");
            if (name.isEmpty()) name = "HEMA_media";
            if (!name.matches("(?i).*\\.(mp4|webm|m4v|mov|mkv|mp3|m4a|aac|wav|ogg|flac|opus)$")) name += ".mp4";
            DownloadManager dm = (DownloadManager) getContext().getSystemService(android.content.Context.DOWNLOAD_SERVICE);
            if (dm == null) {
                call.reject("DOWNLOAD_SERVICE_UNAVAILABLE");
                return;
            }
            DownloadManager.Request req = new DownloadManager.Request(uri);
            req.setTitle(name);
            req.setDescription("HEMA ROKSI PLAYER · Downloads");
            req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            req.setAllowedOverMetered(true);
            req.setAllowedOverRoaming(false);
            req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
            long id = dm.enqueue(req);
            JSObject out = new JSObject();
            out.put("downloadId", id);
            out.put("fileName", name);
            call.resolve(out);
        } catch (Exception e) {
            call.reject("تعذر بدء التنزيل. تأكد أن الرابط مباشر ومتاح.", e);
        }
    }


    @PluginMethod
    public void extractAudio(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q &&
            getPermissionState("writeStorage") != PermissionState.GRANTED) {
            requestPermissionForAlias("writeStorage", call, "extractAudioPermCb");
            return;
        }
        doExtractAudio(call);
    }

    @PermissionCallback
    private void extractAudioPermCb(PluginCall call) {
        if (getPermissionState("writeStorage") != PermissionState.GRANTED) {
            call.reject("PERMISSION_DENIED");
            return;
        }
        doExtractAudio(call);
    }

    private void doExtractAudio(PluginCall call) {
        String raw = call.getString("uri");
        String requested = call.getString("title", "HEMA_Audio");
        if (raw == null || !raw.startsWith("content://")) {
            call.reject("VIDEO_URI_REQUIRED");
            return;
        }
        String safeTitle = requested == null ? "HEMA_Audio" : requested.trim();
        safeTitle = safeTitle.replaceAll("[\\\\/:*?\"<>|]", "_");
        safeTitle = safeTitle.replaceAll("\\s+", " ");
        if (safeTitle.isEmpty()) safeTitle = "HEMA_Audio";
        if (safeTitle.length() > 90) safeTitle = safeTitle.substring(0, 90);

        final String fileTitle = safeTitle;
        new Thread(() -> {
            MediaExtractor extractor = null;
            MediaMuxer muxer = null;
            File temp = new File(getContext().getCacheDir(), "hema-audio-" + System.currentTimeMillis() + ".m4a");
            Uri savedUri = null;
            try {
                extractor = new MediaExtractor();
                extractor.setDataSource(getContext(), Uri.parse(raw), null);
                int audioTrack = -1;
                MediaFormat audioFormat = null;
                for (int t = 0; t < extractor.getTrackCount(); t++) {
                    MediaFormat format = extractor.getTrackFormat(t);
                    String mime = format.getString(MediaFormat.KEY_MIME);
                    if (mime != null && mime.startsWith("audio/")) {
                        audioTrack = t;
                        audioFormat = format;
                        break;
                    }
                }
                if (audioTrack < 0 || audioFormat == null) {
                    call.reject("VIDEO_HAS_NO_AUDIO_TRACK");
                    return;
                }

                extractor.selectTrack(audioTrack);
                muxer = new MediaMuxer(temp.getAbsolutePath(), MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
                int outputTrack = muxer.addTrack(audioFormat);
                muxer.start();
                ByteBuffer buffer = ByteBuffer.allocate(1024 * 1024);
                MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
                while (true) {
                    buffer.clear();
                    int size = extractor.readSampleData(buffer, 0);
                    if (size < 0) break;
                    long sampleTime = extractor.getSampleTime();
                    if (sampleTime < 0) break;
                    info.offset = 0;
                    info.size = size;
                    info.presentationTimeUs = sampleTime;
                    info.flags = (extractor.getSampleFlags() & MediaExtractor.SAMPLE_FLAG_SYNC) != 0
                        ? MediaCodec.BUFFER_FLAG_KEY_FRAME : 0;
                    muxer.writeSampleData(outputTrack, buffer, info);
                    if (!extractor.advance()) break;
                }
                muxer.stop();
                muxer.release();
                muxer = null;
                extractor.release();
                extractor = null;
                if (!temp.exists() || temp.length() < 128) throw new IOException("NO_AUDIO_DATA");

                String fileName = fileTitle + ".m4a";
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, "audio/mp4");
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_MUSIC + "/HEMA ROKSI");
                    values.put(MediaStore.Audio.Media.IS_MUSIC, 1);
                    values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                    savedUri = getContext().getContentResolver().insert(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, values);
                    if (savedUri == null) throw new IOException("MEDIASTORE_INSERT_FAILED");
                    OutputStream stream = getContext().getContentResolver().openOutputStream(savedUri, "w");
                    if (stream == null) throw new IOException("MEDIASTORE_OUTPUT_FAILED");
                    try (InputStream input = new FileInputStream(temp); OutputStream output = stream) {
                        byte[] chunk = new byte[64 * 1024];
                        int count;
                        while ((count = input.read(chunk)) != -1) if (count > 0) output.write(chunk, 0, count);
                    }
                    ContentValues publish = new ContentValues();
                    publish.put(MediaStore.MediaColumns.IS_PENDING, 0);
                    getContext().getContentResolver().update(savedUri, publish, null, null);
                } else {
                    File musicDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MUSIC), "HEMA ROKSI");
                    if (!musicDir.exists() && !musicDir.mkdirs()) throw new IOException("MUSIC_FOLDER_FAILED");
                    File outFile = new File(musicDir, fileName);
                    try (InputStream input = new FileInputStream(temp); OutputStream output = new FileOutputStream(outFile)) {
                        byte[] chunk = new byte[64 * 1024];
                        int count;
                        while ((count = input.read(chunk)) != -1) if (count > 0) output.write(chunk, 0, count);
                    }
                    savedUri = Uri.fromFile(outFile);
                    MediaScannerConnection.scanFile(getContext(), new String[] { outFile.getAbsolutePath() }, new String[] { "audio/mp4" }, null);
                }
                JSObject out = new JSObject();
                out.put("fileName", fileName);
                out.put("uri", savedUri == null ? "" : savedUri.toString());
                call.resolve(out);
            } catch (Exception e) {
                if (savedUri != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    try { getContext().getContentResolver().delete(savedUri, null, null); } catch (Exception ignored) { }
                }
                call.reject("تعذر استخراج الصوت. قد تكون صيغة الصوت داخل الفيديو غير مدعومة.", e);
            } finally {
                if (muxer != null) { try { muxer.stop(); } catch (Exception ignored) { } try { muxer.release(); } catch (Exception ignored) { } }
                if (extractor != null) { try { extractor.release(); } catch (Exception ignored) { } }
                if (temp.exists()) temp.delete();
            }
        }, "HemaAudioExtractor").start();
    }

    @PluginMethod
    public void scan(PluginCall call) {
        boolean ok = true;
        for (String a : aliases()) if (getPermissionState(a) != PermissionState.GRANTED) ok = false;
        int offset = Math.max(0, call.getInt("offset", 0));
    int limit = Math.max(1, Math.min(100, call.getInt("limit", 80)));
    if (ok) doScan(call, offset, limit); else requestPermissionForAliases(aliases(), call, "permCb");
    }

    @PermissionCallback
    private void permCb(PluginCall call) {
        for (String a : aliases()) {
            if (getPermissionState(a) != PermissionState.GRANTED) { call.reject("PERMISSION_DENIED"); return; }
        }
        int offset = Math.max(0, call.getInt("offset", 0));
        int limit = Math.max(1, Math.min(100, call.getInt("limit", 80)));
        doScan(call, offset, limit);
    }

    private void doScan(PluginCall call, int offset, int limit) {
        JSArray out = new JSArray();
        query(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, false, out, offset, limit);
        query(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, true, out, offset, limit);
        JSObject r = new JSObject();
        r.put("items", out);
        call.resolve(r);
    }

    private void query(Uri base, boolean video, JSArray out, int offset, int limit) {
        String[] proj = video
            ? new String[] { MediaStore.MediaColumns._ID, MediaStore.MediaColumns.DISPLAY_NAME, MediaStore.Video.Media.DURATION, MediaStore.MediaColumns.SIZE, MediaStore.Video.Media.HEIGHT, MediaStore.Video.Media.WIDTH, MediaStore.MediaColumns.DATA }
            : new String[] { MediaStore.MediaColumns._ID, MediaStore.MediaColumns.DISPLAY_NAME, MediaStore.Audio.Media.DURATION, MediaStore.MediaColumns.SIZE, MediaStore.Audio.Media.ARTIST, MediaStore.MediaColumns.DATA };
        String sel = video ? null : MediaStore.Audio.Media.IS_MUSIC + " != 0";
        Cursor result;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Ask MediaStore for one bounded page instead of transferring the whole phone library to WebView.
            android.os.Bundle args = new android.os.Bundle();
            args.putString(android.content.ContentResolver.QUERY_ARG_SQL_SORT_ORDER, MediaStore.MediaColumns.DATE_ADDED + " DESC");
            args.putInt(android.content.ContentResolver.QUERY_ARG_LIMIT, limit);
            args.putInt(android.content.ContentResolver.QUERY_ARG_OFFSET, offset);
            if (sel != null) args.putString(android.content.ContentResolver.QUERY_ARG_SQL_SELECTION, sel);
            result = getContext().getContentResolver().query(base, proj, args, null);
        } else {
            result = getContext().getContentResolver().query(base, proj, sel, null, MediaStore.MediaColumns.DATE_ADDED + " DESC");
        }
        try (Cursor c = result) {
            if (c == null) return;
            int skipped = 0;
            int added = 0;
            while (c.moveToNext()) {
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O && skipped++ < offset) continue;
                if (added >= limit) break;
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
                added++;
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
