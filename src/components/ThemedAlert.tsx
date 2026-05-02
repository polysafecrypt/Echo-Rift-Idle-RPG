// =============================================
// ECHO RIFT — THEMED ALERT (BULLETPROOF VERSION)
// Native Alert.alert() drop-in replacement
// Hologram temalı, ultra güvenli
// =============================================

import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, Dimensions, BackHandler,
} from 'react-native'
import { COLORS } from '../constants'

const { width } = Dimensions.get('window')

export type AlertButton = {
  text: string
  style?: 'default' | 'cancel' | 'destructive'
  onPress?: () => void
}

type AlertState = {
  visible: boolean
  title: string
  message?: string
  buttons: AlertButton[]
}

// ─── GLOBAL STATE — singleton pattern ────────────────────────────────────────
let setStateGlobal: ((s: AlertState) => void) | null = null

// Singleton API: Alert.alert(...) gibi kullan
export const ThemedAlert = {
  alert: (title: string, message?: string, buttons?: AlertButton[]) => {
    if (!setStateGlobal) {
      console.warn('[ThemedAlert] Provider not mounted — falling back')
      return
    }
    
    // Defensive değer kontrolü
    const safeTitle = String(title || 'Alert')
    const safeMessage = message ? String(message) : undefined
    const safeButtons = Array.isArray(buttons) && buttons.length > 0 
      ? buttons.map(btn => ({
          text: String(btn.text || 'OK'),
          style: btn.style || 'default',
          onPress: btn.onPress
        }))
      : [{ text: 'OK', style: 'default' as const }]
    
    setStateGlobal({
      visible: true,
      title: safeTitle,
      message: safeMessage,
      buttons: safeButtons,
    })
  },
}

// ─── PROVIDER — App.tsx'in en üstüne yerleştir ───────────────────────────────
export function ThemedAlertProvider() {
  const [state, setState] = useState<AlertState>({
    visible: false, 
    title: '', 
    message: undefined, 
    buttons: [],
  })

  useEffect(() => {
    setStateGlobal = setState
    return () => { setStateGlobal = null }
  }, [])

  const fadeAnim  = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current

  useEffect(() => {
    if (state.visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 120, friction: 9, useNativeDriver: true }),
      ]).start()
    } else {
      fadeAnim.setValue(0)
      scaleAnim.setValue(0.9)
    }
  }, [state.visible])

  // Android back butonu — cancel varsa onu çağır
  useEffect(() => {
    if (!state.visible) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const cancelBtn = state.buttons.find(b => b.style === 'cancel')
      if (cancelBtn) {
        handlePress(cancelBtn)
        return true
      }
      return true // dismiss outside not allowed
    })
    return () => sub.remove()
  }, [state.visible, state.buttons])

  const handlePress = (btn: AlertButton) => {
    setState(s => ({ ...s, visible: false }))
    setTimeout(() => {
      if (typeof btn.onPress === 'function') {
        btn.onPress()
      }
    }, 50)
  }

  // Early return if not visible
  if (!state.visible) return null

  return (
    <Modal visible={true} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          
          {/* Hologram köşeler */}
          <View style={[styles.corner, styles.cTL]} />
          <View style={[styles.corner, styles.cTR]} />
          <View style={[styles.corner, styles.cBL]} />
          <View style={[styles.corner, styles.cBR]} />

          {/* Üst aksan çizgi */}
          <View style={styles.topAccent} />

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>
              {(state.title || 'ALERT').toUpperCase()}
            </Text>
            {state.message && state.message.length > 0 ? (
              <Text style={styles.message}>{state.message}</Text>
            ) : null}
          </View>

          {/* Butonlar */}
          <View style={[
            styles.buttonRow,
            (state.buttons.length === 1) ? styles.buttonRowCenter : null,
          ]}>
            {state.buttons.map((btn, i) => {
              const isDestructive = btn.style === 'destructive'
              const isCancel = btn.style === 'cancel'
              
              let color: string = COLORS.neonGreen
              if (isDestructive && COLORS.error) {
                color = COLORS.error
              } else if (isCancel && COLORS.textMuted) {
                color = COLORS.textMuted
              }

              const buttonStyle = [
                styles.button,
                { borderColor: color + '70' },
                (state.buttons.length === 1) ? styles.buttonSolo : styles.buttonFlex,
                (i > 0) ? { marginLeft: 8 } : null,
              ].filter(Boolean) // Filter out null values
              
              return (
                <TouchableOpacity
                  key={String(i)}
                  style={buttonStyle}
                  onPress={() => handlePress(btn)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.buttonText, { color }]}>
                    {(btn.text || 'OK').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
          
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: Math.min(width - 48, 360),
    backgroundColor: 'rgba(2,6,8,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.35)',
    borderRadius: 4,
    paddingTop: 22,
    paddingBottom: 14,
    paddingHorizontal: 18,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 12, 
    height: 12,
    borderColor: COLORS.cyan || '#00D4FF',
  },
  cTL: { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 },
  cTR: { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2 },
  cBL: { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2 },
  cBR: { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: '15%',
    right: '15%',
    height: 1,
    backgroundColor: COLORS.cyan || '#00D4FF',
    opacity: 0.5,
  },
  content: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    color: '#E8E8E8',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 19,
    letterSpacing: 0.3,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  buttonRowCenter: {
    justifyContent: 'center',
  },
  button: {
    borderWidth: 1,
    backgroundColor: 'rgba(2,6,8,0.4)',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 2,
    alignItems: 'center',
  },
  buttonSolo: {
    minWidth: 140,
  },
  buttonFlex: {
    flex: 1,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
})