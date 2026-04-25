// =============================================
// ECHO RIFT — ECHO PASS SCREEN
// =============================================

import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, Dimensions, ActivityIndicator,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import { useGame } from '../hooks/useGame'
import { COLORS } from '../constants'

const { width } = Dimensions.get('window')

const POINTS_PER_MILESTONE = 52
const MAX_MILESTONE = 40
const PASS_PRICE_RC = 800

const RARITY_COLORS: Record<string, string> = {
  Uncommon:    '#22C55E',
  Rare:        '#3B82F6',
  Epic:        '#A855F7',
  Legendary:   '#F97316',
  Dimensional: '#EC4899',
}

// FREE: gold, scrap, Uncommon/Rare/Epic
// PAID: rc, Legendary, Dimensional
const MILESTONE_REWARDS: Record<number, {
  type: string; gold?: number; rc?: number; scrap?: number
  item?: string; count?: number; free: boolean
}> = {
  1:  { type: 'gold',  gold: 100,   free: true  },
  2:  { type: 'gold',  gold: 200,   free: true  },
  3:  { type: 'rc',    rc: 5,       free: false },
  4:  { type: 'item',  item: 'Uncommon', count: 3, free: true  },
  5:  { type: 'gold',  gold: 500,   free: true  },
  6:  { type: 'rc',    rc: 10,      free: false },
  7:  { type: 'item',  item: 'Rare', count: 2,  free: true  },
  8:  { type: 'gold',  gold: 1000,  free: true  },
  9:  { type: 'rc',    rc: 15,      free: false },
  10: { type: 'item',  item: 'Epic', count: 2,  free: true  },
  11: { type: 'gold',  gold: 2000,  free: true  },
  12: { type: 'rc',    rc: 20,      free: false },
  13: { type: 'item',  item: 'Rare', count: 3,  free: true  },
  14: { type: 'gold',  gold: 3000,  free: true  },
  15: { type: 'mixed', rc: 25, scrap: 50,        free: false },
  16: { type: 'item',  item: 'Epic', count: 3,  free: true  },
  17: { type: 'gold',  gold: 4000,  free: true  },
  18: { type: 'rc',    rc: 30,      free: false },
  19: { type: 'item',  item: 'Legendary', count: 1, free: false },
  20: { type: 'mixed', gold: 5000, scrap: 100,   free: true  },
  21: { type: 'rc',    rc: 40,      free: false },
  22: { type: 'item',  item: 'Epic', count: 3,  free: true  },
  23: { type: 'gold',  gold: 6000,  free: true  },
  24: { type: 'rc',    rc: 50,      free: false },
  25: { type: 'item',  item: 'Legendary', count: 2, free: false },
  26: { type: 'gold',  gold: 7000,  free: true  },
  27: { type: 'rc',    rc: 60,      free: false },
  28: { type: 'scrap', scrap: 200,  free: true  },
  29: { type: 'item',  item: 'Legendary', count: 2, free: false },
  30: { type: 'mixed', gold: 8000, rc: 80,       free: false },
  31: { type: 'item',  item: 'Epic', count: 5,  free: true  },
  32: { type: 'gold',  gold: 10000, free: true  },
  33: { type: 'rc',    rc: 100,     free: false },
  34: { type: 'item',  item: 'Legendary', count: 3, free: false },
  35: { type: 'scrap', scrap: 500,  free: true  },
  36: { type: 'rc',    rc: 120,     free: false },
  37: { type: 'item',  item: 'Legendary', count: 3, free: false },
  38: { type: 'gold',  gold: 15000, free: true  },
  39: { type: 'rc',    rc: 150,     free: false },
  40: { type: 'item',  item: 'Dimensional', count: 1, rc: 200, free: false },
}

function getRewardLabel(r: typeof MILESTONE_REWARDS[number]): string {
  const parts: string[] = []
  if (r.gold)  parts.push(`${r.gold.toLocaleString()} Gold`)
  if (r.rc)    parts.push(`${r.rc} RC`)
  if (r.scrap) parts.push(`${r.scrap} Scrap`)
  if (r.item)  parts.push(`${r.count}x ${r.item}`)
  return parts.join(' + ')
}

