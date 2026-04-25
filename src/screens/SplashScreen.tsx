// =============================================
// ECHO RIFT — SPLASH SCREEN
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

const { width, height } = Dimensions.get('window')

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Splash'>
}

export default function SplashScreen({ navigation }: Props) {
  const [message, setMessage] = useState<string>(LOADING_MESSAGES[0])
  const [messageIndex, setMessageIndex] = useState(0)

  // Animations
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.8)).current
  const glowOpacity = useRef(new Animated.Value(0)).current
  const lineWidth = useRef(new Animated.Value(0)).current
  const messageOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Logo animasyonu
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
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
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

    // Mesaj değiştir
    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => {
        const next = (prev + 1) % LOADING_MESSAGES.length
        setMessage(LOADING_MESSAGES[next])
        return next
      })
    }, 1200)

    // Auth kontrol et ve yönlendir
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
          // Class seçmiş mi? (hata olursa Main'e gönder — class zaten seçilmiş olabilir)
          const { data: player, error } = await supabase
            .from('players')
            .select('class_type')
            .eq('id', session.user.id)
            .single()

          if (error || !player) {
            // Query başarısız — yine de Main'e gönder (güvenli taraf)
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
    } catch (err) {
      navigation.replace('Login')
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Arka plan efekti */}
      <View style={styles.bgGrid} />

      {/* Glow efekti */}
      <Animated.View
        style={[styles.glow, { opacity: glowOpacity }]}
      />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        {/* Echo Rift Logo */}
        <Text style={styles.logoText}>ECHO</Text>
        <View style={styles.logoLine} />
        <Text style={styles.logoTextSub}>RIFT</Text>
        <Text style={styles.logoTagline}>FOLLOW THE SIGNAL</Text>
      </Animated.View>

      {/* Alt çizgi */}
      <Animated.View style={[styles.dividerLine, { width: lineWidth }]} />

      {/* Loading mesajı */}
      <Animated.Text style={[styles.loadingText, { opacity: messageOpacity }]}>
        {message}
      </Animated.Text>

      {/* Loading dots */}
      <Animated.View style={[styles.dotsContainer, { opacity: messageOpacity }]}>
        {[0, 1, 2].map((i) => (
          <LoadingDot key={i} delay={i * 200} />
        ))}
      </Animated.View>

      {/* Version */}
      <Text style={styles.version}>v0.1.0 — Alpha-0</Text>
    </View>
  )
}

// Loading dot animasyonu
function LoadingDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [])

  return (
    <Animated.View style={[styles.dot, { opacity }]} />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgGrid: {
    position: 'absolute',
    inset: 0,
    opacity: 0.03,
    backgroundColor: 'transparent',
  },
  glow: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
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
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 60,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.neonGreen,
  },
  version: {
    position: 'absolute',
    bottom: 32,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
})