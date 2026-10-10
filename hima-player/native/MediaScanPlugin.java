package com.hima.player;

import android.Manifest;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.graphics.Bitmap;
import android.net.wifi.WifiManager;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.util.Base64;
import android.util.Size;
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
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.DatagramPacket;
import java.net.MulticastSocket;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.net.InetSocketAddress;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;
import org.w3c.dom.Element;
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
    private static final Map<String, CastDevice> castDevices = new ConcurrentHashMap<>();
    private static volatile ServerSocket castServer;
    private static volatile Uri castSource;
    private static volatile String castToken = "";
    private static volatile String castMime = "video/mp4";
    private static volatile Context castContext;
    private static final class CastDevice {
        final String id;
        final String name;
        final String controlUrl;
        CastDevice(String id, String name, String controlUrl) { this.id = id; this.name = name; this.controlUrl = controlUrl; }
    }

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
        final long startUs = Math.max(0, call.getInt("startMs", 0)) * 1000L;
        final long requestedEndUs = Math.max(0, call.getInt("endMs", 0)) * 1000L;
        final long endUs = requestedEndUs > startUs ? requestedEndUs : Long.MAX_VALUE;
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
                if (startUs > 0) extractor.seekTo(startUs, MediaExtractor.SEEK_TO_PREVIOUS_SYNC);
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
                    if (sampleTime < 0 || sampleTime >= endUs) break;
                    if (sampleTime < startUs) { if (!extractor.advance()) break; continue; }
                    info.offset = 0;
                    info.size = size;
                    info.presentationTimeUs = sampleTime - startUs;
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
    public void getVideoThumbnail(PluginCall call) {
        String raw = call.getString("uri");
        if (raw == null || !raw.startsWith("content://")) { call.reject("VIDEO_URI_REQUIRED"); return; }
        try {
            Uri uri = Uri.parse(raw);
            Bitmap bitmap;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                bitmap = getContext().getContentResolver().loadThumbnail(uri, new Size(320, 180), new CancellationSignal());
            } else {
                long id = ContentUris.parseId(uri);
                bitmap = MediaStore.Video.Thumbnails.getThumbnail(getContext().getContentResolver(), id, MediaStore.Video.Thumbnails.MINI_KIND, null);
            }
            if (bitmap == null) { call.reject("THUMBNAIL_UNAVAILABLE"); return; }
            Bitmap scaled = bitmap;
            if (bitmap.getWidth() > 320 || bitmap.getHeight() > 180) {
                scaled = Bitmap.createScaledBitmap(bitmap, 320, 180, true);
                if (scaled != bitmap) bitmap.recycle();
            }
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            scaled.compress(Bitmap.CompressFormat.JPEG, 62, bytes);
            scaled.recycle();
            JSObject out = new JSObject();
            out.put("dataUrl", "data:image/jpeg;base64," + Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP));
            call.resolve(out);
        } catch (Exception e) { call.reject("THUMBNAIL_UNAVAILABLE", e); }
    }

    @PluginMethod
    public void getGenres(PluginCall call) {
        new Thread(() -> {
            JSArray items = new JSArray();
            Cursor genreCursor = null;
            try {
                Uri genresUri = MediaStore.Audio.Genres.EXTERNAL_CONTENT_URI;
                genreCursor = getContext().getContentResolver().query(genresUri,
                    new String[] { MediaStore.Audio.Genres._ID, MediaStore.Audio.Genres.NAME }, null, null, MediaStore.Audio.Genres.NAME + " ASC");
                if (genreCursor != null) {
                    while (genreCursor.moveToNext()) {
                        long genreId = genreCursor.getLong(0);
                        String genreName = genreCursor.getString(1);
                        if (genreName == null || genreName.trim().isEmpty()) continue;
                        Uri membersUri = MediaStore.Audio.Genres.Members.getContentUri("external", genreId);
                        try (Cursor members = getContext().getContentResolver().query(membersUri,
                            new String[] { MediaStore.Audio.Media._ID }, null, null, null)) {
                            if (members == null) continue;
                            while (members.moveToNext()) {
                                JSObject item = new JSObject();
                                item.put("id", String.valueOf(members.getLong(0)));
                                item.put("genre", genreName.trim());
                                items.put(item);
                            }
                        } catch (Exception ignored) { }
                    }
                }
            } catch (Exception e) {
                call.reject("GENRES_UNAVAILABLE", e);
                return;
            } finally {
                if (genreCursor != null) genreCursor.close();
            }
            JSObject out = new JSObject();
            out.put("items", items);
            call.resolve(out);
        }, "HemaGenres").start();
    }

    private static String headerValue(String headers, String key) {
        for (String line : headers.split("\\r?\\n")) {
            int colon = line.indexOf(':');
            if (colon > 0 && line.substring(0, colon).trim().equalsIgnoreCase(key)) return line.substring(colon + 1).trim();
        }
        return "";
    }

    private static String escapeXml(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;");
    }

    private String localIPv4() {
        try {
            WifiManager wm = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wm != null) {
                int ip = wm.getConnectionInfo().getIpAddress();
                if (ip != 0) return (ip & 255) + "." + ((ip >> 8) & 255) + "." + ((ip >> 16) & 255) + "." + ((ip >> 24) & 255);
            }
        } catch (Exception ignored) { }
        try {
            Enumeration<java.net.NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces != null && interfaces.hasMoreElements()) {
                java.net.NetworkInterface nif = interfaces.nextElement();
                if (!nif.isUp() || nif.isLoopback()) continue;
                Enumeration<InetAddress> addresses = nif.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress address = addresses.nextElement();
                    if (address instanceof java.net.Inet4Address && !address.isLoopbackAddress()) return address.getHostAddress();
                }
            }
        } catch (Exception ignored) { }
        return "";
    }

    private synchronized String startCastServer(String rawUri, String requestedMime) throws Exception {
        if (castServer == null || castServer.isClosed()) {
            castServer = new ServerSocket();
            castServer.setReuseAddress(true);
            castServer.bind(new InetSocketAddress(InetAddress.getByName("0.0.0.0"), 0));
            castContext = getContext().getApplicationContext();
            ServerSocket server = castServer;
            new Thread(() -> {
                while (!server.isClosed()) {
                    try {
                        Socket client = server.accept();
                        new Thread(() -> serveMedia(client), "HemaDLNA-Client").start();
                    } catch (IOException ignored) { }
                }
            }, "HemaDLNA-Server").start();
        }
        castSource = Uri.parse(rawUri);
        castMime = requestedMime == null || requestedMime.trim().isEmpty() ? "video/mp4" : requestedMime;
        try {
            String contentType = getContext().getContentResolver().getType(castSource);
            if (contentType != null && !contentType.trim().isEmpty()) castMime = contentType;
        } catch (Exception ignored) { }
        castToken = UUID.randomUUID().toString().replace("-", "");
        String ip = localIPv4();
        if (ip.isEmpty()) throw new IOException("WIFI_REQUIRED");
        return "http://" + ip + ":" + castServer.getLocalPort() + "/media/" + castToken;
    }

    private void serveMedia(Socket client) {
        try (Socket socket = client) {
            socket.setSoTimeout(5000);
            BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), java.nio.charset.StandardCharsets.US_ASCII));
            String first = reader.readLine();
            if (first == null) return;
            String[] parts = first.split(" ");
            String method = parts.length > 0 ? parts[0] : "GET";
            String path = parts.length > 1 ? parts[1] : "/";
            String rangeHeader = "";
            String line;
            while ((line = reader.readLine()) != null && !line.isEmpty()) {
                if (line.toLowerCase(Locale.US).startsWith("range:")) rangeHeader = line.substring(line.indexOf(':') + 1).trim();
            }
            Uri source = castSource;
            String token = castToken;
            String mime = castMime;
            if (source == null || !path.equals("/media/" + token)) {
                byte[] body = "Not found".getBytes(java.nio.charset.StandardCharsets.UTF_8);
                socket.getOutputStream().write(("HTTP/1.1 404 Not Found\r\nContent-Length: " + body.length + "\r\nConnection: close\r\n\r\n").getBytes(java.nio.charset.StandardCharsets.US_ASCII));
                socket.getOutputStream().write(body);
                return;
            }
            try (ParcelFileDescriptor pfd = castContext.getContentResolver().openFileDescriptor(source, "r")) {
                if (pfd == null) throw new IOException("FILE_UNAVAILABLE");
                long size = pfd.getStatSize();
                if (size < 0) throw new IOException("UNKNOWN_SIZE");
                long start = 0, end = size - 1;
                boolean partial = false;
                if (!rangeHeader.isEmpty() && rangeHeader.startsWith("bytes=")) {
                    String[] bounds = rangeHeader.substring(6).split("-", 2);
                    start = Long.parseLong(bounds[0]);
                    if (bounds.length > 1 && !bounds[1].isEmpty()) end = Math.min(size - 1, Long.parseLong(bounds[1]));
                    if (start > end || start >= size) {
                        socket.getOutputStream().write(("HTTP/1.1 416 Range Not Satisfiable\r\nContent-Range: bytes */" + size + "\r\nConnection: close\r\n\r\n").getBytes(java.nio.charset.StandardCharsets.US_ASCII));
                        return;
                    }
                    partial = true;
                }
                long length = end - start + 1;
                String status = partial ? "206 Partial Content" : "200 OK";
                String response = "HTTP/1.1 " + status + "\r\nContent-Type: " + mime + "\r\nAccept-Ranges: bytes\r\nContent-Length: " + length + "\r\nConnection: close\r\n";
                if (partial) response += "Content-Range: bytes " + start + "-" + end + "/" + size + "\r\n";
                socket.getOutputStream().write((response + "\r\n").getBytes(java.nio.charset.StandardCharsets.US_ASCII));
                socket.getOutputStream().flush();
                if (!"HEAD".equalsIgnoreCase(method)) {
                    try (FileInputStream input = new FileInputStream(pfd.getFileDescriptor())) {
                        input.getChannel().position(start);
                        byte[] buffer = new byte[64 * 1024];
                        long remaining = length;
                        int count;
                        while (remaining > 0 && (count = input.read(buffer, 0, (int) Math.min(buffer.length, remaining))) >= 0) {
                            if (count == 0) continue;
                            socket.getOutputStream().write(buffer, 0, count);
                            remaining -= count;
                        }
                    }
                }
                socket.getOutputStream().flush();
            }
        } catch (Exception ignored) { }
    }

    @PluginMethod
    public void discoverCastDevices(PluginCall call) {
        new Thread(() -> {
            Map<String, CastDevice> found = new HashMap<>();
            WifiManager wm = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            WifiManager.MulticastLock multicastLock = null;
            try {
                if (wm != null) {
                    multicastLock = wm.createMulticastLock("HemaDLNA");
                    multicastLock.setReferenceCounted(false);
                    multicastLock.acquire();
                }
                try (MulticastSocket socket = new MulticastSocket()) {
                    socket.setSoTimeout(300);
                    String request = "M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: \"ssdp:discover\"\r\nMX: 2\r\nST: urn:schemas-upnp-org:device:MediaRenderer:1\r\n\r\n";
                    byte[] requestBytes = request.getBytes(java.nio.charset.StandardCharsets.US_ASCII);
                    socket.send(new DatagramPacket(requestBytes, requestBytes.length, InetAddress.getByName("239.255.255.250"), 1900));
                    long until = System.currentTimeMillis() + 2300;
                    byte[] buffer = new byte[8192];
                    Map<String, String> locations = new HashMap<>();
                    while (System.currentTimeMillis() < until) {
                        DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                        try {
                            socket.receive(packet);
                            String response = new String(packet.getData(), packet.getOffset(), packet.getLength(), java.nio.charset.StandardCharsets.US_ASCII);
                            String location = headerValue(response, "location");
                            if (!location.isEmpty()) locations.put(location, location);
                        } catch (SocketTimeoutException ignored) { }
                    }
                    for (String location : locations.keySet()) {
                        if (found.size() >= 12) break;
                        HttpURLConnection connection = null;
                        try {
                            connection = (HttpURLConnection) new URL(location).openConnection();
                            connection.setConnectTimeout(1400);
                            connection.setReadTimeout(1400);
                            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
                            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
                            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
                            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
                            Document document;
                            try (InputStream input = connection.getInputStream()) { document = factory.newDocumentBuilder().parse(input); }
                            NodeList deviceNodes = document.getElementsByTagName("device");
                            String name = "DLNA TV";
                            if (deviceNodes.getLength() > 0) {
                                NodeList names = ((Element) deviceNodes.item(0)).getElementsByTagName("friendlyName");
                                if (names.getLength() > 0) name = names.item(0).getTextContent();
                            }
                            NodeList serviceNodes = document.getElementsByTagName("service");
                            String control = "";
                            for (int n = 0; n < serviceNodes.getLength(); n++) {
                                Element service = (Element) serviceNodes.item(n);
                                String type = service.getElementsByTagName("serviceType").getLength() > 0 ? service.getElementsByTagName("serviceType").item(0).getTextContent() : "";
                                if (type.contains("AVTransport")) {
                                    String relative = service.getElementsByTagName("controlURL").getLength() > 0 ? service.getElementsByTagName("controlURL").item(0).getTextContent() : "";
                                    if (!relative.isEmpty()) { control = new URL(new URL(location), relative).toString(); break; }
                                }
                            }
                            if (!control.isEmpty()) found.put(location, new CastDevice(location, name, control));
                        } catch (Exception ignored) { }
                        finally { if (connection != null) connection.disconnect(); }
                    }
                }
            } catch (Exception e) {
                call.reject("تعذر البحث عن التلفاز. تأكد أن الهاتف والتلفاز على شبكة Wi-Fi نفسها.", e);
                return;
            } finally {
                if (multicastLock != null && multicastLock.isHeld()) try { multicastLock.release(); } catch (Exception ignored) { }
            }
            castDevices.clear();
            castDevices.putAll(found);
            JSArray outDevices = new JSArray();
            for (CastDevice device : found.values()) {
                JSObject item = new JSObject();
                item.put("id", device.id);
                item.put("name", device.name);
                outDevices.put(item);
            }
            JSObject out = new JSObject();
            out.put("devices", outDevices);
            call.resolve(out);
        }, "HemaDLNADiscovery").start();
    }

    private boolean sendCastSoap(CastDevice device, String action, String arguments) {
        HttpURLConnection connection = null;
        try {
            String envelope = "<?xml version=\"1.0\" encoding=\"utf-8\"?>"
                + "<s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\" s:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><s:Body>"
                + "<u:" + action + " xmlns:u=\"urn:schemas-upnp-org:service:AVTransport:1\">" + arguments + "</u:" + action + "></s:Body></s:Envelope>";
            connection = (HttpURLConnection) new URL(device.controlUrl).openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(2500);
            connection.setReadTimeout(3500);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "text/xml; charset=\"utf-8\"");
            connection.setRequestProperty("SOAPAction", "\"urn:schemas-upnp-org:service:AVTransport:1#" + action + "\"");
            byte[] bytes = envelope.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(bytes.length);
            try (OutputStream output = connection.getOutputStream()) { output.write(bytes); }
            int status = connection.getResponseCode();
            InputStream body = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            if (body != null) try (InputStream input = body) { byte[] sink = new byte[1024]; while (input.read(sink) >= 0) { } }
            return status >= 200 && status < 300;
        } catch (Exception ignored) { return false; }
        finally { if (connection != null) connection.disconnect(); }
    }

    @PluginMethod
    public void castMedia(PluginCall call) {
        String deviceId = call.getString("deviceId", "");
        String raw = call.getString("uri", "");
        String title = call.getString("title", "HEMA ROKSI");
        boolean video = Boolean.TRUE.equals(call.getBoolean("video", false));
        CastDevice device = castDevices.get(deviceId);
        if (device == null) { call.reject("CAST_DEVICE_NOT_FOUND"); return; }
        if (raw.isEmpty() || !raw.startsWith("content://")) { call.reject("CAST_LOCAL_FILE_REQUIRED"); return; }
        new Thread(() -> {
            try {
                String mediaUrl = startCastServer(raw, video ? "video/mp4" : "audio/mp4");
                String mediaType = video ? "object.item.videoItem" : "object.item.audioItem.musicTrack";
                String didl = "<DIDL-Lite xmlns=\"urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:upnp=\"urn:schemas-upnp-org:metadata-1-0/upnp/\">"
                    + "<item id=\"0\" parentID=\"0\" restricted=\"1\"><dc:title>" + escapeXml(title) + "</dc:title><upnp:class>" + mediaType + "</upnp:class>"
                    + "<res protocolInfo=\"http-get:*:" + escapeXml(castMime) + ":*\">" + escapeXml(mediaUrl) + "</res></item></DIDL-Lite>";
                String args = "<InstanceID>0</InstanceID><CurrentURI>" + escapeXml(mediaUrl) + "</CurrentURI><CurrentURIMetaData>" + escapeXml(didl) + "</CurrentURIMetaData>";
                if (!sendCastSoap(device, "SetAVTransportURI", args)) throw new IOException("TV_REJECTED_MEDIA");
                if (!sendCastSoap(device, "Play", "<InstanceID>0</InstanceID><Speed>1</Speed>")) throw new IOException("TV_PLAY_FAILED");
                JSObject out = new JSObject();
                out.put("url", mediaUrl);
                call.resolve(out);
            } catch (Exception e) { call.reject("لم يبدأ البث. قد لا يدعم التلفاز صيغة الملف أو DLNA.", e); }
        }, "HemaDLNACast").start();
    }

    @PluginMethod
    public void stopCast(PluginCall call) {
        CastDevice device = castDevices.get(call.getString("deviceId", ""));
        if (device == null) { call.reject("CAST_DEVICE_NOT_FOUND"); return; }
        new Thread(() -> {
            boolean ok = sendCastSoap(device, "Stop", "<InstanceID>0</InstanceID>");
            JSObject out = new JSObject();
            out.put("stopped", ok);
            call.resolve(out);
        }, "HemaDLNAStop").start();
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
            : new String[] { MediaStore.MediaColumns._ID, MediaStore.Audio.Media.TITLE, MediaStore.Audio.Media.DURATION, MediaStore.MediaColumns.SIZE, MediaStore.Audio.Media.ARTIST, MediaStore.Audio.Media.ALBUM, MediaStore.Audio.Media.ALBUM_ID, MediaStore.MediaColumns.DATA };
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
                    String album = c.getString(5);
                    o.put("album", album == null ? "" : album);
                    o.put("albumId", String.valueOf(c.getLong(6)));
                }
                String data = c.getString(video ? 6 : 7);
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
