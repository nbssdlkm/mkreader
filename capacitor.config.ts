import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mkreader.app',
  appName: 'MkReader',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
