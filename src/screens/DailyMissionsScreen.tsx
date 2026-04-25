// =============================================
// ECHO RIFT — DAILY MISSIONS SCREEN
// =============================================

import React, { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, Dimensions, RefreshControl,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import { useGame } from '../hooks/useGame'
import { COLORS } from '../constants'

const { width } = Dimensions.get('window')

const MISSION_CONFIG = [
  {
    key: 'dungeon',
    icon: '⚔️',
    title: 'Dungeon Diver',
    desc: 'Win 1 dungeon battle',
    required: 1,
    rewardLabel: (level: number) => `${(level * 200).toLocaleString()} Gold`,
  },
  {
    key: 'quest',
    icon: '🗺️',
    title: 'Quest Runner',
    desc: 'Complete 2 quests',
    required: 2,
    rewardLabel: (level: number) => `${(level * 150).toLocaleString()} Gold + ${level * 5} Scrap`,
  },
  {
    key: 'arena',
    icon: '🏆',
    title: 'Arena Fighter',
    desc: 'Fight 2 arena battles',
    required: 2,
    rewardLabel: (level: number) => `${(level * 100).toLocaleString()} Gold`,
  },
  {
    key: 'scrap',
    icon: '💎',
    title: 'Scrap Collector',
    desc: 'Dismantle 5 items',
    required: 5,
    rewardLabel: (level: number) => `${(level * 50).toLocaleString()} Scrap`,
  },
  {
    key: 'energy',
    icon: '⚡',
    title: 'Energy Burner',
    desc: 'Spend 30 stamina',
    required: 30,
    rewardLabel: (level: number) => `${(level * 100).toLocaleString()} Gold`,
  },
]

export default function DailyMissionsScreen({ navigation }: any) {
  const { playerState } = useGameStore()
  const { fetchPlayerState } = useGame()
  const [missions, setMissions] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => { loadData() }, [])
  )

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data } = await supabase.rpc('get_daily_missions', {
      p_player_id: user.id,
    })
    if (data?.success) setMissions(data)
    await fetchPlayerState(user.id)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  if (!playerState || !missions) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>LOADING...</Text>
      </View>
    )
  }

  const { player } = playerState
  const level = player.level
  const missionData = missions.missions
  const bonus = missions.bonus

  const completedCount = MISSION_CONFIG.filter(
    m => missionData[m.key]?.done
  ).length

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DAILY MISSIONS</Text>
        <Text style={styles.headerDate}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      </View>

      {/* Progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>TODAY'S PROGRESS</Text>
          <Text style={styles.progressCount}>
            {completedCount}/{MISSION_CONFIG.length}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            { width: `${(completedCount / MISSION_CONFIG.length) * 100}%` }
          ]} />
        </View>
        <Text style={styles.progressSub}>
          {completedCount === MISSION_CONFIG.length
            ? '🎉 All missions complete!'
            : `${MISSION_CONFIG.length - completedCount} missions remaining`}
        </Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neonGreen} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Missions */}
        {MISSION_CONFIG.map((config) => {
          const m = missionData[config.key]
          const count = m?.count || 0
          const done = m?.done || false
          const progress = Math.min(count / config.required, 1)

          return (
            <View
              key={config.key}
              style={[styles.missionCard, done && styles.missionCardDone]}
            >
              {done && (
                <View style={styles.doneBadge}>
                  <Text style={styles.doneBadgeText}>✓ DONE</Text>
                </View>
              )}

              <View style={styles.missionHeader}>
                <Text style={styles.missionIcon}>{config.icon}</Text>
                <View style={styles.missionInfo}>
                  <Text style={[styles.missionTitle, done && { color: COLORS.neonGreen }]}>
                    {config.title}
                  </Text>
                  <Text style={styles.missionDesc}>{config.desc}</Text>
                </View>
                <View style={styles.missionProgress}>
                  <Text style={[styles.missionCount, done && { color: COLORS.neonGreen }]}>
                    {Math.min(count, config.required)}/{config.required}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.missionBar}>
                <View style={[
                  styles.missionBarFill,
                  { width: `${progress * 100}%` },
                  done && { backgroundColor: COLORS.neonGreen }
                ]} />
              </View>

              {/* Reward */}
              <View style={styles.rewardRow}>
                <Text style={styles.rewardLabel}>REWARD:</Text>
                <Text style={[styles.rewardValue, done && { color: COLORS.textMuted }]}>
                  {config.rewardLabel(level)}
                </Text>
              </View>
            </View>
          )
        })}

        {/* Bonus Card */}
        <View style={[
          styles.bonusCard,
          bonus.all_done && styles.bonusCardDone,
          bonus.done && styles.bonusCardClaimed,
        ]}>
          <View style={styles.bonusHeader}>
            <Text style={styles.bonusIcon}>🎯</Text>
            <View style={styles.bonusInfo}>
              <Text style={styles.bonusTitle}>DAILY BONUS</Text>
              <Text style={styles.bonusDesc}>Complete all 5 missions</Text>
            </View>
            {bonus.done ? (
              <View style={styles.claimedBadge}>
                <Text style={styles.claimedText}>CLAIMED</Text>
              </View>
            ) : bonus.all_done ? (
              <View style={styles.readyBadge}>
                <Text style={styles.readyText}>READY!</Text>
              </View>
            ) : (
              <Text style={styles.bonusLock}>🔒</Text>
            )}
          </View>

          <View style={styles.bonusRewards}>
            <View style={styles.bonusRewardItem}>
              <Text style={styles.bonusRewardIcon}>💎</Text>
              <Text style={styles.bonusRewardText}>2 RC</Text>
            </View>
            <View style={styles.bonusRewardItem}>
              <Text style={styles.bonusRewardIcon}>🪙</Text>
              <Text style={styles.bonusRewardText}>
                {(level * 500).toLocaleString()} Gold
              </Text>
            </View>
            <View style={styles.bonusRewardItem}>
              <Text style={styles.bonusRewardIcon}>🎁</Text>
              <Text style={styles.bonusRewardText}>1 Random Item</Text>
            </View>
          </View>

          {bonus.done && (
            <Text style={styles.bonusClaimedNote}>
              ✓ Collected today. Come back tomorrow!
            </Text>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📋 HOW IT WORKS</Text>
          <Text style={styles.infoText}>
            Complete daily missions to earn rewards scaled to your level.
            Missions reset every day at UTC 00:00.
            Finish all 5 to claim the bonus reward!
          </Text>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText:      { color: COLORS.neonGreen, letterSpacing: 4 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backBtn:     { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 3 },
  headerDate:  { fontSize: 11, color: COLORS.textMuted },

  progressCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: COLORS.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, padding: 14,
  },
  progressRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel:{ fontSize: 10, color: COLORS.textMuted, letterSpacing: 2 },
  progressCount:{ fontSize: 14, fontWeight: '900', color: COLORS.neonGreen },
  progressBar:  { height: 6, backgroundColor: COLORS.bgPanel, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: COLORS.neonGreen, borderRadius: 3 },
  progressSub:  { fontSize: 10, color: COLORS.textMuted },

  scrollContent: { paddingHorizontal: 16 },

  missionCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 14, marginBottom: 10, position: 'relative', overflow: 'hidden',
  },
  missionCardDone: { borderColor: COLORS.neonGreen + '40', backgroundColor: COLORS.neonGreen + '08' },

  doneBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: COLORS.neonGreen,
    paddingHorizontal: 8, paddingVertical: 3,
    borderBottomLeftRadius: 6,
  },
  doneBadgeText: { fontSize: 8, fontWeight: '900', color: COLORS.bg, letterSpacing: 1 },

  missionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  missionIcon:   { fontSize: 28 },
  missionInfo:   { flex: 1 },
  missionTitle:  { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 1 },
  missionDesc:   { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  missionProgress:{ alignItems: 'flex-end' },
  missionCount:  { fontSize: 16, fontWeight: '900', color: COLORS.textSecondary },

  missionBar:     { height: 4, backgroundColor: COLORS.bgPanel, borderRadius: 2, overflow: 'hidden', marginBottom: 10 },
  missionBarFill: { height: '100%', backgroundColor: COLORS.cyan, borderRadius: 2 },

  rewardRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rewardLabel: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 1 },
  rewardValue: { fontSize: 11, fontWeight: '700', color: COLORS.gold },

  // Bonus Card
  bonusCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.gold + '40',
    padding: 16, marginBottom: 12,
  },
  bonusCardDone:    { borderColor: COLORS.gold, backgroundColor: COLORS.gold + '08' },
  bonusCardClaimed: { borderColor: COLORS.border, opacity: 0.7 },

  bonusHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  bonusIcon:   { fontSize: 28 },
  bonusInfo:   { flex: 1 },
  bonusTitle:  { fontSize: 14, fontWeight: '900', color: COLORS.gold, letterSpacing: 1 },
  bonusDesc:   { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  bonusLock:   { fontSize: 20 },

  readyBadge: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  readyText: { fontSize: 10, fontWeight: '900', color: COLORS.bg, letterSpacing: 1 },

  claimedBadge: {
    backgroundColor: COLORS.border,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  claimedText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1 },

  bonusRewards:     { flexDirection: 'row', gap: 8, marginBottom: 8 },
  bonusRewardItem:  {
    flex: 1, backgroundColor: COLORS.bgPanel, borderRadius: 8,
    padding: 10, alignItems: 'center', gap: 4,
  },
  bonusRewardIcon:  { fontSize: 22 },
  bonusRewardText:  { fontSize: 10, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },

  bonusClaimedNote: { fontSize: 10, color: COLORS.neonGreen, textAlign: 'center', marginTop: 4 },

  infoCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, padding: 14,
  },
  infoTitle: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 2, marginBottom: 8 },
  infoText:  { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
})
