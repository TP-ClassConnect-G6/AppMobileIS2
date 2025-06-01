import * as Linking from 'expo-linking';

export default {
  prefixes: [
    'miappclassconnect://', // para desarrollo y producción (deep linking)
    'https://classconnect.com', // universal links
    'https://u.expo.dev/9a200597-a938-45b5-8e5b-7fb388d2b3eb', // EAS update
  ],
  config: {
    screens: {
      Home: 'home',
      Profile: 'profile/:id',
    },
  },
};
