// =============================================
// ECHO RIFT — INVENTORY SCREEN
// Tabs: Items | Materials
// Enhancement inline (item modal)
// =============================================

import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Dimensions, Modal, ScrollView, Image,
  Animated, Easing,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import { useGame } from '../hooks/useGame'
import { COLORS, RARITY_COLORS, CLASS_INFO } from '../constants'
import { getItemImage } from '../constants/itemImages'
import { Rarity, ClassType } from '../types'
import { ThemedAlert } from '../components/ThemedAlert'
import { TierBadge } from '../components/TierBadge'
import { RarityAura } from '../components/RarityAura'

const { width, height } = Dimensions.get('window')
const GRID_PAD  = 12
const GRID_GAP  = 3
const ITEM_SIZE = (width - GRID_PAD * 2 - GRID_GAP * 4) / 5
// ✅ EQUIP SLOT: ekran genişliğine göre tam oranlı kare
// Formül: charFrame (kare) yüksekliği = 3 slot + 2×6 gap. Toplam genişlik = 24 pad + 16 gap + 2 slotW + charFrameW
// Eşitlik: charFrame.W = 3×slotW + 12, ve charFrame.W = width - 40 - 2×slotW → slotW = (width - 52) / 5
const SLOT_SIZE = Math.floor((width - 52) / 5)

const RARITIES: Rarity[] = ['Common','Uncommon','Rare','Epic','Legendary','Dimensional']
const RARITY_ORDER: Record<Rarity, number> = {
  Common:1, Uncommon:2, Rare:3, Epic:4, Legendary:5, Dimensional:6,
}
const ENH_CAP: Record<string, number> = {
  Common:3, Uncommon:5, Rare:8, Epic:12, Legendary:15, Dimensional:15,
}
const ENH_COSTS = [
  { gold:500,   scrap:5   },{ gold:700,   scrap:8   },{ gold:1000,  scrap:12  },
  { gold:1500,  scrap:18  },{ gold:2000,  scrap:25  },{ gold:3000,  scrap:40  },
  { gold:4500,  scrap:60  },{ gold:6000,  scrap:80  },{ gold:8000,  scrap:100 },
  { gold:10000, scrap:130 },{ gold:15000, scrap:200 },{ gold:20000, scrap:280 },
  { gold:28000, scrap:380 },{ gold:38000, scrap:500 },{ gold:50000, scrap:650 },
]
const enhStatPct = (lv: number) =>
  lv <= 0 ? 0 : lv <= 5 ? lv * 5 : lv <= 10 ? 25 + (lv - 5) * 7 : 60 + (lv - 10) * 8

const SLOT_ICONS: Record<string, string> = {
  sword:'🗡️', helmet:'🪖', chest:'🛡️', gloves:'🧤', crystal:'💎', necklace:'📿',
}
const SLOT_LABELS: Record<string, string> = {
  sword:'SWORD', helmet:'HELMET', chest:'CHEST',
  gloves:'GLOVES', crystal:'CRYSTAL', necklace:'NECKLACE',
}
const PERCENT_AFFIXES = ['HP_PERCENT','CRIT_CHANCE','CRIT_DAMAGE','PIERCE','ATTACK_SPEED','DAMAGE_REDUCTION','CRIT_RESIST']
const AFFIX_NAMES: Record<string, string> = {
  STR:'STR', DEX:'DEX', VIT:'VIT', DEF:'DEF',
  HP_FLAT:'HP+', HP_PERCENT:'HP%', CRIT_CHANCE:'CRIT',
  CRIT_DAMAGE:'CDMG', PIERCE:'PIERCE', ATTACK_SPEED:'ASPD',
  CRIT_RESIST:'CRES', DAMAGE_REDUCTION:'DMGR', ALL_STATS:'ALL',
}
const CLASS_AVATARS: Record<string, any> = {
  vanguard: require('../../assets/images/vanguard.png'),
  riftmage: require('../../assets/images/riftmage.png'),
  phantom:  require('../../assets/images/phantom.png'),
}
const SWORD_IMAGES: Record<string, any> = {
  Common:      require('../../assets/swords/sword_common.png'),
  Uncommon:    require('../../assets/swords/sword_uncommon.png'),
  Rare:        require('../../assets/swords/sword_rare.png'),
  Epic:        require('../../assets/swords/sword_epic.png'),
  Legendary:   require('../../assets/swords/sword_legendary.png'),
  Dimensional: require('../../assets/swords/sword_dimensional.png'),
}
const SWORD_IMAGES_BG: Record<string, any> = {
  Common:      require('../../assets/swords/sword_common_bg.png'),
  Uncommon:    require('../../assets/swords/sword_uncommon_bg.png'),
  Rare:        require('../../assets/swords/sword_rare_bg.png'),
  Epic:        require('../../assets/swords/sword_epic_bg.png'),
  Legendary:   require('../../assets/swords/sword_legendary_bg.png'),
  Dimensional: require('../../assets/swords/sword_dimensional_bg.png'),
}
const RARITY_BG: Record<string, string> = {
  Common:      'rgba(160,160,160,0.10)',
  Uncommon:    'rgba(30,200,30,0.10)',
  Rare:        'rgba(50,130,255,0.12)',
  Epic:        'rgba(160,60,255,0.12)',
  Legendary:   'rgba(255,140,0,0.12)',
  Dimensional: 'rgba(255,60,220,0.14)',
}

// ─── EQUIPMENT SLOT ──────────────────────────────────────────────────────────
function EquipSlot({ slotType, item, onPress, classType }: {
  slotType: string; item: any | null; onPress: () => void; classType?: string
}) {
  const rc        = item ? RARITY_COLORS[item.rarity as Rarity] : 'rgba(255,255,255,0.08)'
  const pulseAnim = useRef(new Animated.Value(0.4)).current
  useEffect(() => {
    if (!item) return
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1,   duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0.4, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [item?.id])

  const slotInner = (
    <View style={[styles.slot, { borderColor: rc, backgroundColor: item ? RARITY_BG[item.rarity] || 'transparent' : 'rgba(255,255,255,0.03)' }]}>
      {item ? (
        <>
          {/* Görsel — tam slot'u doldurur */}
          {(() => {
            if (item.item_type === 'sword' && SWORD_IMAGES_BG[item.rarity]) {
              return <Image source={SWORD_IMAGES_BG[item.rarity]} style={styles.slotSwordImg} resizeMode="contain" />
            }
            const classImg = getItemImage(classType, item.item_type)
            if (classImg) {
              return <Image source={classImg} style={styles.slotItemImg} resizeMode="cover" />
            }
            return <Text style={styles.slotIcon}>{SLOT_ICONS[slotType]}</Text>
          })()}
          {/* Badge'ler — absolute, görsel üstünde */}
          {item.enhancement_level > 0 && (
            <View style={styles.slotEnhBadge}>
              <Text style={styles.slotEnhText}>+{item.enhancement_level}</Text>
            </View>
          )}
          <Text style={[styles.slotCornerLabel, { color: rc }]}>
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
  )

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.slotWrap}>
      {item ? (
        <RarityAura rarity={item.rarity as Rarity} size={84} borderRadius={6}>
          {slotInner}
        </RarityAura>
      ) : slotInner}
    </TouchableOpacity>
  )
}

// ─── STAT CHIP ────────────────────────────────────────────────────────────────
function StatChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statChipVal, { color }]}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
      <Text style={styles.statChipLabel}>{label}</Text>
    </View>
  )
}

