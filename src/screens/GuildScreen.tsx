// =============================================
// ECHO RIFT — GUILD SCREEN
// Tabs: info | members | boss | chat
// =============================================

import React, { useCallback, useState, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Dimensions, Alert, TextInput, RefreshControl,
  KeyboardAvoidingView, Platform, FlatList, Animated, Modal,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import { useGame } from '../hooks/useGame'
import { COLORS } from '../constants'
import { ThemedAlert } from '../components/ThemedAlert'
import { PlayerActionMenu } from '../components/PlayerActionMenu'

const { width } = Dimensions.get('window')
type Tab = 'info' | 'members' | 'boss' | 'chat'

export default function GuildScreen({ navigation }: any) {
  const { playerState } = useGameStore()
  const { fetchPlayerState } = useGame()
  const [userId,       setUserId]       = useState<string | null>(null)
  const [actionMenuPlayer, setActionMenuPlayer] = useState<any | null>(null)
  const [guildData,    setGuildData]    = useState<any>(null)
  const [searchResults,setSearchResults]= useState<any[]>([])
  const [messages,     setMessages]     = useState<any[]>([])
  const [bossData,     setBossData]     = useState<any>(null)
  const [tab,          setTab]          = useState<Tab>('info')
  const [searchQuery,  setSearchQuery]  = useState('')
  const [messageText,  setMessageText]  = useState('')
  const [refreshing,   setRefreshing]   = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [bossLoading,  setBossLoading]  = useState(false)
  // ✅ Reward claim state
  const [claimLoading, setClaimLoading] = useState(false)
  const [rewardModal,  setRewardModal]  = useState<any>(null)
    // ✅ Boss reward claim
    const handleClaimReward = async () => {
      if (!userId || !bossData?.boss?.id || claimLoading) return
      setClaimLoading(true)
      const { data } = await supabase.rpc('claim_guild_boss_reward', {
        p_player_id: userId,
        p_boss_id:   bossData.boss.id,
      })
      setClaimLoading(false)

      if (data?.success) {
        // Modal'ı aç
        setRewardModal({
          contribution_pct: data.contribution_pct,
          gold:  data.gold,
          scrap: data.scrap,
          rc:    data.rc,
          rank:  data.rank,
        })
        // Player state ve boss state'i yenile
        await fetchPlayerState(userId)
        const guildId = playerState?.guild?.id
        if (guildId) await loadBoss(guildId)
      } else {
        const msg = data?.error === 'BOSS_NOT_DEFEATED'   ? 'Boss is not defeated yet.'
                  : data?.error === 'ALREADY_CLAIMED'     ? 'You already claimed this reward.'
                  : data?.error === 'NO_CONTRIBUTION'     ? 'You did not attack this boss.'
                  : data?.error || 'Failed'
        ThemedAlert.alert('Cannot Claim', msg)
      }
    }
  const [showCreate,   setShowCreate]   = useState(false)
  const [showSearch,   setShowSearch]   = useState(false)
  const [guildName,    setGuildName]    = useState('')
  const [guildDesc,    setGuildDesc]    = useState('')
  const [initialLoading,setInitialLoading]=useState(true)
  const flatListRef = useRef<FlatList>(null)
  const shakeAnim   = useRef(new Animated.Value(0)).current

  useFocusEffect(useCallback(() => { loadData() }, []))

  const loadData = async () => {
    setInitialLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setInitialLoading(false); return }
    setUserId(user.id)
    const [playerResult] = await Promise.all([
      supabase.from('players').select('guild_id').eq('id', user.id).single(),
      fetchPlayerState(user.id),
    ])
    const guildId = playerResult.data?.guild_id
    if (guildId) {
      await Promise.all([loadGuild(guildId), loadChat(user.id), loadBoss(guildId)])
    } else {
      setGuildData(null); setMessages([]); setBossData(null)
    }
    setInitialLoading(false)
  }

  const loadGuild = async (guildId: string) => {
    const { data } = await supabase.rpc('get_guild', { p_guild_id: guildId })
    if (data?.success) setGuildData(data)
  }

  const loadChat = async (uid: string) => {
    const { data } = await supabase.rpc('get_guild_chat', { p_player_id: uid, p_limit: 50 })
    if (data?.success) setMessages(data.messages || [])
  }

  const loadBoss = async (guildId: string) => {
    const { data } = await supabase.rpc('get_or_spawn_guild_boss', { p_guild_id: guildId })
    if (data?.success) setBossData(data)
  }

  const onRefresh = async () => {
    setRefreshing(true); await loadData(); setRefreshing(false)
  }

  const handleSearch = async () => {
    const { data } = await supabase.rpc('search_guilds', { p_query: searchQuery, p_limit: 20 })
    if (data?.success) setSearchResults(data.guilds || [])
  }

  const handleCreateGuild = async () => {
    if (!userId || !guildName.trim()) { ThemedAlert.alert('Error', 'Guild name required!'); return }
    setLoading(true)
    const { data } = await supabase.rpc('create_guild', {
      p_player_id: userId, p_name: guildName.trim(), p_description: guildDesc.trim(),
    })
    setLoading(false)
    if (data?.success) { setShowCreate(false); setGuildName(''); setGuildDesc(''); await loadData() }
    else {
      const msg = data?.error === 'NAME_TAKEN' ? 'Guild name already taken!'
        : data?.error === 'INSUFFICIENT_GOLD' ? 'Need 1,000 Gold to create a guild!'
        : data?.error === 'ALREADY_IN_GUILD'  ? 'You are already in a guild!'
        : data?.error || 'Failed to create guild'
      ThemedAlert.alert('Error', msg)
    }
  }

  const handleJoinGuild = async (guildId: string, name: string) => {
    if (!userId) return
    ThemedAlert.alert(`Join ${name}?`, 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'JOIN', onPress: async () => {
        const { data } = await supabase.rpc('join_guild', { p_player_id: userId, p_guild_id: guildId })
        if (data?.success) { setShowSearch(false); await loadData() }
        else ThemedAlert.alert('Error', data?.error === 'LEVEL_TOO_LOW'
          ? `Level too low! Required: ${data.required}` : data?.error || 'Failed')
      }}
    ])
  }

  const handleLeaveGuild = async () => {
    if (!userId) return
    ThemedAlert.alert('Leave Guild', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'LEAVE', style: 'destructive', onPress: async () => {
        const { data } = await supabase.rpc('leave_guild', { p_player_id: userId })
        if (data?.success) { setGuildData(null); setMessages([]); setBossData(null); await fetchPlayerState(userId) }
        else ThemedAlert.alert('Error', data?.error || 'Failed')
      }}
    ])
  }

  const handleDonate = async () => {
    if (!userId) return
    const gold = playerState?.player?.gold || 0
    const donateAmount = Math.min(10000, gold)
    if (donateAmount < 100) { ThemedAlert.alert('Insufficient Gold', 'You need at least 100 Gold.'); return }
    ThemedAlert.alert('🪙 Donate to Guild', `Donate ${donateAmount.toLocaleString()} Gold?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'DONATE', onPress: async () => {
        const { data } = await supabase.rpc('donate_to_guild', { p_player_id: userId, p_gold_amount: donateAmount })
        if (data?.success) {
          let msg = `${data.donated.toLocaleString()} Gold donated!`
          if (data.leveled_up) msg += `\n\n🎉 Guild leveled up to ${data.guild_level}!`
          ThemedAlert.alert('✅ Donated!', msg); await loadData()
        } else {
          ThemedAlert.alert('Error', data?.error === 'DAILY_LIMIT_REACHED' ? 'Daily limit reached!'
            : data?.error || 'Failed')
        }
      }}
    ])
  }

  // ✅ Boss attack
  const handleAttackBoss = async () => {
    if (!userId || !bossData?.boss?.id || bossLoading) return
    setBossLoading(true)

    // Shake animation
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start()

    const { data } = await supabase.rpc('attack_guild_boss', {
      p_player_id: userId,
      p_boss_id:   bossData.boss.id,
    })
    setBossLoading(false)

    if (data?.success) {
      const guildId = playerState?.guild?.id || guildData?.guild?.id
      if (guildId) await loadBoss(guildId)
      if (data.is_kill) {
        ThemedAlert.alert('💥 BOSS DEFEATED!',
          `You dealt the killing blow!\n\n+${data.reward_gold.toLocaleString()} Gold\n+${data.reward_scrap} Scrap`)
      }
    } else {
      const msg = data?.error === 'ALREADY_ATTACKED_TODAY' ? 'Already attacked today! Come back tomorrow.'
        : data?.error === 'BOSS_ALREADY_DEFEATED'          ? 'Boss is already defeated!'
        : data?.error || 'Attack failed'
      ThemedAlert.alert('Error', msg)
    }
  }

  const handleSendMessage = async () => {
    if (!messageText.trim() || !userId) return

    const text = messageText.trim()
    setMessageText('')

    // ✅ Optimistic update: hemen göster
    const tempMsg = {
      id: `temp-${Date.now()}`,
      player_id: userId,
      username:  playerState?.player?.username ?? 'You',
      message:   text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev: any[]) => [...prev, tempMsg])
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50)

    const { data, error } = await supabase.rpc('send_guild_message', {
      p_player_id: userId,
      p_message:   text,
    })

    if (error || !data?.success) {
      // Başarısız → geri al
      setMessages((prev: any[]) => prev.filter(m => m.id !== tempMsg.id))
      const errMsg =
        data?.error === 'SLOW_DOWN' ? 'Wait 3 seconds between messages!' :
        data?.error === 'MESSAGE_TOO_LONG' ? 'Message too long (max 200 chars)!' :
        error?.message || 'Failed to send'
      ThemedAlert.alert('Error', errMsg)
      setMessageText(text) // geri koy
    }
  }

  const handleKick = async (targetId: string, targetName: string) => {
    if (!userId) return
    ThemedAlert.alert('Kick Member', `Remove ${targetName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'KICK', style: 'destructive', onPress: async () => {
        const { data } = await supabase.rpc('kick_guild_member', { p_leader_id: userId, p_target_id: targetId })
        if (data?.success) await loadData()
        else ThemedAlert.alert('Error', data?.error || 'Failed')
      }}
    ])
  }

  const handleSetMinLevel = async () => {
    if (!userId) return
    Alert.prompt('Set Min Level', 'Minimum level to join (1-100):', async (value) => {
      const level = parseInt(value)
      if (isNaN(level) || level < 1 || level > 100) { ThemedAlert.alert('Error', 'Enter 1-100'); return }
      const { data } = await supabase.rpc('set_guild_min_level', { p_leader_id: userId, p_min_level: level })
      if (data?.success) { await loadData(); ThemedAlert.alert('✅', `Min level set to ${level}`) }
    }, 'plain-text', String(guildData?.guild?.min_level || 1), 'numeric')
  }

  const isLeader = guildData && playerState && guildData.guild.leader_id === playerState.player?.id

  // ─── LOADING ──────────────────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>GUILD</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <Text style={{ color: COLORS.neonGreen, letterSpacing: 4, fontSize: 14 }}>LOADING...</Text>
        </View>
      </View>
    )
  }

  // ─── NO GUILD ─────────────────────────────────────────────────────────────
  if (!guildData && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>GUILD</Text>
          <View style={{ width: 50 }} />
        </View>

        {!showCreate && !showSearch ? (
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neonGreen} />}
            contentContainerStyle={styles.noGuildContainer}
          >
            <Text style={styles.noGuildIcon}>⚔️</Text>
            <Text style={styles.noGuildTitle}>NO GUILD</Text>
            <Text style={styles.noGuildDesc}>Join a guild to fight together, share loot, and climb the rankings!</Text>
            <View style={styles.noGuildBenefits}>
              {['🏆 Guild leaderboard','💬 Guild chat','👾 Weekly guild boss','🎁 Shared treasury'].map((b,i) => (
                <Text key={i} style={styles.benefitText}>{b}</Text>
              ))}
            </View>
            <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
              <Text style={styles.createBtnText}>+ CREATE GUILD</Text>
              <Text style={styles.createBtnSub}>Cost: 1,000 Gold</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.searchBtn} onPress={() => { setShowSearch(true); handleSearch() }}>
              <Text style={styles.searchBtnText}>🔍 BROWSE GUILDS</Text>
            </TouchableOpacity>
          </ScrollView>

        ) : showCreate ? (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.formContainer}>
              <Text style={styles.formTitle}>CREATE GUILD</Text>
              <Text style={styles.inputLabel}>GUILD NAME *</Text>
              <TextInput style={styles.input} value={guildName} onChangeText={setGuildName} placeholder="Enter guild name..." placeholderTextColor={COLORS.textMuted} maxLength={30} />
              <Text style={styles.inputLabel}>DESCRIPTION</Text>
              <TextInput style={[styles.input, styles.inputMulti]} value={guildDesc} onChangeText={setGuildDesc} placeholder="Describe your guild..." placeholderTextColor={COLORS.textMuted} multiline maxLength={100} />
              <View style={styles.costInfo}>
                <Text style={styles.costInfoText}>💰 Creation cost: 1,000 Gold</Text>
                <Text style={styles.costInfoText}>Your gold: {playerState?.player?.gold?.toLocaleString() || 0}</Text>
              </View>
              <TouchableOpacity style={[styles.createBtn, loading && { opacity: 0.6 }]} onPress={handleCreateGuild} disabled={loading}>
                <Text style={styles.createBtnText}>{loading ? 'CREATING...' : 'CREATE GUILD'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>

        ) : (
          <View style={{ flex: 1 }}>
            <View style={styles.searchBar}>
              <TextInput style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search guilds..." placeholderTextColor={COLORS.textMuted} onSubmitEditing={handleSearch} />
              <TouchableOpacity style={styles.searchGoBtn} onPress={handleSearch}>
                <Text style={styles.searchGoBtnText}>GO</Text>
              </TouchableOpacity>
            </View>
            <FlatList data={searchResults} keyExtractor={item => item.id} contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No guilds found</Text>}
              renderItem={({ item }) => (
                <View style={styles.guildListCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guildListName}>{item.name}</Text>
                    <Text style={styles.guildListDesc} numberOfLines={1}>{item.description || 'No description'}</Text>
                    <Text style={styles.guildListMeta}>Lv.{item.level} • {item.member_count}/{item.max_members} members • Leader: {item.leader_name}</Text>
                  </View>
                  <TouchableOpacity style={styles.joinBtn} onPress={() => handleJoinGuild(item.id, item.name)}>
                    <Text style={styles.joinBtnText}>JOIN</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            <TouchableOpacity style={[styles.cancelBtn, { margin: 16 }]} onPress={() => setShowSearch(false)}>
              <Text style={styles.cancelBtnText}>BACK</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    )
  }

  // ─── GUILD VIEW ───────────────────────────────────────────────────────────
  const { guild, members } = guildData
  const boss = bossData?.boss
  const attackers: any[] = bossData?.attackers || []
  const myDmg = attackers.find((a: any) => a.player_id === userId)?.total_dmg || 0
  const totalDmg = attackers.reduce((s: number, a: any) => s + (a.total_dmg || 0), 0)
  const hpPct = boss ? Math.max(0, boss.hp_current / boss.hp_max * 100) : 0
  const attackedToday = attackers.some((a: any) => a.player_id === userId)

  // Days left this week
  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setDate(now.getDate() + (7 - now.getDay()))
  weekEnd.setHours(0,0,0,0)
  const daysLeft = Math.ceil((weekEnd.getTime() - now.getTime()) / (1000*60*60*24))

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{guild.name}</Text>
        <TouchableOpacity onPress={handleLeaveGuild}>
          <Text style={styles.leaveBtn}>LEAVE</Text>
        </TouchableOpacity>
      </View>

      {/* Guild Info Card */}
      <View style={styles.guildInfoCard}>
        <View style={styles.guildInfoRow}>
          <View style={styles.guildStat}>
            <Text style={styles.guildStatValue}>Lv.{guild.level}</Text>
            <Text style={styles.guildStatLabel}>LEVEL</Text>
          </View>
          <View style={styles.guildStat}>
            <Text style={styles.guildStatValue}>{guild.member_count}/{guild.max_members}</Text>
            <Text style={styles.guildStatLabel}>MEMBERS</Text>
          </View>
          <View style={styles.guildStat}>
            <Text style={[styles.guildStatValue, { color: COLORS.neonGreen }]}>{guild.war_wins}</Text>
            <Text style={styles.guildStatLabel}>WAR WINS</Text>
          </View>
          <View style={styles.guildStat}>
            <Text style={[styles.guildStatValue, { color: COLORS.gold }]}>{guild.treasury_gold?.toLocaleString()}</Text>
            <Text style={styles.guildStatLabel}>TREASURY</Text>
          </View>
        </View>
        <View style={styles.xpRow}>
          <Text style={styles.xpLabel}>GUILD XP</Text>
          <Text style={styles.xpValue}>{guild.xp} / {guild.xp_to_next}</Text>
        </View>
        <View style={styles.xpBar}>
          <View style={[styles.xpFill, { width: `${Math.min((guild.xp / guild.xp_to_next) * 100, 100)}%` }]} />
        </View>
        <TouchableOpacity style={styles.donateBtn} onPress={handleDonate}>
          <Text style={styles.donateBtnText}>🪙 DONATE GOLD</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['info','members','boss','chat'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => { setTab(t); if (t === 'chat' && userId) loadChat(userId) }}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'info' ? '📋' : t === 'members' ? '👥' : t === 'boss' ? '👾' : '💬'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── INFO TAB ──────────────────────────────────────────────────────── */}
      {tab === 'info' && (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neonGreen} />}
          contentContainerStyle={{ padding: 16 }}
        >
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>DESCRIPTION</Text>
            <Text style={styles.infoText}>{guild.description || 'No description set.'}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>GUILD STATS</Text>
            {[
              ['War Record',    `${guild.war_wins}W - ${guild.war_losses}L`],
              ['Treasury',      `${guild.treasury_gold?.toLocaleString()} 🪙`],
              ['Max Members',   `${guild.max_members}`],
              ['Min Join Level',`Lv.${guild.min_level || 1}`],
            ].map(([k,v]) => (
              <View key={k} style={styles.infoRow}>
                <Text style={styles.infoKey}>{k}</Text>
                <Text style={styles.infoVal}>{v}</Text>
              </View>
            ))}
          </View>
          {!!(isLeader) && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>⚙️ GUILD SETTINGS</Text>
              <TouchableOpacity style={styles.settingBtn} onPress={handleSetMinLevel}>
                <Text style={styles.settingBtnText}>CHANGE MIN JOIN LEVEL (Current: Lv.{guild.min_level || 1})</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* ─── MEMBERS TAB ───────────────────────────────────────────────────── */}
      {tab === 'members' && (
        <FlatList data={members || []} keyExtractor={item => item.player_id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neonGreen} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => item.player_id !== userId && setActionMenuPlayer({
                player_id: item.player_id,
                username: item.username,
                class_type: item.class_type,
                level: item.level,
              })}
              activeOpacity={0.7}
              disabled={item.player_id === userId}
            >
            <View style={styles.memberCard}>
              <View style={styles.memberLeft}>
                <View style={styles.memberRoleBadge}>
                  <Text style={[styles.memberRole, {
                    color: item.role === 'leader' ? COLORS.gold : item.role === 'officer' ? COLORS.cyan : COLORS.textMuted
                  }]}>
                    {item.role === 'leader' ? '👑' : item.role === 'officer' ? '⭐' : '⚔️'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.memberName}>{item.username}</Text>
                  <Text style={styles.memberMeta}>Lv.{item.level} • {item.power_score?.toLocaleString()} PWR</Text>
                </View>
              </View>
              <View style={styles.memberRight}>
                <Text style={styles.memberDonated}>🪙 {item.total_donated?.toLocaleString()}</Text>
                <Text style={styles.memberDonatedLabel}>donated</Text>
                {isLeader && item.player_id !== userId && item.role !== 'leader' && (
                  <TouchableOpacity style={styles.kickBtn} onPress={() => handleKick(item.player_id, item.username)}>
                    <Text style={styles.kickBtnText}>KICK</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* ─── BOSS TAB ──────────────────────────────────────────────────────── */}
      {tab === 'boss' && (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neonGreen} />}
          contentContainerStyle={{ padding: 16 }}
        >
          {boss ? (
            <>
              {/* Boss card */}
              <View style={[styles.bossCard, boss.is_defeated && styles.bossCardDefeated]}>
                <View style={styles.bossTimerRow}>
                  <Text style={styles.bossTimerLabel}>WEEKLY BOSS</Text>
                  <Text style={[styles.bossTimer, daysLeft <= 1 && { color: COLORS.error }]}>
                    {boss.is_defeated ? '✅ DEFEATED' : `${daysLeft}d remaining`}
                  </Text>
                </View>

                {/* Boss visual */}
                <Animated.View style={[styles.bossVisual, { transform: [{ translateX: shakeAnim }] }]}>
                  <Text style={styles.bossEmoji}>{boss.emoji}</Text>
                  <Text style={styles.bossName}>{boss.name}</Text>
                </Animated.View>

                {/* HP Bar */}
                <View style={styles.bossHpRow}>
                  <Text style={styles.bossHpLabel}>HP</Text>
                  <Text style={styles.bossHpVal}>
                    {boss.hp_current.toLocaleString()} / {boss.hp_max.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.bossHpBar}>
                  <View style={[styles.bossHpFill, {
                    width: `${hpPct}%`,
                    backgroundColor: hpPct > 50 ? '#FF4444' : hpPct > 25 ? '#FF8C00' : '#FFD700',
                  }]} />
                </View>
                <Text style={styles.bossHpPct}>{(100 - hpPct).toFixed(1)}% damage dealt</Text>

                {/* Attack button (boss alive) */}
                {!boss.is_defeated && (
                  <TouchableOpacity
                    style={[
                      styles.attackBtn,
                      (attackedToday || bossLoading) && styles.attackBtnUsed,
                    ]}
                    onPress={handleAttackBoss}
                    disabled={attackedToday || bossLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.attackBtnText, attackedToday && { color: COLORS.textMuted }]}>
                      {bossLoading ? 'ATTACKING...'
                        : attackedToday ? '✓ ATTACKED TODAY'
                        : '⚔️ ATTACK'}
                    </Text>
                    {!attackedToday && (
                      <Text style={styles.attackBtnSub}>1 attack remaining today</Text>
                    )}
                  </TouchableOpacity>
                )}

                {/* ✅ Claim Reward button (boss defeated) */}
                {boss.is_defeated && (
                  <>
                    {bossData?.my_contribution > 0 && !bossData?.my_reward_claimed && (
                      <TouchableOpacity
                        style={[styles.claimBtn, claimLoading && styles.attackBtnUsed]}
                        onPress={handleClaimReward}
                        disabled={claimLoading}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.claimBtnText}>
                          {claimLoading ? 'CLAIMING...' : '🎁 CLAIM REWARDS'}
                        </Text>
                        <Text style={styles.attackBtnSub}>
                          Rank #{bossData.my_rank} • {((bossData.my_contribution / boss.hp_max) * 100).toFixed(1)}% contribution
                        </Text>
                      </TouchableOpacity>
                    )}

                    {bossData?.my_contribution > 0 && bossData?.my_reward_claimed && (
                      <View style={styles.claimedBox}>
                        <Text style={styles.claimedText}>✅ REWARD CLAIMED</Text>
                        <Text style={styles.attackBtnSub}>
                          Rank #{bossData.my_rank} • Next boss spawns next week
                        </Text>
                      </View>
                    )}

                    {bossData?.my_contribution === 0 && (
                      <View style={styles.claimedBox}>
                        <Text style={[styles.claimedText, { color: COLORS.textMuted }]}>
                          NO CONTRIBUTION
                        </Text>
                        <Text style={styles.attackBtnSub}>
                          You did not attack this boss
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>

              {/* Damage rankings */}
              {attackers.length > 0 && (
                <View style={styles.rankCard}>
                  <Text style={styles.rankTitle}>DAMAGE RANKINGS</Text>
                  {attackers.slice(0, 10).map((a: any, i: number) => {
                    const pct = totalDmg > 0 ? (a.total_dmg / totalDmg * 100).toFixed(1) : '0'
                    const isMe = a.player_id === userId
                    return (
                      <View key={a.player_id} style={[styles.rankRow, isMe && styles.rankRowMe]}>
                        <Text style={[styles.rankNum, i === 0 && { color: '#FFD700' },
                          i === 1 && { color: '#C0C0C0' }, i === 2 && { color: '#CD7F32' }]}>
                          #{i + 1}
                        </Text>
                        <Text style={styles.rankName} numberOfLines={1}>{a.username}</Text>
                        <View style={styles.rankBarWrap}>
                          <View style={[styles.rankBar, { width: `${Math.max(5, parseFloat(pct))}%` }]} />
                        </View>
                        <Text style={styles.rankDmg}>{(a.total_dmg / 1000000).toFixed(1)}M</Text>
                        <Text style={styles.rankPct}>{pct}%</Text>
                      </View>
                    )
                  })}
                </View>
              )}

              {attackers.length === 0 && !boss.is_defeated && (
                <View style={styles.noAttacksBox}>
                  <Text style={styles.noAttacksText}>No attacks yet — be the first!</Text>
                </View>
              )}
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Loading boss...</Text>
            </View>
          )}

          {/* ✅ REWARD MODAL */}
          <Modal
            visible={!!rewardModal}
            transparent
            animationType="fade"
            onRequestClose={() => setRewardModal(null)}
          >
            <View style={styles.modalBg}>
              <View style={styles.modalCard}>
                <Text style={styles.modalIcon}>🎉</Text>
                <Text style={styles.modalTitle}>BOSS DEFEATED</Text>
                <Text style={styles.modalSub}>
                  Rank #{rewardModal?.rank} • {rewardModal?.contribution_pct}% contribution
                </Text>

                <View style={styles.rewardsList}>
                  <View style={styles.rewardLine}>
                    <Text style={styles.rewardLabel}>🪙 GOLD</Text>
                    <Text style={styles.rewardValue}>+{rewardModal?.gold?.toLocaleString()}</Text>
                  </View>
                  <View style={styles.rewardLine}>
                    <Text style={styles.rewardLabel}>🔩 SCRAP METAL</Text>
                    <Text style={styles.rewardValue}>+{rewardModal?.scrap?.toLocaleString()}</Text>
                  </View>
                  {rewardModal?.rc > 0 && (
                    <View style={[styles.rewardLine, styles.rewardLineHighlight]}>
                      <Text style={[styles.rewardLabel, { color: COLORS.neonGreen }]}>💎 RIFT CRYSTALS (TOP 3)</Text>
                      <Text style={[styles.rewardValue, { color: COLORS.neonGreen }]}>+{rewardModal.rc}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={() => setRewardModal(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalBtnText}>AWESOME!</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </ScrollView>
      )}

      {/* ─── CHAT TAB ──────────────────────────────────────────────────────── */}
      {tab === 'chat' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
          <FlatList ref={flatListRef} data={messages} keyExtractor={item => item.id}
            contentContainerStyle={styles.chatList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            renderItem={({ item }) => {
              const isMe = item.player_id === userId
              return (
                <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                  {!isMe && <Text style={styles.msgUsername}>{item.username}</Text>}
                  <View style={[styles.msgBubble, isMe && styles.msgBubbleMe]}>
                    <Text style={styles.msgText}>{item.message}</Text>
                  </View>
                  <Text style={styles.msgTime}>
                    {new Date(item.created_at).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}
                  </Text>
                </View>
              )
            }}
          />
          <View style={styles.chatInputRow}>
            <TextInput style={styles.chatInput} value={messageText} onChangeText={setMessageText}
              placeholder="Type a message..." placeholderTextColor={COLORS.textMuted}
              maxLength={200} onSubmitEditing={handleSendMessage} />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
              <Text style={styles.sendBtnText}>SEND</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    {!!(actionMenuPlayer) && (
      <PlayerActionMenu
        visible={!!actionMenuPlayer}
        onClose={() => setActionMenuPlayer(null)}
        targetPlayerId={actionMenuPlayer.player_id}
        targetUsername={actionMenuPlayer.username}
        targetClassType={actionMenuPlayer.class_type}
        targetLevel={actionMenuPlayer.level}
        navigation={navigation}
        currentUserId={userId}
      />
    )}
    </View>
  )
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.bg },
  header:           { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingTop:52, paddingBottom:12 },
  backBtn:          { fontSize:12, color:COLORS.textSecondary, letterSpacing:1 },
  headerTitle:      { fontSize:18, fontWeight:'900', color:COLORS.textPrimary, letterSpacing:2, flex:1, textAlign:'center' },
  leaveBtn:         { fontSize:11, color:COLORS.error, fontWeight:'700' },
  noGuildContainer: { alignItems:'center', padding:24 },
  noGuildIcon:      { fontSize:64, marginBottom:16, marginTop:40 },
  noGuildTitle:     { fontSize:24, fontWeight:'900', color:COLORS.textPrimary, letterSpacing:4, marginBottom:8 },
  noGuildDesc:      { fontSize:13, color:COLORS.textSecondary, textAlign:'center', lineHeight:20, marginBottom:24 },
  noGuildBenefits:  { width:'100%', backgroundColor:COLORS.bgCard, borderRadius:10, borderWidth:1, borderColor:COLORS.border, padding:16, marginBottom:24, gap:8 },
  benefitText:      { fontSize:13, color:COLORS.textSecondary },
  createBtn:        { width:'100%', backgroundColor:COLORS.neonGreen, borderRadius:8, padding:16, alignItems:'center', marginBottom:12 },
  createBtnText:    { fontSize:14, fontWeight:'900', color:COLORS.bg, letterSpacing:2 },
  createBtnSub:     { fontSize:10, color:COLORS.bg, opacity:0.7, marginTop:2 },
  searchBtn:        { width:'100%', borderWidth:1, borderColor:COLORS.border, borderRadius:8, padding:14, alignItems:'center' },
  searchBtnText:    { fontSize:14, color:COLORS.textPrimary },
  cancelBtn:        { borderWidth:1, borderColor:COLORS.border, borderRadius:8, padding:14, alignItems:'center' },
  cancelBtnText:    { fontSize:13, color:COLORS.textMuted, letterSpacing:1 },
  formContainer:    { padding:16 },
  formTitle:        { fontSize:20, fontWeight:'900', color:COLORS.textPrimary, letterSpacing:3, marginBottom:24 },
  inputLabel:       { fontSize:9, color:COLORS.textMuted, letterSpacing:2, marginBottom:6 },
  input:            { backgroundColor:COLORS.bgCard, borderWidth:1, borderColor:COLORS.border, borderRadius:8, padding:12, color:COLORS.textPrimary, fontSize:14, marginBottom:16 },
  inputMulti:       { height:80, textAlignVertical:'top' },
  costInfo:         { backgroundColor:COLORS.bgCard, borderRadius:8, borderWidth:1, borderColor:COLORS.border, padding:12, marginBottom:16, gap:4 },
  costInfoText:     { fontSize:12, color:COLORS.textSecondary },
  searchBar:        { flexDirection:'row', paddingHorizontal:16, paddingVertical:12, gap:8 },
  searchInput:      { flex:1, backgroundColor:COLORS.bgCard, borderWidth:1, borderColor:COLORS.border, borderRadius:8, padding:10, color:COLORS.textPrimary, fontSize:14 },
  searchGoBtn:      { backgroundColor:COLORS.neonGreen, borderRadius:8, paddingHorizontal:16, justifyContent:'center' },
  searchGoBtnText:  { fontSize:12, fontWeight:'900', color:COLORS.bg },
  guildListCard:    { flexDirection:'row', alignItems:'center', backgroundColor:COLORS.bgCard, borderRadius:10, borderWidth:1, borderColor:COLORS.border, padding:14, marginBottom:8, gap:10 },
  guildListName:    { fontSize:15, fontWeight:'800', color:COLORS.textPrimary },
  guildListDesc:    { fontSize:11, color:COLORS.textMuted, marginTop:2 },
  guildListMeta:    { fontSize:10, color:COLORS.textMuted, marginTop:4 },
  joinBtn:          { backgroundColor:COLORS.neonGreen, borderRadius:6, paddingHorizontal:14, paddingVertical:8 },
  joinBtnText:      { fontSize:11, fontWeight:'900', color:COLORS.bg, letterSpacing:1 },
  emptyText:        { textAlign:'center', color:COLORS.textMuted, marginTop:40 },
  guildInfoCard:    { marginHorizontal:16, marginBottom:12, backgroundColor:COLORS.bgCard, borderRadius:10, borderWidth:1, borderColor:COLORS.border, padding:14 },
  guildInfoRow:     { flexDirection:'row', marginBottom:12 },
  guildStat:        { flex:1, alignItems:'center' },
  guildStatValue:   { fontSize:16, fontWeight:'900', color:COLORS.textPrimary },
  guildStatLabel:   { fontSize:8, color:COLORS.textMuted, letterSpacing:1, marginTop:2 },
  xpRow:            { flexDirection:'row', justifyContent:'space-between', marginBottom:4 },
  xpLabel:          { fontSize:9, color:COLORS.textMuted, letterSpacing:2 },
  xpValue:          { fontSize:9, color:COLORS.textSecondary },
  xpBar:            { height:4, backgroundColor:COLORS.bgPanel, borderRadius:2, overflow:'hidden', marginBottom:10 },
  xpFill:           { height:'100%', backgroundColor:COLORS.cyan, borderRadius:2 },
  donateBtn:        { borderWidth:1, borderColor:COLORS.gold, borderRadius:6, padding:8, alignItems:'center' },
  donateBtnText:    { fontSize:12, fontWeight:'700', color:COLORS.gold, letterSpacing:1 },
  tabs:             { flexDirection:'row', marginHorizontal:16, marginBottom:8, backgroundColor:COLORS.bgCard, borderRadius:8, borderWidth:1, borderColor:COLORS.border, padding:4 },
  tabBtn:           { flex:1, paddingVertical:8, alignItems:'center', borderRadius:6 },
  tabBtnActive:     { backgroundColor:COLORS.bgPanel },
  tabText:          { fontSize:16 },
  tabTextActive:    { color:COLORS.textPrimary },
  infoCard:         { backgroundColor:COLORS.bgCard, borderRadius:10, borderWidth:1, borderColor:COLORS.border, padding:14, marginBottom:10 },
  infoLabel:        { fontSize:9, color:COLORS.textMuted, letterSpacing:2, marginBottom:8 },
  infoText:         { fontSize:13, color:COLORS.textSecondary, lineHeight:20 },
  infoRow:          { flexDirection:'row', justifyContent:'space-between', marginBottom:6 },
  infoKey:          { fontSize:12, color:COLORS.textMuted },
  infoVal:          { fontSize:12, color:COLORS.textPrimary, fontWeight:'700' },
  settingBtn:       { borderWidth:1, borderColor:COLORS.border, borderRadius:6, padding:10, alignItems:'center' },
  settingBtnText:   { fontSize:11, color:COLORS.textSecondary, letterSpacing:1 },
  memberCard:       { flexDirection:'row', alignItems:'center', backgroundColor:COLORS.bgCard, borderRadius:10, borderWidth:1, borderColor:COLORS.border, padding:12, marginBottom:8 },
  memberLeft:       { flex:1, flexDirection:'row', alignItems:'center', gap:10 },
  memberRoleBadge:  { width:32, alignItems:'center' },
  memberRole:       { fontSize:20 },
  memberName:       { fontSize:14, fontWeight:'700', color:COLORS.textPrimary },
  memberMeta:       { fontSize:10, color:COLORS.textMuted, marginTop:2 },
  memberRight:      { alignItems:'flex-end' },
  memberDonated:    { fontSize:12, fontWeight:'700', color:COLORS.gold },
  memberDonatedLabel:{ fontSize:9, color:COLORS.textMuted },
  kickBtn:          { borderWidth:1, borderColor:COLORS.error, borderRadius:4, paddingHorizontal:8, paddingVertical:3, marginTop:4 },
  kickBtnText:      { fontSize:9, color:COLORS.error, fontWeight:'700', letterSpacing:1 },

  // ✅ Boss tab styles
  bossCard:         { backgroundColor:COLORS.bgCard, borderRadius:12, borderWidth:1, borderColor:'rgba(255,68,68,0.4)', padding:16, marginBottom:12 },
  bossCardDefeated: { borderColor:'rgba(0,255,136,0.4)' },
  bossTimerRow:     { flexDirection:'row', justifyContent:'space-between', marginBottom:12 },
  bossTimerLabel:   { fontSize:9, color:COLORS.textMuted, letterSpacing:3, fontWeight:'700' },
  bossTimer:        { fontSize:12, fontWeight:'700', color:COLORS.textSecondary },
  bossVisual:       { alignItems:'center', marginBottom:16 },
  bossEmoji:        { fontSize:56, marginBottom:6 },
  bossName:         { fontSize:16, fontWeight:'900', color:COLORS.textPrimary, letterSpacing:2 },
  bossHpRow:        { flexDirection:'row', justifyContent:'space-between', marginBottom:4 },
  bossHpLabel:      { fontSize:10, color:COLORS.textMuted, letterSpacing:2 },
  bossHpVal:        { fontSize:10, color:COLORS.textSecondary },
  bossHpBar:        { height:10, backgroundColor:'rgba(255,255,255,0.08)', borderRadius:5, overflow:'hidden', marginBottom:4 },
  bossHpFill:       { height:'100%', borderRadius:5 },
  bossHpPct:        { fontSize:9, color:COLORS.textMuted, textAlign:'right', marginBottom:14 },
  attackBtn:        { backgroundColor:COLORS.error, borderRadius:8, padding:14, alignItems:'center' },
  attackBtnUsed:    { backgroundColor:'rgba(255,255,255,0.05)', borderWidth:1, borderColor:COLORS.border },
  attackBtnText:    { fontSize:15, fontWeight:'900', color:'#fff', letterSpacing:2 },
  attackBtnSub:     { fontSize:9, color:'rgba(255,255,255,0.6)', marginTop:3 },

  // ✅ Boss reward styles
  claimBtn: {
    backgroundColor: COLORS.neonGreen,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 12,
  },
  claimBtnText: {
    fontSize: 14, fontWeight: '900', letterSpacing: 2, color: COLORS.bg,
  },
  claimedBox: {
    backgroundColor: COLORS.bgPanel,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  claimedText: {
    fontSize: 12, fontWeight: '900', letterSpacing: 2, color: COLORS.neonGreen,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.bgCard,
    borderWidth: 2,
    borderColor: COLORS.neonGreen,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  modalIcon: { fontSize: 48, marginBottom: 8 },
  modalTitle: {
    fontSize: 22, fontWeight: '900', letterSpacing: 4,
    color: COLORS.textPrimary, marginBottom: 4,
  },
  modalSub: {
    fontSize: 11, color: COLORS.textSecondary,
    letterSpacing: 1, marginBottom: 20,
  },
  rewardsList: { width: '100%', gap: 8, marginBottom: 20 },
  rewardLine: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.bgPanel, padding: 12, borderRadius: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  rewardLineHighlight: {
    borderColor: COLORS.neonGreen,
    backgroundColor: 'rgba(0,255,136,0.08)',
  },
  rewardLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: 1 },
  rewardValue: { fontSize: 16, fontWeight: '900', color: '#FFD700' },
  modalBtn: {
    backgroundColor: COLORS.neonGreen, borderRadius: 6,
    paddingVertical: 12, paddingHorizontal: 32,
  },
  modalBtnText: {
    fontSize: 13, fontWeight: '900', letterSpacing: 3, color: COLORS.bg,
  },
  rankCard:         { backgroundColor:COLORS.bgCard, borderRadius:12, borderWidth:1, borderColor:COLORS.border, padding:14, marginBottom:12 },
  rankTitle:        { fontSize:9, color:COLORS.textMuted, letterSpacing:3, marginBottom:12, fontWeight:'700' },
  rankRow:          { flexDirection:'row', alignItems:'center', marginBottom:8, gap:6 },
  rankRowMe:        { backgroundColor:'rgba(0,212,255,0.06)', borderRadius:6, paddingHorizontal:4 },
  rankNum:          { fontSize:11, fontWeight:'900', color:COLORS.textMuted, width:24 },
  rankName:         { fontSize:12, color:COLORS.textPrimary, width:80 },
  rankBarWrap:      { flex:1, height:6, backgroundColor:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' },
  rankBar:          { height:'100%', backgroundColor:COLORS.error, borderRadius:3 },
  rankDmg:          { fontSize:10, fontWeight:'700', color:COLORS.textPrimary, width:36, textAlign:'right' },
  rankPct:          { fontSize:9, color:COLORS.textMuted, width:32, textAlign:'right' },
  noAttacksBox:     { alignItems:'center', paddingVertical:24 },
  noAttacksText:    { fontSize:13, color:COLORS.textMuted },

  chatList:         { padding:16, gap:8 },
  msgRow:           { alignItems:'flex-start', maxWidth:'80%' },
  msgRowMe:         { alignSelf:'flex-end', alignItems:'flex-end' },
  msgUsername:      { fontSize:9, color:COLORS.textMuted, letterSpacing:1, marginBottom:2, paddingLeft:4 },
  msgBubble:        { backgroundColor:COLORS.bgCard, borderRadius:10, borderWidth:1, borderColor:COLORS.border, padding:10 },
  msgBubbleMe:      { backgroundColor:COLORS.neonGreen + '20', borderColor:COLORS.neonGreen + '40' },
  msgText:          { fontSize:13, color:COLORS.textPrimary },
  msgTime:          { fontSize:9, color:COLORS.textMuted, marginTop:2, paddingHorizontal:4 },
  chatInputRow:     { flexDirection:'row', padding:12, gap:8, borderTopWidth:1, borderTopColor:COLORS.border, backgroundColor:COLORS.bg },
  chatInput:        { flex:1, backgroundColor:COLORS.bgCard, borderWidth:1, borderColor:COLORS.border, borderRadius:8, padding:10, color:COLORS.textPrimary, fontSize:14 },
  sendBtn:          { backgroundColor:COLORS.neonGreen, borderRadius:8, paddingHorizontal:14, justifyContent:'center' },
  sendBtnText:      { fontSize:12, fontWeight:'900', color:COLORS.bg },
})