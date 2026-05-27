import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hermesbiblico.app',
  appName: 'Hermes Biblico',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    captureInput: true,
    backgroundColor: '#08090B'
  }
};

export default config;
