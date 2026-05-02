// =============================================
// ECHO RIFT — PLAYER PROFILE SCREEN
// Read-only view of another player's profile
// Same layout as InventoryScreen but no equip/dismantle
// =============================================

import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Image, Dimensions, Modal, ActivityIndicator,
  Animated, Easing,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { COLORS, RARITY_COLORS } from '../constants'
import { Rarity } from '../types'
import { ThemedAlert } from '../components/ThemedAlert'
import { ReportModal } from '../components/ReportModal'
import { getItemImage } from '../constants/itemImages'

const { width } = Dimensions.get('window')
const SLOT_SIZE = Math.floor((width - 52) / 5)

const SLOT_ICONS: Record<string, string> = {
  sword: '⚔️', helmet: '🪖', chest: '🛡️',
  gloves: '🧤', crystal: '💎', necklace: '📿',
}

const SLOT_LABELS: Record<string, string> = {
  sword: 'WEAPON', helmet: 'HEAD', chest: 'CHEST',
  gloves: 'GLOVES', crystal: 'CRYSTAL', necklace: 'NECK',
}

const CLASS_INFO: Record<string, { name: string; color: string; icon: string }> = {
  vanguard: { name: 'Vanguard', color: '#FF8C00', icon: '🛡️' },
  riftmage: { name: 'Riftmage', color: '#B366FF', icon: '🔮' },
  phantom:  { name: 'Phantom',  color: '#00D4FF', icon: '🗡️' },
}

// Class avatar görselleri
const CLASS_AVATARS: Record<string, any> = {
  vanguard: require('../../assets/images/vanguard.png'),
  riftmage: require('../../assets/images/riftmage.png'),
  phantom:  require('../../assets/images/phantom.png'),
}

// Sword görselleri (rarity-bazlı, arka planlı)
const SWORD_IMAGES_BG: Record<string, any> = {
  Common:      require('../../assets/swords/sword_common_bg.png'),
  Uncommon:    require('../../assets/swords/sword_uncommon_bg.png'),
  Rare:        require('../../assets/swords/sword_rare_bg.png'),
  Epic:        require('../../assets/swords/sword_epic_bg.png'),
  Legendary:   require('../../assets/swords/sword_legendary_bg.png'),
  Dimensional: require('../../assets/swords/sword_dimensional_bg.png'),
}

const AFFIX_NAMES: Record<string, string> = {
  STR: 'STR', DEX: 'DEX', VIT: 'VIT', DEF: 'DEF',
  HP_FLAT: 'HP', HP_PERCENT: 'HP%',
  CRIT_CHANCE: 'CRIT', CRIT_DAMAGE: 'CDMG',
  PIERCE: 'PIERCE', ATTACK_SPEED: 'ASPD',
  CRIT_RESIST: 'CRES', DAMAGE_REDUCTION: 'DRED',
  ALL_STATS: 'ALL',
}

const PERCENT_AFFIXES = ['HP_PERCENT', 'CRIT_CHANCE', 'CRIT_DAMAGE', 'PIERCE', 'ATTACK_SPEED', 'CRIT_RESIST', 'DAMAGE_REDUCTION']

// ─── EQUIPMENT SLOT (read-only) ──────────────
function ProfileSlot({ slotType, item, onPress, classType }: {
  slotType: string; item: any | null; onPress: () => void; classType?: string
}) {
  const rc = item ? RARITY_COLORS[item.rarity as Rarity] : 'rgba(255,255,255,0.08)'

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} disabled={!item}>
      <View style={[styles.slot, { borderColor: rc, backgroundColor: item ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)' }]}>
        {item ? (
          <>
            {(() => {
              if (item.item_type === 'sword' && SWORD_IMAGES_BG[item.rarity]) {
                return <Image source={SWORD_IMAGES_BG[item.rarity]} style={styles.slotImg} resizeMode="cover" />
              }
              const classImg = getItemImage(classType, item.item_type)
              if (classImg) {
                return <Image source={classImg} style={styles.slotImg} resizeMode="cover" />
              }
              return <Text style={styles.slotIcon}>{SLOT_ICONS[slotType]}</Text>
            })()}
            {item.enhancement_level > 0 && (
              <View style={styles.slotEnhBadge}>
                <Text style={styles.slotEnhText}>+{item.enhancement_level}</Text>
              </View>
            )}
            <Text style={[styles.slotCornerLabel, { color: item.tier > 0 ? rc : '#fff' }]}>
              {item.tier > 0 ? `T${item.tier} · ` : ''}L{item.level}
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.slotIcon, { opacity: 0.2 }]}>{SLOT_ICONS[slotType]}</Text>
            <Text style={styles.slotEmpty}>{SLOT_LABELS[slotType]}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  )
}

