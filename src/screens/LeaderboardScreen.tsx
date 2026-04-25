// =============================================
// ECHO RIFT — LEADERBOARD SCREEN
// =============================================

import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, RefreshControl,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useGame } from '../hooks/useGame'
import { COLORS, CLASS_INFO } from '../constants'
import { ClassType } from '../types'

const CORNER = 10

const TABS = [
  { key: 'power',       label: '⚡ POWER' },
  { key: 'arena',       label: '🏆 ARENA' },
  { key: 'dungeon',     label: '⚔️ DUNGEON' },
  { key: 'all_seasons', label: '🌌 ALL' },
]

function HoloCard({ children, style, color = '#00D4FF' }: {
  children: React.ReactNode; style?: any; color?: string
}) {
  return (
    <View style={[styles.holoCard, style]}>
      <View style={[styles.corner, styles.cTL, { borderColor: color }]} />
      <View style={[styles.corner, styles.cTR, { borderColor: color }]} />
      <View style={[styles.corner, styles.cBL, { borderColor: color }]} />
      <View style={[styles.corner, styles.cBR, { borderColor: color }]} />
      {children}
    </View>
  )
}

export default function LeaderboardScreen({ navigation }: any) {
  const { getLeaderboard } = useGame()
  const [userId,     setUserId]     = useState<string | null>(null)
  const [activeTab,  setActiveTab]  = useState('power')
  const [data,       setData]       = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(useCallback(() => { loadData() }, [activeTab]))

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      // ✅ FIX: 2 argüman (type, player_id) — season_id yok
      const result = await getLeaderboard(activeTab, user.id)
      if (result?.success) setData(result)
    }
  }

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false) }

  const getRankColor = (rank: number) =>
    rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#fff'

  const getRankIcon = (rank: number) =>
    rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`

  const getStatValue = (item: any) => {
    switch (activeTab) {
      case 'power':       return `⚡ ${item.power_score?.toLocaleString()}`
      case 'arena':       return `🏆 ${item.arena_points} pts`
      case 'dungeon':     return `⚔️ F${item.max_floor}`
      case 'all_seasons': return `🌌 ${item.arena_points} pts`
      default:            return ''
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RANKINGS</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && { color: COLORS.neonGreen as string }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KENDİ RANKIN */}
      {data?.player && Object.keys(data.player).length > 0 && (
        <HoloCard color={COLORS.neonGreen as string} style={styles.myRankCard}>
          <Text style={styles.myRankLabel}>YOUR RANK</Text>
          <View style={styles.myRankRow}>
            <Text style={[styles.myRankNum, { color: getRankColor(data.player_rank) }]}>
              {getRankIcon(data.player_rank)}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.myRankName}>{data.player.username}</Text>
              <Text style={styles.myRankSub}>
                {data.player.class_type
                  ? CLASS_INFO[data.player.class_type as ClassType]?.name
                  : ''} • Lv.{data.player.level}
              </Text>
            </View>
            <Text style={[styles.myRankStat, { color: COLORS.neonGreen as string }]}>
              {getStatValue(data.player)}
            </Text>
          </View>
        </HoloCard>
      )}

      {/* TOP 100 */}
      <FlatList
        data={data?.top100 || []}
        keyExtractor={(item) => item.player_id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neonGreen} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ color: '#fff', fontSize: 14 }}>No data yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.rankRow, item.player_id === userId && styles.rankRowMine]}>
            <View style={styles.rankNumCol}>
              {item.rank <= 3
                ? <Text style={styles.rankIcon}>{getRankIcon(item.rank)}</Text>
                : <Text style={[styles.rankNum, { color: getRankColor(item.rank) }]}>{item.rank}</Text>
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.playerName, item.player_id === userId && { color: COLORS.neonGreen as string }]}>
                {item.username}{item.player_id === userId ? ' (YOU)' : ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                {item.class_type && (
                  <Text style={[styles.playerClass, {
                    color: CLASS_INFO[item.class_type as ClassType]?.color || '#fff'
                  }]}>
                    {CLASS_INFO[item.class_type as ClassType]?.icon} {CLASS_INFO[item.class_type as ClassType]?.name}
                  </Text>
                )}
                <Text style={styles.playerLevel}>Lv.{item.level}</Text>
              </View>
            </View>
            <Text style={[styles.statValue, { color: getRankColor(item.rank) }]}>
              {getStatValue(item)}
            </Text>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050A0F' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backText:    { fontSize: 12, color: '#fff', letterSpacing: 1 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 3 },

  tabs:      { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  tab:       { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6 },
  tabActive: { borderColor: COLORS.neonGreen, backgroundColor: 'rgba(0,255,136,0.08)' },
  tabText:   { fontSize: 10, color: '#fff', letterSpacing: 1 },

  holoCard: {
    backgroundColor: 'rgba(0,8,18,0.85)',
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)',
    borderRadius: 4, padding: 12, position: 'relative',
  },
  corner: { position: 'absolute', width: CORNER, height: CORNER },
  cTL: { top: -1, left: -1,    borderTopWidth: 1.5,    borderLeftWidth: 1.5 },
  cTR: { top: -1, right: -1,   borderTopWidth: 1.5,    borderRightWidth: 1.5 },
  cBL: { bottom: -1, left: -1,   borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
  cBR: { bottom: -1, right: -1,  borderBottomWidth: 1.5, borderRightWidth: 1.5 },

  myRankCard:  { marginHorizontal: 16, marginBottom: 12 },
  myRankLabel: { fontSize: 9, color: COLORS.neonGreen, letterSpacing: 3, marginBottom: 8 },
  myRankRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  myRankNum:   { fontSize: 24, fontWeight: '900', width: 40, textAlign: 'center' },
  myRankName:  { fontSize: 15, fontWeight: '800', color: '#fff' },
  myRankSub:   { fontSize: 10, color: '#fff', marginTop: 2 },
  myRankStat:  { fontSize: 13, fontWeight: '800' },

  list: { paddingHorizontal: 16, paddingBottom: 100 },
  rankRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,8,18,0.85)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4, padding: 12, marginBottom: 6, gap: 10,
  },
  rankRowMine: { borderColor: 'rgba(0,255,136,0.4)', backgroundColor: 'rgba(0,255,136,0.06)' },
  rankNumCol:  { width: 36, alignItems: 'center' },
  rankIcon:    { fontSize: 20 },
  rankNum:     { fontSize: 14, fontWeight: '900' },
  playerName:  { fontSize: 14, fontWeight: '700', color: '#fff' },
  playerClass: { fontSize: 10, fontWeight: '700' },
  playerLevel: { fontSize: 10, color: '#fff' },
  statValue:   { fontSize: 12, fontWeight: '800' },
})