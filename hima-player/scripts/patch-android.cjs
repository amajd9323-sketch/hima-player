// Runs after `cap sync` (npm hook capacitor:sync:after). Adds native MediaScan plugin.
const fs = require('fs'), path = require('path')
const main = 'android/app/src/main'
if (!fs.existsSync(main)) process.exit(0)
const dir = path.join(main, 'java', 'com', 'hima', 'player')
fs.mkdirSync(dir, { recursive: true })
for (const f of ['MediaScanPlugin', 'PlaybackService']) fs.copyFileSync(`native/${f}.java`, path.join(dir, `${f}.java`))
const ma = path.join(dir, 'MainActivity.java')
if (fs.existsSync(ma)) {
  let s = fs.readFileSync(ma, 'utf8')
  if (!s.includes('MediaScanPlugin')) {
    s = s.replace(/public class MainActivity extends BridgeActivity\s*\{\s*\}/, 'public class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(android.os.Bundle b) {\n        registerPlugin(MediaScanPlugin.class);\n        super.onCreate(b);\n    }\n}')
    fs.writeFileSync(ma, s)
  }
}
const copyDir = (a, b) => { for (const f of fs.readdirSync(a, { withFileTypes: true })) { const x = path.join(a, f.name), y = path.join(b, f.name); if (f.isDirectory()) { fs.mkdirSync(y, { recursive: true }); copyDir(x, y) } else fs.copyFileSync(x, y) } }
if (fs.existsSync('native/res')) copyDir('native/res', path.join(main, 'res'))
const mf = path.join(main, 'AndroidManifest.xml')
let m = fs.readFileSync(mf, 'utf8')
if (!m.includes('supportsPictureInPicture')) m = m.replace('<activity', '<activity android:supportsPictureInPicture="true"')
for (const p of ['READ_MEDIA_AUDIO', 'READ_MEDIA_VIDEO'])
  if (!m.includes(p)) m = m.replace('<application', `<uses-permission android:name="android.permission.${p}" />\n    <application`)
if (!m.includes('READ_EXTERNAL_STORAGE'))
  m = m.replace('<application', '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />\n    <application')
for (const x of ['FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_MEDIA_PLAYBACK', 'WAKE_LOCK'])
  if (!m.includes(`permission.${x}"`)) m = m.replace('<application', `<uses-permission android:name="android.permission.${x}" />\n    <application`)
if (!m.includes('PlaybackService')) m = m.replace('</application>', '<service android:name="com.hima.player.PlaybackService" android:exported="false" android:foregroundServiceType="mediaPlayback" />\n    </application>')
fs.writeFileSync(mf, m)
console.log('MediaScan plugin patched')
