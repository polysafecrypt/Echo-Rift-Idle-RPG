// =============================================
// ECHO RIFT — ACHIEVEMENTS SCREEN
// =============================================

import React, { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Alert, RefreshControl, Dimensions,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { COLORS } from '../constants'
import { ThemedAlert } from '../components/ThemedAlert'

const { width } = Dimensions.get('window')

type Category = 'all' | 'dungeon' | 'arena' | 'quest' | 'general' | 'guild'

const CATEGORY_ICONS: Record<string, string> = {
  all:     '🏆',
  dungeon: '⚔️',
  arena:   '🏟️',
  quest:   '📡',
  general: '⭐',
  guild:   '🛡️',
}

const CATEGORY_LABELS: Record<string, string> = {
  all:     'ALL',
  dungeon: 'DUNGEON',
  arena:   'ARENA',
  quest:   'QUEST',
  general: 'GENERAL',
  guild:   'GUILD',
}

export default function AchievementsScreen({ navigation }: any) {
  const [userId, setUserId] = useState<string | null>(null)
  const [achievements, setAchievements] = useState<any[]>([])
  const [category, setCategory] = useState<Category>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [showcaseIds, setShowcaseIds] = useState<string[]>([])
  const [savingShowcase, setSavingShowcase] = useState(false)

  useFocusEffect(
    useCallback(() => { loadData() }, [])
  )

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data } = await supabase.rpc('get_achievements', { p_player_id: user.id })
    if (data?.success) {
      setAchievements(data.achievements || [])
      setShowcaseIds(data.showcase_ids || [])
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleClaim = async (achievement: any) => {
    if (!userId) return
    setClaiming(achievement.id)
    const { data } = await supabase.rpc('claim_achievement_reward', {
      p_player_id: userId,
      p_achievement_id: achievement.id,
    })
    setClaiming(null)
    if (data?.success) {
      const lines = []
      if (data.rc_reward > 0)     lines.push(`+${data.rc_reward} 💎 RC`)
      if (data.gold_reward > 0)   lines.push(`+${data.gold_reward.toLocaleString()} 🪙 Gold`)
      if (data.scroll_reward > 0) lines.push(`+${data.scroll_reward} 📜 Echo Sigil${data.scroll_reward > 1 ? 's' : ''}`)
      ThemedAlert.alert('🎉 Reward Claimed!', lines.join('\n'))
      await loadData()
    } else {
      ThemedAlert.alert('Error', data?.error || 'Failed to claim')
    }
  }

  const handleToggleShowcase = async (achievement: any) => {
    if (!userId || savingShowcase) return
    if (!achievement.completed) {
      ThemedAlert.alert('Not Completed', 'You can only showcase completed achievements.')
      return
    }

    const isShowcased = showcaseIds.includes(achievement.id)
    let newIds: string[]

    if (isShowcased) {
      // Kaldır
      newIds = showcaseIds.filter((id: string) => id !== achievement.id)
    } else {
      // Ekle (max 3)
      if (showcaseIds.length >= 3) {
        ThemedAlert.alert('Max 3 Showcase', 'You can only showcase 3 achievements. Remove one first.')
        return
      }
      newIds = [...showcaseIds, achievement.id]
    }

    setSavingShowcase(true)
    const { data, error } = await supabase.rpc('set_showcase_achievements', {
      p_player_id: userId,
      p_achievement_ids: newIds,
    })
    setSavingShowcase(false)

    if (error || !data?.success) {
      const msgs: Record<string, string> = {
        MAX_3_SHOWCASE: 'You can only showcase 3 achievements.',
        NOT_ALL_COMPLETED: 'Only completed achievements can be showcased.',
      }
      ThemedAlert.alert('Error', msgs[data?.error] || error?.message || 'Failed to update showcase')
      return
    }

    setShowcaseIds(newIds)
  }

  const filtered = category === 'all'
    ? achievements
    : achievements.filter(a => a.category === category)

  const completedCount = achievements.filter(a => a.completed).length
  const totalCount = achievements.length

  const getProgressPct = (achievement: any) => {
    if (achievement.completed) return 100
    if (!achievement.target_value) return 0
    return Math.min(100, Math.floor((achievement.current_value / achievement.target_value) * 100))
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ACHIEVEMENTS</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.headerCount}>{completedCount}/{totalCount}</Text>
          <Text style={styles.showcaseCount}>⭐ {showcaseIds.length}/3 showcased</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, {
            width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`
          }]} />
        </View>
        <Text style={styles.progressText}>
          {totalCount > 0 ? Math.floor((completedCount / totalCount) * 100) : 0}% Complete
        </Text>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabs}>
        {(['all', 'dungeon', 'arena', 'quest', 'general', 'guild'] as Category[]).map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.tab, category === cat && styles.tabActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={styles.tabIcon}>{CATEGORY_ICONS[cat]}</Text>
            {category === cat && (
              <Text style={styles.tabLabel}>{CATEGORY_LABELS[cat]}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neonGreen} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No achievements in this category</Text>
          </View>
        }
        renderItem={({ item }) => {
          const pct = getProgressPct(item)
          const canClaim = item.completed && !item.reward_granted

          return (
            <View style={[
              styles.card,
              item.completed && styles.cardCompleted,
              canClaim && styles.cardCanClaim,
            ]}>
              <View style={styles.cardLeft}>
                {/* Status icon */}
                <View style={[styles.statusIcon, {
                  backgroundColor: item.completed
                    ? item.reward_granted ? COLORS.bgPanel : COLORS.neonGreen + '20'
                    : COLORS.bgPanel
                }]}>
                  <Text style={styles.statusEmoji}>
                    {item.completed
                      ? item.reward_granted ? '✅' : '🎁'
                      : item.icon || CATEGORY_ICONS[item.category] || '🏆'}
                  </Text>
                </View>

                {/* Info */}
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, item.completed && { color: COLORS.neonGreen }]}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardDesc}>{item.description}</Text>

                  {/* Progress */}
                  {!item.completed && (
                    <View style={styles.progressRow}>
                      <View style={styles.progressBarSmall}>
                        <View style={[styles.progressFillSmall, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.progressNum}>
                        {item.current_value}/{item.target_value}
                      </Text>
                    </View>
                  )}

                  {/* Rewards */}
                  <View style={styles.rewardsRow}>
                    {item.rc_reward > 0 && (
                      <Text style={styles.rewardTag}>💎 {item.rc_reward} RC</Text>
                    )}
                    {item.gold_reward > 0 && (
                      <Text style={styles.rewardTag}>🪙 {item.gold_reward.toLocaleString()}</Text>
                    )}
                    {item.scroll_reward > 0 && (
                      <Text style={[styles.rewardTag, { color: '#A855F7' }]}>📜 {item.scroll_reward}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Claim button */}
              {!!(canClaim) && (
                <TouchableOpacity
                  style={styles.claimBtn}
                  onPress={() => handleClaim(item)}
                  disabled={claiming === item.id}
                >
                  <Text style={styles.claimBtnText}>
                    {claiming === item.id ? '...' : 'CLAIM'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Right side: claimed badge + showcase toggle */}
              <View style={styles.rightCol}>
                {item.completed && item.reward_granted && (
                  <Text style={styles.claimedText}>CLAIMED</Text>
                )}
                {item.completed && (
                  <TouchableOpacity
                    style={[
                      styles.showcaseBtn,
                      showcaseIds.includes(item.id) && styles.showcaseBtnActive,
                    ]}
                    onPress={() => handleToggleShowcase(item)}
                    disabled={savingShowcase}
                  >
                    <Text style={[
                      styles.showcaseBtnText,
                      showcaseIds.includes(item.id) && styles.showcaseBtnTextActive,
                    ]}>
                      {showcaseIds.includes(item.id) ? '⭐ SHOWCASED' : '☆ SHOWCASE'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    paddingLeft: 8,
  },
  showcaseBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    backgroundColor: 'rgba(255,215,0,0.05)',
  },
  showcaseBtnActive: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255,215,0,0.18)',
  },
  showcaseBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,215,0,0.5)',
    letterSpacing: 1,
  },
  showcaseBtnTextActive: {
    color: '#FFD700',
  },
  showcaseCount: {
    fontSize: 9,
    color: '#FFD700',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  container:  { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backBtn:      { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1 },
  headerTitle:  { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 3 },
  headerCount:  { fontSize: 13, color: COLORS.textMuted, fontWeight: '700' },
  progressSection: { paddingHorizontal: 16, marginBottom: 12 },
  progressBar: { height: 4, backgroundColor: COLORS.bgCard, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: COLORS.neonGreen, borderRadius: 2 },
  progressText: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 1 },
  tabs: {
    flexDirection: 'row', paddingHorizontal: 16,
    marginBottom: 12, gap: 6,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.bgCard, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  tabActive: { borderColor: COLORS.neonGreen, backgroundColor: COLORS.neonGreen + '15' },
  tabIcon:  { fontSize: 14 },
  tabLabel: { fontSize: 9, color: COLORS.neonGreen, fontWeight: '700', letterSpacing: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 12, marginBottom: 8, gap: 12,
  },
  cardCompleted: { borderColor: COLORS.neonGreen + '30' },
  cardCanClaim:  { borderColor: COLORS.gold, backgroundColor: COLORS.gold + '08' },
  cardLeft: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  statusIcon: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  statusEmoji: { fontSize: 22 },
  cardInfo:   { flex: 1, gap: 3 },
  cardTitle:  { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  cardDesc:   { fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  progressBarSmall: {
    flex: 1, height: 3,
    backgroundColor: COLORS.bgPanel, borderRadius: 2, overflow: 'hidden',
  },
  progressFillSmall: { height: '100%', backgroundColor: COLORS.cyan, borderRadius: 2 },
  progressNum: { fontSize: 9, color: COLORS.textMuted, minWidth: 40 },
  rewardsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  rewardTag: { fontSize: 10, color: COLORS.gold, fontWeight: '700' },
  claimBtn: {
    backgroundColor: COLORS.gold, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  claimBtnText: { fontSize: 11, fontWeight: '900', color: COLORS.bg, letterSpacing: 1 },
  claimedText:  { fontSize: 9, color: COLORS.textMuted, letterSpacing: 1 },
})