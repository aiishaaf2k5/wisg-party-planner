import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.iwsg.app',
  appName: 'IWSG Event Management',
  webDir: 'www',
  plugins: {
    FirebaseAuthentication: {
      providers: ['google.com'],
      skipNativeAuth: true,
    },
  },
  server: {
    url: 'https://wisg-party-planner.vercel.app',
    cleartext: false
  }
};

export default config;
