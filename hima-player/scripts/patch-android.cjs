// Runs after `cap sync` (npm hook capacitor:sync:after). Adds native MediaScan plugin.
const fs = require('fs'), path = require('path')
const main = 'android/app/src/main'
if (!fs.existsSync(main)) process.exit(0)
const dir = path.join(main, 'java', 'com', 'hima', 'player')
fs.mkdirSync(dir, { recursive: true })
for (const f of ['MediaScanPlugin', 'PlaybackService', 'HemaWidgetProvider']) fs.copyFileSync(`native/${f}.java`, path.join(dir, `${f}.java`))
const ma = path.join(dir, 'MainActivity.java')
if (fs.existsSync(ma)) {
  const s = `package com.hima.player;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MediaScanPlugin.class);
        super.onCreate(savedInstanceState);
        MediaScanPlugin.captureSharedIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        MediaScanPlugin.captureSharedIntent(intent);
    }
}
`
  fs.writeFileSync(ma, s)
}
const copyDir = (a, b) => { for (const f of fs.readdirSync(a, { withFileTypes: true })) { const x = path.join(a, f.name), y = path.join(b, f.name); if (f.isDirectory()) { fs.mkdirSync(y, { recursive: true }); copyDir(x, y) } else fs.copyFileSync(x, y) } }
if (fs.existsSync('native/res')) copyDir('native/res', path.join(main, 'res'))
const mf = path.join(main, 'AndroidManifest.xml')
let m = fs.readFileSync(mf, 'utf8')

if (!m.includes('HEMA_SHARE_WEB_INTENTS')) {
  const hosts = [
    'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com',
    'youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com',
    'tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'
  ]
  const shareIntent = `<intent-filter android:label="Share to HEMA">
            <action android:name="android.intent.action.SEND" />
            <category android:name="android.intent.category.DEFAULT" />
            <data android:mimeType="text/plain" />
        </intent-filter>`
  const viewIntents = hosts.flatMap(host => ['https', 'http'].map(scheme =>
    `<intent-filter android:label="Open in HEMA">
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="${scheme}" android:host="${host}" />
        </intent-filter>`
  )).join('\n        ')
  const shareBlock = `<!-- HEMA_SHARE_WEB_INTENTS -->\n        ${shareIntent}\n        ${viewIntents}`
  const activities = [...m.matchAll(/<activity\b[^>]*>[\s\S]*?<\/activity>/g)]
  const mainActivity = activities.find(x => x[0].includes('android.intent.action.MAIN'))
  if (mainActivity) {
    let activityXml = mainActivity[0].replace(/<activity\b([^>]*)>/, (_, attrs) =>
      `<activity${/android:launchMode=/.test(attrs) ? attrs : attrs + ' android:launchMode="singleTask"'}>`
    )
    activityXml = activityXml.replace('</activity>', `        ${shareBlock}\n    </activity>`)
    m = m.replace(mainActivity[0], activityXml)
  }
}
if (!m.includes('android.permission.INTERNET'))
  m = m.replace('<application', '<uses-permission android:name="android.permission.INTERNET" />\n    <application')
if (!m.includes('supportsPictureInPicture')) m = m.replace('<activity', '<activity android:supportsPictureInPicture="true"')
for (const p of ['READ_MEDIA_AUDIO', 'READ_MEDIA_VIDEO'])
  if (!m.includes(p)) m = m.replace('<application', `<uses-permission android:name="android.permission.${p}" />\n    <application`)
if (!m.includes('READ_EXTERNAL_STORAGE'))
  m = m.replace('<application', '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />\n    <application')
for (const x of ['FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_MEDIA_PLAYBACK', 'WAKE_LOCK'])
  if (!m.includes(`permission.${x}"`)) m = m.replace('<application', `<uses-permission android:name="android.permission.${x}" />\n    <application`)
if (!m.includes('PlaybackService')) m = m.replace('</application>', '<service android:name="com.hima.player.PlaybackService" android:exported="false" android:foregroundServiceType="mediaPlayback" />\n    </application>')
if (!m.includes('HemaWidgetProvider')) m = m.replace('</application>', '<receiver android:name="com.hima.player.HemaWidgetProvider" android:label="HEMA ROKSI Player" android:exported="true"><intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /><action android:name="com.hima.player.WIDGET_COMMAND" /><action android:name="com.hima.player.WIDGET_UPDATE" /></intent-filter><meta-data android:name="android.appwidget.provider" android:resource="@xml/hema_widget_info" /></receiver>\n    </application>')
fs.writeFileSync(mf, m)
console.log('MediaScan plugin patched')
