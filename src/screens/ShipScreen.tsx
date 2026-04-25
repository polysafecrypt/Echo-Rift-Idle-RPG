// =============================================
// ECHO RIFT — SHIP SCREEN (YENİ TASARIM)
// =============================================

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Dimensions, Alert, Animated, RefreshControl,
  ImageBackground,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useGame } from '../hooks/useGame'
import { COLORS } from '../constants'

const { width, height } = Dimensions.get('window')
const CORNER = 10

const MODULE_INFO = {
  weapon: {
    name: 'WEAPON ARRAY',
    color: '#EF4444',
    passive: '+2% ATK per level',
    skill: 'OVERCHARGE',
    skillDesc: '+5% ATK for 30 min',
    bonusFn: (lv: number) => `+${lv * 2}% ATK`,
  },
  hull: {
    name: 'HULL INTEGRITY',
    color: '#F97316',
    passive: '+2.5% HP per level',
    skill: 'FORTIFY',
    skillDesc: '+5% HP & DEF for 30 min',
    bonusFn: (lv: number) => `+${(lv * 2.5).toFixed(1)}% HP`,
  },
  shield: {
    name: 'SHIELD MATRIX',
    color: '#3B82F6',
    passive: '+2% DEF per level',
    skill: null,
    skillDesc: null,
    bonusFn: (lv: number) => `+${lv * 2}% DEF`,
  },
  scanner: {
    name: 'SIGNAL SCANNER',
    color: '#00D4FF',
    passive: '+1.5% Rare+ Drop',
    skill: null,
    skillDesc: null,
    bonusFn: (lv: number) => `+${(lv * 1.5).toFixed(1)}% DROP`,
  },
  cargo: {
    name: 'CARGO BAY',
    color: '#22C55E',
    passive: '+2% Material Drop',
    skill: null,
    skillDesc: null,
    bonusFn: (lv: number) => `+${lv * 2}% MATS`,
  },
}

const UPGRADE_COSTS: Record<number, { salvage?: number; quantum?: number; rift?: number; scrap: number }> = {
  1:  { salvage: 5,  scrap: 50 },
  2:  { salvage: 7,  scrap: 100 },
  3:  { salvage: 9,  scrap: 200 },
  4:  { salvage: 11, scrap: 300 },
  5:  { salvage: 13, scrap: 400 },
  6:  { quantum: 5,  scrap: 500 },
  7:  { quantum: 7,  scrap: 700 },
  8:  { quantum: 9,  scrap: 900 },
  9:  { rift: 3,     scrap: 1200 },
  10: { rift: 4,     scrap: 1500 },
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

// ─── PROGRESS BAR ────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      <View style={[styles.progressGlow, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  )
}

