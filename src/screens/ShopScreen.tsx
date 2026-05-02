// =============================================
// ECHO RIFT — RIFT SHOP
// Quartermaster Nyx's marketplace
// =============================================

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Dimensions, RefreshControl, Modal, ActivityIndicator,
  Animated, Easing,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import { useGame } from '../hooks/useGame'
import { COLORS } from '../constants'

const { width } = Dimensions.get('window')

// ─── TIER COLORS ─────────────────────────────────────────────────────────────
const TIER_COLORS: Record<string, string> = {
  common:      COLORS.textSecondary,
  rare:        COLORS.rare,
  epic:        COLORS.epic,
  legendary:   COLORS.legendary,
  dimensional: COLORS.dimensional,
}

// ─── CATEGORY → TAB GROUPING ─────────────────────────────────────────────────
type TabKey = 'all' | 'offers' | 'passes' | 'summon' | 'supplies' | 'crystals'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'all',      label: 'ALL',      icon: '✦' },
  { key: 'offers',   label: 'OFFERS',   icon: '🔥' },
  { key: 'passes',   label: 'PASSES',   icon: '👑' },
  { key: 'summon',   label: 'SUMMON',   icon: '🪬' },
  { key: 'supplies', label: 'SUPPLIES', icon: '⚙️' },
  { key: 'crystals', label: 'CRYSTALS', icon: '💎' },
]

const TAB_FILTER: Record<TabKey, string[] | null> = {
  all:      null,
  offers:   ['offer'],
  passes:   ['war_pass', 'echo_pass'],
  summon:   ['summon'],
  supplies: ['dungeon_key', 'arena_token', 'gold'],
  crystals: ['rc_pack'],
}

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface ShopItem {
  code: string
  category: string
  name: string
  description: string
  lore: string | null
  icon: string
  asset_url: string | null
  rarity_tier: string
  currency: 'rc' | 'gold' | 'real'
  price: number
  discounted_price: number
  discount_pct: number
  bundle_value: string | null
  reward_type: string
  reward_amount: number
  reward_extra: any
  daily_limit: number | null
  account_limit: number | null
  min_player_lvl: number
  is_featured: boolean
  sort_order: number
  purchased_today: number
  is_locked: boolean
  lock_reason: string | null
  is_sold_out: boolean
  available_until: string | null
}

