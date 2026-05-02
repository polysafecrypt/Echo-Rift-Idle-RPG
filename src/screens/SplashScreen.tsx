// =============================================
// ECHO RIFT — SPLASH SCREEN (CLEAN REWRITE)
// Minimal, defensive. Tüm string render'lar String() ile sarılı.
// =============================================

import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { supabase } from '../lib/supabase'
import { COLORS, LOADING_MESSAGES } from '../constants'
import { RootStackParamList } from '../navigation/AppNavigator'

const { width } = Dimensions.get('window')

// Defensive default in case import fails
const SAFE_MESSAGES: readonly string[] =
  Array.isArray(LOADING_MESSAGES) && LOADING_MESSAGES.length > 0
    ? LOADING_MESSAGES
    : ['Loading...']

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Splash'>
}

export default function SplashScreen({ navigation }: Props) {
  const [messageIndex, setMessageIndex] = useState<number>(0)

  // Animations
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.8)).current
  const lineWidth = useRef(new Animated.Value(0)).current
  const messageOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(lineWidth, {
        toValue: width * 0.6,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(messageOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start()

    // Mesaj index değiştirici (setState callback içinde başka setState yok)
    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % SAFE_MESSAGES.length)
    }, 1200)

    // Auth kontrolü
    const timer = setTimeout(async () => {
      clearInterval(msgInterval)
      await checkAuth()
    }, 3500)

    return () => {
      clearTimeout(timer)
      clearInterval(msgInterval)
    }
  }, [])

  const checkAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        try {
          const { data: player, error } = await supabase
            .from('players')
            .select('class_type')
            .eq('id', session.user.id)
            .single()

          if (error || !player) {
            navigation.replace('Main')
          } else if (player.class_type) {
            navigation.replace('Main')
          } else {
            navigation.replace('ClassSelect')
          }
        } catch {
          navigation.replace('Main')
        }
      } else {
        navigation.replace('Login')
      }
    } catch {
      navigation.replace('Login')
    }
  }

  // Defensive: index out-of-bounds koruması
  const currentMessage = SAFE_MESSAGES[messageIndex] || SAFE_MESSAGES[0] || ''

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Logo container */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Text style={styles.logoText}>{String('ECHO')}</Text>
        <View style={styles.logoLine} />
        <Text style={styles.logoTextSub}>{String('RIFT')}</Text>
        <Text style={styles.logoTagline}>{String('FOLLOW THE SIGNAL')}</Text>
      </Animated.View>

      {/* Divider */}
      <Animated.View style={[styles.dividerLine, { width: lineWidth }]} />

      {/* Loading mesajı — Animated.View + Text (Animated.Text yerine) */}
      <Animated.View style={{ opacity: messageOpacity }}>
        <Text style={styles.loadingText}>{String(currentMessage)}</Text>
      </Animated.View>

      {/* Loading dots — inline component yok, statik 3 nokta */}
      <Animated.View style={[styles.dotsContainer, { opacity: messageOpacity }]}>
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotMid]} />
        <View style={styles.dot} />
      </Animated.View>

      {/* Version */}
      <Text style={styles.version}>{String('v0.1.0 — Alpha-0')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 56,
    fontWeight: '900',
    color: COLORS.neonGreen,
    letterSpacing: 12,
    textShadowColor: COLORS.neonGreen,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  logoLine: {
    width: 200,
    height: 1,
    backgroundColor: COLORS.neonGreen,
    opacity: 0.5,
    marginVertical: 8,
  },
  logoTextSub: {
    fontSize: 32,
    fontWeight: '300',
    color: COLORS.cyan,
    letterSpacing: 20,
    textShadowColor: COLORS.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  logoTagline: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 6,
    marginTop: 16,
  },
  dividerLine: {
    height: 1,
    backgroundColor: COLORS.neonGreen,
    opacity: 0.2,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    letterSpacing: 2,
    marginBottom: 16,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 60,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.neonGreen,
    opacity: 0.5,
    marginHorizontal: 4,
  },
  dotMid: {
    opacity: 0.8,
  },
  version: {
    position: 'absolute',
    bottom: 32,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
})