export default function ShipScreen() {
  const { getShipState, upgradeShipModule, useShipSkill } = useGame()
  const [userId, setUserId]       = useState<string | null>(null)
  const [shipData, setShipData]   = useState<any>(null)
  const [playerScrap, setPlayerScrap] = useState(0)
  const [loading, setLoading]     = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [tick, setTick]           = useState(0)
  const pulseAnim = useRef(new Animated.Value(0.6)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1,   duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1800, useNativeDriver: true }),
      ])
    ).start()
    const iv = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  useFocusEffect(useCallback(() => { loadData() }, []))

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      const ship = await getShipState(user.id)
      if (ship?.success) setShipData(ship)
      const { data: player } = await supabase
        .from('players').select('scrap_metal').eq('id', user.id).single()
      if (player) setPlayerScrap(player.scrap_metal)
    }
  }

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false) }

  const handleUpgrade = async (moduleType: string, module: any) => {
    if (!userId) return
    if (!module.can_upgrade) {
      const diff = Math.max(0, new Date(module.upgrade_ready_at).getTime() - Date.now())
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000)
      Alert.alert('Cooldown Active', `Next upgrade in ${h}h ${m}m`); return
    }
    if (module.level >= 10) { Alert.alert('Max Level', 'Fully upgraded!'); return }

    const nextLevel = module.level + 1
    const cost = UPGRADE_COSTS[nextLevel]
    let costText = `⚙️ Scrap: ${cost.scrap}`
    if (cost.salvage) costText += `\n🔩 Salvage: ${cost.salvage}`
    if (cost.quantum) costText += `\n🔮 Quantum: ${cost.quantum}`
    if (cost.rift)    costText += `\n💠 Rift: ${cost.rift}`

    Alert.alert(`Upgrade → Level ${nextLevel}`, costText, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'UPGRADE', onPress: async () => {
        setLoading(moduleType)
        const result = await upgradeShipModule(userId, moduleType)
        if (result?.success) {
          await loadData()
          Alert.alert('✅ Upgraded!', `Level ${nextLevel} unlocked!`)
        } else {
          const errMsg =
            result?.error === 'INSUFFICIENT_SALVAGE' ? 'Not enough Salvage Parts!' :
            result?.error === 'INSUFFICIENT_QUANTUM'  ? 'Not enough Quantum Core!' :
            result?.error === 'INSUFFICIENT_RIFT'     ? 'Not enough Rift Crystal!' :
            result?.error === 'INSUFFICIENT_SCRAP'    ? 'Not enough Scrap Metal!' :
            result?.error === 'COOLDOWN_ACTIVE'       ? '24h cooldown active!' : 'Upgrade failed'
          Alert.alert('Error', errMsg)
        }
        setLoading(null)
      }},
    ])
  }

  const handleSkill = async (moduleType: string) => {
    if (!userId) return
    const result = await useShipSkill(userId, moduleType)
    if (result?.success) {
      await loadData()
      Alert.alert('⚡ ACTIVATED!', moduleType === 'hull'
        ? 'FORTIFY: +5% HP & DEF — 30 min'
        : 'OVERCHARGE: +5% ATK — 30 min')
    } else {
      if (result?.error === 'SKILL_COOLDOWN') {
        const diff = Math.max(0, new Date(result.ready_at).getTime() - Date.now())
        const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000)
        Alert.alert('Cooldown', `Ready in ${h}h ${m}m`)
      } else Alert.alert('Error', result?.error || 'Failed')
    }
  }

  const getCooldownText = (module: any) => {
    if (module.can_upgrade) return null
    const diff = Math.max(0, new Date(module.upgrade_ready_at).getTime() - Date.now())
    const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const getSkillTimeLeft = (module: any) => {
    if (!module.skill_active || !module.skill_expires_at) return null
    const diff = Math.max(0, new Date(module.skill_expires_at).getTime() - Date.now())
    return `${Math.floor(diff / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`
  }

  const totalLevel = shipData?.modules?.reduce((s: number, m: any) => s + m.level, 0) ?? 0

  if (!shipData) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>SCANNING SHIP...</Text>
      </View>
    )
  }

  const { materials, modules } = shipData

  // Modülleri layout'a göre sırala: weapon, hull, shield, scanner → 2x2, cargo → alt tam
  const topModules   = ['weapon', 'hull', 'shield', 'scanner']
  const topMods      = topModules.map((t: string) => modules.find((m: any) => m.module_type === t)).filter(Boolean)
  const cargoMod     = modules.find((m: any) => m.module_type === 'cargo')

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* BG */}
      <ImageBackground
        source={require('../../assets/images/ship.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.72)' }]} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.neonGreen} />}
        contentContainerStyle={styles.scroll}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>OMEGA-∞</Text>
            <Text style={styles.headerSub}>SHIP SYSTEMS — BAY 7-G</Text>
          </View>
          <HoloCard color={COLORS.neonGreen as string} style={styles.shipLvCard}>
            <Text style={styles.shipLvLabel}>SHIP LV</Text>
            <Text style={styles.shipLvValue}>{totalLevel}/50</Text>
          </HoloCard>
        </View>

        {/* MATERIALS */}
        <HoloCard style={styles.matsCard}>
          <Text style={styles.sectionTitle}>MATERIALS</Text>
          <View style={styles.matsRow}>
            <MatItem label="SCRAP"   value={playerScrap}          color="#888" />
            <MatItem label="SALVAGE" value={materials.salvage_parts} color="#F97316" />
            <MatItem label="QUANTUM" value={materials.quantum_core}  color="#A855F7" />
            <MatItem label="RIFT"    value={materials.rift_crystal}  color="#00D4FF" />
          </View>
        </HoloCard>

        {/* 2x2 MODÜLLER */}
        <View style={styles.grid}>
          {topMods.map((module: any) => {
            const info = MODULE_INFO[module.module_type as keyof typeof MODULE_INFO]
            return <ModuleCard
              key={module.module_type}
              module={module}
              info={info}
              cost={module.level < 10 ? UPGRADE_COSTS[module.level + 1] : null}
              cooldown={getCooldownText(module)}
              skillTime={getSkillTimeLeft(module)}
              isLoading={loading === module.module_type}
              onUpgrade={() => handleUpgrade(module.module_type, module)}
              onSkill={() => handleSkill(module.module_type)}
            />
          })}
        </View>

        {/* CARGO — tam genişlik */}
        {cargoMod && (
          <ModuleCard
            module={cargoMod}
            info={MODULE_INFO.cargo}
            cost={cargoMod.level < 10 ? UPGRADE_COSTS[cargoMod.level + 1] : null}
            cooldown={getCooldownText(cargoMod)}
            skillTime={null}
            isLoading={loading === 'cargo'}
            onUpgrade={() => handleUpgrade('cargo', cargoMod)}
            onSkill={() => {}}
            fullWidth
          />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

// ─── MODULE CARD ─────────────────────────────────────────────────────────────
function ModuleCard({ module, info, cost, cooldown, skillTime, isLoading, onUpgrade, onSkill, fullWidth }: {
  module: any; info: any; cost: any; cooldown: string | null
  skillTime: string | null; isLoading: boolean
  onUpgrade: () => void; onSkill: () => void; fullWidth?: boolean
}) {
  const cardStyle = fullWidth ? styles.moduleCardFull : styles.moduleCardHalf

  return (
    <View style={[styles.holoCard, cardStyle, { borderColor: info.color + '60' }]}>
      <View style={[styles.corner, styles.cTL, { borderColor: info.color }]} />
      <View style={[styles.corner, styles.cTR, { borderColor: info.color }]} />
      <View style={[styles.corner, styles.cBL, { borderColor: info.color }]} />
      <View style={[styles.corner, styles.cBR, { borderColor: info.color }]} />

      {/* Name + Level */}
      <View style={styles.modHeader}>
        <Text style={[styles.modName, { color: info.color }]}>{info.name}</Text>
        <Text style={[styles.modLv, { color: info.color }]}>LV {module.level}</Text>
      </View>

      {/* Progress bar */}
      <ProgressBar value={module.level} max={10} color={info.color} />
      <Text style={styles.modBonus}>
        {module.level > 0 ? info.bonusFn(module.level) : info.passive}
      </Text>

      {/* Maliyetler */}
      {cost && (
        <View style={styles.costRow}>
          <Text style={styles.costItem}>⚙️{cost.scrap}</Text>
          {cost.salvage && <Text style={styles.costItem}>🔩{cost.salvage}</Text>}
          {cost.quantum && <Text style={styles.costItem}>🔮{cost.quantum}</Text>}
          {cost.rift    && <Text style={styles.costItem}>💠{cost.rift}</Text>}
        </View>
      )}

      {/* Upgrade / Cooldown / Max */}
      {module.level >= 10 ? (
        <View style={[styles.maxBtn, { borderColor: info.color }]}>
          <Text style={[styles.maxBtnText, { color: info.color }]}>✓ MAX</Text>
        </View>
      ) : cooldown ? (
        <View style={styles.cooldownBtn}>
          <Text style={styles.cooldownText}>⏳ {cooldown}</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.upgradeBtn, { borderColor: info.color }, isLoading && { opacity: 0.5 }]}
          onPress={onUpgrade}
          disabled={isLoading}
        >
          <Text style={[styles.upgradeBtnText, { color: info.color }]}>
            {isLoading ? '...' : `UPGRADE → LV ${module.level + 1}`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Skill (hull/weapon için) */}
      {info.skill && module.level >= 3 && (
        <View style={[styles.skillRow, { borderColor: info.color + '40' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.skillName, { color: info.color }]}>⚡ {info.skill}</Text>
            <Text style={styles.skillDesc}>{info.skillDesc}</Text>
          </View>
          {module.skill_active ? (
            <Text style={[styles.skillActive, { color: info.color }]}>{skillTime}</Text>
          ) : (
            <TouchableOpacity
              style={[styles.skillBtn, { borderColor: info.color }]}
              onPress={onSkill}
            >
              <Text style={[styles.skillBtnText, { color: info.color }]}>USE</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

// ─── MATERIAL ITEM ────────────────────────────────────────────────────────────
function MatItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.matItem}>
      <Text style={[styles.matValue, { color }]}>{value?.toLocaleString() ?? 0}</Text>
      <Text style={styles.matLabel}>{label}</Text>
    </View>
  )
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const GAP = 10

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#050A0F' },
  loading: { flex: 1, backgroundColor: '#050A0F', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: COLORS.neonGreen, letterSpacing: 4 },
  scroll:  { paddingHorizontal: 12, paddingTop: 52 },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle:  { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 4 },
  headerSub:    { fontSize: 9, color: 'rgba(255,255,255,0.85)', letterSpacing: 2, marginTop: 2 },
  shipLvCard:   { paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', marginBottom: 0 },
  shipLvLabel:  { fontSize: 8, color: 'rgba(255,255,255,0.85)', letterSpacing: 2 },
  shipLvValue:  { fontSize: 18, fontWeight: '900', color: COLORS.neonGreen },

  // Hologram kart
  holoCard: {
    backgroundColor: 'rgba(0,8,18,0.85)',
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)',
    borderRadius: 4, padding: 12, position: 'relative',
  },
  corner: { position: 'absolute', width: CORNER, height: CORNER },
  cTL:   { top: -1, left: -1,   borderTopWidth: 1.5, borderLeftWidth: 1.5 },
  cTR:   { top: -1, right: -1,  borderTopWidth: 1.5, borderRightWidth: 1.5 },
  cBL:   { bottom: -1, left: -1,  borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
  cBR:   { bottom: -1, right: -1, borderBottomWidth: 1.5, borderRightWidth: 1.5 },

  sectionTitle: { fontSize: 10, fontWeight: '900', color: 'rgba(0,212,255,0.8)', letterSpacing: 3, marginBottom: 10 },

  // Materials
  matsCard: { marginBottom: 12 },
  matsRow:  { flexDirection: 'row', justifyContent: 'space-around' },
  matItem:  { alignItems: 'center', gap: 3 },
  matValue: { fontSize: 16, fontWeight: '900' },
  matLabel: { fontSize: 8, color: 'rgba(255,255,255,0.85)', letterSpacing: 1 },

  // Grid 2x2
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginBottom: GAP },
  moduleCardHalf: {
    width: (width - 24 - GAP) / 2,
  },
  moduleCardFull: {
    width: '100%',
    marginBottom: GAP,
  },

  // Module card içi
  modHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modName:    { fontSize: 10, fontWeight: '900', letterSpacing: 1, flex: 1 },
  modLv:      { fontSize: 14, fontWeight: '900' },
  modBonus:   { fontSize: 10, color: '#fff', marginTop: 4, marginBottom: 6 },

  // Progress
  progressTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', marginBottom: 2 },
  progressFill:  { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  progressGlow:  { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3, opacity: 0.3 },

  // Cost
  costRow:  { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
  costItem: { fontSize: 10, color: '#fff' },

  // Buttons
  upgradeBtn:    { borderWidth: 1, borderRadius: 2, paddingVertical: 8, alignItems: 'center' },
  upgradeBtnText:{ fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  cooldownBtn:   { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 2, paddingVertical: 8, alignItems: 'center' },
  cooldownText:  { fontSize: 11, color: 'rgba(255,255,255,0.85)', letterSpacing: 1 },
  maxBtn:        { borderWidth: 1, borderRadius: 2, paddingVertical: 8, alignItems: 'center' },
  maxBtnText:    { fontSize: 11, fontWeight: '900', letterSpacing: 2 },

  // Skill
  skillRow:   { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8, paddingTop: 8, gap: 8 },
  skillName:  { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  skillDesc:  { fontSize: 9, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  skillActive:{ fontSize: 11, fontWeight: '700' },
  skillBtn:   { borderWidth: 1, borderRadius: 2, paddingHorizontal: 10, paddingVertical: 5 },
  skillBtnText:{ fontSize: 10, fontWeight: '900', letterSpacing: 1 },
})