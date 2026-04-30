import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

// Env'den oku — app.json `expo.extra` veya app.config.ts üzerinden gelir
const extra = Constants.expoConfig?.extra ?? (Constants as any).manifest?.extra ?? {}
const supabaseUrl = extra.supabaseUrl as string
const supabaseAnonKey = extra.supabaseAnonKey as string

if (!supabaseUrl || !supabaseAnonKey) {
  // Build/dev hatası — uygulama açılmasın
  throw new Error(
    'Supabase env missing! Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env, ' +
    'or set expo.extra.supabaseUrl/supabaseAnonKey in app.json/app.config.ts'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
})
