package com.hima.player;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;

public class PlaybackService extends Service {
    private static final int NOTIFICATION_ID = 4107;
    private static final String CHANNEL_ID = "hema_media_controls";
    private MediaSession mediaSession;
    private String trackTitle = "HEMA YARA PLAYER";
    private String trackArtist = "Hema";
    private boolean isPlaying = false;

    @Override
    public void onCreate() {
        super.onCreate();
        mediaSession = new MediaSession(this, "HEMA YARA PLAYER");
        mediaSession.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() {
                if (!isPlaying) dispatchCommand("toggle");
            }
            @Override public void onPause() {
                if (isPlaying) dispatchCommand("toggle");
            }
            @Override public void onSkipToNext() { dispatchCommand("next"); }
            @Override public void onSkipToPrevious() { dispatchCommand("prev"); }
        });
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (manager != null && manager.getNotificationChannel(CHANNEL_ID) == null) {
                manager.createNotificationChannel(new NotificationChannel(
                    CHANNEL_ID, "HEMA music controls", NotificationManager.IMPORTANCE_LOW));
            }
        }
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    private PendingIntent commandIntent(String command, int requestCode) {
        Intent action = new Intent(this, HemaWidgetProvider.class);
        action.setAction(HemaWidgetProvider.ACTION_COMMAND);
        action.setPackage(getPackageName());
        action.putExtra("command", command);
        return PendingIntent.getBroadcast(this, requestCode, action,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private void dispatchCommand(String command) {
        Intent action = new Intent(this, HemaWidgetProvider.class);
        action.setAction(HemaWidgetProvider.ACTION_COMMAND);
        action.setPackage(getPackageName());
        action.putExtra("command", command);
        sendBroadcast(action);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && !intent.getBooleanExtra("on", true)) {
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        if (intent != null) {
            String title = intent.getStringExtra("title");
            String artist = intent.getStringExtra("artist");
            if (title != null && !title.trim().isEmpty()) trackTitle = title.trim();
            if (artist != null && !artist.trim().isEmpty()) trackArtist = artist.trim();
            isPlaying = intent.getBooleanExtra("playing", true);
        }

        if (mediaSession != null) {
            mediaSession.setMetadata(new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, trackTitle)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, trackArtist)
                .putString(MediaMetadata.METADATA_KEY_ALBUM, "HEMA YARA PLAYER")
                .build());
            long actions = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE
                | PlaybackState.ACTION_PLAY_PAUSE | PlaybackState.ACTION_SKIP_TO_NEXT
                | PlaybackState.ACTION_SKIP_TO_PREVIOUS;
            mediaSession.setPlaybackState(new PlaybackState.Builder()
                .setActions(actions)
                .setState(isPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED, 0L, isPlaying ? 1f : 0f)
                .build());
            mediaSession.setActive(true);
        }

        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launch == null) launch = new Intent();
        launch.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent contentIntent = PendingIntent.getActivity(this, 0, launch,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);

        builder.addAction(android.R.drawable.ic_media_previous, "Previous", commandIntent("prev", 10));
        builder.addAction(isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
            isPlaying ? "Pause" : "Play", commandIntent("toggle", 11));
        builder.addAction(android.R.drawable.ic_media_next, "Next", commandIntent("next", 12));

        Notification.MediaStyle mediaStyle = new Notification.MediaStyle()
            .setMediaSession(mediaSession.getSessionToken())
            .setShowActionsInCompactView(0, 1, 2);
        builder.setStyle(mediaStyle)
            .setContentTitle(trackTitle)
            .setContentText(trackArtist)
            .setSubText("HEMA YARA PLAYER")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(contentIntent)
            .setCategory(Notification.CATEGORY_TRANSPORT)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setShowWhen(false)
            .setOnlyAlertOnce(true)
            .setOngoing(true);

        Notification notification = builder.build();
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        super.onDestroy();
    }
}
