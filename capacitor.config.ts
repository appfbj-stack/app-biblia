import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hermesbiblico.app',
  appName: 'Hermes Bíblico',
  webDir: 'dist',
  server: {
    // Altere para a sua URL oficial da Vercel quando fizer o deploy final!
    // Por padrão, apontamos para a URL compartilhada do seu App no AI Studio:
    url: 'https://ais-pre-gk4dsrybjlndvx7fniceyh-218154775651.us-east1.run.app',
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    backgroundColor: '#08090B'
  }
};

export default config;
