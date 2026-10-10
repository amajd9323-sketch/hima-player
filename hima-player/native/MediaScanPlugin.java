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
                call.reject("PIP_FAILED", e);
            }
        });
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
