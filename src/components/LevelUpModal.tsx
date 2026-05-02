// =============================================
// ECHO RIFT — LEVEL UP MODAL
// =============================================

import React, { useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  Dimensions, Modal,
} from 'react-native'
import { COLORS, CLASS_INFO } from '../constants'

const { width } = Dimensions.get('window')

interface LevelUpModalProps {
  visible: boolean
  level: number
  classType: string
  onDismiss: () => void
}

export default function LevelUpModal({ visible, level, classType, onDismiss }: LevelUpModalProps) {
  const overlayOpacity = useRef(new Animated.Value(0)).current
  const cardScale      = useRef(new Animated.Value(0.5)).current
  const cardOpacity    = useRef(new Animated.Value(0)).current
  const levelScale     = useRef(new Animated.Value(0)).current
  const pulseScale     = useRef(new Animated.Value(1)).current
  const titleOpacity   = useRef(new Animated.Value(0)).current
  const titleSlide     = useRef(new Animated.Value(20)).current
  const bonusOpacity   = useRef(new Animated.Value(0)).current
  const btnOpacity     = useRef(new Animated.Value(0)).current

  const classInfo = CLASS_INFO[classType as keyof typeof CLASS_INFO]
  const glowColor = classInfo?.color || COLORS.neonGreen

  useEffect(() => {
    if (!visible) return

    overlayOpacity.setValue(0)
    cardScale.setValue(0.5)
    cardOpacity.setValue(0)
    levelScale.setValue(0)
    pulseScale.setValue(1)
    titleOpacity.setValue(0)
    titleSlide.setValue(20)
    bonusOpacity.setValue(0)
    btnOpacity.setValue(0)

    Animated.sequence([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(cardScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
      Animated.spring(levelScale, { toValue: 1, tension: 50, friction: 5, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(titleSlide, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(bonusOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(btnOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.06, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseScale, { toValue: 1.0, duration: 700, useNativeDriver: true }),
        ])
      ).start()
    })
  }, [visible])

  if (!visible) return null

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}> 
        <TouchableOpacity style={styles.overlayTouch} onPress={onDismiss} activeOpacity={1}>
          <Animated.View style={[styles.card, {
            transform: [{ scale: cardScale }],
            opacity: cardOpacity,
          }]}> 

            {/* Glow - static */}
            <View style={[styles.glow, { backgroundColor: glowColor, opacity: 0.1 }]} />

            {/* Shine - static or removed */}
            {/* <View style={[styles.shine]} /> */}

            <Text style={styles.classIcon}>{classInfo?.icon || '⚡'}</Text>

            <Animated.Text style={[styles.levelUpText, {
              color: glowColor,
              opacity: titleOpacity,
              transform: [{ translateY: titleSlide }],
            }]}> 
              LEVEL UP!
            </Animated.Text>

            <Animated.View style={[styles.levelBadge, {
              borderColor: glowColor,
              transform: [{ scale: Animated.multiply(levelScale, pulseScale) }],
            }]}> 
              {/* Glow inside badge - static */}
              <View style={[styles.levelBadgeGlow, { backgroundColor: glowColor, opacity: 0.15 }]} />
              <Text style={styles.levelPre}>LEVEL</Text>
              <Text style={[styles.levelNum, { color: glowColor }]}>{level}</Text>
            </Animated.View>

            <View style={[styles.divider, { backgroundColor: glowColor + '30' }]} />

            <Animated.View style={[styles.infoBox, { opacity: bonusOpacity }]}> 
              <Text style={styles.infoText}>🎉 You reached Level {level}!</Text>
              <Text style={styles.infoText}>⚔️ New dungeons and challenges await</Text>
            </Animated.View>

            <Animated.View style={[{ width: '100%' }, { opacity: btnOpacity }]}> 
              <TouchableOpacity style={[styles.continueBtn, { borderColor: glowColor }]} onPress={onDismiss}>
                <Text style={[styles.continueBtnText, { color: glowColor }]}>TAP TO CONTINUE</Text>
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.tapNote}>or tap anywhere to dismiss</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 12, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTouch: {
    flex: 1, width: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    width: width * 0.82,
    backgroundColor: '#080F18',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1A2A3A',
    padding: 28,
    alignItems: 'center',
    overflow: 'hidden',
    gap: 14,
  },
  glow: {
    position: 'absolute',
    top: -100, left: -100, right: -100, bottom: -100,
  },
  shine: {
    position: 'absolute',
    top: -200, bottom: -200,
    width: 50,
    backgroundColor: 'rgba(255,255,255,0.07)',
    zIndex: 1,
  },
  classIcon:    { fontSize: 48 },
  levelUpText:  { fontSize: 30, fontWeight: '900', letterSpacing: 6, textAlign: 'center' },
  levelBadge: {
    borderWidth: 2, borderRadius: 16,
    paddingHorizontal: 36, paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  levelBadgeGlow: {
    position: 'absolute',
    top: -50, left: -50, right: -50, bottom: -50,
  },
  levelPre:  { fontSize: 10, color: '#3D5A73', letterSpacing: 4, fontWeight: '700' },
  levelNum:  { fontSize: 64, fontWeight: '900', lineHeight: 72 },
  divider:   { width: '80%', height: 1 },
  infoBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10, borderWidth: 1, borderColor: '#1A2A3A',
    padding: 14, gap: 8,
  },
  infoText:  { fontSize: 12, color: '#8899AA', letterSpacing: 0.5 },
  continueBtn: {
    borderWidth: 1, borderRadius: 8,
    paddingVertical: 14, alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  continueBtnText: { fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  tapNote: { fontSize: 9, color: '#1E2A3A', letterSpacing: 1, marginTop: -6 },
})
