// =============================================
// ECHO RIFT — PROFILE SCREEN (YENİ TASARIM)
// Hologram teması + tüm eski fonksiyonlar korundu
// =============================================

import React, { useCallback, useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground, Image, StatusBar, Dimensions, Alert,
  RefreshControl, Modal, TextInput, Animated,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import { useGame } from '../hooks/useGame'
import { COLORS, CLASS_INFO, PRESTIGE } from '../constants'
import { ThemedAlert } from '../components/ThemedAlert'
import { RebirthModal } from '../components/RebirthModal'
import { TierBadge } from '../components/TierBadge'

const { width } = Dimensions.get('window')
const CORNER = 10

// ─── CLASS AVATAR ─────────────────────────────────────────────────────────────
const CLASS_AVATARS: Record<string, any> = {
  vanguard: require('../../assets/images/vanguard.png'),
  riftmage: require('../../assets/images/riftmage.png'),
  phantom:  require('../../assets/images/phantom.png'),
}

// ─── HOLO KART ───────────────────────────────────────────────────────────────
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

// ─── STAT SATIRI ─────────────────────────────────────────────────────────────
function StatRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
    </View>
  )
}

// ─── XP BAR ──────────────────────────────────────────────────────────────────
function XpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.min(100, Math.max(0, (current / Math.max(1, max)) * 100))
  return (
    <View style={styles.xpWrap}>
      <View style={styles.xpTrack}>
        <View style={[styles.xpFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.xpText}>{current.toLocaleString()} / {max.toLocaleString()} XP</Text>
    </View>
  )
}