export default function PlayerProfileScreen({ navigation, route }: any) {
  const { playerId } = route.params || {}
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)

  const load = useCallback(async () => {
    if (!playerId) {
      ThemedAlert.alert('Error', 'Player ID missing')
      navigation.goBack()
      return
    }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setViewerId(user?.id || null)

      const { data, error } = await supabase.rpc('get_player_profile', {
        p_target_id: playerId,
        p_viewer_id: user?.id || null,
      })

      if (error) {
        console.error('[PlayerProfile] RPC error:', error)
        ThemedAlert.alert('Error', error.message || 'Failed to load profile')
        navigation.goBack()
        return
      }
      if (!data?.success) {
        console.error('[PlayerProfile] RPC failure:', data?.error)
        ThemedAlert.alert('Error', data?.error || 'Profile not found')
        navigation.goBack()
        return
      }
      setProfile(data.profile)
    } catch (err: any) {
      console.error('[PlayerProfile] Exception:', err)
      ThemedAlert.alert('Error', err?.message || 'Unexpected error')
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }, [playerId, navigation])

  // useFocusEffect yerine useEffect — sadece bir kere yüklensin
  useEffect(() => {
    load()
  }, [load])

  const handleAddFriend = async () => {
    if (!viewerId || !profile) return
    setActionBusy(true)
    try {
      const { data } = await supabase.rpc('send_friend_request', {
        p_player_id: viewerId,
        p_target_player_id: profile.id,
        p_target_username: null,
      })
      if (!data?.success) {
        const msgs: Record<string, string> = {
          ALREADY_FRIENDS: 'Already friends.',
          REQUEST_PENDING: 'Request already pending.',
          MAX_FRIENDS:     'Friend list full (max 15).',
        }
        ThemedAlert.alert('Cannot Send', msgs[data?.error] || data?.error || 'Failed')
        return
      }
      ThemedAlert.alert('Sent!', `Friend request sent to ${profile.username}`)
      await load()
    } finally {
      setActionBusy(false)
    }
  }

  const handleAcceptRequest = async () => {
    if (!viewerId || !profile?.friend_request_id) return
    setActionBusy(true)
    try {
      const { data } = await supabase.rpc('accept_friend_request', {
        p_player_id: viewerId,
        p_request_id: profile.friend_request_id,
      })
      if (data?.success) {
        ThemedAlert.alert('Friends!', `You and ${profile.username} are now friends.`)
        await load()
      }
    } finally {
      setActionBusy(false)
    }
  }

  if (loading || !profile) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← BACK</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>PLAYER PROFILE</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.neonGreen as string} size="large" />
          <Text style={{ color: COLORS.textMuted, marginTop: 12, fontSize: 12, letterSpacing: 1 }}>
            LOADING...
          </Text>
        </View>
      </View>
    )
  }

  const classInfo = CLASS_INFO[profile.class_type] || CLASS_INFO.vanguard
  const avatar = CLASS_AVATARS[profile.class_type]
  const isSelf = viewerId === profile.id

  // Equipped item map
  const equippedMap: Record<string, any> = {}
  ;(profile.equipped_items || []).forEach((it: any) => { equippedMap[it.item_type] = it })

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>PLAYER PROFILE</Text>
        </View>
        {!isSelf && (
          <TouchableOpacity onPress={() => setReportOpen(true)}>
            <Text style={styles.reportText}>🚩</Text>
          </TouchableOpacity>
        )}
        {isSelf && <View style={{ width: 60 }} />}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ───────── PROFILE INFO ───────── */}
        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.username}>{profile.username}</Text>
            <View style={[styles.statusDot, { backgroundColor: profile.is_online ? '#00FF88' : '#666' }]} />
          </View>
          <View style={styles.classRow}>
            <Text style={[styles.classText, { color: classInfo.color }]}>
              {classInfo.icon} {classInfo.name.toUpperCase()}  •  LV {profile.level}
            </Text>
            {profile.pass_type && profile.pass_type !== 'free' && (
              <View style={styles.passBadge}>
                <Text style={styles.passText}>{profile.pass_type.toUpperCase()} PASS</Text>
              </View>
            )}
          </View>
          <Text style={styles.powerText}>⚡ POWER {profile.stats?.power_score?.toLocaleString() || 0}</Text>
        </View>

        {/* ───────── EQUIPMENT (kendi inventory'mizdeki gibi) ───────── */}
        <View style={styles.equipSection}>
          <View style={styles.equipMain}>
            <View style={styles.slotCol}>
              <ProfileSlot slotType="sword"    item={equippedMap['sword']    || null} onPress={() => equippedMap['sword'] && setSelectedItem(equippedMap['sword'])}    classType={profile.class_type} />
              <ProfileSlot slotType="necklace" item={equippedMap['necklace'] || null} onPress={() => equippedMap['necklace'] && setSelectedItem(equippedMap['necklace'])} classType={profile.class_type} />
              <ProfileSlot slotType="crystal"  item={equippedMap['crystal']  || null} onPress={() => equippedMap['crystal'] && setSelectedItem(equippedMap['crystal'])}  classType={profile.class_type} />
            </View>
            <View style={[styles.charFrame, { borderColor: classInfo.color }]}>
              {avatar
                ? <Image source={avatar} style={styles.charImg} resizeMode="cover" />
                : <Text style={styles.charEmoji}>{classInfo.icon}</Text>
              }
            </View>
            <View style={styles.slotCol}>
              <ProfileSlot slotType="helmet" item={equippedMap['helmet'] || null} onPress={() => equippedMap['helmet'] && setSelectedItem(equippedMap['helmet'])} classType={profile.class_type} />
              <ProfileSlot slotType="chest"  item={equippedMap['chest']  || null} onPress={() => equippedMap['chest']  && setSelectedItem(equippedMap['chest'])}  classType={profile.class_type} />
              <ProfileSlot slotType="gloves" item={equippedMap['gloves'] || null} onPress={() => equippedMap['gloves'] && setSelectedItem(equippedMap['gloves'])} classType={profile.class_type} />
            </View>
          </View>
        </View>

        {/* ───────── STAT STRIP ───────── */}
        <View style={styles.statStrip}>
          <View style={styles.statChip}>
            <Text style={[styles.statLbl, { color: '#EF4444' }]}>ATK</Text>
            <Text style={styles.statVal}>{profile.stats?.total_atk?.toLocaleString() || 0}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={[styles.statLbl, { color: '#10B981' }]}>HP</Text>
            <Text style={styles.statVal}>{profile.stats?.total_hp?.toLocaleString() || 0}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={[styles.statLbl, { color: '#3B82F6' }]}>DEF</Text>
            <Text style={styles.statVal}>{profile.stats?.total_def?.toLocaleString() || 0}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={[styles.statLbl, { color: '#F59E0B' }]}>CRIT</Text>
            <Text style={styles.statVal}>{Number(profile.stats?.total_crit || 0).toFixed(0)}%</Text>
          </View>
        </View>

        {/* ───────── ACHIEVEMENTS ───────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
          <View style={styles.achievementBox}>
            <Text style={styles.achievementCount}>
              {profile.achievement_count} / {profile.total_achievements}
            </Text>
            <View style={styles.achievementBar}>
              <View
                style={[
                  styles.achievementFill,
                  { width: `${Math.min(100, (profile.achievement_count / Math.max(1, profile.total_achievements)) * 100)}%` },
                ]}
              />
            </View>

            {/* Showcase achievements */}
            {profile.showcase_achievements && profile.showcase_achievements.length > 0 && (
              <View style={styles.showcaseRow}>
                {profile.showcase_achievements.map((a: any) => (
                  <View key={a.id} style={styles.showcaseBadge}>
                    <Text style={styles.showcaseIcon}>{a.icon || '🏆'}</Text>
                    <Text style={styles.showcaseTitle} numberOfLines={1}>{a.title}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ───────── PROGRESS ───────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PROGRESS</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressCard}>
              <Text style={styles.progressLbl}>🏆 ARENA</Text>
              <Text style={styles.progressVal}>#{profile.arena?.rank || '—'}</Text>
              <Text style={styles.progressSub}>
                {profile.arena?.points || 0} pts • {profile.arena?.wins || 0}W/{profile.arena?.losses || 0}L
              </Text>
            </View>
            <View style={styles.progressCard}>
              <Text style={styles.progressLbl}>⚔️ DUNGEON</Text>
              <Text style={styles.progressVal}>F{profile.dungeon?.max_floor || 0}</Text>
              <Text style={styles.progressSub}>Max floor reached</Text>
            </View>
          </View>
        </View>

        {/* ───────── GUILD ───────── */}
        {profile.guild && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>GUILD</Text>
            <View style={styles.guildBox}>
              <Text style={styles.guildName}>🛡️ {profile.guild.name}</Text>
              <Text style={styles.guildSub}>
                {profile.guild.role.toUpperCase()} · LV {profile.guild.level}
              </Text>
            </View>
          </View>
        )}

        {/* ───────── ACTION BUTTONS (kendi profili değilse) ───────── */}
        {!isSelf && (
          <View style={styles.actionRow}>
            {profile.friend_status === 'friends' && (
              <View style={styles.friendBadge}>
                <Text style={styles.friendBadgeText}>🤝 FRIENDS</Text>
              </View>
            )}
            {profile.friend_status === 'pending_outgoing' && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>⏳ REQUEST SENT</Text>
              </View>
            )}
            {profile.friend_status === 'pending_incoming' && (
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={handleAcceptRequest}
                disabled={actionBusy}
              >
                <Text style={styles.acceptBtnText}>{actionBusy ? '...' : '✓ ACCEPT REQUEST'}</Text>
              </TouchableOpacity>
            )}
            {profile.friend_status === 'none' && (
              <TouchableOpacity
                style={styles.addFriendBtn}
                onPress={handleAddFriend}
                disabled={actionBusy}
              >
                <Text style={styles.addFriendBtnText}>{actionBusy ? '...' : '➕ ADD FRIEND'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* ─── ITEM DETAIL (read-only) ─── */}
      <Modal visible={!!selectedItem} transparent animationType="slide" onRequestClose={() => setSelectedItem(null)}>
        <View style={styles.itemOverlay}>
          {!!selectedItem && (() => {
            const rc = RARITY_COLORS[selectedItem.rarity as Rarity]

            const renderImg = () => {
              if (selectedItem.item_type === 'sword' && SWORD_IMAGES_BG[selectedItem.rarity]) {
                return <Image source={SWORD_IMAGES_BG[selectedItem.rarity]} style={styles.itemBigImg} resizeMode="cover" />
              }
              const ci = getItemImage(profile.class_type, selectedItem.item_type)
              if (ci) return <Image source={ci} style={styles.itemBigImg} resizeMode="cover" />
              return <Text style={styles.itemBigFallback}>{SLOT_ICONS[selectedItem.item_type]}</Text>
            }

            return (
              <View style={[styles.itemBox, { borderColor: rc + '80' }]}>
                <View style={styles.itemHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemRarityName, { color: rc }]}>
                      {selectedItem.rarity.toUpperCase()}
                    </Text>
                    <Text style={styles.itemTypeName}>
                      {selectedItem.item_type.toUpperCase()}  •  LV {selectedItem.level}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedItem(null)}>
                    <Text style={styles.itemClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.itemBody}>
                  <View style={[styles.itemImgFrame, { borderColor: rc + '60' }]}>
                    {renderImg()}
                    {selectedItem.enhancement_level > 0 && (
                      <View style={styles.itemEnhBadge}>
                        <Text style={styles.itemEnhText}>+{selectedItem.enhancement_level}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.itemStats}>
                    {selectedItem.base_attack != null && (
                      <View style={styles.itemStatRow}>
                        <Text style={styles.itemStatLbl}>BASE ATK</Text>
                        <Text style={[styles.itemStatVal, { color: rc }]}>+{selectedItem.base_attack}</Text>
                      </View>
                    )}
                    {(selectedItem.item_affixes || []).map((a: any, i: number) => {
                      const isPct = PERCENT_AFFIXES.includes(a.affix_type)
                      return (
                        <View key={i} style={styles.itemStatRow}>
                          <Text style={styles.itemStatLbl}>{AFFIX_NAMES[a.affix_type] || a.affix_type}</Text>
                          <Text style={[styles.itemStatVal, { color: rc }]}>
                            {isPct ? `${a.value}%` : `+${a.value}`}
                          </Text>
                        </View>
                      )
                    })}
                    <View style={[styles.itemStatRow, styles.itemPwrRow]}>
                      <Text style={styles.itemPwrLbl}>⚡ POWER</Text>
                      <Text style={[styles.itemPwrVal, { color: rc }]}>{selectedItem.power_score}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )
          })()}
        </View>
      </Modal>

      {/* ─── REPORT MODAL ─── */}
      {reportOpen && viewerId && !isSelf && (
        <ReportModal
          visible={reportOpen}
          onClose={() => setReportOpen(false)}
          targetPlayerId={profile.id}
          targetUsername={profile.username}
          reporterId={viewerId}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backText: { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1, width: 60 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 3 },
  reportText: { fontSize: 20, width: 60, textAlign: 'right' },

  profileInfo: {
    paddingHorizontal: 16, paddingBottom: 12, alignItems: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  username: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 3 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  classText: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  passBadge: {
    backgroundColor: '#FFD70030', borderColor: '#FFD700', borderWidth: 1,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  passText: { fontSize: 9, color: '#FFD700', fontWeight: '900', letterSpacing: 1 },
  powerText: {
    fontSize: 14, fontWeight: '900', color: '#FFD700',
    marginTop: 8, letterSpacing: 1,
  },

  equipSection: {
    backgroundColor: 'rgba(0,8,18,0.7)',
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: 'rgba(0,212,255,0.12)',
    paddingTop: 8, paddingBottom: 10, paddingHorizontal: 12,
  },
  equipMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  slotCol: { gap: 6 },
  charFrame: {
    flex: 1, aspectRatio: 1, borderWidth: 1.5, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  charImg: { width: '100%', height: '100%' },
  charEmoji: { fontSize: 52 },

  slot: {
    width: SLOT_SIZE, height: SLOT_SIZE,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    gap: 2, position: 'relative', overflow: 'hidden',
  },
  slotImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  slotIcon: { fontSize: 22 },
  slotEmpty: { fontSize: 8, color: COLORS.textMuted, letterSpacing: 1 },
  slotEnhBadge: {
    position: 'absolute', top: 3, left: 3,
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 3,
    paddingHorizontal: 4, paddingVertical: 1, zIndex: 2,
  },
  slotEnhText: { fontSize: 9, fontWeight: '900', color: '#FFD700' },
  slotCornerLabel: {
    position: 'absolute', bottom: 2, right: 3,
    fontSize: 8, fontWeight: '900', letterSpacing: 0.3, zIndex: 2,
    textShadowColor: 'rgba(0,0,0,0.95)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },

  statStrip: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 12, borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  statChip: { alignItems: 'center' },
  statLbl: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  statVal: { fontSize: 14, fontWeight: '900', color: '#fff', marginTop: 2 },

  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: {
    fontSize: 11, color: COLORS.textMuted, letterSpacing: 3,
    fontWeight: '700', marginBottom: 8,
  },

  achievementBox: {
    backgroundColor: COLORS.bgCard, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 12,
  },
  achievementCount: { fontSize: 16, fontWeight: '900', color: '#FFD700' },
  achievementBar: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2, marginTop: 6, overflow: 'hidden',
  },
  achievementFill: { height: '100%', backgroundColor: '#FFD700' },
  showcaseRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  showcaseBadge: {
    flex: 1, backgroundColor: 'rgba(255,215,0,0.08)',
    borderWidth: 1, borderColor: '#FFD70060',
    borderRadius: 6, padding: 8, alignItems: 'center',
  },
  showcaseIcon: { fontSize: 24 },
  showcaseTitle: { fontSize: 9, color: '#FFD700', fontWeight: '700', marginTop: 4, textAlign: 'center' },

  progressRow: { flexDirection: 'row', gap: 8 },
  progressCard: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 12, alignItems: 'center',
  },
  progressLbl: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '700', letterSpacing: 1 },
  progressVal: { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 4 },
  progressSub: { fontSize: 9, color: COLORS.textMuted, marginTop: 2 },

  guildBox: {
    backgroundColor: COLORS.bgCard, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 12,
  },
  guildName: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  guildSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, letterSpacing: 1 },

  actionRow: { paddingHorizontal: 16, paddingTop: 20 },
  addFriendBtn: {
    backgroundColor: 'rgba(0,255,136,0.15)',
    borderWidth: 1, borderColor: COLORS.neonGreen as string,
    borderRadius: 8, paddingVertical: 14, alignItems: 'center',
  },
  addFriendBtnText: { fontSize: 13, fontWeight: '900', color: COLORS.neonGreen as string, letterSpacing: 2 },
  acceptBtn: {
    backgroundColor: COLORS.neonGreen as string,
    borderRadius: 8, paddingVertical: 14, alignItems: 'center',
  },
  acceptBtnText: { fontSize: 13, fontWeight: '900', color: COLORS.bg, letterSpacing: 2 },
  friendBadge: {
    borderWidth: 1, borderColor: COLORS.neonGreen as string,
    backgroundColor: 'rgba(0,255,136,0.08)',
    borderRadius: 8, paddingVertical: 12, alignItems: 'center',
  },
  friendBadgeText: { fontSize: 12, fontWeight: '900', color: COLORS.neonGreen as string, letterSpacing: 2 },
  pendingBadge: {
    borderWidth: 1, borderColor: '#F59E0B',
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 8, paddingVertical: 12, alignItems: 'center',
  },
  pendingBadgeText: { fontSize: 12, fontWeight: '900', color: '#F59E0B', letterSpacing: 2 },

  // Item modal
  itemOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', padding: 16,
  },
  itemBox: {
    backgroundColor: COLORS.bg,
    borderWidth: 1.5, borderRadius: 12, overflow: 'hidden',
  },
  itemHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  itemRarityName: { fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  itemTypeName: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3, letterSpacing: 1.5 },
  itemClose: { fontSize: 18, color: COLORS.textSecondary },
  itemBody: { flexDirection: 'row', padding: 14, gap: 12 },
  itemImgFrame: {
    width: 110, height: 110, borderWidth: 1, borderRadius: 8,
    overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.4)', position: 'relative',
  },
  itemBigImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  itemBigFallback: { fontSize: 60, textAlign: 'center', lineHeight: 110 },
  itemEnhBadge: {
    position: 'absolute', top: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1, zIndex: 2,
  },
  itemEnhText: { fontSize: 11, fontWeight: '900', color: '#FFD700' },
  itemStats: { flex: 1, gap: 2 },
  itemStatRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  itemStatLbl: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  itemStatVal: { fontSize: 13, fontWeight: '800' },
  itemPwrRow: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 8, marginTop: 4 },
  itemPwrLbl: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  itemPwrVal: { fontSize: 16, fontWeight: '900' },
})