interface ShopData {
  player: {
    level: number
    rc: number
    gold: number
    summon_scrolls: number
    pass_type: string
    pass_expires_at: string | null
    echo_pass_expires_at: string | null
    first_purchase_made: boolean
    dungeon_extra_today: number
    arena_extra_today: number
  }
  items: ShopItem[]
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════════════════════════════════════
export default function ShopScreen({ navigation }: any) {
  const { fetchPlayerState } = useGame()
  const [userId, setUserId] = useState<string | null>(null)
  const [data, setData] = useState<ShopData | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadShop = useCallback(async (uid?: string | null) => {
    const id = uid ?? userId
    if (!id) {
      setLoadError('No authenticated user.')
      return
    }
    setLoadError(null)
    const { data: res, error } = await supabase.rpc('get_shop_offers', { p_player_id: id })
    if (error) {
      console.error('[Shop] RPC error:', error)
      setLoadError(`RPC error: ${error.message ?? 'unknown'}`)
      return
    }
    if (!res) {
      setLoadError('No response from server.')
      return
    }
    if (!res.success) {
      console.error('[Shop] RPC returned failure:', res)
      setLoadError(`Shop error: ${res.error ?? 'UNKNOWN'}${res.message ? ' — ' + res.message : ''}`)
      return
    }
    setData(res as ShopData)
  }, [userId])

  useFocusEffect(useCallback(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        loadShop(user.id)
      } else {
        setLoadError('Not signed in.')
      }
    })
  }, []))

  const onRefresh = async () => {
    setRefreshing(true)
    await loadShop()
    setRefreshing(false)
  }

  const handlePurchaseSuccess = async () => {
    // Reload shop offers + global player state
    await loadShop()
    if (userId) await fetchPlayerState(userId)
  }

  if (loadError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorIcon}>⚠</Text>
        <Text style={styles.errorTitle}>SHOP UNAVAILABLE</Text>
        <Text style={styles.errorMsg}>{loadError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setData(null); loadShop() }}>
          <Text style={styles.retryText}>RETRY</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>← BACK</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.cyan} />
        <Text style={styles.loadingText}>QUARTERMASTER STANDING BY...</Text>
      </View>
    )
  }

  const { player } = data

  // Filter items by active tab
  const filter = TAB_FILTER[activeTab]
  const visibleItems = filter
    ? data.items.filter(it => filter.includes(it.category))
    : data.items

  // Featured hero (first is_featured item, all categories)
  const featured = data.items.find(it => it.is_featured && it.category === 'offer')
                 || data.items.find(it => it.is_featured)

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← BACK</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>RIFT SHOP</Text>
          <Text style={styles.headerSub}>Quartermaster Nyx</Text>
        </View>
        <View style={styles.balanceCol}>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceIcon}>💎</Text>
            <Text style={[styles.balanceText, { color: COLORS.cyan }]}>{player.rc.toLocaleString()}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceIcon}>🪙</Text>
            <Text style={[styles.balanceText, { color: COLORS.gold }]}>{player.gold.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neonGreen} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── FEATURED HERO ─── */}
        {featured && activeTab === 'all' && (
          <FeaturedHero item={featured} onPress={() => setSelectedItem(featured)} />
        )}

        {/* ─── TABS ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, activeTab === t.key && styles.tabActive]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
                {t.icon} {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ─── ITEMS ─── */}
        <View style={styles.itemsList}>
          {visibleItems
            .filter(it => !(featured && activeTab === 'all' && it.code === featured.code))
            .map(item => (
              <ShopItemCard
                key={item.code}
                item={item}
                onPress={() => !item.is_locked && !item.is_sold_out && setSelectedItem(item)}
              />
            ))}
          {visibleItems.length === 0 && (
            <Text style={styles.emptyText}>Nothing on the shelves here, commander.</Text>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ─── BUY MODAL ─── */}
      <BuyModal
        item={selectedItem}
        playerRc={player.rc}
        playerGold={player.gold}
        onClose={() => setSelectedItem(null)}
        onSuccess={handlePurchaseSuccess}
      />
    </View>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// FEATURED HERO BANNER
// ═════════════════════════════════════════════════════════════════════════════
function FeaturedHero({ item, onPress }: { item: ShopItem; onPress: () => void }) {
  const tierColor = TIER_COLORS[item.rarity_tier] ?? COLORS.cyan
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: false }),
      ])
    ).start()
  }, [])

  const glowOp = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.45] })

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.heroCard, { borderColor: tierColor + '80' }]}
    >
      <Animated.View style={[styles.heroGlow, { backgroundColor: tierColor, opacity: glowOp }]} />
      <View style={styles.heroBadge}>
        <Text style={styles.heroBadgeText}>★ TODAY'S DEAL</Text>
      </View>
      <View style={styles.heroContent}>
        <Text style={styles.heroIcon}>{item.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroName, { color: tierColor }]}>{item.name}</Text>
          <Text style={styles.heroDesc} numberOfLines={2}>{item.description}</Text>
          <View style={styles.heroPriceRow}>
            {item.discount_pct > 0 && (
              <Text style={styles.heroOriginalPrice}>
                {item.price} {item.currency.toUpperCase()}
              </Text>
            )}
            <Text style={[styles.heroPrice, { color: tierColor }]}>
              {item.discounted_price} {item.currency.toUpperCase()}
            </Text>
            {item.discount_pct > 0 && (
              <View style={[styles.heroDiscount, { backgroundColor: COLORS.error }]}>
                <Text style={styles.heroDiscountText}>-{item.discount_pct}%</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// SHOP ITEM CARD
// ═════════════════════════════════════════════════════════════════════════════
function ShopItemCard({ item, onPress }: { item: ShopItem; onPress: () => void }) {
  const tierColor = TIER_COLORS[item.rarity_tier] ?? COLORS.textSecondary
  const isRcPack = item.category === 'rc_pack'  // IAP placeholder
  const dimmed = item.is_locked || item.is_sold_out || isRcPack

  const currencyIcon = item.currency === 'rc' ? '💎'
                    : item.currency === 'gold' ? '🪙'
                    : '$'
  const currencyLabel = item.currency === 'real' ? 'USD' : item.currency.toUpperCase()

  return (
    <TouchableOpacity
      activeOpacity={dimmed ? 1 : 0.75}
      disabled={dimmed}
      onPress={onPress}
      style={[
        styles.itemCard,
        { borderColor: tierColor + '50' },
        dimmed && styles.itemCardDimmed,
      ]}
    >
      {/* Bundle badge */}
      {!!item.bundle_value && (
        <View style={[styles.itemBadge, { backgroundColor: tierColor }]}>
          <Text style={styles.itemBadgeText}>{item.bundle_value}</Text>
        </View>
      )}

      <View style={styles.itemTop}>
        <View style={[styles.itemIconWrap, { borderColor: tierColor + '70' }]}>
          <Text style={styles.itemIcon}>{item.icon}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.itemName, { color: tierColor }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
        </View>
      </View>

      <View style={styles.itemBottom}>
        {/* Price + buy */}
        <View style={styles.itemPriceCol}>
          {item.discount_pct > 0 && (
            <Text style={styles.itemOriginalPrice}>
              {item.price} {currencyLabel}
            </Text>
          )}
          <View style={styles.itemPriceRow}>
            <Text style={styles.itemPriceIcon}>{currencyIcon}</Text>
            <Text style={[styles.itemPrice, { color: tierColor }]}>
              {isRcPack ? `$${(item.price / 100).toFixed(2)}` : item.discounted_price.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Status / buy button */}
        {item.is_locked ? (
          <View style={styles.itemStatusBadge}>
            <Text style={styles.itemStatusText}>🔒 {item.lock_reason}</Text>
          </View>
        ) : item.is_sold_out ? (
          <View style={[styles.itemStatusBadge, { borderColor: COLORS.textMuted }]}>
            <Text style={styles.itemStatusText}>SOLD OUT</Text>
          </View>
        ) : isRcPack ? (
          <View style={[styles.itemStatusBadge, { borderColor: COLORS.gold }]}>
            <Text style={[styles.itemStatusText, { color: COLORS.gold }]}>SOON</Text>
          </View>
        ) : (
          <View style={[styles.itemBuyBtn, { borderColor: tierColor, backgroundColor: tierColor + '15' }]}>
            <Text style={[styles.itemBuyText, { color: tierColor }]}>BUY</Text>
          </View>
        )}
      </View>

      {/* Daily limit indicator */}
      {item.daily_limit !== null && !item.is_locked && (
        <View style={styles.limitRow}>
          <View style={styles.limitBarBg}>
            <View style={[styles.limitBarFill, {
              width: `${(item.purchased_today / item.daily_limit) * 100}%`,
              backgroundColor: tierColor,
            }]} />
          </View>
          <Text style={styles.limitText}>
            {item.purchased_today}/{item.daily_limit} today
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// BUY MODAL
// ═════════════════════════════════════════════════════════════════════════════
type BuyState = 'confirm' | 'loading' | 'success' | 'error'

function BuyModal({
  item, playerRc, playerGold, onClose, onSuccess,
}: {
  item: ShopItem | null
  playerRc: number
  playerGold: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [state, setState] = useState<BuyState>('confirm')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [resultData, setResultData] = useState<any>(null)
  const sparkle = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (item) {
      setState('confirm')
      setErrorMsg('')
      setResultData(null)
    }
  }, [item])

  useEffect(() => {
    if (state === 'success') {
      sparkle.setValue(0)
      Animated.timing(sparkle, {
        toValue: 1, duration: 800,
        easing: Easing.out(Easing.back(1.4)), useNativeDriver: true,
      }).start()
    }
  }, [state])

  if (!item) return null

  const tierColor = TIER_COLORS[item.rarity_tier] ?? COLORS.cyan
  const balance = item.currency === 'rc' ? playerRc : item.currency === 'gold' ? playerGold : 0
  const finalPrice = item.discounted_price
  const balanceAfter = balance - finalPrice
  const canAfford = balance >= finalPrice
  const currencyIcon = item.currency === 'rc' ? '💎' : item.currency === 'gold' ? '🪙' : '$'
  const currencyLabel = item.currency === 'real' ? 'USD' : item.currency.toUpperCase()

  const doPurchase = async () => {
    if (!canAfford) {
      setErrorMsg(item.currency === 'rc' ? 'Not enough Rift Crystals.' : 'Not enough Gold.')
      setState('error')
      return
    }

    setState('loading')
    const idempotencyKey = `${item.code}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErrorMsg('Authentication failed.')
      setState('error')
      return
    }

    const { data: res, error } = await supabase.rpc('purchase_shop_item', {
      p_player_id: user.id,
      p_item_code: item.code,
      p_idempotency_key: idempotencyKey,
    })

    if (error) {
      setErrorMsg(error.message ?? 'Transaction failed.')
      setState('error')
      return
    }

    if (!res?.success) {
      const errKey = res?.error ?? 'UNKNOWN'
      setErrorMsg(translateError(errKey, res))
      setState('error')
      return
    }

    setResultData(res)
    setState('success')
  }

  const handleClose = () => {
    if (state === 'success') onSuccess()
    onClose()
  }

  const sparkleScale = sparkle.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] })
  const sparkleOpacity = sparkle.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] })

  return (
    <Modal visible={!!item} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={state === 'success' || state === 'confirm' || state === 'error' ? handleClose : undefined}
        />

        <View style={[styles.modalBox, { borderColor: tierColor + 'AA' }]}>
          {/* Tier glow corner */}
          <View style={[styles.modalCornerGlow, { backgroundColor: tierColor }]} />

          {state === 'confirm' && (
            <>
              {/* Item icon big */}
              <View style={[styles.modalIconWrap, { borderColor: tierColor }]}>
                <Text style={styles.modalIcon}>{item.icon}</Text>
              </View>

              {/* Name + tier */}
              <Text style={[styles.modalName, { color: tierColor }]}>{item.name}</Text>
              <Text style={styles.modalTier}>{item.rarity_tier.toUpperCase()}</Text>

              {/* Lore */}
              {!!item.lore && (
                <View style={styles.modalLoreBox}>
                  <Text style={styles.modalLoreSpeaker}>— Quartermaster Nyx</Text>
                  <Text style={styles.modalLore}>"{item.lore}"</Text>
                </View>
              )}

              {/* Reward summary */}
              <View style={styles.modalRewardBox}>
                <Text style={styles.modalRewardLabel}>YOU RECEIVE</Text>
                <Text style={styles.modalReward}>{formatReward(item)}</Text>
              </View>

              {/* Price + balance preview */}
              <View style={styles.modalPriceBox}>
                <View style={styles.modalPriceRow}>
                  <Text style={styles.modalPriceLabel}>Cost</Text>
                  <Text style={[styles.modalPriceVal, { color: tierColor }]}>
                    {currencyIcon} {finalPrice.toLocaleString()} {currencyLabel}
                  </Text>
                </View>
                {item.currency !== 'real' && (
                  <View style={styles.modalPriceRow}>
                    <Text style={styles.modalPriceLabel}>Balance</Text>
                    <Text style={[
                      styles.modalPriceVal,
                      { color: canAfford ? COLORS.textPrimary : COLORS.error, fontSize: 12 },
                    ]}>
                      {balance.toLocaleString()} → {Math.max(0, balanceAfter).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Buttons */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={handleClose}>
                  <Text style={styles.modalCancelText}>CANCEL</Text>
                </TouchableOpacity>
                {item.currency === 'real' ? (
                  <View style={[styles.modalBuyBtn, { borderColor: COLORS.gold + '50', backgroundColor: COLORS.gold + '10' }]}>
                    <Text style={[styles.modalBuyText, { color: COLORS.gold }]}>SOON</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.modalBuyBtn,
                      { borderColor: tierColor, backgroundColor: tierColor + '20' },
                      !canAfford && styles.modalBuyBtnDisabled,
                    ]}
                    onPress={doPurchase}
                    disabled={!canAfford}
                  >
                    <Text style={[
                      styles.modalBuyText,
                      { color: canAfford ? tierColor : COLORS.textMuted },
                    ]}>
                      {canAfford ? 'BUY' : 'INSUFFICIENT'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {state === 'loading' && (
            <View style={styles.modalCenter}>
              <ActivityIndicator size="large" color={tierColor} />
              <Text style={styles.modalLoadingText}>SEALING TRANSACTION...</Text>
            </View>
          )}

          {state === 'success' && (
            <Animated.View style={[
              styles.modalCenter,
              { transform: [{ scale: sparkleScale }], opacity: sparkleOpacity },
            ]}>
              <Text style={styles.modalSparkle}>✨</Text>
              <Text style={[styles.modalSuccessTitle, { color: tierColor }]}>PURCHASED</Text>
              <Text style={styles.modalSuccessReward}>{formatReward(item)}</Text>
              {!!item.lore && (
                <Text style={styles.modalSuccessQuote}>"Spend it well, commander." — Nyx</Text>
              )}
              <TouchableOpacity
                style={[styles.modalDoneBtn, { borderColor: tierColor, backgroundColor: tierColor + '20' }]}
                onPress={handleClose}
              >
                <Text style={[styles.modalDoneText, { color: tierColor }]}>DONE</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {state === 'error' && (
            <View style={styles.modalCenter}>
              <Text style={styles.modalErrorIcon}>⚠</Text>
              <Text style={styles.modalErrorTitle}>TRANSACTION FAILED</Text>
              <Text style={styles.modalErrorText}>{errorMsg}</Text>
              <TouchableOpacity style={styles.modalDoneBtn} onPress={handleClose}>
                <Text style={styles.modalDoneText}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function formatReward(item: ShopItem): string {
  switch (item.reward_type) {
    case 'rc':            return `+${item.reward_amount.toLocaleString()} 💎 RC`
    case 'gold':          return `+${item.reward_amount.toLocaleString()} 🪙 Gold`
    case 'summon_scroll': return `+${item.reward_amount} 🪬 Echo Sigil${item.reward_amount > 1 ? 's' : ''}`
    case 'dungeon_key':   return `+${item.reward_amount} 🗝️ Dungeon Key${item.reward_amount > 1 ? 's' : ''}`
    case 'arena_token':   return `+${item.reward_amount} ⚔️ Arena Sigil${item.reward_amount > 1 ? 's' : ''}`
    case 'pass_silver':   return `🥈 Silver Pass · ${item.reward_amount} days`
    case 'pass_gold':     return `🥇 Gold Pass · ${item.reward_amount} days`
    case 'echo_pass':     return `📜 Echo Pass · ${item.reward_amount} days`
    case 'first_purchase_bonus': return '🎁 First Purchase Bonus unlocked'
    case 'bundle': {
      const e = item.reward_extra ?? {}
      const parts: string[] = []
      if (e.rc)      parts.push(`+${e.rc} 💎`)
      if (e.gold)    parts.push(`+${e.gold} 🪙`)
      if (e.scrolls) parts.push(`+${e.scrolls} 🪬`)
      return parts.join('  ·  ') || 'Mystery cache'
    }
    default: return `${item.reward_amount}`
  }
}

function translateError(key: string, res: any): string {
  switch (key) {
    case 'INSUFFICIENT_RC':   return `Not enough Rift Crystals. Need ${res.required}, have ${res.available}.`
    case 'INSUFFICIENT_GOLD': return `Not enough Gold. Need ${res.required}, have ${res.available}.`
    case 'DAILY_LIMIT_REACHED': return `Daily limit reached (${res.limit}/day). Try again tomorrow.`
    case 'ALREADY_PURCHASED': return 'You\'ve already claimed this one-time offer.'
    case 'LEVEL_TOO_LOW':     return `Requires level ${res.required_level}.`
    case 'IAP_NOT_AVAILABLE': return res.message ?? 'Real-money purchases coming soon.'
    case 'DUPLICATE_REQUEST': return 'Transaction already in progress.'
    case 'ITEM_NOT_FOUND':    return 'This item is no longer available.'
    case 'UNAUTHORIZED':      return 'Authentication failed. Please log in again.'
    default: return res.message ?? `Error: ${key}`
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  loadingContainer: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 30 },
  loadingText:      { color: COLORS.cyan, letterSpacing: 3, fontSize: 11, fontWeight: '700' },
  errorIcon:        { fontSize: 48 },
  errorTitle:       { fontSize: 14, fontWeight: '900', color: COLORS.error, letterSpacing: 3 },
  errorMsg:         { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18, paddingHorizontal: 20, marginBottom: 8 },
  retryBtn:         { paddingHorizontal: 28, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 },
  retryText:        { fontSize: 12, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 2 },

  // ─── HEADER ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backBtn:      { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 1, width: 60 },
  headerCenter: { alignItems: 'center' },
  headerTitle:  { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 4 },
  headerSub:    { fontSize: 9, color: COLORS.textMuted, letterSpacing: 2, marginTop: 2 },
  balanceCol:   { gap: 2, alignItems: 'flex-end', minWidth: 80 },
  balanceRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceIcon:  { fontSize: 12 },
  balanceText:  { fontSize: 12, fontWeight: '800' },

  scrollContent: { paddingHorizontal: 16 },

  // ─── HERO ──────────────────────────────────────────────────────────────────
  heroCard: {
    borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14,
    backgroundColor: COLORS.bgCard, position: 'relative', overflow: 'hidden',
  },
  heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroBadge: {
    alignSelf: 'flex-start', backgroundColor: COLORS.gold,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginBottom: 8,
  },
  heroBadgeText: { fontSize: 9, fontWeight: '900', color: COLORS.bg, letterSpacing: 2 },
  heroContent:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIcon:      { fontSize: 48 },
  heroName:      { fontSize: 18, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  heroDesc:      { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16, marginBottom: 8 },
  heroPriceRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroOriginalPrice: { fontSize: 11, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  heroPrice:     { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  heroDiscount:  { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  heroDiscountText: { fontSize: 10, fontWeight: '900', color: '#fff' },

  // ─── TABS ──────────────────────────────────────────────────────────────────
  tabRow:        { flexDirection: 'row', gap: 6, paddingVertical: 4, marginBottom: 12 },
  tab: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgCard,
  },
  tabActive:     { borderColor: COLORS.cyan, backgroundColor: COLORS.cyan + '15' },
  tabText:       { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1 },
  tabTextActive: { color: COLORS.cyan },

  // ─── ITEM CARD ─────────────────────────────────────────────────────────────
  itemsList:     { gap: 10 },
  itemCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 10,
    borderWidth: 1, padding: 12, position: 'relative', overflow: 'hidden',
  },
  itemCardDimmed:    { opacity: 0.55 },
  itemBadge: {
    position: 'absolute', top: 0, right: 0,
    paddingHorizontal: 8, paddingVertical: 3,
    borderBottomLeftRadius: 6,
  },
  itemBadgeText: { fontSize: 8, fontWeight: '900', color: COLORS.bg, letterSpacing: 1 },
  itemTop:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  itemIconWrap: {
    width: 48, height: 48, borderRadius: 8, borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  itemIcon:       { fontSize: 26 },
  itemName:       { fontSize: 13, fontWeight: '900', letterSpacing: 0.5, marginBottom: 3 },
  itemDesc:       { fontSize: 10, color: COLORS.textMuted, lineHeight: 14 },
  itemBottom:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemPriceCol:   { gap: 2 },
  itemOriginalPrice: { fontSize: 10, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  itemPriceRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemPriceIcon:  { fontSize: 13 },
  itemPrice:      { fontSize: 15, fontWeight: '900' },
  itemBuyBtn:     { paddingHorizontal: 16, paddingVertical: 7, borderWidth: 1, borderRadius: 6 },
  itemBuyText:    { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  itemStatusBadge:{ paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderRadius: 6, borderColor: COLORS.border },
  itemStatusText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1 },

  limitRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  limitBarBg:     { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  limitBarFill:   { height: '100%', borderRadius: 2 },
  limitText:      { fontSize: 9, color: COLORS.textMuted, letterSpacing: 0.5 },

  emptyText:      { color: COLORS.textMuted, textAlign: 'center', fontSize: 12, padding: 30 },

  // ─── BUY MODAL ─────────────────────────────────────────────────────────────
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalBox: {
    width: '100%', maxWidth: 360,
    backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1.5,
    padding: 20, position: 'relative', overflow: 'hidden',
  },
  modalCornerGlow: {
    position: 'absolute', top: -40, right: -40,
    width: 120, height: 120, borderRadius: 60, opacity: 0.15,
  },
  modalIconWrap: {
    width: 76, height: 76, borderRadius: 12, borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10,
  },
  modalIcon:        { fontSize: 42 },
  modalName:        { fontSize: 17, fontWeight: '900', letterSpacing: 1, textAlign: 'center', marginBottom: 4 },
  modalTier:        { fontSize: 9, color: COLORS.textMuted, letterSpacing: 3, textAlign: 'center', marginBottom: 12 },
  modalLoreBox:     { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: 10, marginBottom: 12 },
  modalLoreSpeaker: { fontSize: 8, color: COLORS.cyan, letterSpacing: 2, marginBottom: 4, fontWeight: '700' },
  modalLore:        { fontSize: 11, color: COLORS.textSecondary, fontStyle: 'italic', lineHeight: 16 },

  modalRewardBox:   { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginBottom: 12, alignItems: 'center' },
  modalRewardLabel: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 2, marginBottom: 4 },
  modalReward:      { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },

  modalPriceBox:    { gap: 6, marginBottom: 16 },
  modalPriceRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalPriceLabel:  { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1 },
  modalPriceVal:    { fontSize: 14, fontWeight: '900' },

  modalBtnRow:      { flexDirection: 'row', gap: 10 },
  modalCancelBtn:   { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, alignItems: 'center' },
  modalCancelText:  { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1 },
  modalBuyBtn:      { flex: 1, paddingVertical: 12, borderWidth: 1.5, borderRadius: 8, alignItems: 'center' },
  modalBuyBtnDisabled: { opacity: 0.5 },
  modalBuyText:     { fontSize: 13, fontWeight: '900', letterSpacing: 1 },

  modalCenter:      { alignItems: 'center', paddingVertical: 24, gap: 10 },
  modalLoadingText: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2, marginTop: 6 },
  modalSparkle:     { fontSize: 56, marginBottom: 4 },
  modalSuccessTitle:{ fontSize: 18, fontWeight: '900', letterSpacing: 3, marginBottom: 4 },
  modalSuccessReward:{ fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  modalSuccessQuote:{ fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', textAlign: 'center', marginBottom: 12 },
  modalErrorIcon:   { fontSize: 38 },
  modalErrorTitle:  { fontSize: 14, fontWeight: '900', color: COLORS.error, letterSpacing: 2 },
  modalErrorText:   { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 17, marginBottom: 8 },
  modalDoneBtn:     { paddingHorizontal: 32, paddingVertical: 11, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, marginTop: 4 },
  modalDoneText:    { fontSize: 12, fontWeight: '900', letterSpacing: 2, color: COLORS.textPrimary },
})