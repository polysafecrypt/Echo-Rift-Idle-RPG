// =============================================
// ECHO RIFT — WORLD MAP SCREEN
// Fixed layout — scroll yok — ImageBackground sabit
// Zone butonları absolute pozisyon
// Quest → Bottom Sheet
// AFK Reward → AfkRewardModal
// =============================================

import React, { useEffect, useRef, useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, StatusBar, Alert, ImageBackground, Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import { useGame } from '../hooks/useGame'
import { COLORS, CLASS_INFO, QUEST_CONFIGS } from '../constants'
import type { QuestDurationKey, ActiveQuest } from '../types'
import LevelUpModal from '../components/LevelUpModal'
import DailyLoginModal from '../components/DailyLoginModal'
import QuestBottomSheet from '../components/QuestBottomSheet'
import AfkRewardModal from '../components/AfkRewardModal'

const { width, height } = Dimensions.get('window')

// ─── CLASS PORTRAIT IMAGES ───────────────────────────────────────────────────
const CLASS_IMAGES: Record<string, any> = {
  vanguard: require('../../assets/vanguard.png'),
  phantom:  require('../../assets/phantom.png'),
  riftmage: require('../../assets/riftmage.png'),
}

const ZONES = [
  { id: 'arena',   screen: 'Arena',     label: 'ARENA',      color: '#B366FF', top: height * 0.18 },
  { id: 'guild',   screen: 'Guild',     label: 'GUILD HALL', color: '#FFD700', top: height * 0.33 },
  { id: 'ship',    screen: 'Ship',      label: 'SHIP',       color: '#00D4FF', top: height * 0.53 },
  { id: 'dungeon', screen: 'Dungeon',   label: 'DUNGEON',    color: '#FF4444', top: height * 0.85 },
]

// ─── ZONE BUTTON ─────────────────────────────────────────────────────────────
function ZoneButton({ label, color, onPress, subText, delay = 0 }: {
  label: string; color: string; onPress: () => void
  subText?: string; delay?: number
}) {
  const scaleAnim   = useRef(new Animated.Value(0.85)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const glowAnim    = useRef(new Animated.Value(0.5)).current
  const pressAnim   = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1, tension: 70, friction: 10, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start()
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 1600, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.5, duration: 1600, useNativeDriver: true }),
    ])).start()
  }, [])

  const onPressIn  = () => Animated.spring(pressAnim, { toValue: 0.93, useNativeDriver: true, tension: 200 }).start()
  const onPressOut = () => Animated.spring(pressAnim, { toValue: 1,    useNativeDriver: true, tension: 200 }).start()

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }, { scale: pressAnim }], opacity: opacityAnim }}>
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
        <View style={[zoneStyles.btn, { borderColor: color + '70' }]}>
          <View style={[zoneStyles.cTL, { borderColor: color }]} />
          <View style={[zoneStyles.cTR, { borderColor: color }]} />
          <View style={[zoneStyles.cBL, { borderColor: color }]} />
          <View style={[zoneStyles.cBR, { borderColor: color }]} />
          <View style={zoneStyles.grid} pointerEvents="none">
            {[0,1,2].map(i => <View key={i} style={zoneStyles.gridLine} />)}
          </View>
          <Animated.View style={[zoneStyles.glow, {
            backgroundColor: color,
            opacity: glowAnim.interpolate({ inputRange:[0.5,1], outputRange:[0, 0.08] }),
          }]} />
          <Animated.View style={[zoneStyles.bottomBar, { backgroundColor: color, opacity: glowAnim }]} />
          <Text style={[zoneStyles.label, { color }]}>{label}</Text>
          {subText ? <Text style={zoneStyles.subText}>{subText}</Text> : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

const zoneStyles = StyleSheet.create({
  btn: {
    width: 160, height: 50,
    borderWidth: 1, borderRadius: 2,
    backgroundColor: 'rgba(2,6,8,0.68)',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', position: 'relative',
  },
  cTL: { position:'absolute', top:-1,    left:-1,   width:10, height:10, borderTopWidth:2,    borderLeftWidth:2  },
  cTR: { position:'absolute', top:-1,    right:-1,  width:10, height:10, borderTopWidth:2,    borderRightWidth:2 },
  cBL: { position:'absolute', bottom:-1, left:-1,   width:10, height:10, borderBottomWidth:2, borderLeftWidth:2  },
  cBR: { position:'absolute', bottom:-1, right:-1,  width:10, height:10, borderBottomWidth:2, borderRightWidth:2 },
  grid:     { position:'absolute', inset:0, flexDirection:'column', justifyContent:'space-around' },
  gridLine: { height: StyleSheet.hairlineWidth, backgroundColor:'rgba(255,255,255,0.05)' },
  glow:      { position:'absolute', inset:0 },
  bottomBar: { position:'absolute', bottom:0, left:'15%', width:'70%', height:1 },
  label:     { fontSize:13, fontWeight:'900', letterSpacing:4, zIndex:1 },
  subText:   { fontSize:9, color:'rgba(255,255,255,0.4)', letterSpacing:1, marginTop:2, zIndex:1 },
})

// ─── QUESTS BUTTON ────────────────────────────────────────────────────────────
function QuestsButton({ onPress, hasActive, timeLeft }: {
  onPress: () => void; hasActive: boolean; timeLeft: string | null
}) {
  const glowAnim = useRef(new Animated.Value(0.5)).current
  useEffect(() => {
    if (!hasActive) return
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
    ])).start()
  }, [hasActive])

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={qStyles.btn}>
        <View style={qStyles.cTL} />
        <View style={qStyles.cBR} />
        <Text style={qStyles.icon}>📡</Text>
        <Text style={qStyles.label}>QUESTS</Text>
        {hasActive && timeLeft ? (
          <Text style={[qStyles.timer, timeLeft === 'READY!' && { color: COLORS.neonGreen }]}>
            {timeLeft}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}

const qStyles = StyleSheet.create({
  btn: {
    width: 96, height: 62,
    borderWidth: 1, borderRadius: 2,
    borderColor: 'rgba(0,212,255,0.5)',
    backgroundColor: 'rgba(2,6,8,0.72)',
    alignItems: 'center', justifyContent: 'center',
    gap: 2, position: 'relative',
  },
  cTL: { position:'absolute', top:-1, left:-1, width:8, height:8, borderTopWidth:1.5, borderLeftWidth:1.5, borderColor: COLORS.cyan },
  cBR: { position:'absolute', bottom:-1, right:-1, width:8, height:8, borderBottomWidth:1.5, borderRightWidth:1.5, borderColor: COLORS.cyan },
  icon:  { fontSize: 18 },
  label: { fontSize: 9, color: COLORS.cyan, letterSpacing: 2, fontWeight: '700' },
  timer: { fontSize: 10, color: COLORS.textPrimary, fontWeight: '800' },
})

// ─── AFK BUTTON ──────────────────────────────────────────────────────────────
function AfkButton({ onPress, hasReward }: { onPress: () => void; hasReward: boolean }) {
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!hasReward) return
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
    ])).start()
  }, [hasReward])

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[
        afkStyles.btn,
        hasReward && afkStyles.btnActive,
        { transform: [{ scale: pulseAnim }] },
      ]}>
        <View style={afkStyles.cTL} />
        <View style={afkStyles.cBR} />
        <Text style={afkStyles.icon}>⚡</Text>
        <Text style={[afkStyles.label, hasReward && { color: '#FFD700' }]}>AFK</Text>
        {hasReward && <View style={afkStyles.dot} />}
      </Animated.View>
    </TouchableOpacity>
  )
}