// ─── COMPARE ROW ──────────────────────────────────────────────────────────────
function CompareRow({ label, oldVal, newVal, isPercent, newColor }: {
  label: string; oldVal: number; newVal: number; isPercent: boolean; newColor: string
}) {
  const diff = newVal - oldVal
  const fmt  = (v: number) => v === 0 ? '—' : isPercent ? `${v}%` : `+${v}`
  return (
    <View style={styles.cStatRow}>
      <Text style={styles.cStatLabel}>{label}</Text>
      <Text style={styles.cStatOld}>{fmt(oldVal)}</Text>
      <Text style={[styles.cStatNew, { color: newColor }]}>{fmt(newVal)}</Text>
      <View style={styles.cStatDiffWrap}>
        {diff !== 0 ? (
          <View style={[styles.cStatDiffBadge, {
            backgroundColor: diff > 0 ? '#00FF8818' : '#FF444418',
            borderColor: diff > 0 ? '#00FF8860' : '#FF444460',
          }]}>
            <Text style={[styles.cStatDiffText, { color: diff > 0 ? '#00FF88' : '#FF4444' }]}>
              {diff > 0 ? '▲' : '▼'} {isPercent ? `${Math.abs(diff)}%` : Math.abs(diff)}
            </Text>
          </View>
        ) : <Text style={styles.cStatSame}>—</Text>}
      </View>
    </View>
  )
}

// ─── MATERIAL CARD ────────────────────────────────────────────────────────────
function MaterialCard({ icon, label, value, color }: {
  icon: string; label: string; value: number | string; color: string
}) {
  return (
    <View style={[styles.matCard, { borderColor: color + '40' }]}>
      <Text style={styles.matIcon}>{icon}</Text>
      <Text style={[styles.matValue, { color }]}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
      <Text style={styles.matLabel}>{label}</Text>
    </View>
  )
}

// ─── FLOATING TOAST ───────────────────────────────────────────────────────────
function FloatingToast({ msg, color, onDone }: {
  msg: string; color: string; onDone: () => void
}) {
  const translateY = useRef(new Animated.Value(0)).current
  const opacity    = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -72, duration: 900, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start(onDone)
  }, [])

  return (
    <Animated.View style={[styles.floatToast, { transform: [{ translateY }], opacity }]}
      pointerEvents="none">
      <Text style={[styles.floatToastText, { color }]}>{msg}</Text>
    </Animated.View>
  )
}

