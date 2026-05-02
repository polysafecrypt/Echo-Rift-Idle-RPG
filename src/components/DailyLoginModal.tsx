// =============================================
// ECHO RIFT — DAILY LOGIN REWARD MODAL
// =============================================
import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, Dimensions, ActivityIndicator, Easing,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { COLORS } from '../constants'

const { width } = Dimensions.get('window')

const DAY_REWARDS = [
  { day: 1, icon: '💰', label: '100 Gold',        type: 'gold'   },
  { day: 2, icon: '💰', label: '200 Gold',        type: 'gold'   },
  { day: 3, icon: '💎', label: '5 RC',            type: 'rc'     },
  { day: 4, icon: '💰', label: '300 Gold',        type: 'gold'   },
  { day: 5, icon: '⚔️', label: 'Epic Item',       type: 'item'   },
  { day: 6, icon: '💎', label: '10 RC',           type: 'rc'     },
  { day: 7, icon: '🌟', label: 'Legendary Item!', type: 'legend' },
]

const TYPE_COLORS: Record<string, string> = {
  gold:   '#FFD700',
  rc:     '#00D4FF',
  item:   '#8B5CF6',
  legend: '#FF8C00',
}

interface RewardData {
  has_reward:   boolean
  day_number:   number
  streak:       number
  gold_reward:  number
  rc_reward:    number
  item_rarity:  string | null
}

interface Props {
  visible:    boolean
  onClose:    () => void
  onClaimed?: () => void
}