const afkStyles = StyleSheet.create({
  btn: {
    width: 72, height: 62,
    borderWidth: 1, borderRadius: 2,
    borderColor: 'rgba(255,215,0,0.3)',
    backgroundColor: 'rgba(2,6,8,0.72)',
    alignItems: 'center', justifyContent: 'center',
    gap: 2, position: 'relative',
  },
  btnActive: { borderColor: 'rgba(255,215,0,0.8)' },
  cTL: { position:'absolute', top:-1, left:-1, width:8, height:8, borderTopWidth:1.5, borderLeftWidth:1.5, borderColor: '#FFD700' },
  cBR: { position:'absolute', bottom:-1, right:-1, width:8, height:8, borderBottomWidth:1.5, borderRightWidth:1.5, borderColor: '#FFD700' },
  icon:  { fontSize: 16 },
  label: { fontSize: 9, color: 'rgba(255,215,0,0.6)', letterSpacing: 2, fontWeight: '700' },
  dot: {
    position: 'absolute', top: 4, right: 4,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#FFD700',
  },
})

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function WorldMapScreen() {
  const navigation      = useNavigation<any>()
  const { playerState } = useGameStore()
  const { fetchPlayerState, syncQuestQueue, startQuest, cancelQuest } = useGame()

  const [userId,         setUserId]         = useState<string | null>(null)
  const [unreadCount,    setUnread]         = useState(0)
  const [tick,           setTick]           = useState(0)
  const [questSheetOpen, setQuestSheetOpen] = useState(false)
  const [levelUpVisible, setLevelUpVisible] = useState(false)
  const [newLevel,       setNewLevel]       = useState(0)
  const [toastVisible,   setToastVisible]   = useState(false)
  // DailyLoginModal — modal kendi RPC'sini çağırır, has_reward=false ise otomatik kapanır
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [toastMsg,       setToastMsg]       = useState('')

  // ✅ AFK state
  const [afkModalVisible, setAfkModalVisible] = useState(false)
  const [afkHasReward,    setAfkHasReward]    = useState(false)

  const toastAnim            = useRef(new Animated.Value(-80)).current
  const isMountedRef         = useRef(true)
  const userIdRef            = useRef<string | null>(null)
  const activeQuestEndsAtRef = useRef<string | null>(null)
  const syncInProgressRef    = useRef(false)
  const loginModalShownRef      = useRef(false)
  const prevLevelRef            = useRef(0)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const showToast = useCallback((msg: string) => {
    if (!isMountedRef.current) return
    setToastMsg(msg)
    setToastVisible(true)
    toastAnim.setValue(-80)
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastAnim, { toValue: -80, duration: 300, useNativeDriver: true }),
    ]).start(() => { if (isMountedRef.current) setToastVisible(false) })
  }, [])

  // ✅ AFK preview kontrol
  const checkAfkReward = useCallback(async (uid: string) => {
    const { data } = await supabase.rpc('preview_afk_rewards', { p_player_id: uid })
    if (data && isMountedRef.current) {
      setAfkHasReward(data.minutes >= 1)
    }
  }, [])

  useEffect(() => {
    let counter = 0
    const interval = setInterval(async () => {
      if (!isMountedRef.current) return
      counter++
      setTick(t => t + 1)

      if (counter % 60 === 0 && userIdRef.current) {
        checkAfkReward(userIdRef.current)
      }

      if (counter % 3 !== 0) return
      if (!userIdRef.current || syncInProgressRef.current) return
      if (!activeQuestEndsAtRef.current) return
      const ends = new Date(activeQuestEndsAtRef.current).getTime()
      if (Date.now() < ends - 500) return
      syncInProgressRef.current = true
      activeQuestEndsAtRef.current = null
      try {
        const syncResult = await syncQuestQueue(userIdRef.current)
        if (!isMountedRef.current) return
        if (syncResult?.completed_count > 0) {
          let totalXp = 0, totalGold = 0
          for (const q of syncResult.completed_quests || []) {
            if (q?.success) { totalXp += q.xp_gained || 0; totalGold += q.gold_gained || 0 }
          }
          if (totalXp > 0 || totalGold > 0) showToast(`✅ +${totalXp.toLocaleString()} XP  •  +${totalGold.toLocaleString()} 🪙`)
        }
        const state = await fetchPlayerState(userIdRef.current!)
        if (!isMountedRef.current) return
        activeQuestEndsAtRef.current = state?.active_quest?.ends_at || null
        const currentLevel = state?.player?.level || 0
        if (prevLevelRef.current > 0 && currentLevel > prevLevelRef.current) {
          setNewLevel(currentLevel); setLevelUpVisible(true)
        }
        prevLevelRef.current = currentLevel
      } finally { syncInProgressRef.current = false }
    }, 1000)
    return () => clearInterval(interval)
  }, [showToast, checkAfkReward])

  useFocusEffect(useCallback(() => { loadData() }, []))

  useEffect(() => {
    activeQuestEndsAtRef.current = playerState?.active_quest?.ends_at || null
  }, [playerState?.active_quest?.ends_at])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isMountedRef.current) return
    setUserId(user.id)
    userIdRef.current = user.id

    const syncResult = await syncQuestQueue(user.id)
    if (!isMountedRef.current) return
    if (syncResult?.completed_count > 0) {
      let totalXp = 0, totalGold = 0
      for (const q of syncResult.completed_quests || []) {
        if (q?.success) { totalXp += q.xp_gained || 0; totalGold += q.gold_gained || 0 }
      }
      if (totalXp > 0 || totalGold > 0) showToast(`✅ +${totalXp.toLocaleString()} XP  •  +${totalGold.toLocaleString()} 🪙`)
    }

    const state = await fetchPlayerState(user.id)
    if (!isMountedRef.current) return
    activeQuestEndsAtRef.current = state?.active_quest?.ends_at || null
    const currentLevel = state?.player?.level || 0
    if (prevLevelRef.current > 0 && currentLevel > prevLevelRef.current) {
      setNewLevel(currentLevel); setLevelUpVisible(true)
    }
    prevLevelRef.current = currentLevel

    // AFK kontrol
    await checkAfkReward(user.id)

    // Daily login modal — sadece app açılışında bir kez tetikle
    // Her WorldMap focus'unda açılmaması için ref ile kontrol
    if (!loginModalShownRef.current) {
      loginModalShownRef.current = true
      setShowLoginModal(true)
    }

    const { count } = await supabase
      .from('mailbox').select('*', { count:'exact', head:true })
      .eq('player_id', user.id).eq('status','pending')
    if (isMountedRef.current) setUnread(count || 0)
  }

  // ✅ AFK toplandı
  const handleAfkCollected = useCallback((xp: number, gold: number) => {
    setAfkHasReward(false)
    fetchPlayerState(userId!)
    showToast(`⚡ AFK +${xp.toLocaleString()} XP  •  +${gold.toLocaleString()} 🪙`)
  }, [userId, fetchPlayerState, showToast])

  const handleStartQuest = async (key: QuestDurationKey) => {
    if (!userId || !playerState) return
    const config = QUEST_CONFIGS[key]
    const lastUpdate     = new Date(playerState.player.last_stamina_update).getTime()
    const elapsed        = Math.floor((Date.now() - lastUpdate) / 1000)
    const regenned       = Math.floor(elapsed / 1800)
    const currentStamina = Math.min(playerState.player.stamina_max, playerState.player.stamina_current + regenned)
    if (currentStamina < config.stamina) {
      Alert.alert('Insufficient Stamina', `Need ${config.stamina} ⚡, have ${currentStamina} ⚡`)
      return
    }
    const maxSlots    = playerState.player.pass_type === 'gold' ? 5 : playerState.player.pass_type === 'silver' ? 4 : 2
    const activeCount = (playerState.active_quest ? 1 : 0) + (playerState.queued_quests?.length || 0)
    if (activeCount >= maxSlots) { Alert.alert('Queue Full', `Max ${maxSlots} quests.`); return }
    const result = await startQuest(userId, key)
    if (result?.success) {
      const state = await fetchPlayerState(userId)
      activeQuestEndsAtRef.current = state?.active_quest?.ends_at || null
    } else {
      Alert.alert('Error', result?.error || 'Failed')
    }
  }

  const handleCancelQuest = async (quest: ActiveQuest) => {
    if (!userId) return
    const result = await cancelQuest(userId, quest.id)
    if (result?.success) {
      const state = await fetchPlayerState(userId)
      activeQuestEndsAtRef.current = state?.active_quest?.ends_at || null
    } else {
      Alert.alert('Error', result?.error || 'Failed')
    }
  }

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

  const getStaminaCurrent = useCallback(() => {
    if (!playerState) return 0
    const { player } = playerState
    const elapsed  = Math.floor((Date.now() - new Date(player.last_stamina_update).getTime()) / 1000)
    const regenned = Math.floor(elapsed / 1800)
    return Math.min(player.stamina_max, player.stamina_current + regenned)
  }, [playerState, tick])

  if (!playerState?.player) {
    return (
      <View style={[styles.container, { alignItems:'center', justifyContent:'center' }]}>
        <StatusBar barStyle="light-content" />
        <Text style={{ color: COLORS.neonGreen, letterSpacing: 4, fontSize: 13 }}>INITIALIZING...</Text>
      </View>
    )
  }

  const { player, stats, active_quest, dungeon, arena } = playerState
  const classInfo      = player.class_type ? CLASS_INFO[player.class_type] : null
  const staminaCurrent = getStaminaCurrent()
  const xpPct          = player.xp / player.xp_to_next_level
  const questTimeLeft  = getQuestTimeLeft()

  const getSubText = (id: string) => {
    if (id === 'dungeon') return `FLOOR ${dungeon?.current_floor || 1}`
    if (id === 'arena')   return `${arena?.points || 0} PTS`
    if (id === 'guild')   return playerState?.guild ? playerState.guild.name.slice(0,8).toUpperCase() : 'NO GUILD'
    if (id === 'ship')    return `PWR ${stats?.power_score?.toLocaleString() || 0}`
    return ''
  }

  // Class portrait: assets'ten gerçek görsel, fallback emoji
  const classPortrait = player.class_type ? CLASS_IMAGES[player.class_type] : null

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ImageBackground
        source={require('../../assets/images/Worldmap.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(2,6,8,0.2)', 'rgba(2,6,8,0.1)', 'rgba(2,6,8,0.35)', 'rgba(2,6,8,0.7)']}
          locations={[0, 0.3, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
          {/* ✅ Class portrait — gerçek görsel, fallback emoji */}
          <View style={[styles.profileAvatar, { borderColor: classInfo?.color || COLORS.neonGreen }]}>
            {classPortrait ? (
              <Image
                source={classPortrait}
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.profileIcon}>{classInfo?.icon || '👤'}</Text>
            )}
          </View>
          <View>
            <Text style={styles.profileName}>{player.username}</Text>
            <Text style={[styles.profileClass, { color: classInfo?.color || COLORS.neonGreen }]}>
              LVL {player.level} {classInfo?.name?.toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('DailyMissions')}>
            <Text style={styles.iconText}>📋</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Shop')}>
            <Text style={styles.iconText}>🛒</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Mailbox')}>
            <Text style={styles.iconText}>📬</Text>
            {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Leaderboard')}>
            <Text style={styles.iconText}>🏅</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('GlobalChat')}>
            <Text style={styles.iconText}>💬</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── STATS STRIP ── */}
      <View style={styles.statsStrip}>
        <View style={styles.xpBarBg}>
          <View style={[styles.xpBarFill, { width: `${Math.min(xpPct * 100, 100)}%` }]} />
        </View>
        <View style={styles.resourcesRow}>
          <Text style={styles.xpLabel}>{player.xp.toLocaleString()} / {player.xp_to_next_level.toLocaleString()} XP</Text>
          <View style={styles.resources}>
            <Text style={styles.resourceVal}>🪙 {player.gold.toLocaleString()}</Text>
            <Text style={styles.resourceVal}>💎 {player.rc_balance}</Text>
            <Text style={styles.resourceVal}>⚡ {staminaCurrent}/{player.stamina_max}</Text>
          </View>
        </View>
      </View>

      {/* ── ZONE BUTONLARI ── */}
      {ZONES.map((zone, i) => (
        <View key={zone.id} style={[styles.zoneAbsolute, { top: zone.top }]}> 
          <ZoneButton
            label={zone.label}
            color={zone.color}
            subText={getSubText(zone.id)}
            onPress={() => navigation.navigate(zone.screen as any)}
            delay={i * 80}
          />
        </View>
      ))}

      {/* ── QUESTS BUTTON ── */}
      <View style={styles.questsBtnPos}>
        <QuestsButton
          onPress={() => setQuestSheetOpen(true)}
          hasActive={!!active_quest}
          timeLeft={questTimeLeft}
        />
      </View>

      {/* ── AFK BUTTON ── */}
      <View style={styles.afkBtnPos}>
        <AfkButton
          onPress={() => setAfkModalVisible(true)}
          hasReward={afkHasReward}
        />
      </View>

      {questSheetOpen && (
        <TouchableOpacity
          style={styles.sheetOverlay}
          onPress={() => setQuestSheetOpen(false)}
          activeOpacity={1}
        />
      )}

      <QuestBottomSheet
        visible={questSheetOpen}
        onClose={() => setQuestSheetOpen(false)}
        playerState={playerState}
        userId={userId}
        onStartQuest={handleStartQuest}
        onCancelQuest={handleCancelQuest}
        tick={tick}
      />

      {toastVisible && (
        <Animated.View style={[styles.toast, { transform: [{ translateY: toastAnim }] }]} pointerEvents="none">
          <Text style={styles.toastText}>{toastMsg}</Text>
        </Animated.View>
      )}

      {/* ── MODALS ── */}
      <AfkRewardModal
        visible={afkModalVisible}
        playerId={userId}
        passType={player.pass_type as any}
        onCollected={handleAfkCollected}
        onDismiss={() => setAfkModalVisible(false)}
      />

      {/* ✅ Yeni DailyLoginModal — kendi RPC'sini çağırır, has_reward=false ise kapanır */}
      <DailyLoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onClaimed={() => fetchPlayerState(userId!)}
      />

      <LevelUpModal
        visible={levelUpVisible}
        level={newLevel}
        classType={player?.class_type || 'vanguard'}
        onDismiss={() => setLevelUpVisible(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020608' },

  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 10,
    backgroundColor: 'rgba(2,6,8,0.72)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,212,255,0.12)',
    zIndex: 50,
  },
  profileBtn:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileAvatar: {
    width: 44, height: 44, borderRadius: 8, borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  // ✅ Gerçek görsel için
  profileImage:  { width: '100%', height: '100%' },
  // Fallback emoji
  profileIcon:   { fontSize: 22 },
  profileName:   { fontSize: 14, fontWeight: '800', color: '#E8E8E8', letterSpacing: 1 },
  profileClass:  { fontSize: 9, fontWeight: '700', letterSpacing: 2, marginTop: 1 },
  headerIcons:   { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  iconText:  { fontSize: 17 },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: COLORS.error, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },

  statsStrip: {
    position: 'absolute', top: 106, left: 16, right: 16,
    backgroundColor: 'rgba(2,6,8,0.78)',
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,212,255,0.1)',
    padding: 10, zIndex: 40, gap: 5,
  },
  xpBarBg:      { height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  xpBarFill:    { height: '100%', backgroundColor: COLORS.cyan, borderRadius: 2 },
  resourcesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpLabel:      { fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 },
  resources:    { flexDirection: 'row', gap: 12 },
  resourceVal:  { fontSize: 11, fontWeight: '700', color: '#FFD700' },

  zoneAbsolute: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 10 },

  questsBtnPos: { position: 'absolute', left: 24, top: height * 0.46, zIndex: 10 },
  afkBtnPos:    { position: 'absolute', right: 24, bottom: 40, zIndex: 10 },

  sheetOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: '52%', zIndex: 50,
  },
  toast: {
    position: 'absolute', top: 60, left: 16, right: 16,
    backgroundColor: '#0A1628', borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.neonGreen + '60',
    padding: 12, alignItems: 'center', zIndex: 999,
  },
  toastText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
})