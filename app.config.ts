import 'dotenv/config';

export default {
  expo: {
    name: 'ClassConnect', // nombre visible en el ícono
    slug: 'classconnect', // usado por Expo para la URL (expo.dev/@owner/classconnect)
    scheme: 'classconnect', // para deep linking: classconnect://ruta
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    splash: {
      image: './assets/images/splash-icon.png', // imagen de carga (ver abajo)
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    userInterfaceStyle: 'light',
    assetBundlePatterns: ['**/*'],
    ios: {
      bundleIdentifier: 'com.gpanaccio.classconnect',
      supportsTablet: true,
    },
    android: {
      package: 'com.gpanaccio.classconnect',
      intentFilters: [
        {
          action: 'VIEW',
          data: [
            {
              scheme: 'https',
              host: 'classconnect.com',
              pathPrefix: '/', // permite https://classconnect.com/*
            },
            {
              scheme: 'classconnect',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },

    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png'
    },
    
    updates: {
      url: 'https://u.expo.dev/9a200597-a938-45b5-8e5b-7fb388d2b3eb', // <-- Reemplaza con el ID de tu proyecto en EAS
    },
    runtimeVersion: {
      policy: 'appVersion',
    },

    owner: 'gpanaccio', // <-- Reemplaza con tu usuario Expo (ver más abajo)

    extra: {
      environment: process.env.ENVIRONMENT,
    },
  },
};
