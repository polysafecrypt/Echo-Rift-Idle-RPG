// =============================================
// ECHO RIFT — QUEST BOTTOM SHEET
// =============================================

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, PanResponder, Alert,
} from 'react-native'
import { COLORS, QUEST_CONFIGS } from '../constants'
import { QuestDurationKey, ActiveQuest } from '../types'
import { ThemedAlert } from './ThemedAlert'

const { height, width } = Dimensions.get('window')
const SHEET_HEIGHT = height * 0.52
const SNAP_CLOSE   = SHEET_HEIGHT * 0.45  // bu kadar sürüklenirse kapanır

interface Props {
  visible: boolean
  onClose: () => void
  playerState: any
  userId: string | null
  onStartQuest: (key: QuestDurationKey) => Promise<void>
  onCancelQuest: (quest: ActiveQuest) => Promise<void>
  tick: number  // her saniye değişen tick → timer günceller
}

export default function QuestBottomSheet({
  visible, onClose, playerState, userId,
  onStartQuest, onCancelQuest, tick,
}: Props) {
  const translateY  = useRef(new Animated.Value(SHEET_HEIGHT)).current
  const overlayOpacity = useRef(new Animated.Value(0)).current
  const [loading, setLoading] = useState<string | null>(null)

  // ─── OPEN / CLOSE ANİMASYON ──────────────────
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0, tension: 65, friction: 11, useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1, duration: 250, useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT, duration: 300, useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0, duration: 250, useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible])

  // ─── PAN RESPONDER (sürükle kapat) ───────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy)
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > SNAP_CLOSE || g.vy > 0.5) {
          onClose()
        } else {
          Animated.spring(translateY, {
            toValue: 0, tension: 65, friction: 11, useNativeDriver: true,
          }).start()
        }
      },
    })
  ).current

  // ─── HELPERS ─────────────────────────────────
  const getStaminaInfo = useCallback(() => {
    if (!playerState) return { current: 0, nextRegenText: '' }
    const { player } = playerState
    const lastUpdate = new Date(player.last_stamina_update).getTime()
    const elapsed    = Math.floor((Date.now() - lastUpdate) / 1000)
    const regenned   = Math.floor(elapsed / 1800)
    const current    = Math.min(player.stamina_max, player.stamina_current + regenned)
    const nextRegen  = 1800 - (elapsed % 1800)
    const m = Math.floor(nextRegen / 60)
    const s = nextRegen % 60
    return {
      current,
      nextRegenText: current < player.stamina_max
        ? `+1 in ${m}:${s.toString().padStart(2, '0')}`
        : 'FULL',
    }
  }, [playerState, tick])

  const getQuestTimeLeft = useCallback(() => {
    const q = playerState?.active_quest
    if (!q?.ends_at) return null
    const diff = Math.max(0, Math.floor((new Date(q.ends_at).getTime() - Date.now()) / 1000))
    if (diff === 0) return 'READY!'
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    const s = diff % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }, [playerState, tick])

  const getQuestProgress = useCallback(() => {
    const q = playerState?.active_quest
    if (!q?.ends_at || !q?.started_at) return 0
    const total   = new Date(q.ends_at).getTime() - new Date(q.started_at).getTime()
    const elapsed = Date.now() - new Date(q.started_at).getTime()
    return Math.min(1, elapsed / total)
  }, [playerState, tick])

  const handleStartQuest = async (key: QuestDurationKey) => {
    setLoading(key)
    try { await onStartQuest(key) }
    finally { setLoading(null) }
  }

  const handleCancelQuest = async (quest: ActiveQuest) => {
    ThemedAlert.alert(
      'Cancel Quest',
      `Cancel "${quest.name}"?\nStamina will be refunded.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Quest', style: 'destructive',
          onPress: async () => {
            await onCancelQuest(quest)
          },
        },
      ]
    )
  }

  if (!playerState) return null

  const { player, active_quest, queued_quests } = playerState
  const { current: staminaCurrent, nextRegenText } = getStaminaInfo()
  const questTime     = getQuestTimeLeft()
  const questProgress = getQuestProgress()
  const maxSlots      = player.pass_type === 'gold' ? 5 : player.pass_type === 'silver' ? 4 : 2
  const activeCount   = (active_quest ? 1 : 0) + (queued_quests?.length || 0)

  return (
    <>
      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} pointerEvents={visible ? 'box-none' : 'none'}>

        {/* Drag handle + X butonu — tüm üst alan sürüklenebilir */}
        <View {...panResponder.panHandlers} style={styles.dragArea}>
          <View style={styles.dragHandle} />
          <TouchableOpacity
            style={styles.closeX}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeXText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>MISSIONS</Text>
        </View>

        {/* Aktif Quest */}
        {active_quest ? (
          <View style={styles.activeCard}>
            <View style={styles.activeCardHeader}>
              <Text style={styles.activeLabel}>📡 ACTIVE</Text>
              <Text style={[
                styles.activeTimer,
                questTime === 'READY!' && { color: COLORS.neonGreen },
              ]}>
                {questTime}
              </Text>
            </View>
            <Text style={styles.activeName}>{active_quest.name}</Text>
            <View style={styles.progressBar}>
              <Animated.View style={[styles.progressFill, { width: `${questProgress * 100}%` }]} />
            </View>
          </View>
        ) : (
          <View style={styles.noActiveCard}>
            <Text style={styles.noActiveText}>No active mission</Text>
          </View>
        )}

        {/* Queued Quests */}
        {queued_quests && queued_quests.length > 0 && (
          <View style={styles.queuedList}>
            {queued_quests.map((q: ActiveQuest) => (
              <View key={q.id} style={styles.queuedItem}>
                <Text style={styles.queuedName}>{q.name}</Text>
                <View style={styles.queuedRight}>
                  <Text style={styles.queuedStatus}>QUEUED</Text>
                  <TouchableOpacity onPress={() => handleCancelQuest(q)} style={styles.cancelBtn}>
                    <Text style={styles.cancelText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Quest Başlatma Butonları */}
        {activeCount < maxSlots && (
          <View style={styles.startSection}>
            <Text style={styles.startLabel}>
              {active_quest ? '+ QUEUE MISSION' : 'START MISSION'}
            </Text>
            <View style={styles.questGrid}>
              {(Object.keys(QUEST_CONFIGS) as QuestDurationKey[]).map((key) => {
                const config    = QUEST_CONFIGS[key]
                const isLocked  = (key === '4h' || key === '8h') && player.level < 10
                const canAfford = !isLocked && staminaCurrent >= config.stamina
                const isLoading = loading === key

                const borderColor = isLocked
                  ? 'rgba(255,255,255,0.08)'
                  : canAfford ? COLORS.neonGreen : COLORS.border

                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.questBtn,
                      isLocked && styles.questBtnLocked,
                      !isLocked && !canAfford && styles.questBtnDisabled,
                    ]}
                    onPress={() => handleStartQuest(key)}
                    disabled={isLocked || !canAfford || !!loading}
                    activeOpacity={0.7}
                  >
                    {/* Köşe aksan */}
                    <View style={[styles.qBtnCornerTL, { borderColor }]} />
                    <View style={[styles.qBtnCornerBR, { borderColor }]} />

                    <Text style={[styles.questDuration, {
                      color: isLocked ? 'rgba(255,255,255,0.2)' : canAfford ? COLORS.textPrimary : COLORS.textMuted,
                    }]}>
                      {key}
                    </Text>
                    <Text style={[styles.questStamina, {
                      color: isLocked ? 'rgba(255,255,255,0.15)' : canAfford ? COLORS.neonGreen : COLORS.error,
                    }]}>
                      ⚡{config.stamina}
                    </Text>

                    {/* Level gate overlay */}
                    {!!(isLocked) && (
                      <View style={styles.lockedOverlay}>
                        <Text style={styles.lockedIcon}>🔒</Text>
                        <Text style={styles.lockedText}>Lv.10</Text>
                      </View>
                    )}

                    {!!(isLoading) && (
                      <View style={styles.loadingOverlay}>
                        <Text style={{ color: COLORS.neonGreen, fontSize: 10 }}>...</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* Slot dolu uyarısı */}
        {activeCount >= maxSlots && (
          <View style={styles.fullSlotBanner}>
            <Text style={styles.fullSlotText}>
              QUEUE FULL ({activeCount}/{maxSlots}) — {player.pass_type.toUpperCase()} PASS
            </Text>
          </View>
        )}

      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', inset: 0,
    zIndex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT,
    zIndex: 100,
    backgroundColor: '#050D1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(0,212,255,0.25)',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  dragArea: {
    alignItems: 'center', paddingTop: 12, paddingBottom: 8,
    position: 'relative',
  },
  dragHandle: {
    width: 40, height: 4,
    backgroundColor: 'rgba(0,212,255,0.3)',
    borderRadius: 2,
  },
  closeX: {
    position: 'absolute', right: 0, top: 8,
    padding: 8,
  },
  closeXText: {
    fontSize: 18, color: '#FF4444', fontWeight: '700',
  },

  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 16, fontWeight: '900',
    color: COLORS.textPrimary, letterSpacing: 4,
  },
  staminaInfo: { alignItems: 'flex-end', gap: 2 },
  staminaVal: { fontSize: 13, fontWeight: '700', color: COLORS.neonGreen },
  staminaRegen: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 1 },

  // Aktif quest
  activeCard: {
    backgroundColor: 'rgba(0,212,255,0.05)',
    borderRadius: 8, borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.3)',
    padding: 12, marginBottom: 10,
  },
  activeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  activeLabel: { fontSize: 9, color: COLORS.cyan, letterSpacing: 2 },
  activeTimer: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  activeName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  progressBar: {
    height: 3, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.cyan, borderRadius: 2 },

  noActiveCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 8, borderWidth: 1,
    borderColor: COLORS.border, borderStyle: 'dashed',
    padding: 12, alignItems: 'center', marginBottom: 10,
  },
  noActiveText: { fontSize: 12, color: COLORS.textMuted },

  // Queued
  queuedList: { gap: 6, marginBottom: 10 },
  queuedItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 6, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  queuedName: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  queuedRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  queuedStatus: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 2 },
  cancelBtn: { padding: 4 },
  cancelText: { fontSize: 14, color: COLORS.error, fontWeight: '700' },

  // Start section
  startSection: { flex: 1 },
  startLabel: {
    fontSize: 9, color: COLORS.textMuted,
    letterSpacing: 3, marginBottom: 10,
  },
  questGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  questBtn: {
    width: (width - 56) / 3,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 6, borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.25)',
    paddingVertical: 10, paddingHorizontal: 8,
    alignItems: 'center', position: 'relative',
    overflow: 'hidden',
  },
  questBtnDisabled: { opacity: 0.35 },
  questBtnLocked: {
    opacity: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  lockedOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 6, gap: 2,
  },
  lockedIcon: { fontSize: 12 },
  lockedText: {
    fontSize: 9, fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
  },
  qBtnCornerTL: {
    position: 'absolute', top: -1, left: -1,
    width: 8, height: 8,
    borderTopWidth: 1.5, borderLeftWidth: 1.5,
  },
  qBtnCornerBR: {
    position: 'absolute', bottom: -1, right: -1,
    width: 8, height: 8,
    borderBottomWidth: 1.5, borderRightWidth: 1.5,
  },
  questDuration: { fontSize: 16, fontWeight: '900', marginBottom: 2 },
  questStamina: { fontSize: 11, fontWeight: '700' },
  loadingOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },

  fullSlotBanner: {
    backgroundColor: 'rgba(0,212,255,0.05)',
    borderRadius: 6, borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.2)',
    padding: 12, alignItems: 'center',
  },
  fullSlotText: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2 },
})