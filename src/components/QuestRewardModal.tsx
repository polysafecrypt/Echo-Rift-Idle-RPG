// =============================================
// ECHO RIFT — QUEST REWARD MODAL
// =============================================

import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  Dimensions, Modal,
} from 'react-native'
import { COLORS } from '../constants'

const { width, height } = Dimensions.get('window')

interface QuestRewardModalProps {
  visible: boolean
  data: {
    questName: string
    xp: number
    gold: number
    items: number
    salvage?: number
    quantum?: number
    rift?: number
  } | null
  onDismiss: () => void
}

export default function QuestRewardModal({ visible, data, onDismiss }: QuestRewardModalProps) {
  const scaleAnim    = useRef(new Animated.Value(0.5)).current
  const opacityAnim  = useRef(new Animated.Value(0)).current
  const glowAnim     = useRef(new Animated.Value(0)).current
  const slideAnims   = useRef([0,1,2,3,4,5].map(() => new Animated.Value(40))).current
  const fadeAnims    = useRef([0,1,2,3,4,5].map(() => new Animated.Value(0))).current
  const checkAnim    = useRef(new Animated.Value(0)).current
  const [particles, setParticles] = useState<{x:number,y:number,size:number,opacity:Animated.Value}[]>([])

  useEffect(() => {
    if (visible && data) {
      // Reset
      scaleAnim.setValue(0.5)
      opacityAnim.setValue(0)
      glowAnim.setValue(0)
      checkAnim.setValue(0)
      slideAnims.forEach(a => a.setValue(40))
      fadeAnims.forEach(a => a.setValue(0))

      // Particle'lar oluştur
      const newParticles = Array.from({ length: 12 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height * 0.6,
        size: 4 + Math.random() * 8,
        opacity: new Animated.Value(0),
      }))
      setParticles(newParticles)

      // Ana animasyon
      Animated.sequence([
        // 1. Modal giriş
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        // 2. Check animasyonu
        Animated.timing(checkAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        // 3. Reward itemler sırayla gelir
        Animated.stagger(80, slideAnims.map((anim, i) =>
          Animated.parallel([
            Animated.spring(anim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
            Animated.timing(fadeAnims[i], { toValue: 1, duration: 200, useNativeDriver: true }),
          ])
        )),
      ]).start()

      // Glow loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
        ])
      ).start()

      // Particle animasyonları
      newParticles.forEach((p, i) => {
        Animated.sequence([
          Animated.delay(i * 60),
          Animated.parallel([
            Animated.timing(p.opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(p.opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
          ]),
        ]).start()
      })

    } else {
      glowAnim.stopAnimation()
    }
  }, [visible, data])

  if (!visible || !data) return null

  const rewards = [
    { icon: '✨', label: 'XP',     value: `+${data.xp.toLocaleString()}`,  color: COLORS.cyan,      show: data.xp > 0 },
    { icon: '🪙', label: 'GOLD',   value: `+${data.gold.toLocaleString()}`, color: COLORS.gold,      show: data.gold > 0 },
    { icon: '🎁', label: 'ITEMS',  value: `+${data.items}`,                color: COLORS.epic,      show: data.items > 0 },
    { icon: '🔩', label: 'SALVAGE',value: `+${data.salvage}`,              color: '#F97316',        show: !!data.salvage },
    { icon: '🔮', label: 'QUANTUM',value: `+${data.quantum}`,              color: '#A855F7',        show: !!data.quantum },
    { icon: '💠', label: 'RIFT',   value: `+${data.rift}`,                 color: COLORS.cyan,      show: !!data.rift },
  ].filter(r => r.show)

  const checkScale = checkAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.3, 1],
  })

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.6],
  })

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        {/* Particles */}
        {particles.map((p, i) => (
          <Animated.Text
            key={i}
            style={[styles.particle, {
              left: p.x, top: p.y,
              fontSize: p.size,
              opacity: p.opacity,
            }]}
          >
            ⭐
          </Animated.Text>
        ))}

        <Animated.View style={[styles.modal, {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }]}>
          {/* Glow efekti */}
          <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

          {/* Check ikonu */}
          <Animated.View style={[styles.checkContainer, { transform: [{ scale: checkScale }] }]}>
            <Text style={styles.checkIcon}>✅</Text>
          </Animated.View>

          {/* Başlık */}
          <Text style={styles.title}>MISSION COMPLETE</Text>
          <Text style={styles.questName}>{data.questName}</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Rewards */}
          <View style={styles.rewardsGrid}>
            {rewards.map((reward, i) => (
              <Animated.View
                key={i}
                style={[styles.rewardItem, {
                  transform: [{ translateY: slideAnims[i] }],
                  opacity: fadeAnims[i],
                  borderColor: reward.color + '40',
                }]}
              >
                <Text style={styles.rewardIcon}>{reward.icon}</Text>
                <Text style={[styles.rewardValue, { color: reward.color }]}>
                  {reward.value}
                </Text>
                <Text style={styles.rewardLabel}>{reward.label}</Text>
              </Animated.View>
            ))}
          </View>

          {/* Tap to continue */}
          <TouchableOpacity style={styles.continueBtn} onPress={onDismiss} activeOpacity={0.8}>
            <Text style={styles.continueBtnText}>TAP TO CONTINUE</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 15, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    zIndex: 0,
  },
  modal: {
    width: width * 0.80,
    backgroundColor: COLORS.bgPanel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.neonGreen + '60',
    padding: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    zIndex: 1,
  },
  glow: {
    position: 'absolute',
    top: -50, left: -50, right: -50, bottom: -50,
    backgroundColor: COLORS.neonGreen,
    borderRadius: 20,
  },
  checkContainer: {
    marginBottom: 12,
  },
  checkIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.neonGreen,
    letterSpacing: 3,
    marginBottom: 4,
  },
  questName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 1,
    marginBottom: 14,
    textAlign: 'center',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 14,
  },
  rewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
    width: '100%',
  },
  rewardItem: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    minWidth: (width * 0.80 - 40 - 10) / 3,
    gap: 3,
  },
  rewardIcon:  { fontSize: 20 },
  rewardValue: { fontSize: 14, fontWeight: '900' },
  rewardLabel: { fontSize: 7, color: COLORS.textMuted, letterSpacing: 2 },
  continueBtn: {
    borderWidth: 1,
    borderColor: COLORS.neonGreen,
    borderRadius: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  continueBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.neonGreen,
    letterSpacing: 3,
  },
})
