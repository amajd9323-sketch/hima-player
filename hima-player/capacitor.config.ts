import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hima.player',
  appName: 'HEMA YARA PLAYER',
  webDir: 'dist',
  android: { backgroundColor: '#050406' },
  plugins: { StatusBar: { overlaysWebView: false, style: 'DARK', backgroundColor: '#050406' } }
};

export default config;
