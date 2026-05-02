// =============================================
// ECHO RIFT — FRIENDS SCREEN
// =============================================

import React, { useState, useCallback, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, RefreshControl, Modal, TextInput,
} from 'react-native'
import { PlayerActionMenu } from '../components/PlayerActionMenu'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useGame } from '../hooks/useGame'
import { COLORS, CLASS_INFO } from '../constants'
import { ClassType } from '../types'
import { ThemedAlert } from '../components/ThemedAlert'

type TabKey = 'friends' | 'activity' | 'requests' | 'suggestions'

// Pure helper — kept outside component so it isn't recreated each render
function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const d = Math.floor(hr / 24)
  return `${d}d`
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'friends',     label: '👥 FRIENDS' },
  { key: 'activity',    label: '📡 ACTIVITY' },
  { key: 'requests',    label: '📩 REQUESTS' },
  { key: 'suggestions', label: '✨ SUGGEST' },
]

export default function FriendsScreen({ navigation }: any) {
  const {
    getFriendsList, getFriendSuggestions, searchPlayers,
    sendFriendRequest, acceptFriendRequest, rejectFriendRequest, cancelFriendRequest,
    addFriendByCode, removeFriend, sendEnergyGift,
  } = useGame()

  const [userId, setUserId] = useState<string | null>(null)
  const [actionMenuPlayer, setActionMenuPlayer] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('friends')
  const [data, setData] = useState<any>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)

  // Activity feed state
  const [activities, setActivities] = useState<any[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)

  // Add Friend Modal
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addMode, setAddMode] = useState<'code' | 'search'>('code')
  const [codeInput, setCodeInput] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [busy, setBusy] = useState(false)

  useFocusEffect(useCallback(() => { loadAll() }, []))

  const loadAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const [list, sugg] = await Promise.all([
      getFriendsList(user.id),
      getFriendSuggestions(user.id),
    ])
    if (list?.success) setData(list)
    if (sugg?.success) setSuggestions(sugg.suggestions || [])
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadAll()
    setRefreshing(false)
  }

  // ========== ACTIVITY FEED ==========
  const loadActivities = async () => {
    if (!userId) return
    setActivitiesLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_friend_feed', {
        p_player_id: userId,
        p_limit: 50,
      })
      if (!error && data?.success) {
        setActivities(data.activities || [])
      } else if (error) {
        console.error('[FriendsScreen] loadActivities rpc error:', error)
      }
    } catch (err) {
      console.error('[FriendsScreen] loadActivities:', err)
    } finally {
      setActivitiesLoading(false)
    }
  }

  // Load activity feed when user opens the tab (and userId is ready).
  // Deliberately uses useEffect (not useFocusEffect) to avoid re-fire loops
  // when modals open/close while still on the activity tab.
  useEffect(() => {
    if (activeTab === 'activity' && userId) {
      loadActivities()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userId])

  // ========== ACTIONS ==========
  const handleSendGift = async (friendId: string, friendName: string) => {
    if (!userId) return
    setBusy(true)
    const res = await sendEnergyGift(userId, friendId)
    setBusy(false)
    if (res?.success) {
      ThemedAlert.alert('Gift Sent!', `${friendName} got 1 energy.`)
      await loadAll()
    } else {
      const err = res?.error || 'Unknown error'
      if (err === 'ALREADY_SENT_TODAY') {
        ThemedAlert.alert('Already Sent', 'You already sent a gift today. Reset at midnight UTC.')
      } else {
        ThemedAlert.alert('Error', err)
      }
    }
  }

  const handleRemoveFriend = (friendId: string, friendName: string) => {
    ThemedAlert.alert(
      'Remove Friend',
      `Remove ${friendName} from friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!userId) return
            const res = await removeFriend(userId, friendId)
            if (res?.success) await loadAll()
            else ThemedAlert.alert('Error', res?.error || 'Failed')
          },
        },
      ]
    )
  }

  const handleAcceptRequest = async (requestId: string) => {
    if (!userId) return
    setBusy(true)
    const res = await acceptFriendRequest(userId, requestId)
    setBusy(false)
    if (res?.success) await loadAll()
    else ThemedAlert.alert('Error', res?.error || 'Failed')
  }

  const handleRejectRequest = async (requestId: string) => {
    if (!userId) return
    setBusy(true)
    const res = await rejectFriendRequest(userId, requestId)
    setBusy(false)
    if (res?.success) await loadAll()
    else ThemedAlert.alert('Error', res?.error || 'Failed')
  }

  const handleCancelOutgoing = async (requestId: string) => {
    if (!userId) return
    setBusy(true)
    const res = await cancelFriendRequest(userId, requestId)
    setBusy(false)
    if (res?.success) await loadAll()
    else ThemedAlert.alert('Error', res?.error || 'Failed')
  }

  const handleSendRequestToSuggestion = async (targetId: string, targetName: string) => {
    if (!userId) return
    setBusy(true)
    const res = await sendFriendRequest(userId, { targetPlayerId: targetId })
    setBusy(false)
    if (res?.success) {
      ThemedAlert.alert('Request Sent', `Friend request sent to ${targetName}.`)
      await loadAll()
    } else {
      ThemedAlert.alert('Error', res?.error || 'Failed')
    }
  }

  // ========== ADD FRIEND MODAL ==========
  const openAddModal = (mode: 'code' | 'search') => {
    setAddMode(mode)
    setCodeInput('')
    setSearchInput('')
    setSearchResults([])
    setAddModalOpen(true)
  }

  const handleAddByCode = async () => {
    if (!userId || !codeInput.trim()) return
    setBusy(true)
    const res = await addFriendByCode(userId, codeInput.trim())
    setBusy(false)
    if (res?.success) {
      ThemedAlert.alert('Friend Added!', `You are now friends with ${res.friend_username}.`)
      setAddModalOpen(false)
      await loadAll()
    } else {
      const err = res?.error
      const messages: Record<string, string> = {
        EMPTY_CODE: 'Please enter a code.',
        CODE_NOT_FOUND: 'Invalid friend code.',
        CANNOT_ADD_SELF: 'You cannot add yourself.',
        ALREADY_FRIENDS: `Already friends with ${res?.friend_username || 'this player'}.`,
        FRIEND_LIMIT_REACHED: `Friend limit reached (${res?.max || 15}).`,
        TARGET_FRIEND_LIMIT_REACHED: `${res?.friend_username || 'Target'} has reached friend limit.`,
      }
      ThemedAlert.alert('Could Not Add', messages[err] || err || 'Unknown error')
    }
  }

  const handleSearch = async () => {
    if (!userId || !searchInput.trim()) return
    setBusy(true)
    const res = await searchPlayers(userId, searchInput.trim())
    setBusy(false)
    if (res?.success) setSearchResults(res.results || [])
  }

  const handleSendRequestFromSearch = async (targetId: string) => {
    if (!userId) return
    setBusy(true)
    const res = await sendFriendRequest(userId, { targetPlayerId: targetId })
    setBusy(false)
    if (res?.success) {
      ThemedAlert.alert('Request Sent', 'Friend request sent.')
      await handleSearch() // refresh sonuçları
      await loadAll()
    } else {
      ThemedAlert.alert('Error', res?.error || 'Failed')
    }
  }

  // ========== HELPERS ==========
  const formatLastActive = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 300) return 'online'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const renderClassEmoji = (ct: string | null) => {
    if (!ct) return '❓'
    return CLASS_INFO[ct as ClassType]?.icon || '❓'
  }

  // ========== RENDER ==========
  const friends = data?.friends || []
  const incoming = data?.pending_incoming || []
  const outgoing = data?.pending_outgoing || []
  const friendCount = data?.count || 0
  const maxFriends = data?.max_friends || 15

  const renderFriendCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => setActionMenuPlayer({
          player_id: item.friend_id,
          username: item.username,
          class_type: item.class_type,
          level: item.level,
        })}
        activeOpacity={0.7}
        style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.avatar, item.is_online && styles.avatarOnline]}>
            <Text style={styles.avatarText}>{renderClassEmoji(item.class_type)}</Text>
            {item.is_online && <View style={styles.onlineDot} />}
          </View>
        </View>
        <View style={styles.cardCenter}>
          <View style={styles.nameRow}>
            <Text style={styles.username}>{item.username}</Text>
            {item.is_referral && (
              <View style={styles.refBadge}><Text style={styles.refBadgeText}>REF</Text></View>
            )}
          </View>
          <Text style={styles.subText}>
            Lv.{item.level} • {item.power_score?.toLocaleString() || 0} ⚡ • {formatLastActive(item.last_active_at)}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.cardRight}>
        <TouchableOpacity
          style={[styles.giftBtn, item.gift_sent_today && styles.giftBtnDisabled]}
          onPress={() => !item.gift_sent_today && handleSendGift(item.friend_id, item.username)}
          disabled={item.gift_sent_today || busy}
        >
          <Text style={styles.giftBtnText}>
            {item.gift_sent_today ? '✓' : '🎁'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => handleRemoveFriend(item.friend_id, item.username)}
        >
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderActivityItem = ({ item }: { item: any }) => {
    const classColor = CLASS_INFO[item.class_type as ClassType]?.color || '#888'
    const classIcon  = CLASS_INFO[item.class_type as ClassType]?.icon  || '👤'
    const p = item.payload || {}

    type ActivityContent = { icon: string; text: string; color: string }
    const content: ActivityContent = (() => {
      switch (item.activity_type) {
        case 'level_up':
          return { icon: '⬆️', text: `reached Level ${p.level}`, color: COLORS.neonGreen as string }
        case 'dungeon_floor':
          return { icon: '⚔️', text: `beat Dungeon Floor ${p.floor}`, color: '#3B82F6' }
        case 'legendary_drop':
          return { icon: '✨', text: `got a Legendary ${p.item_type}`, color: '#F59E0B' }
        case 'dimensional_drop':
          return { icon: '💎', text: `got a Dimensional ${p.item_type}`, color: '#A855F7' }
        case 'enhancement_max':
          return { icon: '🔥', text: `enhanced ${p.rarity} ${p.item_type} to +15`, color: '#FFD700' }
        case 'achievement':
          return { icon: p.icon || '🏆', text: `unlocked "${p.title}"`, color: '#FFD700' }
        case 'arena_top':
          return { icon: '👑', text: `climbed to Arena Rank #${p.rank}`, color: '#FFD700' }
        case 'rebirth':
          return { icon: '🌌', text: `performed Echo Rebirth (Tier ${p.tier})`, color: '#A855F7' }
        default:
          return { icon: '⭐', text: 'did something cool', color: COLORS.textMuted }
      }
    })()

    return (
      <TouchableOpacity
        style={styles.activityCard}
        onPress={() => setActionMenuPlayer({
          player_id: item.player_id,
          username: item.username,
          class_type: item.class_type,
          level: item.level,
        })}
        activeOpacity={0.7}
      >
        <View style={[styles.activityIconBox, { borderColor: classColor + '40' }]}>
          <Text style={styles.activityIconText}>{content.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.activityNameRow}>
            <Text style={[styles.activityUsername, { color: classColor }]}>
              {classIcon} {item.username}
            </Text>
            <Text style={styles.activityTime}>{formatTimeAgo(item.created_at)}</Text>
          </View>
          <Text style={[styles.activityDesc, { color: content.color }]}>
            {content.text}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  const renderIncomingCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{renderClassEmoji(item.from_class_type)}</Text>
        </View>
      </View>
      <View style={styles.cardCenter}>
        <Text style={styles.username}>{item.from_username}</Text>
        <Text style={styles.subText}>
          Lv.{item.from_level} • {item.from_power_score?.toLocaleString() || 0} ⚡
        </Text>
      </View>
      <View style={styles.cardRight}>
        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => handleAcceptRequest(item.request_id)}
          disabled={busy}
        >
          <Text style={styles.acceptBtnText}>✓</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => handleRejectRequest(item.request_id)}
          disabled={busy}
        >
          <Text style={styles.rejectBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderOutgoingCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardCenter}>
        <Text style={styles.username}>{item.to_username}</Text>
        <Text style={styles.subText}>Lv.{item.to_level} • Pending...</Text>
      </View>
      <View style={styles.cardRight}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => handleCancelOutgoing(item.request_id)}
        >
          <Text style={styles.cancelBtnText}>CANCEL</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderSuggestionCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.avatar, item.is_online && styles.avatarOnline]}>
          <Text style={styles.avatarText}>{renderClassEmoji(item.class_type)}</Text>
        </View>
      </View>
      <View style={styles.cardCenter}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.subText}>
          Lv.{item.level} • {item.power_score?.toLocaleString() || 0} ⚡
        </Text>
      </View>
      <View style={styles.cardRight}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => handleSendRequestToSuggestion(item.player_id, item.username)}
          disabled={busy}
        >
          <Text style={styles.addBtnText}>ADD</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FRIENDS</Text>
        <Text style={styles.counter}>{friendCount}/{maxFriends}</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        {TABS.map(tab => {
          const count =
            tab.key === 'requests'    ? incoming.length + outgoing.length :
            tab.key === 'friends'     ? friendCount :
            tab.key === 'suggestions' ? suggestions.length :
            0 // activity tab: no badge
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab.key && { color: COLORS.neonGreen as string },
              ]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* CONTENT */}
      {activeTab === 'friends' && (
        <FlatList
          data={friends}
          keyExtractor={(it) => it.friend_id}
          renderItem={renderFriendCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neonGreen} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="👥" text="No friends yet. Tap + to add." />}
        />
      )}

      {activeTab === 'requests' && (
        <FlatList
          data={[
            ...incoming.map((r: any) => ({ ...r, _kind: 'incoming' })),
            ...outgoing.map((r: any) => ({ ...r, _kind: 'outgoing' })),
          ]}
          keyExtractor={(it) => it.request_id}
          renderItem={({ item }) => item._kind === 'incoming'
            ? renderIncomingCard({ item })
            : renderOutgoingCard({ item })}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neonGreen} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="📭" text="No pending requests." />}
          ListHeaderComponent={
            (incoming.length > 0 || outgoing.length > 0) ? (
              <View style={styles.section}>
                {incoming.length > 0 && <Text style={styles.sectionLabel}>INCOMING ({incoming.length})</Text>}
              </View>
            ) : null
          }
        />
      )}

      {activeTab === 'suggestions' && (
        <FlatList
          data={suggestions}
          keyExtractor={(it) => it.player_id}
          renderItem={renderSuggestionCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neonGreen} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="✨" text="No suggestions." />}
        />
      )}

      {activeTab === 'activity' && (
        <FlatList
          data={activities}
          keyExtractor={(it) => it.id}
          renderItem={renderActivityItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={activitiesLoading}
              onRefresh={loadActivities}
              tintColor={COLORS.neonGreen as string}
            />
          }
          ListEmptyComponent={
            activitiesLoading
              ? null
              : <EmptyState
                  icon="📡"
                  text="No friend activity yet. Add friends to see their progress!"
                />
          }
        />
      )}

      {/* FAB — ADD FRIEND */}
      <TouchableOpacity style={styles.fab} onPress={() => openAddModal('code')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ADD FRIEND MODAL */}
      <Modal visible={addModalOpen} transparent animationType="fade" onRequestClose={() => setAddModalOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ADD FRIEND</Text>

            {/* Mode toggle */}
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeBtn, addMode === 'code' && styles.modeBtnActive]}
                onPress={() => setAddMode('code')}
              >
                <Text style={[styles.modeText, addMode === 'code' && { color: COLORS.bg }]}>By Code</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, addMode === 'search' && styles.modeBtnActive]}
                onPress={() => setAddMode('search')}
              >
                <Text style={[styles.modeText, addMode === 'search' && { color: COLORS.bg }]}>Search</Text>
              </TouchableOpacity>
            </View>

            {addMode === 'code' ? (
              <>
                <Text style={styles.modalLabel}>Friend Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ECHO-XXXX"
                  placeholderTextColor={COLORS.textMuted}
                  value={codeInput}
                  onChangeText={setCodeInput}
                  autoCapitalize="characters"
                  maxLength={20}
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, busy && { opacity: 0.5 }]}
                  onPress={handleAddByCode}
                  disabled={busy || !codeInput.trim()}
                >
                  <Text style={styles.primaryBtnText}>{busy ? '...' : 'ADD INSTANTLY'}</Text>
                </TouchableOpacity>
                <Text style={styles.helperText}>
                  Adding by code skips the request approval — they become your friend immediately.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.modalLabel}>Username</Text>
                <View style={styles.searchRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Search username..."
                    placeholderTextColor={COLORS.textMuted}
                    value={searchInput}
                    onChangeText={setSearchInput}
                    onSubmitEditing={handleSearch}
                  />
                  <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={busy}>
                    <Text style={styles.searchBtnText}>🔍</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={searchResults}
                  keyExtractor={(it) => it.player_id}
                  style={{ maxHeight: 240, marginTop: 8 }}
                  ListEmptyComponent={busy ? null : (
                    <Text style={styles.helperText}>
                      {searchInput.trim() ? 'No results.' : 'Type at least 2 characters.'}
                    </Text>
                  )}
                  renderItem={({ item }) => (
                    <View style={styles.searchResultRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.searchUsername}>{item.username}</Text>
                        <Text style={styles.searchSub}>Lv.{item.level} • {item.power_score?.toLocaleString() || 0} ⚡</Text>
                      </View>
                      {item.is_friend ? (
                        <Text style={styles.searchBadge}>FRIEND</Text>
                      ) : item.request_sent ? (
                        <Text style={styles.searchBadge}>SENT</Text>
                      ) : item.request_received ? (
                        <Text style={styles.searchBadge}>PENDING</Text>
                      ) : (
                        <TouchableOpacity
                          style={styles.searchAddBtn}
                          onPress={() => handleSendRequestFromSearch(item.player_id)}
                          disabled={busy}
                        >
                          <Text style={styles.searchAddBtnText}>+ ADD</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                />
              </>
            )}

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setAddModalOpen(false)}
            >
              <Text style={styles.closeBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PlayerActionMenu — başkasının username/avatar'ına tıklanınca */}
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

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 60 }}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>{icon}</Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backText: { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 3 },
  counter: { fontSize: 12, color: COLORS.neonGreen as string, fontWeight: '700' },

  tabs: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 12,
  },
  tab: {
    flex: 1, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 4, paddingHorizontal: 8, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  tabActive: { borderColor: COLORS.neonGreen as string, backgroundColor: 'rgba(0,255,136,0.08)' },
  tabText: { fontSize: 10, color: COLORS.textPrimary, letterSpacing: 1 },
  tabBadge: {
    backgroundColor: COLORS.error, borderRadius: 8,
    paddingHorizontal: 6, minWidth: 16, alignItems: 'center',
  },
  tabBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },

  list: { padding: 16, paddingBottom: 100 },
  section: { paddingTop: 8 },
  sectionLabel: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 8 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 10, marginBottom: 6, gap: 10,
  },
  cardLeft: {},
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.bgPanel, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatarOnline: { borderColor: COLORS.neonGreen as string },
  avatarText: { fontSize: 20 },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.neonGreen as string,
  },
  cardCenter: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  username: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  refBadge: {
    backgroundColor: COLORS.cyan as string + '30',
    borderWidth: 1, borderColor: COLORS.cyan as string,
    borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1,
  },
  refBadgeText: { fontSize: 8, color: COLORS.cyan as string, fontWeight: '900', letterSpacing: 1 },
  subText: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },

  cardRight: { flexDirection: 'row', gap: 6 },
  giftBtn: {
    backgroundColor: COLORS.neonGreen as string, borderRadius: 6,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  giftBtnDisabled: { backgroundColor: COLORS.border, opacity: 0.5 },
  giftBtnText: { fontSize: 16 },
  removeBtn: {
    borderWidth: 1, borderColor: COLORS.error,
    borderRadius: 6, width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { fontSize: 14, color: COLORS.error, fontWeight: '700' },

  acceptBtn: {
    backgroundColor: COLORS.neonGreen as string, borderRadius: 6,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  acceptBtnText: { fontSize: 16, color: COLORS.bg, fontWeight: '900' },
  rejectBtn: {
    borderWidth: 1, borderColor: COLORS.error, borderRadius: 6,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  rejectBtnText: { fontSize: 14, color: COLORS.error, fontWeight: '700' },

  cancelBtn: {
    borderWidth: 1, borderColor: COLORS.textMuted,
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
  },
  cancelBtnText: { fontSize: 9, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 1 },

  addBtn: {
    backgroundColor: COLORS.cyan as string, borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  addBtnText: { fontSize: 11, color: COLORS.bg, fontWeight: '800', letterSpacing: 1 },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.neonGreen as string,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.4,
    shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  fabText: { fontSize: 28, color: COLORS.bg, fontWeight: '900', marginTop: -3 },

  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%', maxWidth: 400,
    backgroundColor: COLORS.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.neonGreen as string,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16, fontWeight: '900', color: COLORS.textPrimary,
    letterSpacing: 3, textAlign: 'center', marginBottom: 16,
  },
  modeRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  modeBtn: {
    flex: 1, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 6, paddingVertical: 8, alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: COLORS.neonGreen as string,
    borderColor: COLORS.neonGreen as string,
  },
  modeText: { fontSize: 11, color: COLORS.textPrimary, fontWeight: '700', letterSpacing: 1 },
  modalLabel: {
    fontSize: 9, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 6,
  },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 6,
    padding: 12, fontSize: 14, color: COLORS.textPrimary,
    backgroundColor: COLORS.bgPanel, marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: COLORS.neonGreen as string, borderRadius: 6,
    padding: 12, alignItems: 'center', marginBottom: 8,
  },
  primaryBtnText: { fontSize: 12, color: COLORS.bg, fontWeight: '900', letterSpacing: 2 },
  helperText: { fontSize: 10, color: COLORS.textMuted, lineHeight: 14, marginTop: 4 },
  searchRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  searchBtn: {
    backgroundColor: COLORS.cyan as string, borderRadius: 6,
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  searchBtnText: { fontSize: 18 },
  searchResultRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  searchUsername: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '700' },
  searchSub: { fontSize: 9, color: COLORS.textMuted, marginTop: 2 },
  searchBadge: {
    fontSize: 9, color: COLORS.textMuted, letterSpacing: 1,
    fontWeight: '700',
  },
  searchAddBtn: {
    backgroundColor: COLORS.neonGreen as string,
    borderRadius: 4, paddingHorizontal: 10, paddingVertical: 6,
  },
  searchAddBtnText: { fontSize: 9, color: COLORS.bg, fontWeight: '900', letterSpacing: 1 },
  closeBtn: {
    marginTop: 12, paddingVertical: 8, alignItems: 'center',
  },
  closeBtnText: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2 },

  // Activity feed
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
  },
  activityIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  activityIconText: { fontSize: 22 },
  activityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityUsername: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activityTime: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  activityDesc: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.3,
  },
})