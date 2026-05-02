// =============================================
// ECHO RIFT — NETWORK MONITOR
// =============================================

import React, { useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native'
import NetInfo from '@react-native-community/netinfo'

export default function NetworkMonitor({ navigationRef }: { navigationRef: any }) {
  const [isOffline, setIsOffline] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [reconnecting, setReconnecting] = useState(false)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const opacityAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected || !state.isInternetReachable
      if (offline) {
        setIsOffline(true)
        setCountdown(5)
        startPulse()
        startCountdown()
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start()
      } else {
        setIsOffline(false)
        setReconnecting(false)
        if (countdownRef.current) clearInterval(countdownRef.current)
        pulseAnim.stopAnimation()
        pulseAnim.setValue(1)
        Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start()
      }
    })

    return () => {
      unsubscribe()
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    ).start()
  }

  const startCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    let count = 5
    setCountdown(count)
    countdownRef.current = setInterval(() => {
      count--
      setCountdown(count)
      if (count <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current)
        NetInfo.fetch().then(state => {
          if (!state.isConnected || !state.isInternetReachable) {
            navigationRef.current?.reset({ index: 0, routes: [{ name: 'Login' }] })
          } else {
            setIsOffline(false)
            Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start()
          }
        })
      }
    }, 1000)
  }

  const handleRetry = async () => {
    setReconnecting(true)
    const state = await NetInfo.fetch()
    if (state.isConnected && state.isInternetReachable) {
      setIsOffline(false)
      if (countdownRef.current) clearInterval(countdownRef.current)
      Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start()
    } else {
      setReconnecting(false)
      setCountdown(5)
      startCountdown()
    }
  }

  if (!isOffline) return null

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
      <View style={styles.content}>
        <Animated.Text style={[styles.icon, { transform: [{ scale: pulseAnim }] }]}>
          📡
        </Animated.Text>
        <Text style={styles.title}>SIGNAL LOST</Text>
        <Text style={styles.subtitle}>Connection interrupted</Text>
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownLabel}>Reconnecting in</Text>
          <Text style={styles.countdown}>{countdown}</Text>
        </View>
        <View style={styles.dotsRow}>
          <View style={styles.dot} />
          <View style={[styles.dot, { opacity: 0.6 }]} />
          <View style={[styles.dot, { opacity: 0.3 }]} />
        </View>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} disabled={reconnecting}>
          <Text style={styles.retryBtnText}>
            {reconnecting ? 'CHECKING...' : 'RETRY NOW'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.note}>Returning to login in {countdown}s...</Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(5, 10, 15, 0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  content: { alignItems: 'center', padding: 32 },
  icon: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '900', color: '#FF4444', letterSpacing: 6, marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#3D5A73', letterSpacing: 2, marginBottom: 32 },
  countdownContainer: { alignItems: 'center', marginBottom: 16 },
  countdownLabel: { fontSize: 11, color: '#3D5A73', letterSpacing: 2, marginBottom: 4 },
  countdown: { fontSize: 56, fontWeight: '900', color: '#FF4444' },
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4444' },
  retryBtn: { borderWidth: 1, borderColor: '#FF4444', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12, marginBottom: 16 },
  retryBtnText: { fontSize: 13, fontWeight: '800', color: '#FF4444', letterSpacing: 2 },
  note: { fontSize: 10, color: '#3D5A73', letterSpacing: 1 },
})