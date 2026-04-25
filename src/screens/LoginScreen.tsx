// =============================================
// ECHO RIFT — LOGIN SCREEN
// =============================================

import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  Dimensions, StatusBar, Alert, ImageBackground,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { supabase } from '../lib/supabase'
import { COLORS } from '../constants'
import { RootStackParamList } from '../navigation/AppNavigator'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { LinearGradient } from 'expo-linear-gradient'

const { width, height } = Dimensions.get('window')

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>
}

// ─── HOLO BUTTON ─────────────────────────────────────────────────────────────
function HoloButton({
  label, onPress, disabled = false, primary = false, delay = 0,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  primary?: boolean
  delay?: number
}) {
  const slideAnim   = useRef(new Animated.Value(40)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const pressAnim   = useRef(new Animated.Value(1)).current
  const glowAnim    = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(slideAnim,   { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 1800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1800, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  const handlePressIn  = () => Animated.spring(pressAnim, { toValue: 0.96, useNativeDriver: true, tension: 200 }).start()
  const handlePressOut = () => Animated.spring(pressAnim, { toValue: 1,    useNativeDriver: true, tension: 200 }).start()

  const borderColor = primary ? COLORS.cyan : 'rgba(0,212,255,0.45)'

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }, { scale: pressAnim }], opacity: opacityAnim }}>
      <TouchableOpacity onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled} activeOpacity={1}>
        <View style={[holoStyles.btn, {
          borderColor,
          backgroundColor: primary ? 'rgba(0,212,255,0.1)' : 'rgba(0,0,0,0.55)',
        }]}>
          <View style={[holoStyles.cornerTL, { borderColor }]} />
          <View style={[holoStyles.cornerTR, { borderColor }]} />
          <View style={[holoStyles.cornerBL, { borderColor }]} />
          <View style={[holoStyles.cornerBR, { borderColor }]} />

          <View style={holoStyles.gridOverlay} pointerEvents="none">
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={holoStyles.gridLine} />
            ))}
          </View>

          <Animated.View style={[holoStyles.glowSweep, {
            opacity: glowAnim.interpolate({ inputRange: [0.4, 1], outputRange: [0, primary ? 0.08 : 0.04] }),
            backgroundColor: COLORS.cyan,
          }]} />

          <View style={[holoStyles.sideL, { backgroundColor: borderColor }]} />
          <View style={[holoStyles.sideR, { backgroundColor: borderColor }]} />

          <Text style={[
            holoStyles.btnLabel,
            primary
              ? { color: COLORS.cyan, fontSize: 16, letterSpacing: 5 }
              : { color: 'rgba(200,225,255,0.9)', fontSize: 14, letterSpacing: 4 },
          ]}>
            {label}
          </Text>

          {primary && (
            <Animated.View style={[holoStyles.bottomBar, { opacity: glowAnim, backgroundColor: COLORS.cyan }]} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

const holoStyles = StyleSheet.create({
  btn: {
    width: width * 0.82, height: 58,
    borderWidth: 1, borderRadius: 2,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', position: 'relative',
  },
  cornerTL: { position: 'absolute', top: -1, left: -1,   width: 14, height: 14, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { position: 'absolute', top: -1, right: -1,  width: 14, height: 14, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { position: 'absolute', bottom: -1, left: -1,  width: 14, height: 14, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderBottomWidth: 2, borderRightWidth: 2 },
  gridOverlay: { position: 'absolute', inset: 0, flexDirection: 'column', justifyContent: 'space-around' },
  gridLine: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,212,255,0.12)' },
  glowSweep: { position: 'absolute', inset: 0 },
  sideL: { position: 'absolute', left: 0, top: '20%', width: 2, height: '60%', opacity: 0.7 },
  sideR: { position: 'absolute', right: 0, top: '20%', width: 2, height: '60%', opacity: 0.7 },
  btnLabel: { fontWeight: '700', textAlign: 'center', zIndex: 1 },
  bottomBar: { position: 'absolute', bottom: 0, left: '10%', width: '80%', height: 1 },
})

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false)

  const logoFade   = useRef(new Animated.Value(0)).current
  const logoSlide  = useRef(new Animated.Value(-30)).current
  const scanlineY  = useRef(new Animated.Value(-height)).current
  const glitchAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoFade,  { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(logoSlide, { toValue: 0, tension: 50, friction: 12, useNativeDriver: true }),
    ]).start()

    Animated.loop(
      Animated.timing(scanlineY, { toValue: height * 1.2, duration: 5000, useNativeDriver: true })
    ).start()

    const glitchInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(glitchAnim, { toValue: 1,   duration: 50, useNativeDriver: true }),
        Animated.timing(glitchAnim, { toValue: 0,   duration: 50, useNativeDriver: true }),
        Animated.timing(glitchAnim, { toValue: 0.5, duration: 30, useNativeDriver: true }),
        Animated.timing(glitchAnim, { toValue: 0,   duration: 80, useNativeDriver: true }),
      ]).start()
    }, 4000)

    return () => clearInterval(glitchInterval)
  }, [])

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      const redirectUrl = Linking.createURL('login-callback')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      })
      if (error) throw error
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
        if (result.type === 'success' && result.url) {
          const code = new URL(result.url).searchParams.get('code') || ''
          const { data: s, error: e } = await supabase.auth.exchangeCodeForSession(code)
          if (e) throw e
          if (s.user) {
            const { data: player } = await supabase.from('players').select('class_type').eq('id', s.user.id).single()
            navigation.replace(player?.class_type ? 'Main' : 'ClassSelect')
          }
        }
      }
    } catch (err: any) { Alert.alert('Error', err.message) }
    finally { setLoading(false) }
  }

  const handleAppleLogin = async () => {
    try {
      setLoading(true)
      const redirectUrl = Linking.createURL('login-callback')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      })
      if (error) throw error
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
        if (result.type === 'success' && result.url) {
          const code = new URL(result.url).searchParams.get('code') || ''
          const { data: s, error: e } = await supabase.auth.exchangeCodeForSession(code)
          if (e) throw e
          if (s.user) {
            const { data: player } = await supabase.from('players').select('class_type').eq('id', s.user.id).single()
            navigation.replace(player?.class_type ? 'Main' : 'ClassSelect')
          }
        }
      }
    } catch (err: any) { Alert.alert('Error', err.message) }
    finally { setLoading(false) }
  }

  const handleTestLogin = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@test.com',
        password: 'test123456',
      })
      if (error) throw error
      if (data.user) {
        const { data: player } = await supabase.from('players').select('class_type').eq('id', data.user.id).single()
        navigation.replace(player?.class_type ? 'Main' : 'ClassSelect')
      }
    } catch (err: any) { Alert.alert('Error', err.message) }
    finally { setLoading(false) }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ARKA PLAN */}
      <ImageBackground
        source={require('../../assets/images/ImageBackground.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        {/* Alt yarıyı karartır — butonlar okunur olur, karakter görünür kalır */}
        <LinearGradient
          colors={[
            'rgba(2,6,8,0.15)',  // üst — karakter görünsün
            'rgba(2,6,8,0.25)',  // orta
            'rgba(2,6,8,0.80)',  // alt başlangıç
            'rgba(2,6,8,0.97)',  // buton alanı
          ]}
          locations={[0, 0.45, 0.72, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      {/* Scanline */}
      <Animated.View
        style={[styles.scanline, { transform: [{ translateY: scanlineY }] }]}
        pointerEvents="none"
      />

      {/* Köşe dekorasyonları */}
      <View style={styles.decoTL} />
      <View style={styles.decoTR} />
      <View style={styles.decoBL} />
      <View style={styles.decoBR} />

      {/* İÇERİK */}
      <View style={styles.content}>

        {/* LOGO — üstte, görsel üzerinde */}
        <Animated.View style={[styles.logoSection, {
          opacity: logoFade,
          transform: [{ translateY: logoSlide }],
        }]}>
          <View style={styles.signalRow}>
            <View style={styles.signalDot} />
            <Text style={styles.signalText}>◈ DIMENSIONAL SIGNAL DETECTED ◈</Text>
            <View style={styles.signalDot} />
          </View>

          <View style={styles.logoWrap}>
            <Animated.Text style={[styles.logoGlitch, {
              opacity: glitchAnim,
              transform: [{ translateX: glitchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) }],
            }]}>
              ECHO RIFT
            </Animated.Text>
            <Text style={styles.logo}>ECHO RIFT</Text>
          </View>

          <Text style={styles.logoSub}>SEASON 1 — ALPHA-0</Text>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerDiamond} />
            <View style={styles.dividerLine} />
          </View>
        </Animated.View>

        {/* Karakterin görüneceği boş alan */}
        <View style={styles.characterSpace} />

        {/* BUTONLAR — altta */}
        <View style={styles.bottomSection}>
          <HoloButton
            label={loading ? 'CONNECTING...' : '⚡  INITIALIZE UNIT-7'}
            onPress={handleTestLogin}
            disabled={loading}
            primary
            delay={200}
          />
          <HoloButton
            label="G   CONTINUE WITH GOOGLE"
            onPress={handleGoogleLogin}
            disabled={loading}
            delay={350}
          />
          <HoloButton
            label="   CONTINUE WITH APPLE"
            onPress={handleAppleLogin}
            disabled={loading}
            delay={500}
          />
          <Animated.Text style={[styles.footer, { opacity: logoFade }]}>
            By continuing you agree to our Terms of Service
          </Animated.Text>
        </View>

      </View>

      {/* Alt HUD çizgisi */}
      <View style={styles.hudBottom}>
        <View style={styles.hudLine} />
        <Text style={styles.hudText}>ECHO STATION • SECTOR 7-G</Text>
        <View style={styles.hudLine} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020608' },

  scanline: {
    position: 'absolute', left: 0, right: 0, height: 80,
    backgroundColor: 'rgba(0,255,136,0.025)',
  },

  decoTL: { position: 'absolute', top: 52, left: 20, width: 28, height: 28, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: 'rgba(0,255,136,0.5)' },
  decoTR: { position: 'absolute', top: 52, right: 20, width: 28, height: 28, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: 'rgba(0,255,136,0.5)' },
  decoBL: { position: 'absolute', bottom: 36, left: 20, width: 28, height: 28, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: 'rgba(0,255,136,0.5)' },
  decoBR: { position: 'absolute', bottom: 36, right: 20, width: 28, height: 28, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: 'rgba(0,255,136,0.5)' },

  content: { flex: 1, alignItems: 'center', paddingTop: 64 },

  logoSection: { alignItems: 'center', gap: 8 },
  signalRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signalDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: COLORS.neonGreen,
    shadowColor: COLORS.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6, shadowOpacity: 1,
  },
  signalText: { fontSize: 9, color: 'rgba(0,255,136,0.7)', letterSpacing: 2 },

  logoWrap: { position: 'relative', alignItems: 'center' },
  logo: {
    fontSize: 52, fontWeight: '900',
    color: COLORS.neonGreen, letterSpacing: 10,
    textShadowColor: COLORS.neonGreen,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 28,
  },
  logoGlitch: {
    position: 'absolute',
    fontSize: 52, fontWeight: '900',
    letterSpacing: 10, color: 'rgba(255,0,80,0.7)',
  },
  logoSub: { fontSize: 11, color: COLORS.cyan, letterSpacing: 6, opacity: 0.7 },

  divider:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, width: width * 0.7 },
  dividerLine:    { flex: 1, height: 1, backgroundColor: 'rgba(0,212,255,0.25)' },
  dividerDiamond: { width: 6, height: 6, backgroundColor: COLORS.cyan, transform: [{ rotate: '45deg' }], opacity: 0.6 },

  characterSpace: { flex: 1 },

  bottomSection: {
    width: '100%', alignItems: 'center',
    gap: 12, paddingBottom: 56, paddingHorizontal: 20,
  },
  footer: { fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, textAlign: 'center', marginTop: 4 },

  hudBottom: { position: 'absolute', bottom: 18, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  hudLine:   { flex: 1, height: 1, backgroundColor: 'rgba(0,212,255,0.2)' },
  hudText:   { fontSize: 8, color: 'rgba(0,212,255,0.35)', letterSpacing: 2 },
})