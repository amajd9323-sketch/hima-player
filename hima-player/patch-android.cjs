// Runs after `cap sync` (npm hook capacitor:sync:after). Adds native MediaScan plugin.
const fs = require('fs'), path = require('path')
const main = 'android/app/src/main'
if (!fs.existsSync(main)) process.exit(0)
const dir = path.join(main, 'java', 'com', 'hema', 'player')
fs.mkdirSync(dir, { recursive: true })
fs.copyFileSync('native/MediaScanPlugin.java', path.join(dir, 'MediaScanPlugin.java'))
const ma = path.join(dir, 'MainActivity.java')
if (fs.existsSync(ma)) {
  let s = fs.readFileSync(ma, 'utf8')
  if (!s.includes('MediaScanPlugin')) {
    s = s.replace(/public class MainActivity extends BridgeActivity\s*\{\s*\}/, 'public class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(android.os.Bundle b) {\n        registerPlugin(MediaScanPlugin.class);\n        super.onCreate(b);\n    }\n}')
    fs.writeFileSync(ma, s)
  }
}
const mf = path.join(main, 'AndroidManifest.xml')
let m = fs.readFileSync(mf, 'utf8')
for (const p of ['READ_MEDIA_AUDIO', 'READ_MEDIA_VIDEO'])
  if (!m.includes(p)) m = m.replace('<application', `<uses-permission android:name="android.permission.${p}" />\n    <application`)
if (!m.includes('READ_EXTERNAL_STORAGE'))
  m = m.replace('<application', '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />\n    <application')
fs.writeFileSync(mf, m)
console.log('MediaScan plugin patched')