// ─── ANA EKRAN ────────────────────────────────────────────────────────────────
export default function InventoryScreen() {
  const { playerState } = useGameStore()
  const { fetchPlayerState, equipItem, unequipItem, autoEquip, dismantleItems, getInventory } = useGame()

  const [userId,           setUserId]           = useState<string | null>(null)
  const [items,            setItems]            = useState<any[]>([])
  const [materials,        setMaterials]        = useState<any>(null)
  const [activeTab,        setActiveTab]        = useState<'items' | 'materials'>('items')
  const [sortBy,           setSortBy]           = useState<'power' | 'rarity'>('power')
  const [selectedItem,     setSelectedItem]     = useState<any | null>(null)
  const [showDismantle,    setShowDismantle]    = useState(false)
  const [selectedRarities, setSelectedRarities] = useState<Rarity[]>(['Common','Uncommon','Rare'])
  const [loading,          setLoading]          = useState(false)
  const [enhLoading,       setEnhLoading]       = useState(false)
  const [floatMsg,         setFloatMsg]         = useState<{ msg: string; color: string } | null>(null)

  useFocusEffect(useCallback(() => { loadData() }, []))

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    await fetchPlayerState(user.id)

    // Items — enhancement_level dahil
    const { data: invData } = await supabase
      .from('items')
      .select(`id, item_type, rarity, level, tier, base_attack, power_score,
               is_equipped, is_locked, source, enhancement_level,
               item_affixes (affix_type, value)`)
      .eq('player_id', user.id)
      .eq('is_pending', false)
      .order('power_score', { ascending: false })
    if (invData) setItems(invData)

    // Materials
    const [{ data: matData }, { data: playerData }] = await Promise.all([
      supabase.from('player_materials').select('*').eq('player_id', user.id).single(),
      supabase.from('players').select('scrap_metal, gold, rc_balance').eq('id', user.id).single(),
    ])
    setMaterials({ ...(matData || {}), ...(playerData || {}) })
  }

  const handleEquip = async (item: any) => {
    if (!userId) return
    setLoading(true)
    const result = await equipItem(userId, item.id)
    if (result?.success) { await loadData(); setSelectedItem(null) }
    else ThemedAlert.alert('Error', 'Failed to equip')
    setLoading(false)
  }

  const handleUnequip = async (item: any) => {
    if (!userId) return
    setLoading(true)
    const result = await unequipItem(userId, item.id)
    if (result?.success) { await loadData(); setSelectedItem(null) }
    else ThemedAlert.alert('Error', 'Failed to unequip')
    setLoading(false)
  }

  const handleAutoEquip = async () => {
    if (!userId) return
    setLoading(true)
    await autoEquip(userId)
    await loadData()
    setLoading(false)
    ThemedAlert.alert('Done', 'Best items equipped!')
  }

  const handleToggleLock = async (item: any) => {
    if (!userId) return
    const { data } = await supabase.rpc('toggle_item_lock', { p_player_id: userId, p_item_id: item.id })
    if (data?.success) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_locked: data.is_locked } : i))
      if (selectedItem?.id === item.id) setSelectedItem((prev: any) => ({ ...prev, is_locked: data.is_locked }))
    }
  }

  // ✅ Enhancement
  const handleEnhance = async (item: any) => {
    if (!userId || enhLoading) return
    const cap       = ENH_CAP[item.rarity] || 0
    const nextLevel = item.enhancement_level + 1
    if (nextLevel > cap) return

    const cost = ENH_COSTS[nextLevel - 1]
    const gold  = materials?.gold || 0
    const scrap = materials?.scrap_metal || 0

    if (gold < cost.gold) {
      ThemedAlert.alert('Insufficient Gold', `Need ${cost.gold.toLocaleString()} gold, you have ${gold.toLocaleString()}.`)
      return
    }
    if (scrap < cost.scrap) {
      ThemedAlert.alert('Insufficient Scrap', `Need ${cost.scrap} scrap, you have ${scrap}.`)
      return
    }

    setEnhLoading(true)
    const { data } = await supabase.rpc('enhance_item', { p_player_id: userId, p_item_id: item.id })
    setEnhLoading(false)

    if (data?.success) {
      const updated = { ...item, enhancement_level: data.enhancement_level }
      setSelectedItem(updated)
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      setMaterials((prev: any) => ({
        ...prev,
        gold:        (prev?.gold || 0) - data.gold_cost,
        scrap_metal: (prev?.scrap_metal || 0) - data.scrap_cost,
      }))
      const rc2 = RARITY_COLORS[item.rarity as Rarity]
      if (data.enhanced) {
        setFloatMsg({ msg: `+${data.enhancement_level}  SUCCESS!`, color: rc2 })
      } else {
        setFloatMsg({ msg: `+${item.enhancement_level + 1}  FAILED`, color: '#FF4444' })
      }
      await fetchPlayerState(userId)
    } else {
      setFloatMsg({ msg: 'ERROR', color: '#FF4444' })
    }
  }

  const toggleRarity = (r: Rarity) =>
    setSelectedRarities(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])

  const handleDismantleSingle = async (item: any) => {
    if (!userId || item.is_locked || item.is_equipped) return
    const scrapMap: Record<string, number> = { Common: 1, Uncommon: 3, Rare: 8, Epic: 20, Legendary: 50, Dimensional: 150 }
    const scrap = scrapMap[item.rarity] || 1
    ThemedAlert.alert(
      'Dismantle Item',
      `Dismantle this ${item.rarity} ${item.item_type}?\n+${scrap} Scrap`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismantle',
          style: 'destructive',
          onPress: async () => {
            setLoading(true)
            try {
              const result = await dismantleItems([item.id], item.rarity)
              if (result?.success) {
                setSelectedItem(null)
                await loadData()
                setTimeout(() => {
                  ThemedAlert.alert('Done!', `+${result.scrap_earned || scrap} Scrap`)
                }, 100)
              }
            } finally {
              setLoading(false)
            }
          }
        }
      ]
    )
  }

  const handleDismantle = async () => {
    try {
      if (!userId || !selectedRarities.length) return
      const toD = items.filter((i) => !i.is_equipped && !i.is_locked && selectedRarities.includes(i.rarity))

      // ✅ FIX: Items boş ise modal'ı kapat, sonra alert
      if (!toD.length) {
        setShowDismantle(false)
        setTimeout(() => {
          ThemedAlert.alert('Nothing to dismantle', 'No unequipped items match.')
        }, 250)
        return
      }

      const scrap = toD.reduce((a, i) => {
        const s: Record<string, number> = { Common: 1, Uncommon: 3, Rare: 8, Epic: 20, Legendary: 50, Dimensional: 150 }
        return a + (s[i.rarity] || 0)
      }, 0)
      const enhItems = toD.filter((i) => i.enhancement_level > 0)
      const enhMsg = enhItems.length > 0 ? `\n\n${enhItems.length} enhanced item — 70% material refund.` : ''

      // ✅ FIX: Confirm alert açmadan önce modal'ı kapat
      setShowDismantle(false)
      setTimeout(() => {
        ThemedAlert.alert(
          'Dismantle Items',
          `${toD.length} items  ~${scrap} Scrap${enhMsg}`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Dismantle',
              style: 'destructive',
              onPress: async () => {
                try {
                  setLoading(true)
                  const ids = toD.map((i) => i.id)
                  const maxR = selectedRarities.reduce(
                    (m, r) => (RARITY_ORDER[r] > RARITY_ORDER[m] ? r : m),
                    selectedRarities[0]
                  )
                  const result = await dismantleItems(ids, maxR)
                  await loadData()
                  if (result?.success) {
                    const goldMsg = result.gold_returned > 0
                      ? `\n+${Number(result.gold_returned).toLocaleString()} Gold (enhancement refund)`
                      : ''
                    setTimeout(() => {
                      ThemedAlert.alert(
                        'Done!',
                        `${result.dismantled_count} items dismantled\n+${result.scrap_earned} Scrap${goldMsg}`
                      )
                    }, 100)
                  }
                } catch (err) {
                  console.warn('[handleDismantle] inner error:', err)
                } finally {
                  setLoading(false)
                }
              },
            },
          ]
        )
      }, 250)
    } catch (err) {
      console.warn('[handleDismantle] outer error:', err)
    }
  }

  // ─── Derived ─────────────────────────────────────────────────────────────
  const equippedMap: Record<string, any> = {}
  items.filter(i => i.is_equipped).forEach(i => { equippedMap[i.item_type] = i })

  const dismantleableCount = items.filter(
    (i) => !i.is_equipped && !i.is_locked && selectedRarities.includes(i.rarity)
  ).length

  const bagItems = [...items.filter(i => !i.is_equipped)].sort((a, b) =>
    sortBy === 'power'
      ? b.power_score - a.power_score
      : (RARITY_ORDER[b.rarity as Rarity] || 0) - (RARITY_ORDER[a.rarity as Rarity] || 0)
  )

  const equippedSameSlot = selectedItem
    ? items.find(i => i.is_equipped && i.item_type === selectedItem.item_type && i.id !== selectedItem.id)
    : null

  const getAffix = (item: any, t: string) => item?.item_affixes?.find((a: any) => a.affix_type === t)?.value || 0
  const allAffixTypes = selectedItem ? Array.from(new Set([
    ...(selectedItem.item_affixes || []).map((a: any) => a.affix_type),
    ...(equippedSameSlot?.item_affixes || []).map((a: any) => a.affix_type),
  ])) : []
  const fmtAffix = (t: string, v: number) =>
    v === 0 ? '-' : PERCENT_AFFIXES.includes(t) ? `${v}%` : `+${v}`

  const player    = playerState?.player
  const stats     = playerState?.stats
  const classType = player?.class_type as ClassType | undefined
  const classInfo = classType ? CLASS_INFO[classType] : null
  const avatar    = classType ? CLASS_AVATARS[classType] : null
  const totalPwr  = Object.values(equippedMap).reduce((s: number, i: any) => s + (i.power_score || 0), 0)

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.headerTitle}>INVENTORY</Text>
            <TierBadge tier={player?.prestige_tier} size="sm" />
          </View>
          <Text style={styles.headerSub}>{player?.inventory_count || 0}/200 items</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.pwrLabel}>EQUIPPED PWR</Text>
          <Text style={styles.pwrValue}>⚡ {totalPwr.toLocaleString()}</Text>
        </View>
      </View>

      {/* EQUIPMENT */}
      <View style={styles.equipSection}>
        <View style={styles.nameRow}>
          <Text style={styles.charName}>{player?.username || '-'}</Text>
          {!!(classInfo) && (
            <Text style={[styles.charClass, { color: classInfo.color }]}>
              {classInfo.icon} {String(classInfo.name).toUpperCase()}  •  LV {player?.level}
            </Text>
          )}
        </View>
        <View style={styles.equipMain}>
          <View style={styles.slotCol}>
            <EquipSlot slotType="sword"    item={equippedMap['sword']    || null} onPress={() => equippedMap['sword']    && setSelectedItem(equippedMap['sword'])}    classType={classType} />
            <EquipSlot slotType="necklace" item={equippedMap['necklace'] || null} onPress={() => equippedMap['necklace'] && setSelectedItem(equippedMap['necklace'])} classType={classType} />
            <EquipSlot slotType="crystal"  item={equippedMap['crystal']  || null} onPress={() => equippedMap['crystal']  && setSelectedItem(equippedMap['crystal'])}  classType={classType} />
          </View>
          <View style={[styles.charFrame, { borderColor: classInfo?.color || '#00D4FF' }]}>
            {avatar
              ? <Image source={avatar} style={styles.charImg} resizeMode="cover" />
              : <Text style={styles.charEmoji}>{classInfo?.icon || '⚔️'}</Text>
            }
          </View>
          <View style={styles.slotCol}>
            <EquipSlot slotType="helmet" item={equippedMap['helmet'] || null} onPress={() => equippedMap['helmet'] && setSelectedItem(equippedMap['helmet'])} classType={classType} />
            <EquipSlot slotType="chest"  item={equippedMap['chest']  || null} onPress={() => equippedMap['chest']  && setSelectedItem(equippedMap['chest'])}  classType={classType} />
            <EquipSlot slotType="gloves" item={equippedMap['gloves'] || null} onPress={() => equippedMap['gloves'] && setSelectedItem(equippedMap['gloves'])} classType={classType} />
          </View>
        </View>
      </View>

      {/* STAT STRIP */}
      <View style={styles.statStrip}>
        <StatChip label="ATK"  value={stats?.total_atk || 0}                     color="#EF4444" />
        <View style={styles.stripDiv} />
        <StatChip label="HP"   value={stats?.total_hp  || 0}                     color="#00FF88" />
        <View style={styles.stripDiv} />
        <StatChip label="DEF"  value={stats?.total_def  || 0}                    color="#3B82F6" />
        <View style={styles.stripDiv} />
        <StatChip label="DEX"  value={stats?.total_dex  || 0}                    color="#FFD700" />
        <View style={styles.stripDiv} />
        <StatChip label="CRIT" value={`${(stats?.total_crit || 0).toFixed(0)}%`} color="#A855F7" />
      </View>

      {/* TOOLBAR */}
      <View style={styles.toolbar}>
        <View style={styles.sortRow}>
          <TouchableOpacity style={[styles.sortBtn, sortBy === 'power'  && styles.sortBtnOn]} onPress={() => setSortBy('power')}>
            <Text style={[styles.sortTxt, sortBy === 'power'  && { color: '#00FF88' }]}>PWR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sortBtn, sortBy === 'rarity' && styles.sortBtnOn]} onPress={() => setSortBy('rarity')}>
            <Text style={[styles.sortTxt, sortBy === 'rarity' && { color: '#00FF88' }]}>RAR</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleAutoEquip} disabled={loading}>
            <Text style={styles.actionBtnTxt}>AUTO</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: '#FF4444' }]} onPress={() => setShowDismantle(true)}>
            <Text style={[styles.actionBtnTxt, { color: '#FF4444' }]}>DISMANTLE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ✅ TAB BAR */}
      <View style={styles.tabBar}>
        {(['items', 'materials'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabTxt, activeTab === tab && styles.tabTxtActive]}>
              {tab === 'items' ? `ITEMS  ${bagItems.length}` : 'MATERIALS'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ✅ ITEMS TAB */}
      {activeTab === 'items' && (
        <FlatList
          data={bagItems}
          keyExtractor={i => i.id}
          numColumns={5}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          // Performance: only mount nearby cells, drop the rest
          windowSize={5}
          maxToRenderPerBatch={10}
          initialNumToRender={20}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Bag is empty</Text>
              <Text style={styles.emptyHint}>Complete quests and dungeon to get items</Text>
            </View>
          }
          renderItem={({ item }) => {
            const rc = RARITY_COLORS[item.rarity as Rarity]
            const bg = RARITY_BG[item.rarity] || 'rgba(255,255,255,0.04)'
            return (
              <TouchableOpacity
                onPress={() => setSelectedItem(item)}
                onLongPress={() => handleToggleLock(item)}
                activeOpacity={0.75}
              >
                <RarityAura rarity={item.rarity as Rarity} size={88} borderRadius={6} reduced>
                  <View style={[styles.itemCard, { borderColor: rc + '70', backgroundColor: bg }]}>
                    {!!(item.is_locked) && <Text style={styles.itemLock}>🔒</Text>}
                    {item.enhancement_level > 0 && (
                      <View style={[styles.itemEnhBadge, { backgroundColor: rc + '33', borderColor: rc + '80' }]}>
                        <Text style={[styles.itemEnhText, { color: rc }]}>+{item.enhancement_level}</Text>
                      </View>
                    )}
                    {(() => {
                      if (item.item_type === 'sword' && SWORD_IMAGES_BG[item.rarity]) {
                        return <Image source={SWORD_IMAGES_BG[item.rarity]} style={styles.itemSwordImg} resizeMode="cover" />
                      }
                      const classImg = getItemImage(classType, item.item_type)
                      if (classImg) {
                        return <Image source={classImg} style={styles.itemClassImg} resizeMode="cover" />
                      }
                      return <Text style={styles.itemIcon}>{SLOT_ICONS[item.item_type] || '?'}</Text>
                    })()}
                    <Text style={[styles.itemCornerLabel, { color: rc }]}>
                      {item.tier > 0 ? `T${item.tier} · ` : ''}L{item.level}
                    </Text>
                  </View>
                </RarityAura>
              </TouchableOpacity>
            )
          }}
        />
      )}

      {/* ✅ MATERIALS TAB */}
      {activeTab === 'materials' && (
        <ScrollView contentContainerStyle={styles.matContainer} showsVerticalScrollIndicator={false}>

          <Text style={styles.matSection}>ENHANCEMENT</Text>
          <View style={styles.matGrid}>
            <MaterialCard icon="🪙" label="GOLD"  value={materials?.gold || 0}        color="#FFD700" />
            <MaterialCard icon="🔩" label="SCRAP" value={materials?.scrap_metal || 0} color="#B0BEC5" />
          </View>

          <Text style={styles.matSection}>QUEST DROPS</Text>
          <View style={styles.matGrid}>
            <MaterialCard icon="🔧" label="SALVAGE" value={materials?.salvage_parts || 0} color="#78909C" />
            <MaterialCard icon="🔮" label="QUANTUM" value={materials?.quantum_core  || 0} color="#7E57C2" />
            <MaterialCard icon="💠" label="RIFT"    value={materials?.rift_crystal  || 0} color="#00BCD4" />
            {materials?.dimensional_shard > 0 && (
              <MaterialCard icon="✨" label="DIM SHARD" value={materials.dimensional_shard} color="#E040FB" />
            )}
            {materials?.ascend_shard > 0 && (
              <MaterialCard icon="🌟" label="ASCEND" value={materials.ascend_shard} color="#FFB300" />
            )}
          </View>

          <Text style={styles.matSection}>BUFFS</Text>
          <View style={styles.matComingSoon}>
            <Text style={styles.matComingSoonIcon}>⚗️</Text>
            <Text style={styles.matComingSoonText}>Coming soon</Text>
            <Text style={styles.matComingSoonHint}>Temporary boosts — e.g. +10% ATK for 10 min</Text>
          </View>

        </ScrollView>
      )}

      {/* ─── ITEM DETAIL MODAL — HORIZONTAL LAYOUT ────────────────────────── */}
      <Modal visible={!!selectedItem} transparent animationType="slide" onRequestClose={() => setSelectedItem(null)}>
        <View style={styles.overlay}>
          {!!(selectedItem) && (() => {
            const rc         = RARITY_COLORS[selectedItem.rarity as Rarity]
            const oldItem    = equippedSameSlot
            const isCompare  = !!oldItem && !selectedItem.is_equipped
            const pwrDiff    = isCompare ? selectedItem.power_score - (oldItem?.power_score || 0) : 0
            const isUpgrade  = pwrDiff > 0
            const cap        = ENH_CAP[selectedItem.rarity] || 0
            const nextLevel  = selectedItem.enhancement_level + 1
            const isMaxEnh   = selectedItem.enhancement_level >= cap
            const nextCost   = !isMaxEnh ? ENH_COSTS[nextLevel - 1] : null
            const canAfford  = nextCost
              ? (materials?.gold || 0) >= nextCost.gold && (materials?.scrap_metal || 0) >= nextCost.scrap
              : false

            const calcEnh = (val: number, lvl: number) => Math.floor(val * (1 + enhStatPct(lvl) / 100))

            const renderImg = (item: any, imgStyle: any, fallbackStyle: any) => {
              if (item.item_type === 'sword' && SWORD_IMAGES_BG[item.rarity]) {
                return <Image source={SWORD_IMAGES_BG[item.rarity]} style={imgStyle} resizeMode="cover" />
              }
              const ci = getItemImage(classType, item.item_type)
              if (ci) return <Image source={ci} style={imgStyle} resizeMode="cover" />
              return <Text style={fallbackStyle}>{SLOT_ICONS[item.item_type]}</Text>
            }

            // ─── HORIZONTAL ITEM CARD: sol görsel kare + sağ stat listesi ───
            const renderItemCard = (item: any, tag: 'EQUIPPED' | 'NEW' | null, color: string) => {
              const enhLvl = item.enhancement_level
              const itemCap = ENH_CAP[item.rarity] || 0
              const itemMaxEnh = enhLvl >= itemCap

              return (
                <View style={[styles.hCard, { borderColor: color + '80' }]}>
                  {/* Tag (EQUIPPED / NEW) */}
                  {!!(tag) && (
                    <View style={[styles.hCardTag, { backgroundColor: color + '20', borderColor: color + '60' }]}>
                      <Text style={[styles.hCardTagText, { color }]}>{tag}</Text>
                    </View>
                  )}

                  <View style={styles.hCardBody}>
                    {/* SOL: Kare görsel — RarityAura entegre */}
                    <RarityAura rarity={item.rarity as Rarity} size={92} borderRadius={6}>
                    <View style={[styles.hImgFrame, { borderColor: color + '60' }]}>
                      {renderImg(item, styles.hImg, styles.hFallback)}
                      <View style={styles.hEnhBadge}>
                        <Text style={[styles.hEnhText, { color: enhLvl > 0 ? '#FFD700' : 'rgba(255,255,255,0.5)' }]}>
                          +{enhLvl}
                        </Text>
                      </View>
                      {!!(item.is_locked) && (
                        <View style={styles.hLockBadge}>
                          <Text style={styles.hLockText}>🔒</Text>
                        </View>
                      )}
                      <Text style={[styles.hCornerLabel, { color }]}>
                        {item.tier > 0 ? `T${item.tier} · ` : ''}L{item.level}
                      </Text>
                    </View>
                    </RarityAura>

                    {/* SAĞ: Stat listesi */}
                    <View style={styles.hStats}>
                      {item.base_attack != null && (() => {
                        const cur = calcEnh(item.base_attack, enhLvl)
                        const max = calcEnh(item.base_attack, itemCap)
                        return (
                          <View style={styles.hStatRow}>
                            <Text style={styles.hStatLbl}>BASE ATK</Text>
                            <View style={styles.hStatValWrap}>
                              <Text style={[styles.hStatVal, { color }]}>+{cur}</Text>
                              {!itemMaxEnh && cur !== max && (
                                <Text style={styles.hStatPreview}>+{max} @+{itemCap}</Text>
                              )}
                            </View>
                          </View>
                        )
                      })()}
                      {(item.item_affixes || []).map((a: any, i: number) => {
                        const isPct = PERCENT_AFFIXES.includes(a.affix_type)
                        const cur = calcEnh(a.value, enhLvl)
                        const max = calcEnh(a.value, itemCap)
                        const fmt = (v: number) => isPct ? `${v}%` : `+${v}`
                        return (
                          <View key={i} style={styles.hStatRow}>
                            <Text style={styles.hStatLbl}>{AFFIX_NAMES[a.affix_type] || a.affix_type}</Text>
                            <View style={styles.hStatValWrap}>
                              <Text style={[styles.hStatVal, { color }]}>{fmt(cur)}</Text>
                              {!itemMaxEnh && cur !== max && (
                                <Text style={styles.hStatPreview}>{fmt(max)} @+{itemCap}</Text>
                              )}
                            </View>
                          </View>
                        )
                      })}
                      {/* Power */}
                      <View style={[styles.hStatRow, styles.hPwrRow]}>
                        <Text style={styles.hPwrLbl}>⚡ POWER</Text>
                        <Text style={[styles.hPwrVal, { color }]}>{item.power_score}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )
            }

            return (
              <View style={[styles.modalBox, { borderColor: rc + '80' }]}>
                {/* COMPACT HEADER */}
                <View style={styles.mHead2}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.mHeadName, { color: rc }]}>
                      {selectedItem.rarity.toUpperCase()}
                    </Text>
                    <Text style={styles.mHeadMeta}>
                      {selectedItem.item_type.toUpperCase()}  •  LV {selectedItem.level}
                    </Text>
                  </View>
                  {!!(isCompare) && pwrDiff !== 0 && (
                    <View style={[styles.diffPill, {
                      backgroundColor: isUpgrade ? '#00FF8820' : '#FF444420',
                      borderColor:     isUpgrade ? '#00FF88'   : '#FF4444',
                    }]}>
                      <Text style={[styles.diffPillText, { color: isUpgrade ? '#00FF88' : '#FF4444' }]}>
                        {isUpgrade ? '▲' : '▼'} {isUpgrade ? '+' : ''}{pwrDiff}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => setSelectedItem(null)} style={styles.mClose}>
                    <Text style={styles.mCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.65 }}>
                  {isCompare ? (
                    /* ━━━ COMPARE MODE — 2 horizontal kart üst üste ━━━ */
                    <View style={styles.cardsCol}>
                      {/* Üstte EQUIPPED (giyili olan) */}
                      {renderItemCard(oldItem, 'EQUIPPED', RARITY_COLORS[oldItem.rarity as Rarity])}
                      {/* Altta NEW (yeni) */}
                      {renderItemCard(selectedItem, 'NEW', rc)}
                    </View>
                  ) : (
                    /* ━━━ SINGLE MODE ━━━ */
                    <View style={styles.cardsCol}>
                      {!!(selectedItem.is_equipped) && (
                        <View style={[styles.equippedTag, { borderColor: rc + '60', backgroundColor: rc + '12' }]}>
                          <Text style={[styles.equippedTagTxt, { color: rc }]}>✓ CURRENTLY EQUIPPED</Text>
                        </View>
                      )}
                      {renderItemCard(selectedItem, null, rc)}
                    </View>
                  )}

                  {/* ENHANCEMENT — kompakt */}
                  <View style={[styles.enhSection, { borderColor: rc + '30' }]}>
                    <View style={styles.enhHeader}>
                      <Text style={styles.enhTitle}>ENHANCEMENT</Text>
                      <Text style={[styles.enhLevel, { color: isMaxEnh ? '#FFD700' : rc }]}>
                        +{selectedItem.enhancement_level} / +{cap}
                        {isMaxEnh && <Text style={styles.enhMax}> MAX</Text>}
                      </Text>
                    </View>

                    <View style={styles.enhBar}>
                      {Array.from({ length: cap }, (_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.enhBarSegment,
                            i < selectedItem.enhancement_level
                              ? { backgroundColor: rc, opacity: 0.9 }
                              : { backgroundColor: 'rgba(255,255,255,0.08)' },
                          ]}
                        />
                      ))}
                    </View>

                    <View style={styles.enhInfoRow}>
                      <Text style={styles.enhInfoLabel}>Stat bonus</Text>
                      <Text style={[styles.enhInfoVal, { color: rc }]}>
                        +{enhStatPct(selectedItem.enhancement_level)}%
                        {!isMaxEnh && <Text style={styles.enhInfoNext}> → +{enhStatPct(nextLevel)}%</Text>}
                      </Text>
                    </View>

                    {!isMaxEnh && nextCost && (
                      <View style={styles.enhCostRow}>
                        <Text style={[styles.enhCostItem, (materials?.gold || 0) < nextCost.gold && styles.enhCostLack]}>
                          🪙 {nextCost.gold.toLocaleString()}
                        </Text>
                        <Text style={[styles.enhCostItem, (materials?.scrap_metal || 0) < nextCost.scrap && styles.enhCostLack]}>
                          🔩 {nextCost.scrap}
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>

                {/* FLOATING TOAST */}
                {!!(floatMsg) && (
                  <View style={styles.floatToastWrap} pointerEvents="none">
                    <FloatingToast
                      msg={floatMsg.msg}
                      color={floatMsg.color}
                      onDone={() => setFloatMsg(null)}
                    />
                  </View>
                )}

                {/* BUTONLAR */}
                <View style={styles.mBtnRow}>
                  <TouchableOpacity
                    style={[styles.mLockBtn, selectedItem.is_locked && { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.1)' }]}
                    onPress={() => handleToggleLock(selectedItem)}
                  >
                    <Text style={styles.mLockBtnText}>{selectedItem.is_locked ? '🔒' : '🔓'}</Text>
                  </TouchableOpacity>

                  {!isMaxEnh && (
                    <TouchableOpacity
                      style={[styles.enhBtn, { borderColor: canAfford ? rc : 'rgba(255,255,255,0.15)', opacity: canAfford ? 1 : 0.5 }]}
                      onPress={() => handleEnhance(selectedItem)}
                      disabled={!canAfford || enhLoading}
                    >
                      <Text style={[styles.enhBtnText, { color: canAfford ? rc : 'rgba(255,255,255,0.3)' }]}>
                        {enhLoading ? '...' : `⬆ +${nextLevel}`}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {!selectedItem.is_equipped ? (
                    <TouchableOpacity
                      style={[styles.mEquipBtn, { backgroundColor: rc + '20', borderColor: rc, flex: 1 }]}
                      onPress={() => handleEquip(selectedItem)}
                      disabled={loading}
                    >
                      <Text style={[styles.mEquipBtnText, { color: rc }]}>
                        {loading ? '...' : '⚡ EQUIP'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[styles.mUnequipBtn, { flex: 1 }]} onPress={() => handleUnequip(selectedItem)} disabled={loading}>
                      <Text style={styles.mUnequipBtnText}>{loading ? '...' : 'UNEQUIP'}</Text>
                    </TouchableOpacity>
                  )}

                  {!selectedItem.is_locked && !selectedItem.is_equipped && selectedItem.enhancement_level === 0 && (
                    <TouchableOpacity
                      style={styles.mDismantleBtn}
                      onPress={() => handleDismantleSingle(selectedItem)}
                      disabled={loading}
                    >
                      <Text style={styles.mDismantleBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )
          })()}
        </View>
      </Modal>


      {/* DISMANTLE MODAL — MİNİMAL VERSION (debug için) */}
      <Modal visible={showDismantle} transparent animationType="fade" onRequestClose={() => setShowDismantle(false)}>
        <View style={styles.dismantleOverlay}>
          <View style={styles.dismantleBox}>
            <View style={styles.dismantleHeader}>
              <Text style={styles.dismantleTitle}>DISMANTLE</Text>
              <TouchableOpacity onPress={() => setShowDismantle(false)}>
                <Text style={styles.mCloseText}>X</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.dismantleHint}>Equipped and locked items are safe.</Text>

            <View style={styles.rarityGrid}>
              {RARITIES.map((r) => {
                const rc = RARITY_COLORS[r] || '#888'
                const sel = selectedRarities.includes(r)
                const cnt = items.filter((i) => !i.is_equipped && i.rarity === r).length
                return (
                  <TouchableOpacity
                    key={String(r)}
                    style={[styles.rarityChip, sel ? { borderColor: rc, backgroundColor: rc + '20' } : null]}
                    onPress={() => toggleRarity(r)}
                  >
                    <Text style={[styles.rarityChipTxt, { color: sel ? rc : 'rgba(255,255,255,0.35)' }]}>
                      {String(r).slice(0, 3).toUpperCase()}
                    </Text>
                    <Text style={[styles.rarityChipCnt, { color: sel ? rc : 'rgba(255,255,255,0.25)' }]}>
                      {String(cnt)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <View style={styles.dismantleSummary}>
              <Text style={styles.dSumTxt}>
                {String(items.filter((i) => !i.is_equipped && selectedRarities.includes(i.rarity)).length)} items
              </Text>
              <Text style={styles.dSumScrap}>
                ~{String(
                  items
                    .filter((i) => !i.is_equipped && selectedRarities.includes(i.rarity))
                    .reduce((a, i) => {
                      const s: Record<string, number> = { Common: 1, Uncommon: 3, Rare: 8, Epic: 20, Legendary: 50, Dimensional: 150 }
                      return a + (s[i.rarity] || 0)
                    }, 0)
                )} Scrap
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.dismantleBtn,
                (!selectedRarities.length || dismantleableCount === 0) ? { opacity: 0.4 } : null,
              ]}
              onPress={handleDismantle}
              disabled={loading || !selectedRarities.length || dismantleableCount === 0}
            >
              <Text style={styles.dismantleBtnTxt}>
                {loading
                  ? 'DISMANTLING...'
                  : dismantleableCount === 0
                  ? 'NO ITEMS TO DISMANTLE'
                  : 'DISMANTLE ' + String(dismantleableCount)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050A0F' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 3 },
  headerSub:   { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  pwrLabel:    { fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 },
  pwrValue:    { fontSize: 15, fontWeight: '900', color: '#FFD700' },

  equipSection: { backgroundColor: 'rgba(0,8,18,0.7)', borderTopWidth:1, borderBottomWidth:1, borderColor:'rgba(0,212,255,0.12)', paddingTop:8, paddingBottom:10, paddingHorizontal:12 },
  nameRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 },
  charName:  { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  charClass: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  equipMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  slotCol:   { gap: 6 },
  // ✅ charFrame: TAM KARE — flex ile dinamik genişlik, aspectRatio: 1 ile yükseklik = genişlik
  charFrame: { flex: 1, aspectRatio: 1, borderWidth: 1.5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  charImg:   { width: '100%', height: '100%' },
  charEmoji: { fontSize: 52 },
  slot:      { width: SLOT_SIZE, height: SLOT_SIZE, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative', overflow: 'hidden' },
  slotWrap:  {},
  slotIcon:  { fontSize: 22 },
  slotLevel: { position: 'absolute', bottom: 2, right: 3, fontSize: 8, color: 'rgba(255,255,255,0.8)', fontWeight: '800', zIndex: 2, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  slotCornerLabel: { position: 'absolute', bottom: 2, right: 3, fontSize: 8, fontWeight: '900', letterSpacing: 0.3, zIndex: 2, textShadowColor: 'rgba(0,0,0,0.95)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  slotEmpty: { fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 0.5, marginTop: 2 },
  slotGlow:  { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: 10, borderWidth: 2 },
  slotSwordImg: { width: 60, height: 60 },
  slotItemImg:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  slotEnhBadge: { position: 'absolute', top: 2, left: 2, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1, zIndex: 2 },
  slotEnhText:  { fontSize: 8, fontWeight: '900', color: '#FFD700' },

  statStrip:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(0,4,12,0.95)', borderBottomWidth: 1, borderBottomColor: 'rgba(0,212,255,0.1)' },
  statChip:      { alignItems: 'center', flex: 1 },
  statChipVal:   { fontSize: 13, fontWeight: '900' },
  statChipLabel: { fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginTop: 1 },
  stripDiv:      { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.08)' },

  toolbar:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,212,255,0.08)' },
  sortRow:      { flexDirection: 'row', gap: 6 },
  sortBtn:      { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6 },
  sortBtnOn:    { borderColor: '#00FF88', backgroundColor: 'rgba(0,255,136,0.08)' },
  sortTxt:      { fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, fontWeight: '700' },
  actionRow:    { flexDirection: 'row', gap: 6 },
  actionBtn:    { borderWidth: 1, borderColor: '#00FF88', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6 },
  actionBtnTxt: { fontSize: 10, color: '#00FF88', letterSpacing: 1, fontWeight: '700' },

  // ✅ Tab bar
  tabBar:        { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(0,212,255,0.1)' },
  tabBtn:        { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabBtnActive:  { borderBottomWidth: 2, borderBottomColor: '#00D4FF' },
  tabTxt:        { fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, fontWeight: '700' },
  tabTxtActive:  { color: '#00D4FF' },

  // Item grid
  grid:          { padding: GRID_PAD, paddingBottom: 100 },
  gridRow:       { gap: GRID_GAP, marginBottom: GRID_GAP },
  itemCard:      { width: ITEM_SIZE, height: ITEM_SIZE, borderWidth: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', gap: 2, overflow: 'hidden', position: 'relative' },
  itemLock:      { position: 'absolute', top: 2, left: 3, fontSize: 10, zIndex: 2 },
  itemSwordImg:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  itemClassImg:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  itemIcon:      { fontSize: 22 },
  itemCornerLabel: { position: 'absolute', bottom: 3, right: 4, fontSize: 9, fontWeight: '900', letterSpacing: 0.3, opacity: 0.9 },
  itemEnhBadge:  { position: 'absolute', top: 2, right: 2, borderWidth: 1, borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1 },
  itemEnhText:   { fontSize: 8, fontWeight: '900' },

  emptyWrap:  { alignItems: 'center', paddingTop: 30 },
  emptyText:  { fontSize: 13, color: 'rgba(255,255,255,0.3)' },
  emptyHint:  { fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4 },

  // ✅ Materials tab
  matContainer:     { padding: GRID_PAD, paddingBottom: 60 },
  matSection:       { fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 3, marginTop: 16, marginBottom: 8, fontWeight: '700' },
  matGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  matCard:          { width: ITEM_SIZE, height: ITEM_SIZE + 8, borderWidth: 1, borderRadius: 6,
                      alignItems: 'center', justifyContent: 'center', gap: 2,
                      backgroundColor: 'rgba(255,255,255,0.03)' },
  matIcon:          { fontSize: 18 },
  matValue:         { fontSize: 11, fontWeight: '900', color: '#fff' },
  matLabel:         { fontSize: 7, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 },
  matComingSoon:    { borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8,
                      padding: 20, alignItems: 'center', gap: 6, borderStyle: 'dashed', marginTop: 4 },
  matComingSoonIcon:{ fontSize: 24 },
  matComingSoonText:{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },
  matComingSoonHint:{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center' },

  // Modal
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#060F1E', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, paddingBottom: 40, overflow: 'hidden' },
  mHead:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  mHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mSlotIcon: { fontSize: 32 },
  mSlotImg:  { width: 36, height: 36 },
  cCardImg:  { width: 32, height: 32, marginVertical: 4 },
  mRarityText:{ fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  mSlotType:  { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginTop: 2 },
  mClose:    { padding: 8 },
  mCloseText:{ fontSize: 18, color: 'rgba(255,255,255,0.4)' },

  cCards:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  cCard:         { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.03)' },
  cCardTag:      { fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 },
  cCardIcon:     { fontSize: 30, marginVertical: 4 },
  cCardRarity:   { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  cCardPwr:      { fontSize: 16, fontWeight: '900', color: '#fff', marginTop: 2 },
  cVerdict:      { alignItems: 'center', gap: 6 },
  cVerdictArrow: { fontSize: 16, color: 'rgba(255,255,255,0.2)' },
  cVerdictBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' },
  cVerdictText:  { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  cVerdictDiff:  { fontSize: 15, fontWeight: '900' },

  cStats:       { paddingHorizontal: 16, paddingBottom: 8 },
  cStatsHeader: { flexDirection: 'row', paddingBottom: 6, marginBottom: 2, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  cStatRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  cStatLabel:   { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  cStatOldH:    { width: 72, fontSize: 9, color: 'rgba(255,255,255,0.35)', textAlign: 'center', letterSpacing: 1 },
  cStatNewH:    { width: 60, fontSize: 9, color: 'rgba(255,255,255,0.35)', textAlign: 'center', letterSpacing: 1 },
  cStatDiffH:   { width: 70, fontSize: 9, color: 'rgba(255,255,255,0.35)', textAlign: 'center', letterSpacing: 1 },
  cStatOld:     { width: 72, fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', textDecorationLine: 'line-through' },
  cStatNew:     { width: 60, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  cStatDiffWrap:  { width: 70, alignItems: 'center' },
  cStatDiffBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  cStatDiffText:  { fontSize: 11, fontWeight: '800' },
  cStatSame:      { fontSize: 12, color: 'rgba(255,255,255,0.2)' },
  cPowerRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingVertical: 8 },
  cPowerLabel: { flex: 1, fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  cPowerOld:   { width: 72, fontSize: 15, color: 'rgba(255,255,255,0.3)', textAlign: 'center', textDecorationLine: 'line-through' },
  cPowerNew:   { width: 60, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  cPowerDiff:  { width: 70, fontSize: 16, fontWeight: '900', textAlign: 'center' },

  equippedBanner:     { marginHorizontal: 16, marginTop: 8, borderWidth: 1, borderRadius: 6, padding: 8, alignItems: 'center' },
  equippedBannerText: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  singleStats:        { paddingHorizontal: 16, paddingVertical: 8 },
  singleStatRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  singleStatLabel:    { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  singleStatVal:      { fontSize: 15, fontWeight: '700' },
  singlePowerRow:     { borderBottomWidth: 0, marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  singlePowerLabel:   { fontSize: 15, fontWeight: '900', color: '#fff' },
  singlePowerVal:     { fontSize: 24, fontWeight: '900' },

  // ✅ Enhancement section
  enhSection:  { marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderRadius: 10, padding: 14, backgroundColor: 'rgba(255,255,255,0.02)' },
  enhHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  enhTitle:    { fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, fontWeight: '700' },
  enhLevel:    { fontSize: 16, fontWeight: '900' },
  enhMax:      { fontSize: 11, color: '#FFD700' },
  enhBar:      { flexDirection: 'row', gap: 3, marginBottom: 10 },
  enhBarSegment: { flex: 1, height: 6, borderRadius: 3 },
  enhInfoRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  enhInfoLabel:{ fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  enhInfoVal:  { fontSize: 13, fontWeight: '700' },
  enhInfoNext: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  enhCostRow:  { flexDirection: 'row', gap: 16 },
  enhCostItem: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  enhCostLack: { color: '#FF4444' },

  // Buttons
  mBtnRow:        { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 14, paddingBottom: 4 },
  mLockBtn:       { width: 52, height: 52, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)' },
  mLockBtnText:   { fontSize: 22 },
  floatToastWrap: { position: 'relative', alignItems: 'center', height: 0, overflow: 'visible', zIndex: 999 },
  floatToast:     { position: 'absolute', bottom: 0, alignSelf: 'center', alignItems: 'center' },
  floatToastText: { fontSize: 20, fontWeight: '900', letterSpacing: 2,
                    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },

  enhBtn:         { width: 64, height: 52, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  enhBtnText:     { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  mEquipBtn:      { marginHorizontal: 0, marginTop: 0, height: 52, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mEquipBtnText:  { fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  mUnequipBtn:    { marginHorizontal: 0, marginTop: 0, height: 52, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.08)' },
  mUnequipBtnText:{ fontSize: 16, fontWeight: '900', color: '#F59E0B', letterSpacing: 2 },

  dismantleOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end' },
  dismantleBox:     { backgroundColor: '#060F1E', borderTopLeftRadius: 12, borderTopRightRadius: 12, borderTopWidth: 1, borderColor: 'rgba(0,212,255,0.2)', padding: 20, paddingBottom: 40 },
  dismantleHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dismantleTitle:   { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  dismantleHint:    { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 14 },
  rarityGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  rarityChip:       { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 60 },
  rarityChipTxt:    { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  rarityChipCnt:    { fontSize: 15, fontWeight: '900', marginTop: 2 },
  dismantleSummary: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: 12, marginBottom: 14 },
  dSumTxt:          { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  dSumScrap:        { fontSize: 14, fontWeight: '700', color: '#FFD700' },
  dismantleBtn:     { backgroundColor: '#FF4444', borderRadius: 4, padding: 14, alignItems: 'center' },
  dismantleBtnTxt:  { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 2 },

  // ━━━ HORIZONTAL CARD MODAL STYLES ━━━
  mHead2:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 8 },
  mHeadName:     { fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  mHeadMeta:     { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3, letterSpacing: 1.5 },
  diffPill:      { borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  diffPillText:  { fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  cardsCol:      { paddingHorizontal: 14, paddingTop: 14, gap: 10 },

  // Horizontal card
  hCard:         { borderWidth: 1.5, borderRadius: 12, padding: 10, paddingTop: 14, backgroundColor: 'rgba(255,255,255,0.02)', position: 'relative' },
  hCardTag:      { position: 'absolute', top: -10, left: 14, borderWidth: 1.5, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, zIndex: 3, backgroundColor: '#060F1E' },
  hCardTagText:  { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  hCardBody:     { flexDirection: 'row', gap: 12, alignItems: 'center' },
  // Sol görsel
  hImgFrame:     { width: 110, height: 110, borderWidth: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.4)', position: 'relative' },
  hImg:          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  hFallback:     { fontSize: 60, textAlign: 'center', lineHeight: 110 },
  hEnhBadge:     { position: 'absolute', top: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, zIndex: 2 },
  hEnhText:      { fontSize: 11, fontWeight: '900' },
  hLockBadge:    { position: 'absolute', top: 4, right: 4, zIndex: 2 },
  hLockText:     { fontSize: 12 },
  hLvl:          { position: 'absolute', bottom: 4, right: 6, fontSize: 11, color: '#fff', fontWeight: '900', zIndex: 2, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  hCornerLabel:  { position: 'absolute', bottom: 4, right: 6, fontSize: 11, fontWeight: '900', letterSpacing: 0.3, zIndex: 2, textShadowColor: 'rgba(0,0,0,0.95)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  // Sağ stat
  hStats:        { flex: 1, gap: 2 },
  hStatRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 },
  hStatLbl:      { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600', letterSpacing: 0.5, flex: 1 },
  hStatValWrap:  { alignItems: 'flex-end' },
  hStatVal:      { fontSize: 13, fontWeight: '800' },
  hStatPreview:  { fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1 },
  hPwrRow:       { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 6, marginTop: 4, paddingVertical: 4 },
  hPwrLbl:       { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1, flex: 1 },
  hPwrVal:       { fontSize: 16, fontWeight: '900' },

  equippedTag:   { alignSelf: 'center', borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 4 },
  equippedTagTxt:{ fontSize: 10, fontWeight: '900', letterSpacing: 2 },

  // Single dismantle button
  mDismantleBtn:    { width: 52, height: 52, borderWidth: 1.5, borderRadius: 10, borderColor: '#FF4444', backgroundColor: 'rgba(255,68,68,0.08)', alignItems: 'center', justifyContent: 'center' },
  mDismantleBtnText:{ fontSize: 22 },
})