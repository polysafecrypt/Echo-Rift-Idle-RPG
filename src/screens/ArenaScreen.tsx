// =============================================
// ECHO RIFT — ARENA SCREEN
// =============================================

import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, StatusBar, RefreshControl,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import { useGame } from '../hooks/useGame'
import { COLORS, CLASS_INFO } from '../constants'
import { ArenaOpponent, ArenaBattleResult, ClassType } from '../types'
import ArenaBattleModal from '../components/ArenaBattleModal'
import { ThemedAlert } from '../components/ThemedAlert'

// ─── STAT ITEM ───────────────────────────────────────────────────────────────
function StatItem({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statItemValue}>{value}</Text>
      <Text style={styles.statItemLabel}>{label}</Text>
    </View>
  )
}

// ─── OPPONENT CARD ───────────────────────────────────────────────────────────
function OpponentCard({ opponent, playerPower, onFight, isBattling, disabled }: {
  opponent: ArenaOpponent
  playerPower: number
  onFight: () => void
  isBattling: boolean
  disabled: boolean
}) {
  const classInfo = opponent.class_type
    ? CLASS_INFO[opponent.class_type as keyof typeof CLASS_INFO]
    : null
  const powerDiff = opponent.power_score - playerPower
  const isBot     = opponent.is_bot

  return (
    <View style={[styles.opponentCard, isBot && styles.opponentCardBot]}>
      <View style={styles.opponentHeader}>
        <View style={styles.opponentInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.opponentName}>{opponent.username}</Text>
            {!!(isBot) && (
              <View style={styles.botBadge}>
                <Text style={styles.botBadgeText}>BOT</Text>
              </View>
            )}
          </View>
          <View style={styles.opponentMeta}>
            <Text style={styles.opponentLevel}>Lv.{opponent.level}</Text>
            {!!(classInfo) && (
              <Text style={[styles.opponentClass, { color: classInfo.color }]}>
                {classInfo.icon} {classInfo.name}
              </Text>
            )}
            <Text style={styles.opponentPoints}>{opponent.arena_points} pts</Text>
          </View>
        </View>
        <Text style={powerDiff > 0 ? styles.theyFirstText : styles.youFirstText}>
          {powerDiff > 0 ? 'They first' : 'You first'}
        </Text>
      </View>

      <View style={styles.opponentStats}>
        <Text style={styles.opponentStatText}>ATK {opponent.total_atk}</Text>
        <Text style={styles.opponentStatText}>HP {opponent.total_hp}</Text>
        <Text style={styles.opponentStatText}>DEF {opponent.total_def}</Text>
        <Text style={styles.opponentStatText}>CRIT {opponent.total_crit.toFixed(0)}%</Text>
      </View>

      <View style={styles.opponentFooter}>
        <Text style={[styles.powerDiff, { color: powerDiff > 0 ? COLORS.error : COLORS.neonGreen }]}>
          {opponent.power_score.toLocaleString()}
          {powerDiff !== 0 && ` (${powerDiff > 0 ? '+' : ''}${powerDiff})`}
        </Text>
        <TouchableOpacity
          style={[styles.fightBtn, disabled && styles.fightBtnDisabled]}
          onPress={onFight}
          disabled={disabled}
        >
          <Text style={styles.fightBtnText}>{isBattling ? '...' : 'FIGHT'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function ArenaScreen() {
  const { playerState, arenaOpponents } = useGameStore()
  const { fetchPlayerState, getArenaOpponents, arenaBattle } = useGame()

  const [userId,          setUserId]          = useState<string | null>(null)
  const [battling,        setBattling]        = useState<string | null>(null)
  const [lastResult,      setLastResult]      = useState<ArenaBattleResult | null>(null)
  const [lastOpponent,    setLastOpponent]    = useState<ArenaOpponent | null>(null)
  const [showBattleModal, setShowBattleModal] = useState(false)
  const [refreshing,      setRefreshing]      = useState(false)

  useFocusEffect(useCallback(() => { loadData() }, []))

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      await fetchPlayerState(user.id)
      await getArenaOpponents(user.id)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleBattle = async (opponent: ArenaOpponent) => {
    if (!userId || !playerState) return
    const { arena } = playerState
    const maxBattles = playerState.player.pass_type === 'gold' ? 15
      : playerState.player.pass_type === 'silver' ? 12 : 10

    if (arena.battles_today >= maxBattles) {
      ThemedAlert.alert('Daily Limit Reached', `${maxBattles} battles used today.`)
      return
    }

    try {
      setBattling(opponent.player_id)
      const result = await arenaBattle(userId, opponent.player_id, opponent.is_bot)
      if (result?.success) {
        setLastResult(result)
        setLastOpponent(opponent)
        setShowBattleModal(true)
        await Promise.all([
          fetchPlayerState(userId),
          getArenaOpponents(userId),
        ])
      } else {
        ThemedAlert.alert('Error', result?.error || 'Battle failed')
      }
    } finally {
      setBattling(null)
    }
  }

  const handleClose = () => {
    setShowBattleModal(false)
    if (userId) {
      fetchPlayerState(userId)
      getArenaOpponents(userId)
    }
  }

  if (!playerState) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>LOADING ARENA...</Text>
      </View>
    )
  }

  const { player, stats, arena } = playerState
  const maxBattles = player.pass_type === 'gold' ? 15
    : player.pass_type === 'silver' ? 12 : 10

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neonGreen} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ARENA</Text>
          <Text style={styles.headerSub}>PVP COMBAT ZONE</Text>
        </View>

        {/* PLAYER CARD */}
        <View style={styles.playerCard}>
          <View style={styles.playerCardHeader}>
            <Text style={styles.playerCardTitle}>YOUR POWER</Text>
            <Text style={styles.playerCardPower}>⚡ {stats.power_score.toLocaleString()}</Text>
          </View>
          <View style={styles.statsRow}>
            <StatItem label="ATK"  value={stats.total_atk} />
            <StatItem label="HP"   value={stats.total_hp} />
            <StatItem label="DEF"  value={stats.total_def} />
            <StatItem label="CRIT" value={`${stats.total_crit.toFixed(0)}%`} />
          </View>
          <View style={styles.arenaStatsRow}>
            <View style={styles.arenaStatItem}>
              <Text style={styles.arenaStatValue}>{arena.points}</Text>
              <Text style={styles.arenaStatLabel}>POINTS</Text>
            </View>
            <View style={styles.arenaStatItem}>
              <Text style={[styles.arenaStatValue, { color: COLORS.neonGreen }]}>{arena.wins}</Text>
              <Text style={styles.arenaStatLabel}>WINS</Text>
            </View>
            <View style={styles.arenaStatItem}>
              <Text style={[styles.arenaStatValue, { color: COLORS.error }]}>{arena.losses}</Text>
              <Text style={styles.arenaStatLabel}>LOSSES</Text>
            </View>
            <View style={styles.arenaStatItem}>
              <Text style={styles.arenaStatValue}>{arena.battles_today}/{maxBattles}</Text>
              <Text style={styles.arenaStatLabel}>TODAY</Text>
            </View>
          </View>
        </View>

        {/* OPPONENTS */}
        <View style={styles.opponentsSection}>
          <View style={styles.opponentsHeader}>
            <Text style={styles.opponentsTitle}>OPPONENTS</Text>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => userId && getArenaOpponents(userId)}
            >
              <Text style={styles.refreshBtnText}>REFRESH</Text>
            </TouchableOpacity>
          </View>

          {arenaOpponents.length === 0 ? (
            <View style={styles.noOpponents}>
              <Text style={styles.noOpponentsText}>No opponents found.</Text>
            </View>
          ) : (
            arenaOpponents.map((opponent) => (
              <OpponentCard
                key={opponent.player_id}
                opponent={opponent}
                playerPower={stats.power_score}
                onFight={() => handleBattle(opponent)}
                isBattling={battling === opponent.player_id}
                disabled={!!battling || arena.battles_today >= maxBattles}
              />
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── BATTLE MODAL — sprite animasyonlu ── */}
      <ArenaBattleModal
        visible={showBattleModal}
        result={lastResult}
        onClose={handleClose}
        playerName={player.username}
        playerClass={player.class_type}
        playerSwordRarity={playerState?.equipped_items?.find(i => i.item_type === 'sword')?.rarity || 'Common'}
        playerStats={stats ? {
          atk:     stats.total_atk,
          hp:      stats.total_hp,
          def:     stats.total_def,
          crit:    Math.round(stats.total_crit),
          critDmg: Math.round(stats.total_crit_dmg),
          spd:     stats.total_dex,
        } : undefined}
        defenderStats={lastOpponent ? {
          atk:     lastOpponent.total_atk,
          hp:      lastOpponent.total_hp,
          def:     lastOpponent.total_def,
          crit:    Math.round(lastOpponent.total_crit),
          critDmg: 0,
          spd:     lastOpponent.total_dex,
        } : undefined}
        defenderClass={(lastOpponent?.class_type as any) ?? 'vanguard'}
        defenderSwordRarity={lastResult?.defender_sword_rarity ?? 'Common'}
      />
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

  playerCard:       { marginHorizontal: 20, marginBottom: 16, backgroundColor: COLORS.bgCard, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  playerCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  playerCardTitle:  { fontSize: 10, color: COLORS.textMuted, letterSpacing: 3 },
  playerCardPower:  { fontSize: 18, fontWeight: '900', color: COLORS.neonGreen },
  statsRow:         { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statItem:         { flex: 1, alignItems: 'center', backgroundColor: COLORS.bgPanel, borderRadius: 6, padding: 8 },
  statItemValue:    { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  statItemLabel:    { fontSize: 8, color: COLORS.textMuted, letterSpacing: 1, marginTop: 2 },
  arenaStatsRow:    { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  arenaStatItem:    { flex: 1, alignItems: 'center' },
  arenaStatValue:   { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary },
  arenaStatLabel:   { fontSize: 8, color: COLORS.textMuted, letterSpacing: 2, marginTop: 2 },

  opponentsSection: { paddingHorizontal: 20 },
  opponentsHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  opponentsTitle:   { fontSize: 10, color: COLORS.textMuted, letterSpacing: 3 },
  refreshBtn:       { borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 },
  refreshBtnText:   { fontSize: 10, color: COLORS.textSecondary, letterSpacing: 1 },
  noOpponents:      { alignItems: 'center', paddingVertical: 40 },
  noOpponentsText:  { fontSize: 14, color: COLORS.textSecondary },

  opponentCard:     { backgroundColor: COLORS.bgCard, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 10 },
  opponentCardBot:  { opacity: 0.85 },
  opponentHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  opponentInfo:     { flex: 1 },
  opponentName:     { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  botBadge:         { backgroundColor: COLORS.bgPanel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  botBadgeText:     { fontSize: 8, color: COLORS.textMuted, letterSpacing: 1 },
  opponentMeta:     { flexDirection: 'row', gap: 8, alignItems: 'center' },
  opponentLevel:    { fontSize: 11, color: COLORS.textMuted },
  opponentClass:    { fontSize: 11, fontWeight: '700' },
  opponentPoints:   { fontSize: 11, color: COLORS.gold },
  youFirstText:     { fontSize: 11, color: COLORS.neonGreen, fontWeight: '700' },
  theyFirstText:    { fontSize: 11, color: COLORS.error, fontWeight: '700' },
  opponentStats:    { flexDirection: 'row', gap: 12, marginBottom: 10 },
  opponentStatText: { fontSize: 11, color: COLORS.textSecondary },
  opponentFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  powerDiff:        { fontSize: 13, fontWeight: '700' },
  fightBtn:         { backgroundColor: COLORS.bgPanel, borderWidth: 1, borderColor: COLORS.neonGreen, borderRadius: 6, paddingHorizontal: 20, paddingVertical: 10 },
  fightBtnDisabled: { opacity: 0.4 },
  fightBtnText:     { fontSize: 13, fontWeight: '800', color: COLORS.neonGreen, letterSpacing: 2 },
})