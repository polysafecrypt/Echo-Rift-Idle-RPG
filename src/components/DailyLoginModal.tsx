// =============================================
// ECHO RIFT — DAILY LOGIN REWARD MODAL
// =============================================
import React, { useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, Dimensions,
} from 'react-native'

const { width } = Dimensions.get('window')

const DAY_REWARDS = [
  { day: 1, icon: '💰', label: '100 Gold',      type: 'gold'   },
  { day: 2, icon: '💰', label: '200 Gold',      type: 'gold'   },
  { day: 3, icon: '💎', label: '5 RC',          type: 'rc'     },
  { day: 4, icon: '💰', label: '300 Gold',      type: 'gold'   },
  { day: 5, icon: '⚔️', label: 'Epic Item',     type: 'item'   },
  { day: 6, icon: '💎', label: '10 RC',         type: 'rc'     },
  { day: 7, icon: '🌟', label: 'Legendary!',   type: 'legend' },
]

const TYPE_COLORS: Record<string, string> = {
  gold:   '#F59E0B',
  rc:     '#A855F7',
  item:   '#3B82F6',
  legend: '#FF8C00',
}

interface Props {
  visible: boolean
  dayNumber: number       // 1-7
  streak: number          // toplam gün
  goldReward: number
  rcReward: number
  itemRarity: string | null
  onClose: () => void
}

export default function DailyLoginModal({
  visible, dayNumber, streak, goldReward, rcReward, itemRarity, onClose,
}: Props) {
  const scaleAnim = useRef(new Animated.Value(0.7)).current
  const opacAnim  = useRef(new Animated.Value(0)).current
  const glowAnim  = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
        Animated.timing(opacAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(glowAnim,  { toValue: 1, duration: 600, useNativeDriver: false }),
      ]).start()
    } else {
      scaleAnim.setValue(0.7)
      opacAnim.setValue(0)
      glowAnim.setValue(0)
    }
  }, [visible])

  const todayReward = DAY_REWARDS[(dayNumber - 1) % 7]
  const rc = TYPE_COLORS[todayReward?.type] || '#00D4FF'

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1], outputRange: ['rgba(0,212,255,0)', rc + '40'],
  })

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.box, { transform: [{ scale: scaleAnim }], opacity: opacAnim }]}>

          {/* Glow */}
          <Animated.View style={[styles.glow, { backgroundColor: glowColor }]} />

          {/* Başlık */}
          <Text style={styles.title}>GÜNLÜK ÖDÜL</Text>
          <Text style={styles.streakTxt}>🔥 {streak} gün üst üste</Text>

          {/* 7 günlük takvim */}
          <View style={styles.calendar}>
            {DAY_REWARDS.map((d) => {
              const isCurrent = d.day === ((dayNumber - 1) % 7) + 1
              const isPast    = d.day < ((dayNumber - 1) % 7) + 1
              return (
                <View key={d.day} style={[
                  styles.dayBox,
                  isCurrent && [styles.dayBoxCurrent, { borderColor: TYPE_COLORS[d.type] }],
                  isPast     && styles.dayBoxPast,
                ]}>
                  <Text style={[styles.dayIcon, isPast && styles.dimmed]}>{d.icon}</Text>
                  <Text style={[styles.dayNum, isCurrent && { color: TYPE_COLORS[d.type] }]}>
                    {d.day}
                  </Text>
                  {isPast && <View style={styles.checkOverlay}><Text style={styles.checkTxt}>✓</Text></View>}
                </View>
              )
            })}
          </View>

          {/* Bugünkü ödül */}
          <View style={[styles.rewardBox, { borderColor: rc }]}>
            <Text style={styles.rewardIcon}>{todayReward?.icon || '🎁'}</Text>
            <View>
              <Text style={styles.rewardLabel}>BUGÜNKÜ ÖDÜL</Text>
              <View style={styles.rewardRow}>
                {goldReward > 0 && (
                  <Text style={styles.rewardGold}>💰 +{goldReward.toLocaleString()} Gold</Text>
                )}
                {rcReward > 0 && (
                  <Text style={styles.rewardRc}>💎 +{rcReward} RC</Text>
                )}
                {itemRarity && (
                  <Text style={[styles.rewardItem, { color: rc }]}>⚔️ {itemRarity} Item!</Text>
                )}
              </View>
            </View>
          </View>

          {/* Sonraki ödül hint */}
          {dayNumber % 7 !== 0 && (
            <Text style={styles.nextHint}>
              Yarın: {DAY_REWARDS[dayNumber % 7]?.icon} {DAY_REWARDS[dayNumber % 7]?.label}
            </Text>
          )}

          <TouchableOpacity style={[styles.claimBtn, { borderColor: rc }]} onPress={onClose}>
            <Text style={[styles.claimBtnTxt, { color: rc }]}>TOPLA ✓</Text>
          </TouchableOpacity>

        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  box:           { backgroundColor: '#060F1E', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,212,255,0.25)', padding: 24, width: '100%', maxWidth: 380, overflow: 'hidden' },
  glow:          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  title:         { fontSize: 20, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: 3 },
  streakTxt:     { fontSize: 13, color: '#F59E0B', textAlign: 'center', marginTop: 4, marginBottom: 16, fontWeight: '700' },

  calendar:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  dayBox:        { width: (width - 96) / 7, aspectRatio: 0.9, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)', position: 'relative' },
  dayBoxCurrent: { borderWidth: 2, backgroundColor: 'rgba(255,255,255,0.08)' },
  dayBoxPast:    { backgroundColor: 'rgba(0,255,136,0.06)', borderColor: 'rgba(0,255,136,0.2)' },
  dayIcon:       { fontSize: 14 },
  dayNum:        { fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '700', marginTop: 2 },
  dimmed:        { opacity: 0.5 },
  checkOverlay:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,255,136,0.15)', borderRadius: 8 },
  checkTxt:      { fontSize: 16, color: '#00FF88', fontWeight: '900' },

  rewardBox:     { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.04)' },
  rewardIcon:    { fontSize: 36 },
  rewardLabel:   { fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 4 },
  rewardRow:     { gap: 4 },
  rewardGold:    { fontSize: 16, fontWeight: '900', color: '#F59E0B' },
  rewardRc:      { fontSize: 16, fontWeight: '900', color: '#A855F7' },
  rewardItem:    { fontSize: 16, fontWeight: '900' },

  nextHint:      { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginBottom: 16 },
  claimBtn:      { borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  claimBtnTxt:   { fontSize: 16, fontWeight: '900', letterSpacing: 3 },
})
