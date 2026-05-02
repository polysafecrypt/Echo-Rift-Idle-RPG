// =============================================
// ECHO RIFT — QUEST SCREEN (FIXED)
// Queue sistemi bozulmadan düzeltildi:
// - Stamina hesabı regen dahil doğru
// - Slot/queue sayısı doğru
// - fetchPlayerState her zaman anlık çalışır (cooldown yok)
// - Toast quest adını sync result'tan alır
// =============================================

import React, { useState, useCallback, useEffect, useRef } from 'react'
import QuestRewardModal from '../components/QuestRewardModal'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import { useGame } from '../hooks/useGame'
import { COLORS, QUEST_CONFIGS } from '../constants'
import { QuestDurationKey, ActiveQuest } from '../types'
import { ThemedAlert } from '../components/ThemedAlert'

const { width } = Dimensions.get('window')

// ─── STAMINA HELPER — regen dahil güncel değer ───────────────────────────────
function calcStamina(player: any): { current: number; nextRegenText: string } {
  if (!player) return { current: 0, nextRegenText: '' }
  const lastUpdate = new Date(player.last_stamina_update).getTime()
  const elapsed = Math.floor((Date.now() - lastUpdate) / 1000)
  const regenned = Math.floor(elapsed / 1800)
  const current = Math.min(player.stamina_max, player.stamina_current + regenned)
  const nextRegen = 1800 - (elapsed % 1800)
  const m = Math.floor(nextRegen / 60)
  const s = nextRegen % 60
  return {
    current,
    nextRegenText: current < player.stamina_max
      ? `+1 in ${m}:${s.toString().padStart(2, '0')}`
      : 'FULL',
  }
}

// ─── MAX SLOTS HELPER ────────────────────────────────────────────────────────
function getMaxSlots(passType: string): number {
  if (passType === 'gold') return 5
  if (passType === 'silver') return 4
  return 2
}

