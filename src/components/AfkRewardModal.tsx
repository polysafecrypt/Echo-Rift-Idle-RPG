// =============================================
// ECHO RIFT — AFK REWARD MODAL
// Her zaman toplanabilir (oyun içi + açılışta)
// =============================================

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Modal,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { COLORS } from '../constants'

interface AfkPreview {
  minutes: number
  xp_est: number
  gold_est: number
  max_minutes: number
  is_capped: boolean
}

interface Props {
  visible: boolean
  playerId: string | null
  passType: 'free' | 'silver' | 'gold'
  onCollected: (xp: number, gold: number) => void
  onDismiss: () => void
}

export default function AfkRewardModal({
  visible, playerId, passType, onCollected, onDismiss,
}: Props) {
  const scaleAnim   = useRef(new Animated.Value(0.85)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const glowAnim    = useRef(new Animated.Value(0)).current

  const [preview,    setPreview]  = useState<AfkPreview | null>(null)
  const [collecting, setCollecting] = useState(false)
  const [collected,  setCollected] = useState<{ xp: number; gold: number } | null>(null)

  // ─── Açılış animasyonu ──────────────────
  useEffect(() => {
    if (visible) {
      loadPreview()
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1, tension: 70, friction: 10, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start()
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1,   duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
        ])
      ).start()
    } else {
      scaleAnim.setValue(0.85)
      opacityAnim.setValue(0)
      setPreview(null)
      setCollected(null)
      setCollecting(false)
    }
  }, [visible])

  const loadPreview = useCallback(async () => {
    if (!playerId) return
    const { data } = await supabase.rpc('preview_afk_rewards', { p_player_id: playerId })
    if (data) setPreview(data)
  }, [playerId])

  const handleCollect = async () => {
    if (!playerId || collecting) return
    setCollecting(true)
    try {
      const { data } = await supabase.rpc('collect_afk_rewards', { p_player_id: playerId })
      if (data?.success) {
        setCollected({ xp: data.xp_gained, gold: data.gold_gained })
        onCollected(data.xp_gained, data.gold_gained)
      }
    } finally {
      setCollecting(false)
    }
  }

  // ─── Time formatı ───────────────────────
  const formatMinutes = (min: number) => {
    if (min < 60) return `${min}m`
    const h = Math.floor(min / 60)
    const m = min % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  const passColor = passType === 'gold' ? '#FFD700' : passType === 'silver' ? '#C0C0C0' : COLORS.cyan

  const maxMinutes = passType === 'gold' ? 900 : passType === 'silver' ? 750 : 600
  const fillPct    = preview ? Math.min(preview.minutes / maxMinutes, 1) : 0

  if (!visible) return null

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Animated.View style={[
          styles.modal,
          { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
        ]}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.icon}>⚡</Text>
            <Text style={styles.title}>AFK REWARDS</Text>
            <Text style={[styles.passTag, { color: passColor, borderColor: passColor + '60' }]}>
              {passType.toUpperCase()}
            </Text>
          </View>

          {/* Toplama doldu mu? */}
          {!collected ? (
            <>
              {/* Preview */}
              {preview && (
                <>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>Time</Text>
                    <Text style={[styles.timeVal, preview.is_capped && { color: passColor }]}>
                      {formatMinutes(preview.minutes)}
                      {preview.is_capped && <Text style={styles.cappedTag}> FULL</Text>}
                    </Text>
                  </View>

                  {/* Doluluk bar */}
                  <View style={styles.barBg}>
                    <Animated.View style={[
                      styles.barFill,
                      {
                        width: `${fillPct * 100}%` as any,
                        backgroundColor: preview.is_capped ? passColor : COLORS.cyan,
                      },
                    ]} />
                    <Text style={styles.barLabel}>
                      {formatMinutes(preview.minutes)} / {formatMinutes(maxMinutes)}
                    </Text>
                  </View>

                  {/* Rewards */}
                  <View style={styles.rewardsRow}>
                    <View style={styles.rewardBox}>
                      <Text style={styles.rewardIcon}>✨</Text>
                      <Text style={styles.rewardVal}>+{preview.xp_est.toLocaleString()}</Text>
                      <Text style={styles.rewardLabel}>XP</Text>
                    </View>
                    <View style={[styles.rewardDivider]} />
                    <View style={styles.rewardBox}>
                      <Text style={styles.rewardIcon}>🪙</Text>
                      <Text style={styles.rewardVal}>+{preview.gold_est.toLocaleString()}</Text>
                      <Text style={styles.rewardLabel}>GOLD</Text>
                    </View>
                  </View>
                </>
              )}

              {/* Butonlar */}
              <View style={styles.btnRow}>
                {preview && preview.minutes >= 1 ? (
                  <TouchableOpacity
                    style={[styles.collectBtn, { borderColor: passColor }]}
                    onPress={handleCollect}
                    disabled={collecting}
                    activeOpacity={0.8}
                  >
                    <Animated.View style={{
                      opacity: glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: [0.7, 1] }),
                    }}>
                      <Text style={[styles.collectBtnText, { color: passColor }]}>
                        {collecting ? 'COLLECTING...' : 'COLLECT'}
                      </Text>
                    </Animated.View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.noRewardBox}>
                    <Text style={styles.noRewardText}>No rewards yet</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
                  <Text style={styles.dismissText}>CLOSE</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // Toplama sonucu
            <>
              <View style={styles.successBox}>
                <Text style={styles.successIcon}>🎉</Text>
                <Text style={styles.successTitle}>COLLECTED!</Text>
              </View>
              <View style={styles.rewardsRow}>
                <View style={styles.rewardBox}>
                  <Text style={styles.rewardIcon}>✨</Text>
                  <Text style={[styles.rewardVal, { color: COLORS.neonGreen }]}>
                    +{collected.xp.toLocaleString()}
                  </Text>
                  <Text style={styles.rewardLabel}>XP</Text>
                </View>
                <View style={styles.rewardDivider} />
                <View style={styles.rewardBox}>
                  <Text style={styles.rewardIcon}>🪙</Text>
                  <Text style={[styles.rewardVal, { color: '#FFD700' }]}>
                    +{collected.gold.toLocaleString()}
                  </Text>
                  <Text style={styles.rewardLabel}>GOLD</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.collectBtn} onPress={onDismiss} activeOpacity={0.8}>
                <Text style={[styles.collectBtnText, { color: COLORS.neonGreen }]}>HARIKA!</Text>
              </TouchableOpacity>
            </>
          )}

        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    width: 300,
    backgroundColor: '#050D1A',
    borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.3)',
    padding: 24,
  },

  header: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 20,
  },
  icon:  { fontSize: 20 },
  title: {
    fontSize: 15, fontWeight: '900',
    color: COLORS.textPrimary, letterSpacing: 3, flex: 1,
  },
  passTag: {
    fontSize: 9, fontWeight: '800', letterSpacing: 2,
    borderWidth: 1, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },

  timeRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeLabel: { fontSize: 12, color: COLORS.textMuted },
  timeVal:   { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  cappedTag: { fontSize: 10, color: '#FFD700' },

  barBg: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3, overflow: 'hidden',
    marginBottom: 4, position: 'relative',
  },
  barFill: { height: '100%', borderRadius: 3 },
  barLabel: {
    fontSize: 9, color: COLORS.textMuted,
    textAlign: 'right', marginBottom: 16,
  },

  rewardsRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 20,
    marginBottom: 20,
  },
  rewardBox:     { alignItems: 'center', gap: 4 },
  rewardIcon:    { fontSize: 22 },
  rewardVal:     { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary },
  rewardLabel:   { fontSize: 9, color: COLORS.textMuted, letterSpacing: 2 },
  rewardDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.08)' },

  btnRow: { gap: 10 },
  collectBtn: {
    borderWidth: 1, borderColor: COLORS.cyan,
    borderRadius: 8, paddingVertical: 12,
    alignItems: 'center',
  },
  collectBtnText: { fontSize: 13, fontWeight: '900', letterSpacing: 3 },

  dismissBtn: {
    paddingVertical: 8, alignItems: 'center',
  },
  dismissText: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2 },

  noRewardBox: {
    paddingVertical: 12, alignItems: 'center',
  },
  noRewardText: { fontSize: 12, color: COLORS.textMuted },

  successBox:   { alignItems: 'center', marginBottom: 16 },
  successIcon:  { fontSize: 36, marginBottom: 8 },
  successTitle: {
    fontSize: 18, fontWeight: '900',
    color: COLORS.neonGreen, letterSpacing: 4,
  },
})