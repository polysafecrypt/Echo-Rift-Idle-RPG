// app.config.js — Expo dynamic config
// .env dosyasından supabase credentials'ı okuyup expo.extra'ya geçirir
// react-native-dotenv kurulu değilse manual EXPO_PUBLIC_* env vars kullan

module.exports = ({ config }) => {
  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''

  return {
    expo: {
      name: 'echo-rift',
      slug: 'echo-rift',
      scheme: 'echo-rift',
      version: '1.0.0',
      orientation: 'portrait',
      icon: './assets/icon.png',
      userInterfaceStyle: 'light',
      newArchEnabled: true,
      splash: {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
      ios: {
        supportsTablet: true,
      },
      android: {
        package: 'com.echrift.game',
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#ffffff',
        },
        edgeToEdgeEnabled: true,
        predictiveBackGestureEnabled: false,
      },
      web: {
        favicon: './assets/favicon.png',
      },
      plugins: [
        'expo-font',
        'expo-secure-store',
        'expo-web-browser',
      ],
      assetBundlePatterns: [
        '**/*',
        'assets/characters/*.glb',
      ],
      extra: {
        supabaseUrl,
        supabaseAnonKey,
      },
    },
  }
}