function getRewardIcon(r: typeof MILESTONE_REWARDS[number]): string {
  if (r.item === 'Dimensional') return '🌌'
  if (r.item === 'Legendary')   return '🟠'
  if (r.item === 'Epic')        return '🟣'
  if (r.item === 'Rare')        return '🔵'
  if (r.item === 'Uncommon')    return '🟢'
  if (r.rc && r.gold)           return '✨'
  if (r.rc)                     return '💎'
  if (r.gold)                   return '🪙'
  if (r.scrap)                  return '⚙️'
  return '🎁'
}

export default function EchoPassScreen({ navigation }: any) {
  const { playerState } = useGameStore()
  const { fetchPlayerState } = useGame()
  const [userId,     setUserId]     = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [claiming,   setClaiming]   = useState(false)
  const [claimingId, setClaimingId] = useState<number | null>(null)

  useFocusEffect(
    useCallback(() => { loadData() }, [])
  )

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      await fetchPlayerState(user.id)
    }
  }

  const handleClaim = async (milestone: number) => {
    if (!userId) return
    setClaimingId(milestone)
    try {
      const { data, error } = await supabase.rpc('claim_echo_pass_milestone', {
        p_player_id: userId,
        p_milestone: milestone,
      })
      if (error) throw error
      if (data?.success) {
        await fetchPlayerState(userId)
      } else {
        Alert.alert('Error', data?.error || 'Claim failed')
      }
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setClaimingId(null)
    }
  }

  const handleClaimAll = async () => {
    if (!userId || !playerState) return
    const { echo_pass } = playerState as any
    const currentMilestone = echo_pass?.milestone || 0
    const claimed: number[] = echo_pass?.claimed || []
    const isPurchased = echo_pass?.purchased || false

    // Claim edilebilir milestone'ları bul
    const claimable = Array.from({ length: currentMilestone }, (_, i) => i + 1).filter(m => {
      if (claimed.includes(m)) return false
      const reward = MILESTONE_REWARDS[m]
      if (!reward) return false
      if (!reward.free && !isPurchased) return false
      return true
    })

    if (claimable.length === 0) {
      Alert.alert('Nothing to claim', 'All available rewards have been claimed!')
      return
    }

    setClaiming(true)
    try {
      for (const m of claimable) {
        const { data } = await supabase.rpc('claim_echo_pass_milestone', {
          p_player_id: userId,
          p_milestone: m,
        })
        if (!data?.success && data?.error !== 'ALREADY_CLAIMED') break
      }
      await fetchPlayerState(userId)
      Alert.alert('Done!', `${claimable.length} reward(s) claimed!`)
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setClaiming(false)
    }
  }

  const handlePurchase = () => {
    if (!playerState || !userId) return
    const { player } = playerState

    if ((playerState as any).echo_pass?.purchased) {
      Alert.alert('Already Purchased', 'You already own Echo Pass!')
      return
    }
    if (player.rc_balance < PASS_PRICE_RC) {
      Alert.alert('Insufficient RC', `Need ${PASS_PRICE_RC} RC.\nYou have ${player.rc_balance} RC.`)
      return
    }

    Alert.alert(
      'Purchase Echo Pass',
      `Buy Echo Pass for ${PASS_PRICE_RC} RC?\n\nUnlocks all milestone rewards!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: async () => {
            setPurchasing(true)
            try {
              const { data, error } = await supabase.rpc('purchase_echo_pass', {
                p_player_id: userId,
              })
              if (error) throw error
              if (data?.success) {
                await fetchPlayerState(userId)
                Alert.alert('Success!', 'Echo Pass activated!')
              } else {
                Alert.alert('Error', data?.error || 'Purchase failed')
              }
            } catch (err: any) {
              Alert.alert('Error', err.message)
            } finally {
              setPurchasing(false)
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

  const { player } = playerState
  const echoPass        = (playerState as any).echo_pass || {}
  const currentPoints   = echoPass.points    || 0
  const currentMilestone= echoPass.milestone  || 0
  const isPurchased     = echoPass.purchased  || false
  const claimed: number[]= echoPass.claimed   || []
  const progressToNext  = currentPoints % POINTS_PER_MILESTONE
  const progressPct     = progressToNext / POINTS_PER_MILESTONE

  // Kaç free claim bekliyor
  const pendingFree = Array.from({ length: currentMilestone }, (_, i) => i + 1)
    .filter(m => !claimed.includes(m) && MILESTONE_REWARDS[m]?.free).length

  const pendingPaid = isPurchased
    ? Array.from({ length: currentMilestone }, (_, i) => i + 1)
        .filter(m => !claimed.includes(m) && !MILESTONE_REWARDS[m]?.free).length
    : 0

  const totalPending = pendingFree + pendingPaid

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ECHO PASS</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Pass Status Card */}
        <View style={[styles.passCard, isPurchased && styles.passCardActive]}>
          <View style={styles.passCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.passCardTitle}>
                {isPurchased ? '⚡ ECHO PASS ACTIVE' : '🔒 ECHO PASS'}
              </Text>
              <Text style={styles.passCardSub}>
                {isPurchased
                  ? 'All milestone rewards unlocked!'
                  : `${PASS_PRICE_RC} RC · Unlocks RC, Legendary & Dimensional rewards`}
              </Text>
            </View>
            {!isPurchased && (
              <TouchableOpacity
                style={[styles.buyBtn, purchasing && { opacity: 0.6 }]}
                onPress={handlePurchase}
                disabled={purchasing}
              >
                <Text style={styles.buyBtnText}>{purchasing ? '...' : `BUY\n${PASS_PRICE_RC} RC`}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>MILESTONE {currentMilestone}/{MAX_MILESTONE}</Text>
              <Text style={styles.progressPts}>{currentPoints} pts</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, {
                width: `${currentMilestone >= MAX_MILESTONE ? 100 : progressPct * 100}%`
              }]} />
            </View>
            <Text style={styles.progressNext}>
              {currentMilestone >= MAX_MILESTONE
                ? 'All milestones complete!'
                : `${progressToNext}/${POINTS_PER_MILESTONE} pts to next milestone`}
            </Text>
          </View>

          {/* Earn info */}
          <View style={styles.earnSection}>
            <Text style={styles.earnText}>⚡ 1 stamina spent = 2 Echo Pass points</Text>
          </View>
        </View>

        {/* Claim All button */}
        {totalPending > 0 && (
          <TouchableOpacity
            style={[styles.claimAllBtn, claiming && { opacity: 0.6 }]}
            onPress={handleClaimAll}
            disabled={claiming}
          >
            {claiming
              ? <ActivityIndicator color={COLORS.bg} size="small" />
              : <Text style={styles.claimAllText}>
                  CLAIM ALL ({totalPending} reward{totalPending > 1 ? 's' : ''})
                </Text>
            }
          </TouchableOpacity>
        )}

        {/* Milestones */}
        <Text style={styles.milestonesTitle}>MILESTONES</Text>

        {Array.from({ length: MAX_MILESTONE }, (_, i) => i + 1).map((m) => {
          const reward      = MILESTONE_REWARDS[m]
          const isUnlocked  = m <= currentMilestone
          const isClaimed   = claimed.includes(m)
          const isCurrent   = m === currentMilestone + 1
          const canClaim    = isUnlocked && !isClaimed && (reward.free || isPurchased)
          const needsPass   = isUnlocked && !isClaimed && !reward.free && !isPurchased
          const isLoading   = claimingId === m

          return (
            <View
              key={m}
              style={[
                styles.milestoneRow,
                isClaimed  && styles.milestoneClaimed,
                canClaim   && styles.milestoneCanClaim,
                isCurrent  && styles.milestoneCurrent,
                m === MAX_MILESTONE && styles.milestoneLast,
              ]}
            >
              {/* Number */}
              <View style={[
                styles.milestoneNum,
                isClaimed  && { backgroundColor: COLORS.neonGreen, borderColor: COLORS.neonGreen },
                canClaim   && { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
                isCurrent  && { borderColor: COLORS.gold },
              ]}>
                <Text style={[
                  styles.milestoneNumText,
                  (isClaimed || canClaim) && { color: COLORS.bg },
                ]}>
                  {isClaimed ? '✓' : m}
                </Text>
              </View>

              {/* Reward */}
              <View style={styles.milestoneInfo}>
                <Text style={styles.milestoneIcon}>{getRewardIcon(reward)}</Text>
                <View style={styles.milestoneTextCol}>
                  <Text style={[
                    styles.milestoneReward,
                    reward.item && { color: RARITY_COLORS[reward.item] || COLORS.textPrimary },
                    !reward.item && isClaimed && { color: COLORS.neonGreen },
                    !reward.item && canClaim  && { color: COLORS.gold },
                  ]}>
                    {getRewardLabel(reward)}
                  </Text>
                  <View style={styles.milestoneMetaRow}>
                    <Text style={styles.milestonePts}>{m * POINTS_PER_MILESTONE} pts</Text>
                    {reward.free
                      ? <Text style={styles.freeTag}>FREE</Text>
                      : <Text style={styles.passTag}>PASS</Text>
                    }
                  </View>
                </View>
              </View>

              {/* Action */}
              <View style={styles.milestoneAction}>
                {isClaimed ? (
                  <Text style={styles.statusClaimed}>✓</Text>
                ) : canClaim ? (
                  <TouchableOpacity
                    style={styles.claimBtn}
                    onPress={() => handleClaim(m)}
                    disabled={isLoading}
                  >
                    {isLoading
                      ? <ActivityIndicator color={COLORS.bg} size="small" />
                      : <Text style={styles.claimBtnText}>CLAIM</Text>
                    }
                  </TouchableOpacity>
                ) : needsPass ? (
                  <Text style={styles.statusNeedsPass}>🔒</Text>
                ) : (
                  <Text style={styles.statusLocked}>—</Text>
                )}
              </View>
            </View>
          )
        })}

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
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 3 },

  passCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: COLORS.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, padding: 16,
  },
  passCardActive:  { borderColor: COLORS.gold + '80', backgroundColor: COLORS.gold + '08' },
  passCardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  passCardTitle:   { fontSize: 15, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 1 },
  passCardSub:     { fontSize: 10, color: COLORS.textMuted, marginTop: 4, lineHeight: 15 },

  buyBtn: {
    backgroundColor: COLORS.gold, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 70,
  },
  buyBtnText: { fontSize: 11, fontWeight: '900', color: COLORS.bg, textAlign: 'center', letterSpacing: 1 },

  progressSection:  { marginBottom: 10 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel:    { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2 },
  progressPts:      { fontSize: 10, color: COLORS.gold, fontWeight: '700' },
  progressBarBg:    { height: 8, backgroundColor: COLORS.bgPanel, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  progressBarFill:  { height: '100%', backgroundColor: COLORS.gold, borderRadius: 4 },
  progressNext:     { fontSize: 9, color: COLORS.textMuted },

  earnSection: { backgroundColor: COLORS.bgPanel, borderRadius: 6, padding: 8 },
  earnText:    { fontSize: 10, color: COLORS.textSecondary },

  claimAllBtn: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: COLORS.neonGreen, borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  claimAllText: { fontSize: 14, fontWeight: '900', color: COLORS.bg, letterSpacing: 2 },

  milestonesTitle: {
    fontSize: 10, color: COLORS.textMuted, letterSpacing: 3,
    paddingHorizontal: 16, marginBottom: 8,
  },

  milestoneRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 5,
    backgroundColor: COLORS.bgCard, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 10, gap: 10,
  },
  milestoneClaimed:  { borderColor: COLORS.neonGreen + '30', backgroundColor: COLORS.neonGreen + '05' },
  milestoneCanClaim: { borderColor: COLORS.gold + '80', backgroundColor: COLORS.gold + '10' },
  milestoneCurrent:  { borderColor: COLORS.border + '80' },
  milestoneLast:     { borderColor: COLORS.dimensional + '60' },

  milestoneNum: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.bgPanel, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  milestoneNumText: { fontSize: 11, fontWeight: '900', color: COLORS.textMuted },

  milestoneInfo:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  milestoneIcon:    { fontSize: 18 },
  milestoneTextCol: { flex: 1 },
  milestoneReward:  { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  milestoneMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  milestonePts:     { fontSize: 9, color: COLORS.textMuted },

  freeTag: {
    fontSize: 8, fontWeight: '800', color: COLORS.neonGreen,
    borderWidth: 1, borderColor: COLORS.neonGreen,
    borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1,
  },
  passTag: {
    fontSize: 8, fontWeight: '800', color: COLORS.gold,
    borderWidth: 1, borderColor: COLORS.gold,
    borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1,
  },

  milestoneAction: { alignItems: 'center', justifyContent: 'center', minWidth: 50 },

  claimBtn: {
    backgroundColor: COLORS.gold, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 6, minWidth: 50, alignItems: 'center',
  },
  claimBtnText:    { fontSize: 10, fontWeight: '900', color: COLORS.bg, letterSpacing: 1 },
  statusClaimed:   { fontSize: 16, color: COLORS.neonGreen, fontWeight: '900' },
  statusNeedsPass: { fontSize: 16 },
  statusLocked:    { fontSize: 14, color: COLORS.textMuted },
})