export default function DailyLoginModal({ visible, onClose, onClaimed }: Props) {
  const [loading,  setLoading]  = useState(true)
  const [reward,   setReward]   = useState<RewardData | null>(null)
  const [claimed,  setClaimed]  = useState(false)

  const scaleAnim   = useRef(new Animated.Value(0.75)).current
  const opacAnim    = useRef(new Animated.Value(0)).current
  const glowAnim    = useRef(new Animated.Value(0)).current
  const legendPulse = useRef(new Animated.Value(0)).current

  const fetchReward = useCallback(async () => {
    setLoading(true)
    setClaimed(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { onClose(); return }

    const { data, error } = await supabase.rpc('get_and_mark_login_reward', {
      p_player_id: user.id,
    })

    if (error || !data?.success || !data?.has_reward) {
      onClose()
      return
    }

    setReward(data as RewardData)
    setLoading(false)
  }, [onClose])

  useEffect(() => {
    if (visible) {
      fetchReward()
    } else {
      scaleAnim.setValue(0.75)
      opacAnim.setValue(0)
      glowAnim.setValue(0)
      legendPulse.setValue(0)
      setLoading(true)
      setReward(null)
      setClaimed(false)
    }
  }, [visible])

  useEffect(() => {
    if (!loading && reward) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6,   useNativeDriver: true }),
        Animated.timing(opacAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(glowAnim,  { toValue: 1, duration: 700, useNativeDriver: false }),
      ]).start()

      if (reward.day_number % 7 === 0) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(legendPulse, { toValue: 1, duration: 900, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
            Animated.timing(legendPulse, { toValue: 0, duration: 900, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
          ])
        ).start()
      }
    }
  }, [loading, reward])

  const handleCollect = () => {
    setClaimed(true)
    onClaimed?.()
    setTimeout(onClose, 500)
  }

  if (!visible) return null

  const dayIndex    = reward ? (reward.day_number - 1) % 7 : 0
  const todaySlot   = DAY_REWARDS[dayIndex]
  const accentColor = reward ? (TYPE_COLORS[todaySlot?.type] ?? '#00D4FF') : '#00D4FF'
  const isLegendary = !!(reward?.day_number && reward.day_number % 7 === 0)

  const glowBg = glowAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['rgba(0,0,0,0)', accentColor + '22'],
  })

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>

        {!!(loading) && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#00D4FF" />
            <Text style={styles.loadingTxt}>Opening vault...</Text>
          </View>
        )}

        {!loading && reward && (
          <Animated.View style={[
            styles.box,
            { borderColor: accentColor + '66' },
            { transform: [{ scale: scaleAnim }], opacity: opacAnim },
          ]}>
            <Animated.View style={[styles.glow, { backgroundColor: glowBg }]} />

            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={styles.title}>DAILY REWARD</Text>
              {!!(isLegendary) && <Text style={styles.legendTag}>✦ LEGENDARY DAY ✦</Text>}
            </View>
            <Text style={[styles.streakTxt, { color: accentColor }]}>
              🔥 {reward.streak} day streak
            </Text>

            {/* 7-day calendar */}
            <View style={styles.calendar}>
              {DAY_REWARDS.map((d) => {
                const calDay    = (dayIndex % 7) + 1
                const isCurrent = d.day === calDay
                const isPast    = d.day < calDay
                const dotColor  = TYPE_COLORS[d.type]
                return (
                  <View key={d.day} style={[
                    styles.dayBox,
                    isCurrent && [styles.dayBoxCurrent, { borderColor: dotColor }],
                    isPast    && styles.dayBoxPast,
                  ]}>
                    <Text style={[styles.dayIcon, isPast && styles.dimmed]}>{d.icon}</Text>
                    <Text style={[styles.dayNum, isCurrent && { color: dotColor }]}>{d.day}</Text>
                    {!!(isPast) && (
                      <View style={styles.checkOverlay}>
                        <Text style={styles.checkTxt}>✓</Text>
                      </View>
                    )}
                    {!!(isCurrent) && (
                      <View style={[styles.activeDot, { backgroundColor: dotColor }]} />
                    )}
                  </View>
                )
              })}
            </View>

            {/* Reward box */}
            <View style={[styles.rewardBox, { borderColor: accentColor + '80' }]}>
              <Text style={[styles.rewardBigIcon, isLegendary && { fontSize: 52 }]}>
                {todaySlot?.icon || '🎁'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rewardLabel}>
                  TODAY'S REWARD · DAY {reward.day_number}
                </Text>
                <View style={styles.rewardValues}>
                  {reward.gold_reward > 0 && (
                    <Text style={[styles.rewardVal, { color: '#FFD700' }]}>
                      💰 +{reward.gold_reward.toLocaleString()} Gold
                    </Text>
                  )}
                  {reward.rc_reward > 0 && (
                    <Text style={[styles.rewardVal, { color: '#00D4FF' }]}>
                      💎 +{reward.rc_reward} RC
                    </Text>
                  )}
                  {!!(reward.item_rarity) && (
                    <Text style={[styles.rewardVal, { color: accentColor }]}>
                      ⚔️ {reward.item_rarity} Item
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Next hint */}
            {!isLegendary ? (
              <Text style={styles.nextHint}>
                Tomorrow → {DAY_REWARDS[dayIndex % 7]?.icon} {DAY_REWARDS[dayIndex % 7]?.label}
              </Text>
            ) : (
              <Text style={[styles.nextHint, { color: '#FFD700' }]}>
                ✦ 7-day cycle complete · New cycle starts tomorrow
              </Text>
            )}

            {/* Collect button */}
            <TouchableOpacity
              style={[styles.claimBtn, {
                borderColor: accentColor,
                backgroundColor: accentColor + '18',
              }]}
              onPress={handleCollect}
              disabled={claimed}
              activeOpacity={0.8}
            >
              <Text style={[styles.claimBtnTxt, {
                color: claimed ? 'rgba(255,255,255,0.3)' : accentColor,
              }]}>
                {claimed ? '✓ COLLECTED' : 'CLAIM ✓'}
              </Text>
            </TouchableOpacity>

          </Animated.View>
        )}

      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  loadingBox: { alignItems: 'center', gap: 14 },
  loadingTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 12, letterSpacing: 2 },

  box: {
    backgroundColor: '#0A1628',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
  },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  headerRow:  { alignItems: 'center', gap: 4, marginBottom: 4 },
  title:      { fontSize: 20, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', letterSpacing: 4 },
  legendTag:  { fontSize: 10, fontWeight: '800', color: '#FF8C00', letterSpacing: 3 },
  streakTxt:  { fontSize: 13, textAlign: 'center', fontWeight: '700', marginBottom: 16 },

  calendar:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18, gap: 4 },
  dayBox:        { flex: 1, aspectRatio: 0.85, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D1F35', position: 'relative' },
  dayBoxCurrent: { borderWidth: 2, backgroundColor: '#0A1628' },
  dayBoxPast:    { backgroundColor: 'rgba(0,255,136,0.06)', borderColor: 'rgba(0,255,136,0.25)' },
  dayIcon:       { fontSize: 13 },
  dayNum:        { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginTop: 2 },
  dimmed:        { opacity: 0.4 },
  checkOverlay:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,255,136,0.15)', borderRadius: 8 },
  checkTxt:      { fontSize: 15, color: '#00FF88', fontWeight: '900' },
  activeDot:     { position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2 },

  rewardBox:       { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12, backgroundColor: '#0D1F35' },
  rewardBigIcon:   { fontSize: 42 },
  rewardLabel:     { fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 6, fontWeight: '700' },
  rewardValues:    { gap: 3 },
  rewardVal:       { fontSize: 17, fontWeight: '900' },

  nextHint:        { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginBottom: 16, letterSpacing: 0.5 },

  claimBtn:     { borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  claimBtnTxt:  { fontSize: 16, fontWeight: '900', letterSpacing: 3 },
})