// ─── ANA EKRAN ───────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }: any) {
  const { playerState } = useGameStore()
  const { fetchPlayerState, performEchoRebirth } = useGame()

  const [userId,            setUserId]            = useState<string | null>(null)
  const [refreshing,        setRefreshing]        = useState(false)
  const [showPassModal,     setShowPassModal]     = useState(false)
  const [showRenameModal,   setShowRenameModal]   = useState(false)
  const [showRebirthModal,  setShowRebirthModal]  = useState(false)

  // Rebirth-ready pulse animasyonu
  const rebirthPulse = useRef(new Animated.Value(1)).current

  const _tier = playerState?.player?.prestige_tier ?? 0
  const _canRebirth = (playerState?.player?.level ?? 0) >= PRESTIGE.threshold(_tier)

  useEffect(() => {
    if (_canRebirth) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(rebirthPulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
          Animated.timing(rebirthPulse, { toValue: 1.0,  duration: 700, useNativeDriver: true }),
        ])
      )
      loop.start()
      return () => loop.stop()
    }
  }, [_canRebirth, rebirthPulse])

  const [newUsername,       setNewUsername]       = useState('')
  const [renameLoading,     setRenameLoading]     = useState(false)

  useFocusEffect(useCallback(() => { loadData() }, []))

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) { setUserId(user.id); await fetchPlayerState(user.id) }
    } catch (e) { console.error(e) }
  }

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false) }

  const handleRename = async () => {
    if (!userId || !newUsername.trim()) return
    setRenameLoading(true)
    const { data } = await supabase.rpc('rename_player', {
      p_player_id: userId, p_new_name: newUsername.trim(),
    })
    setRenameLoading(false)
    if (data?.success) {
      setShowRenameModal(false); setNewUsername('')
      await fetchPlayerState(userId)
      ThemedAlert.alert('✅', `Username changed to ${data.username}!`)
    } else {
      if (data?.error === 'INSUFFICIENT_RC') {
        ThemedAlert.alert('💎 Insufficient RC',
          `You need 100 RC to rename.\nYou have: ${data.have} RC`,
          [{ text: 'Cancel', style: 'cancel' },
           { text: '🛒 SHOP', onPress: () => { setShowRenameModal(false); navigation.navigate('Shop') } }])
        return
      }
      const msg =
        data?.error === 'NAME_TAKEN'           ? 'This name is already taken!' :
        data?.error === 'INVALID_LENGTH'       ? 'Name must be 3-20 characters!' :
        data?.error === 'INVALID_CHARACTERS'   ? 'Only letters, numbers, _ and - allowed!' :
        data?.error || 'Failed to rename'
      ThemedAlert.alert('Error', msg)
    }
  }

  const handleLogout = () => {
    ThemedAlert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut()
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] })
      }},
    ])
  }

  if (!playerState) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>LOADING...</Text>
      </View>
    )
  }

  const { player, stats, equipped_items, dungeon, arena } = playerState
  if (!stats || !player || !dungeon || !arena) {
    return <View style={styles.loading}><Text style={styles.loadingText}>LOADING...</Text></View>
  }

  const classInfo = player.class_type ? CLASS_INFO[player.class_type as keyof typeof CLASS_INFO] : null
  const avatar    = CLASS_AVATARS[player.class_type || ''] || null

  const passColor =
    player.pass_type === 'gold'   ? '#FFD700' :
    player.pass_type === 'silver' ? '#C0C0C0' : (COLORS.textMuted as string)

  const passLabel =
    player.pass_type === 'gold'   ? '⭐ GOLD PASS' :
    player.pass_type === 'silver' ? '🥈 SILVER PASS' : '🔓 FREE'

  const winRate = () => {
    const t = arena.wins + arena.losses
    return t === 0 ? '—' : `${Math.round((arena.wins / t) * 100)}%`
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* BG */}
      <ImageBackground
        source={require('../../assets/images/profile.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.70)' }]} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neonGreen} />}
        contentContainerStyle={styles.scroll}
      >

        {/* ══ HEADER ══ */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PROFILE</Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.navigate('Achievements')}>
              <Text style={{ fontSize: 22 }}>🏆</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Referral')}>
              <Text style={{ fontSize: 22 }}>🤝</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Text style={{ fontSize: 22 }}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ══ BÖLGE 1: PROFİL KARTI ══ */}
        <HoloCard color={classInfo?.color || '#00D4FF'} style={{ marginBottom: 12 }}>
          <View style={styles.profileTop}>
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              <View style={[styles.avatarRing, { borderColor: classInfo?.color || '#00D4FF' }]} />
              {avatar
                ? <Image source={avatar} style={styles.avatarImg} />
                : <Text style={styles.avatarEmoji}>{classInfo?.icon || '👤'}</Text>
              }
              <View style={[styles.lvlBadge, { borderColor: classInfo?.color || '#00D4FF' }]}>
                <Text style={styles.lvlText}>{player.level}</Text>
              </View>
            </View>

            {/* Bilgiler */}
            <View style={styles.profileInfo}>
              <TouchableOpacity onPress={() => { setNewUsername(player.username); setShowRenameModal(true) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.username}>{player.username} <Text style={{ fontSize: 12, color: '#00D4FF' }}>✏️</Text></Text>
                  <TierBadge tier={player.prestige_tier} size="sm" />
                </View>
              </TouchableOpacity>
              {!!(classInfo) && (
                <Text style={[styles.className, { color: classInfo.color }]}>
                  {classInfo.icon} {classInfo.name?.toUpperCase()}
                </Text>
              )}
              <Text style={styles.seasonText}>SEASON {player.season_id}</Text>
              <Text style={[styles.passChip, { color: passColor, borderColor: passColor + '60' }]}>
                {passLabel}
              </Text>
            </View>
          </View>

          {/* XP */}
          <View style={{ marginTop: 12 }}>
            <View style={styles.xpLabelRow}>
              <Text style={styles.xpLabel}>XP PROGRESS — LEVEL {player.level}</Text>
              <Text style={styles.xpLabel}>→ {player.level + 1}</Text>
            </View>
            <XpBar current={player.xp} max={player.xp_to_next_level} />
          </View>
        </HoloCard>

        {/* ══ BÖLGE 1.5: ECHO REBIRTH (PRESTIGE) ══ */}
        {(() => {
          const tier = player.prestige_tier ?? 0
          const nextThreshold = PRESTIGE.threshold(tier)
          const canRebirth = player.level >= nextThreshold
          const statPct = PRESTIGE.statBonusPct(tier)
          const xpMult = PRESTIGE.xpMult(tier)
          return (
            <HoloCard color={COLORS.gold as string} style={{ marginBottom: 12 }}>
              <View style={styles.prestigeHead}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: COLORS.gold as string }]}>
                    🌌 ECHO REBIRTH
                  </Text>
                  <Text style={styles.prestigeSub}>
                    TIER {tier} · +{statPct}% STAT · ×{xpMult.toFixed(2)} XP
                  </Text>
                </View>
                <Animated.View style={{ transform: [{ scale: canRebirth ? rebirthPulse : 1 }] }}>
                  <TouchableOpacity
                    style={[
                      styles.rebirthBtn,
                      canRebirth && {
                        borderColor: COLORS.neonGreen as string,
                        backgroundColor: 'rgba(0,255,136,0.18)',
                        shadowColor: COLORS.neonGreen as string,
                        shadowOpacity: 0.6,
                        shadowRadius: 8,
                        elevation: 6,
                      },
                    ]}
                    onPress={() => setShowRebirthModal(true)}
                  >
                    <Text style={[
                      styles.rebirthBtnText,
                      canRebirth && { color: COLORS.neonGreen as string },
                    ]}>
                      {canRebirth ? `✨ REBIRTH → T${tier + 1}` : `LV ${nextThreshold} TO UNLOCK`}
                    </Text>
                    {canRebirth && (
                      <Text style={styles.rebirthReadyBadge}>READY</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>
              <View style={styles.divider} />
              <View style={styles.statsGrid}>
                <View style={styles.statsCol}>
                  <StatRow label="LIFETIME XP"  value={(player.prestige_xp ?? 0).toLocaleString()} color={COLORS.gold as string} />
                  <StatRow label="REGEN/⚡"     value={PRESTIGE.regenMinutes(tier)} />
                </View>
                <View style={styles.statsDivider} />
                <View style={styles.statsCol}>
                  <StatRow label="MAX FRIENDS"  value={`${PRESTIGE.maxFriends(tier)}`} />
                  <StatRow label="NEXT TIER"    value={`LV ${nextThreshold}`} color={canRebirth ? COLORS.neonGreen as string : COLORS.textMuted as string} />
                </View>
              </View>
            </HoloCard>
          )
        })()}

        {/* ══ BÖLGE 2: CLASS BONUSES ══ */}
        {!!(classInfo) && (
          <HoloCard color={classInfo.color} style={{ marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { color: classInfo.color }]}>
              {classInfo.icon} {classInfo.name?.toUpperCase()} CLASS BONUSES
            </Text>
            <Text style={styles.classDesc}>{classInfo.description}</Text>
            <View style={styles.divider} />
            <View style={styles.bonusRow}>
              {(classInfo.bonuses || []).map((b: string, i: number) => (
                <View key={i} style={styles.bonusChip}>
                  <Text style={[styles.bonusChipText, {
                    color: b.startsWith('+') ? COLORS.neonGreen as string : COLORS.error as string
                  }]}>{b}</Text>
                </View>
              ))}
            </View>
          </HoloCard>
        )}

        {/* ══ BÖLGE 3: COMBAT STATS ══ */}
        <HoloCard style={{ marginBottom: 12 }}>
          <Text style={styles.sectionTitle}>COMBAT STATS</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statsCol}>
              <StatRow label="POWER"      value={stats.power_score?.toLocaleString() || '0'} color='#FFD700' />
              <StatRow label="ATTACK"     value={stats.total_atk?.toLocaleString()   || '0'} color='#FFD700' />
              <StatRow label="HP"         value={stats.total_hp?.toLocaleString()    || '0'} color='#FFD700' />
              <StatRow label="DEFENSE"    value={stats.total_def?.toLocaleString()   || '0'} color='#FFD700' />
              <StatRow label="CRIT %"     value={`${stats.total_crit?.toFixed(1)     || '0'}%`} color='#FFD700' />
              <StatRow label="CRIT DMG"   value={`${stats.total_crit_dmg?.toFixed(0) || '0'}%`} color='#FFD700' />
            </View>
            <View style={styles.statsDivider} />
            <View style={styles.statsCol}>
              <StatRow label="STR"        value={stats.total_str?.toLocaleString()   || '0'} />
              <StatRow label="DEX"        value={stats.total_dex?.toLocaleString()   || '0'} />
              <StatRow label="VIT"        value={stats.total_vit?.toLocaleString()   || '0'} />
              <StatRow label="PIERCE"     value={`${stats.total_pierce?.toFixed(1)   || '0'}%`} />
              <StatRow label="ATK SPD"    value={`${stats.total_atk_spd?.toFixed(1)  || '0'}%`} />
              <StatRow label="DMG RED"    value={`${stats.total_dmg_red?.toFixed(1)  || '0'}%`} />
            </View>
          </View>
        </HoloCard>

        {/* ══ BÖLGE 4: DROP BONUSES ══ */}
        <HoloCard style={{ marginBottom: 12 }}>
          <Text style={styles.sectionTitle}>DROP BONUSES</Text>
          <Text style={styles.bonusNote}>Based on Level {player.level} — increases as you level up</Text>
          <View style={styles.divider} />
          <StatRow label="ITEM DROP RATE"       value={`${((player.level || 1) * 0.5).toFixed(1)}%`}  color='#FFD700' />
          <StatRow label="BONUS ITEM DROP"      value={`${((player.level || 1) * 0.2).toFixed(1)}%`}  color='#FFD700' />
          <StatRow label="MATERIAL DROP CHANCE" value={`${((player.level || 1) * 0.3).toFixed(1)}%`}  color='#FFD700' />
          <View style={styles.divider} />
          <StatRow label="GOLD"       value={player.gold?.toLocaleString()        || '0'} color='#FFD700' />
          <StatRow label="RC"         value={player.rc_balance?.toString()        || '0'} color='#FFD700' />
          <StatRow label="SCRAP"      value={player.scrap_metal?.toLocaleString() || '0'} />
          <StatRow label="INVENTORY"  value={`${player.inventory_count || 0}/200`} />
          <StatRow label="LOGIN STREAK" value={`${player.consecutive_login_days || 0} days`} color='#FFD700' />
        </HoloCard>

        {/* ══ BÖLGE 5: ARENA + DUNGEON ══ */}
        <View style={styles.twoCol}>
          <HoloCard color="#FF4444" style={styles.halfCard}>
            <Text style={[styles.sectionTitle, { color: '#FF4444', fontSize: 9 }]}>ARENA RECORD</Text>
            <View style={styles.divider} />
            <StatRow label="POINTS"   value={arena.points  || 0} color='#FFD700' />
            <StatRow label="WINS"     value={arena.wins    || 0} color='#FFD700' />
            <StatRow label="LOSSES"   value={arena.losses  || 0} color='#FFD700' />
            <StatRow label="WIN RATE" value={winRate()} />
          </HoloCard>

          <HoloCard color="#B366FF" style={styles.halfCard}>
            <Text style={[styles.sectionTitle, { color: '#B366FF', fontSize: 9 }]}>DUNGEON</Text>
            <View style={styles.divider} />
            <StatRow label="FLOOR"      value={`F${dungeon.current_floor || 1}`} color='#FFD700' />
            <StatRow label="BEST"       value={`F${dungeon.max_floor || 1}`} color='#FFD700' />
            <StatRow label="TODAY"      value={`${dungeon.attempts_today || 0}/${dungeon.max_attempts || 3}`} />
          </HoloCard>
        </View>

        {/* ══ PASS KARTI ══ */}
        <HoloCard color={passColor} style={{ marginBottom: 12 }}>
          <View style={styles.passRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: passColor }]}>ECHO PASS</Text>
              <Text style={[styles.passLarge, { color: passColor }]}>{passLabel}</Text>
              <Text style={styles.passBenefits}>
                {player.pass_type === 'free'
                  ? '100 ⚡ • 2 Quest Slots • 10 Arena/day'
                  : player.pass_type === 'silver'
                  ? '125 ⚡ • 4 Quest Slots • 12 Arena/day'
                  : '150 ⚡ • 5 Quest Slots • 15 Arena/day'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.upgradeBtn, { borderColor: passColor }]}
              onPress={() => player.pass_type === 'free'
                ? setShowPassModal(true)
                : navigation.navigate('EchoPass')
              }
            >
              <Text style={[styles.upgradeBtnText, { color: passColor }]}>
                {player.pass_type === 'free' ? 'UPGRADE' : 'VIEW'}
              </Text>
            </TouchableOpacity>
          </View>
        </HoloCard>

        {/* ══ LOGOUT ══ */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>⏻  LOGOUT</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ══ RENAME MODAL ══ */}
      <Modal visible={showRenameModal} transparent animationType="fade" onRequestClose={() => setShowRenameModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={[styles.corner, styles.cTL]} /><View style={[styles.corner, styles.cTR]} />
            <View style={[styles.corner, styles.cBL]} /><View style={[styles.corner, styles.cBR]} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ RENAME</Text>
              <TouchableOpacity onPress={() => setShowRenameModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              {player.username.startsWith('UNIT-') ? 'First rename is FREE!' : 'Renaming costs 100 💎'}
            </Text>
            <TextInput
              style={styles.renameInput}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Enter new username..."
              placeholderTextColor={COLORS.textMuted as string}
              maxLength={16}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.renameHint}>3-16 chars • Letters, numbers, _ and - only</Text>
            <TouchableOpacity
              style={[styles.holoBtn, renameLoading && { opacity: 0.5 }]}
              onPress={handleRename}
              disabled={renameLoading}
            >
              <Text style={styles.holoBtnText}>{renameLoading ? 'SAVING...' : 'CONFIRM'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ PASS UPGRADE MODAL ══ */}
      <Modal visible={showPassModal} transparent animationType="fade" onRequestClose={() => setShowPassModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={[styles.corner, styles.cTL]} /><View style={[styles.corner, styles.cTR]} />
            <View style={[styles.corner, styles.cBL]} /><View style={[styles.corner, styles.cBR]} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚡ UPGRADE PASS</Text>
              <TouchableOpacity onPress={() => setShowPassModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Unlock more power and daily limits</Text>

            {/* Silver */}
            <View style={[styles.passCard, { borderColor: '#C0C0C0' }]}>
              <View style={styles.passCardHead}>
                <Text style={[styles.passCardName, { color: '#C0C0C0' }]}>🥈 SILVER PASS</Text>
                <TouchableOpacity
                  style={[styles.buyBtn, { borderColor: '#C0C0C0' }]}
                  onPress={() => { setShowPassModal(false); ThemedAlert.alert('Coming Soon', 'Purchase system coming soon!') }}
                >
                  <Text style={[styles.buyBtnText, { color: '#C0C0C0' }]}>💎 400</Text>
                </TouchableOpacity>
              </View>
              {['125 ⚡ Max Stamina', '4 Quest Slots', '12 Arena/day'].map((b, i) => (
                <Text key={i} style={[styles.benefitLine, { color: '#C0C0C0' }]}>✓ {b}</Text>
              ))}
            </View>

            {/* Gold */}
            <View style={[styles.passCard, { borderColor: '#FFD700' }]}>
              <View style={styles.passCardHead}>
                <Text style={[styles.passCardName, { color: '#FFD700' }]}>🥇 GOLD PASS</Text>
                <TouchableOpacity
                  style={[styles.buyBtn, { borderColor: '#FFD700' }]}
                  onPress={() => { setShowPassModal(false); ThemedAlert.alert('Coming Soon', 'Purchase system coming soon!') }}
                >
                  <Text style={[styles.buyBtnText, { color: '#FFD700' }]}>💎 800</Text>
                </TouchableOpacity>
              </View>
              {['150 ⚡ Max Stamina', '5 Quest Slots', '15 Arena/day', 'Exclusive rewards'].map((b, i) => (
                <Text key={i} style={[styles.benefitLine, { color: '#FFD700' }]}>✓ {b}</Text>
              ))}
            </View>
            <Text style={styles.modalNote}>* Pass expires after 30 days</Text>
          </View>
        </View>
      </Modal>

      {/* ══ ECHO REBIRTH MODAL ══ */}
      <RebirthModal
        visible={showRebirthModal}
        currentTier={player.prestige_tier ?? 0}
        currentLevel={player.level}
        onClose={() => setShowRebirthModal(false)}
        onConfirm={async () => {
          if (!userId) return null
          return await performEchoRebirth(userId)
        }}
      />

    </View>
  )
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#050A0F' },
  loading: { flex: 1, backgroundColor: '#050A0F', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: COLORS.neonGreen, letterSpacing: 4 },
  scroll:  { paddingHorizontal: 16, paddingTop: 56 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 4 },

  // Hologram kart
  holoCard: {
    backgroundColor: 'rgba(0,8,18,0.82)',
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)',
    borderRadius: 4, padding: 14, position: 'relative',
  },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#00D4FF' },
  cTL: { top: -1, left: -1,   borderTopWidth: 1.5, borderLeftWidth: 1.5 },
  cTR: { top: -1, right: -1,  borderTopWidth: 1.5, borderRightWidth: 1.5 },
  cBL: { bottom: -1, left: -1,  borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
  cBR: { bottom: -1, right: -1, borderBottomWidth: 1.5, borderRightWidth: 1.5 },

  // Profil
  profileTop:  { flexDirection: 'row', gap: 16 },
  avatarWrap:  { width: 90, height: 90, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  avatarRing:  { position: 'absolute', inset: -3, borderRadius: 999, borderWidth: 1.5 },
  avatarImg:   { width: 88, height: 88, borderRadius: 44 },
  avatarEmoji: { fontSize: 52 },
  lvlBadge:    { position: 'absolute', bottom: -4, right: -4, width: 26, height: 26, borderRadius: 13, backgroundColor: '#050A0F', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  lvlText:     { fontSize: 10, fontWeight: '900', color: '#fff' },
  profileInfo: { flex: 1, justifyContent: 'center', gap: 5 },
  username:    { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  className:   { fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  seasonText:  { fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: 2 },
  passChip:    { fontSize: 11, fontWeight: '900', letterSpacing: 2, borderWidth: 1.5, borderRadius: 2, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3 },

  xpLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  xpLabel:    { fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },
  xpWrap:     { gap: 4 },
  xpTrack:    { height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' },
  xpFill:     { height: '100%', backgroundColor: '#00FF88', borderRadius: 3 },
  xpText:     { fontSize: 10, color: 'rgba(255,255,255,0.55)', textAlign: 'right' },

  sectionTitle: { fontSize: 11, fontWeight: '900', color: 'rgba(0,212,255,0.9)', letterSpacing: 3, marginBottom: 8 },
  divider:      { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,212,255,0.12)', marginVertical: 8 },
  classDesc:    { fontSize: 11, color: '#fff', fontStyle: 'italic', marginBottom: 6 },
  bonusRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bonusChip:    { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, paddingHorizontal: 8, paddingVertical: 4 },
  bonusChipText:{ fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  bonusNote:    { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginBottom: 6, letterSpacing: 1 },

  statsGrid:    { flexDirection: 'row', gap: 8 },
  statsCol:     { flex: 1, gap: 1 },
  statsDivider: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,212,255,0.12)' },
  statRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  statLabel:    { fontSize: 11, color: 'rgba(255,255,255,0.75)', letterSpacing: 1 },
  statValue:    { fontSize: 11, fontWeight: '800', color: '#fff' },

  twoCol:   { flexDirection: 'row', gap: 12, marginBottom: 12 },
  halfCard: { flex: 1, marginBottom: 0 },

  // Echo Rebirth (prestige)
  prestigeHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prestigeSub:  {
    fontSize: 10, color: COLORS.textMuted as string, letterSpacing: 1.5,
    marginTop: 2, fontWeight: '700',
  },
  rebirthBtn: {
    borderWidth: 1, borderColor: COLORS.textMuted as string,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  rebirthBtnText: {
    fontSize: 9, fontWeight: '900', letterSpacing: 1.5,
    color: COLORS.textMuted as string,
  },
  rebirthReadyBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFD700',
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },

  passRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  passLarge:     { fontSize: 16, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  passBenefits:  { fontSize: 9, color: 'rgba(255,255,255,0.85)', letterSpacing: 1 },
  upgradeBtn:    { borderWidth: 1, borderRadius: 2, paddingHorizontal: 14, paddingVertical: 8 },
  upgradeBtnText:{ fontSize: 11, fontWeight: '900', letterSpacing: 2 },

  logoutBtn:  { borderWidth: 1, borderColor: 'rgba(255,68,68,0.35)', borderRadius: 2, paddingVertical: 13, alignItems: 'center', backgroundColor: 'rgba(255,68,68,0.05)', marginBottom: 12 },
  logoutText: { fontSize: 12, fontWeight: '900', color: COLORS.error as string, letterSpacing: 4 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox:     { backgroundColor: '#060F1E', borderWidth: 1, borderColor: 'rgba(0,212,255,0.25)', borderRadius: 4, padding: 20, width: '100%', position: 'relative' },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle:   { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  modalClose:   { fontSize: 20, color: 'rgba(255,255,255,0.85)', padding: 4 },
  modalSub:     { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginBottom: 16, letterSpacing: 1 },
  renameInput:  { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)', borderRadius: 2, padding: 12, color: '#fff', fontSize: 15, marginBottom: 8 },
  renameHint:   { fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 16 },
  holoBtn:      { borderWidth: 1, borderColor: COLORS.neonGreen, borderRadius: 2, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(0,255,136,0.07)' },
  holoBtnText:  { fontSize: 13, fontWeight: '900', color: COLORS.neonGreen as string, letterSpacing: 3 },
  modalNote:    { fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 8, letterSpacing: 1 },

  passCard:     { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderRadius: 2, padding: 12, marginBottom: 10 },
  passCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  passCardName: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  buyBtn:       { borderWidth: 1, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 6 },
  buyBtnText:   { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  benefitLine:  { fontSize: 10, marginBottom: 3, letterSpacing: 1, opacity: 0.8 },
})