export default function QuestScreen() {
  const { playerState } = useGameStore()
  const { fetchPlayerState, startQuest, cancelQuest, syncQuestQueue } = useGame()
  const [loading, setLoading] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastData, setToastData] = useState<{
    questName: string
    xp: number
    gold: number
    items: number
  } | null>(null)

  useFocusEffect(
    useCallback(() => {
      loadData()
      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }, [])
  )

  // Quest timer — aktif görevin geri sayımı
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      if (playerState?.active_quest?.ends_at) {
        const ends = new Date(playerState.active_quest.ends_at).getTime()
        const now = Date.now()
        const diff = Math.max(0, Math.floor((ends - now) / 1000))

        if (diff === 0) {
          setTimeLeft('READY!')
          // Görev bitti — queue'yu sync et ve state'i güncelle
          loadData()
        } else {
          const h = Math.floor(diff / 3600)
          const m = Math.floor((diff % 3600) / 60)
          const s = diff % 60
          if (h > 0) setTimeLeft(`${h}h ${m}m ${s}s`)
          else if (m > 0) setTimeLeft(`${m}m ${s}s`)
          else setTimeLeft(`${s}s`)
        }
      } else {
        setTimeLeft('')
      }
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [playerState?.active_quest?.ends_at])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // ✅ Önce sync — tamamlanan questleri yakala
    const syncResult = await syncQuestQueue(user.id)

    // ✅ Toast: quest adını sync result'tan al (active_quest null olabilir o an)
    if (syncResult?.completed_count > 0 && syncResult?.completed_quests?.length > 0) {
      const q = syncResult.completed_quests[0]
      if (q?.success) {
        setToastData({
          questName: q.quest_name || q.name || 'Mission Complete',
          xp: q.xp_gained || 0,
          gold: q.gold_gained || 0,
          items: q.items_earned || 0,
        })
        setToastVisible(true)
      }
    }

    // ✅ State'i her zaman anında güncelle — cooldown yok
    await fetchPlayerState(user.id)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleStartQuest = async (durationKey: QuestDurationKey) => {
    if (!userId || !playerState) return

    const config = QUEST_CONFIGS[durationKey]

    // ✅ Regen dahil güncel stamina kullan
    const { current: staminaCurrent } = calcStamina(playerState.player)

    if (staminaCurrent < config.stamina) {
      ThemedAlert.alert(
        'Insufficient Stamina',
        `Need ${config.stamina} ⚡, have ${staminaCurrent} ⚡`
      )
      return
    }

    // ✅ Slot kontrolü — her zaman güncel playerState'ten hesapla
    const maxSlots = getMaxSlots(playerState.player.pass_type)
    const activeCount =
      (playerState.active_quest ? 1 : 0) +
      (playerState.queued_quests?.length || 0)

    if (activeCount >= maxSlots) {
      ThemedAlert.alert('Queue Full', `Maximum ${maxSlots} quest slots (${playerState.player.pass_type} pass).`)
      return
    }

    try {
      setLoading(durationKey)
      const result = await startQuest(userId, durationKey)

      if (result?.success) {
        // ✅ Quest başlatıldı — anında state güncelle (cooldown bekletme)
        await fetchPlayerState(userId)
      } else {
        const errMsg = result?.error === 'INSUFFICIENT_STAMINA'
          ? `Not enough stamina. Need ${config.stamina} ⚡`
          : result?.error === 'MAX_SLOTS_REACHED'
          ? `Queue is full (${maxSlots} slots).`
          : result?.error === 'LEVEL_GATE'
          ? result?.message || 'Level too low for this quest.'
          : result?.error || 'Failed to start quest'
        ThemedAlert.alert('Error', errMsg)
      }
    } finally {
      setLoading(null)
    }
  }

  const handleCancelQuest = async (quest: ActiveQuest) => {
    if (!userId) return

    if (quest.status === 'active') {
      ThemedAlert.alert('Cannot Cancel', 'Active quests cannot be cancelled.')
      return
    }

    ThemedAlert.alert(
      'Cancel Quest',
      `Cancel "${quest.name}"?\nStamina will be refunded.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Quest',
          style: 'destructive',
          onPress: async () => {
            const result = await cancelQuest(userId, quest.id)
            if (result?.success) {
              // ✅ Anında güncelle
              await fetchPlayerState(userId)
            } else {
              ThemedAlert.alert('Error', result?.error || 'Failed to cancel quest')
            }
          },
        },
      ]
    )
  }

  if (!playerState) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>LOADING...</Text>
      </View>
    )
  }

  const { player, active_quest, queued_quests } = playerState

  // ✅ Her render'da regen dahil güncel değerleri hesapla
  const { current: staminaCurrent, nextRegenText } = calcStamina(player)
  const maxSlots = getMaxSlots(player.pass_type)
  const activeCount = (active_quest ? 1 : 0) + (queued_quests?.length || 0)
  const slotsLeft = maxSlots - activeCount

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.neonGreen}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>MISSIONS</Text>
          <Text style={styles.headerSub}>ALPHA-0 SECTOR</Text>
        </View>

        {/* Stamina Bar */}
        <View style={styles.staminaCard}>
          <View style={styles.staminaRow}>
            <Text style={styles.staminaLabel}>⚡ STAMINA</Text>
            <Text style={styles.staminaValue}>
              {staminaCurrent} / {player.stamina_max}
            </Text>
            <Text style={styles.regenText}>{nextRegenText}</Text>
          </View>
          <View style={styles.staminaBar}>
            <View
              style={[
                styles.staminaFill,
                { width: `${(staminaCurrent / player.stamina_max) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.slotRow}>
            <Text style={styles.slotText}>
              QUEUE: {activeCount}/{maxSlots} slots
              {slotsLeft > 0 ? ` (${slotsLeft} free)` : ' — FULL'}
            </Text>
            <Text style={styles.passText}>
              {player.pass_type.toUpperCase()} PASS
            </Text>
          </View>
        </View>

        {/* Aktif görev */}
        {!!(active_quest) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SLOT 1 — ACTIVE</Text>
            <QuestSlotCard
              quest={active_quest}
              timeLeft={timeLeft}
              onCancel={() => handleCancelQuest(active_quest)}
              isActive={true}
            />
          </View>
        )}

        {/* Queue */}
        {queued_quests && queued_quests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              QUEUED — {queued_quests.length} mission{queued_quests.length > 1 ? 's' : ''}
            </Text>
            {queued_quests.map((quest) => (
              <QuestSlotCard
                key={quest.id}
                quest={quest}
                timeLeft=""
                onCancel={() => handleCancelQuest(quest)}
                isActive={false}
              />
            ))}
          </View>
        )}

        {/* Görev seçenekleri — sadece slot varsa göster */}
        {slotsLeft > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {active_quest || queued_quests?.length
                ? `QUEUE NEXT MISSION (${slotsLeft} slot left)`
                : 'SELECT MISSION'}
            </Text>

            <View style={styles.questGrid}>
              {(Object.keys(QUEST_CONFIGS) as QuestDurationKey[]).map((key) => {
                const config = QUEST_CONFIGS[key]
                const canAfford = staminaCurrent >= config.stamina
                const isLoading = loading === key

                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.questCard,
                      !canAfford && styles.questCardDisabled,
                      isLoading && styles.questCardLoading,
                    ]}
                    onPress={() => handleStartQuest(key)}
                    disabled={!canAfford || !!loading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.questDuration}>
                      {key === '15s' ? '15s'
                        : key === '5m' ? '5m'
                        : key === '15m' ? '15m'
                        : key === '1h' ? '1h'
                        : key === '4h' ? '4h'
                        : '8h'}
                    </Text>

                    <Text style={styles.questName}>{config.name}</Text>

                    <View style={styles.staminaCost}>
                      <Text style={[
                        styles.staminaCostText,
                        { color: canAfford ? COLORS.neonGreen : COLORS.error }
                      ]}>
                        ⚡ {config.stamina}
                      </Text>
                    </View>

                    {(key === '4h' || key === '8h') && (
                      <View style={styles.bonusBadge}>
                        <Text style={styles.bonusText}>
                          +{key === '4h' ? '3' : '5'}% ITEMS
                        </Text>
                      </View>
                    )}

                    {!!(isLoading) && (
                      <View style={styles.loadingOverlay}>
                        <Text style={styles.loadingOverlayText}>...</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <QuestRewardModal
        visible={toastVisible}
        data={toastData}
        onDismiss={() => { setToastVisible(false); setToastData(null) }}
      />
    </View>
  )
}

// ─── QUEST SLOT CARD ──────────────────────────────────────────────────────────
function QuestSlotCard({
  quest,
  timeLeft,
  onCancel,
  isActive,
}: {
  quest: ActiveQuest
  timeLeft: string
  onCancel: () => void
  isActive: boolean
}) {
  const spinAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start()
    } else {
      spinAnim.stopAnimation()
    }
  }, [isActive])

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  // Progress bar hesabı
  const progressPct = (() => {
    if (!isActive || !quest.ends_at || !quest.started_at) return 0
    const total = new Date(quest.ends_at).getTime() - new Date(quest.started_at).getTime()
    const elapsed = Date.now() - new Date(quest.started_at).getTime()
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  })()

  return (
    <View style={[
      styles.slotCard,
      isActive && { borderColor: COLORS.neonGreen },
    ]}>
      <View style={styles.slotCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.slotCardName}>{quest.name}</Text>
          <Text style={styles.slotCardStamina}>
            ⚡ {quest.stamina_spent} stamina
          </Text>
        </View>
        <View style={styles.slotCardRight}>
          {isActive ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Animated.Text style={{ fontSize: 18, transform: [{ rotate: spin }] }}>
                ◈
              </Animated.Text>
              <Text style={styles.activeTimer}>{timeLeft}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.queuedText}>QUEUED</Text>
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelText}>CANCEL</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {!!(isActive) && (
        <View style={styles.activeBar}>
          <View
            style={[
              styles.activeBarFill,
              { width: `${progressPct}%` },
            ]}
          />
        </View>
      )}
    </View>
  )
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText:      { color: COLORS.neonGreen, letterSpacing: 4 },
  header:           { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  headerTitle:      { fontSize: 28, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 4 },
  headerSub:        { fontSize: 11, color: COLORS.textMuted, letterSpacing: 4, marginTop: 2 },

  staminaCard: {
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: COLORS.bgCard, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border, padding: 14,
  },
  staminaRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  staminaLabel:  { fontSize: 11, color: COLORS.textSecondary, letterSpacing: 2, flex: 1 },
  staminaValue:  { fontSize: 14, fontWeight: '800', color: COLORS.neonGreen },
  regenText:     { fontSize: 10, color: COLORS.textMuted },
  staminaBar:    { height: 6, backgroundColor: COLORS.bgPanel, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  staminaFill:   { height: '100%', backgroundColor: COLORS.neonGreen, borderRadius: 3 },
  slotRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  slotText:      { fontSize: 10, color: COLORS.textMuted, letterSpacing: 1 },
  passText:      { fontSize: 10, color: COLORS.gold, letterSpacing: 1 },

  section:      { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 3, marginBottom: 10 },

  slotCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 14, marginBottom: 8,
  },
  slotCardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotCardName:    { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  slotCardStamina: { fontSize: 11, color: COLORS.textMuted },
  slotCardRight:   { alignItems: 'flex-end', gap: 6 },
  activeTimer:     { fontSize: 16, fontWeight: '800', color: COLORS.neonGreen, letterSpacing: 1 },
  queuedText:      { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2 },
  cancelBtn:       { borderWidth: 1, borderColor: COLORS.error, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  cancelText:      { fontSize: 10, color: COLORS.error, letterSpacing: 1 },
  activeBar:       { height: 2, backgroundColor: COLORS.bgPanel, borderRadius: 1, marginTop: 10, overflow: 'hidden' },
  activeBarFill:   { height: '100%', backgroundColor: COLORS.neonGreen, borderRadius: 1 },

  questGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  questCard: {
    width: (width - 40 - 8) / 2,
    backgroundColor: COLORS.bgCard, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 14, position: 'relative', overflow: 'hidden',
  },
  questCardDisabled: { opacity: 0.4 },
  questCardLoading:  { opacity: 0.6 },
  questDuration:     { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 1, marginBottom: 4 },
  questName:         { fontSize: 11, color: COLORS.textSecondary, marginBottom: 10, lineHeight: 16 },
  staminaCost:       { flexDirection: 'row', alignItems: 'center' },
  staminaCostText:   { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  bonusBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: COLORS.gold, borderRadius: 3,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  bonusText: { fontSize: 8, color: COLORS.bg, fontWeight: '800', letterSpacing: 1 },
  loadingOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  loadingOverlayText: { color: COLORS.neonGreen, fontSize: 20, letterSpacing: 4 },
})