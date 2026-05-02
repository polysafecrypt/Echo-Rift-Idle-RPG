// =============================================
// ECHO RIFT — ARENA BATTLE MODAL v6
// + Champion skill engine entegrasyonu
// + Element flash + slide-in portrait + skill text
// + HP bar üstünde buff/debuff iconları
// + DoT renkli floating damage
// =============================================

import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Modal, Dimensions, ImageBackground, ScrollView,
} from 'react-native'
import { COLORS } from '../constants'
import { ArenaBattleResult, ChampionSkillEvent, DOT_COLORS } from '../types'
import SpriteCharacter, { SpriteCharacterRef, ClassType } from './SpriteCharacter'
import HitFx from './HitFx'
import ChampionSkillOverlay from './ChampionSkillOverlay'
import BuffDebuffIcons, { ActiveEffect } from './BuffDebuffIcons'

const { width, height } = Dimensions.get('window')

const SWORD_IMAGES: Record<string, any> = {
  Common:      require('../../assets/swords/sword_common.png'),
  Uncommon:    require('../../assets/swords/sword_uncommon.png'),
  Rare:        require('../../assets/swords/sword_rare.png'),
  Epic:        require('../../assets/swords/sword_epic.png'),
  Legendary:   require('../../assets/swords/sword_legendary.png'),
  Dimensional: require('../../assets/swords/sword_dimensional.png'),
}

const CHAR_SIZE    = Math.floor(width * 0.56)
const CHAR_OVERLAP = 0.05

const TIMING = {
  START_DELAY:  1500,
  HIT_STOP:     100,
  CRIT_FREEZE:  180,
  BETWEEN:      0,
  ROUND_GAP:    0,
  DEATH_DELAY:  1300,
  SWORD_DELAY:  750,
  SKILL_HOLD:   1500,  // ✅ Champion skill cast + overlay süresi
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// ─── TYPES ───────────────────────────────────────────────────────────────────
type LogEntry = { id: number; p1Text: string; p2Text: string; p1Color: string; p2Color: string }
type FloatDmg = { id: number; text: string; isCrit: boolean; side: 'p1' | 'p2'; color?: string; size?: number }

export interface PlayerStats { atk: number; hp: number; def: number; crit: number; critDmg: number; spd: number }
export interface DefenderStats { atk: number; hp: number; def: number; crit: number; critDmg: number; spd: number }


// ─── FLOATING DAMAGE ─────────────────────────────────────────────────────────
function FloatingDamageItem({ item, onDone }: { item: FloatDmg; onDone: (id: number) => void }) {
  const translateY = useRef(new Animated.Value(0)).current
  const opacity    = useRef(new Animated.Value(1)).current
  const scale      = useRef(new Animated.Value(item.isCrit ? 1.4 : 1)).current
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -80, duration: 900, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      item.isCrit ? Animated.sequence([
        Animated.spring(scale, { toValue: 1.6, tension: 200, friction: 5, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.3, duration: 400, useNativeDriver: true }),
      ]) : Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(() => onDone(item.id))
  }, [])

  // Custom rengi varsa onu kullan, yoksa default
  const baseStyle = item.isCrit
    ? fdStyles.crit
    : item.color
      ? { fontSize: item.size ?? 18, color: item.color,
          textShadowColor: 'rgba(0,0,0,0.85)',
          textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }
      : fdStyles.normal

  return (
    <Animated.Text style={[
      fdStyles.text,
      baseStyle,
      { transform: [{ translateY }, { scale }], opacity },
    ]}>
      {item.text}
    </Animated.Text>
  )
}
const fdStyles = StyleSheet.create({
  text:   { position: 'absolute', fontWeight: '900', letterSpacing: 1, zIndex: 100 },
  normal: { fontSize: 18, color: '#ffffff', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  crit:   { fontSize: 26, color: '#FFD700', textShadowColor: '#FF8C00', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
})

// ─── CHAR HP BAR ─────────────────────────────────────────────────────────────
function CharHpBar({ current, max, color, width: barWidth, align }: {
  current: number; max: number; color: string; width: number; align: 'left' | 'right'
}) {
  const pct     = Math.max(0, Math.min(1, current / max))
  const animPct = useRef(new Animated.Value(pct)).current
  const shimmer = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(animPct, { toValue: pct, duration: 380, useNativeDriver: false }).start()
  }, [pct])
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 1800, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 1800, useNativeDriver: true }),
    ])).start()
  }, [])

  const barColor   = pct > 0.5 ? color : pct > 0.25 ? '#FFB800' : '#FF4444'
  const darkColor  = pct > 0.5 ? color + '55' : pct > 0.25 ? '#FFB80055' : '#FF444455'
  const pctText    = `${Math.round(pct * 100)}%`
  const hpText     = current.toLocaleString()

  return (
    <View style={{ width: barWidth, marginBottom: 6 }}>
      <View style={[chStyles.track, { borderColor: color + '40' }]}>
        <View style={[chStyles.trackBg, { backgroundColor: darkColor }]} />
        <Animated.View style={[chStyles.fill, {
          width: animPct.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }),
          backgroundColor: barColor,
        }]}>
          <Animated.View style={[chStyles.shimmer, {
            opacity: shimmer.interpolate({ inputRange:[0,1], outputRange:[0, 0.25] }),
          }]} />
          <View style={chStyles.highlight} />
        </Animated.View>
        <Text style={[
          chStyles.hpNum,
          align === 'left' ? { right: 5 } : { left: 5 },
          { color: pct > 0.15 ? '#fff' : '#ffaaaa' },
        ]} numberOfLines={1}>{hpText}</Text>
        <Text style={chStyles.pctLabel}>{pctText}</Text>
      </View>
    </View>
  )
}
const chStyles = StyleSheet.create({
  track: {
    height: 18, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4, overflow: 'hidden',
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)', borderBottomColor: 'rgba(0,0,0,0.5)',
    borderLeftColor: 'rgba(255,255,255,0.08)', borderRightColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },
  trackBg: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  shimmer: { position: 'absolute', left: 0, top: 0, bottom: 0, right: 0, backgroundColor: '#ffffff' },
  highlight: {
    position: 'absolute', left: 0, top: 0, right: 0,
    height: '45%', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 3,
  },
  hpNum: {
    position: 'absolute', fontSize: 9, fontWeight: '900', letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
    zIndex: 2,
  },
  pctLabel: {
    position: 'absolute', left: 0, right: 0, fontSize: 8, fontWeight: '900',
    color: 'rgba(255,255,255,0.85)', textAlign: 'center', letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
    zIndex: 2,
  },
})

// ─── SWORD TRAIL ─────────────────────────────────────────────────────────────
const RARITY_TRAIL_COLORS: Record<string, { core: string; glow: string }> = {
  Common:      { core: '#E5E7EB', glow: 'rgba(229, 231, 235, 0.6)' },
  Uncommon:    { core: '#86EFAC', glow: 'rgba(34, 197, 94, 0.85)'  },
  Rare:        { core: '#BAE6FD', glow: 'rgba(56, 189, 248, 0.85)' },
  Epic:        { core: '#E9D5FF', glow: 'rgba(168, 85, 247, 0.95)' },
  Legendary:   { core: '#FED7AA', glow: 'rgba(249, 115, 22, 0.95)' },
  Dimensional: { core: '#FBCFE8', glow: 'rgba(236, 72, 153, 0.95)' },
}

type TrailParticle = { id: number; x: number; y: number; rot: number; size: number; drift: number; delay: number }

function SwordTrailParticle({ particle, color, glow, onDone }: { particle: TrailParticle; color: string; glow: string; onDone: (id: number) => void }) {
  const op = useRef(new Animated.Value(0)).current
  const sc = useRef(new Animated.Value(1)).current
  const dy = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const dur = 480 + Math.random() * 220
    Animated.sequence([
      Animated.delay(particle.delay),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(op, { toValue: 1, duration: 60, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0, duration: dur - 60, useNativeDriver: true }),
        ]),
        Animated.timing(sc, { toValue: 0.2, duration: dur, useNativeDriver: true }),
        Animated.timing(dy, { toValue: particle.drift, duration: dur, useNativeDriver: true }),
      ]),
    ]).start(() => onDone(particle.id))
  }, [])
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left: particle.x, top: particle.y,
      width: particle.size, height: particle.size, opacity: op,
      transform: [{ scale: sc }, { translateY: dy }, { rotate: `${particle.rot}deg` }],
    }}>
      <View style={{
        position: 'absolute', left: -particle.size * 0.6, top: -particle.size * 0.6,
        width: particle.size * 2.2, height: particle.size * 2.2,
        borderRadius: particle.size * 1.1, backgroundColor: glow, opacity: 0.45,
      }} />
      <View style={{
        width: particle.size, height: particle.size, borderRadius: particle.size / 2,
        backgroundColor: color, shadowColor: glow, shadowOpacity: 1,
        shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
      }} />
    </Animated.View>
  )
}

function SwordTrail({ rarity, charSize, swordX, swordY, swordOpacity, mirror }: {
  rarity: string; charSize: number; swordX: Animated.Value; swordY: Animated.Value; swordOpacity: Animated.Value; mirror?: boolean
}) {
  const colors = RARITY_TRAIL_COLORS[rarity] || RARITY_TRAIL_COLORS.Common
  const [particles, setParticles] = useState<TrailParticle[]>([])
  const idRef = useRef(0)
  const lastXY = useRef({ x: 0, y: 0 })
  const lastSpawn = useRef(0)

  useEffect(() => {
    const sub = swordX.addListener(({ value: x }) => {
      const now = Date.now()
      if (now - lastSpawn.current < 25) return
      const dist = Math.abs(x - lastXY.current.x)
      if (dist < 6) return
      lastSpawn.current = now
      lastXY.current.x = x
      const id = idRef.current++
      const dir = mirror ? -1 : 1
      const baseX = charSize * 0.25
      const baseY = charSize * 0.25
      const newParticle: TrailParticle = {
        id,
        x: baseX + x - dir * (charSize * 0.05) + (Math.random() - 0.5) * 10,
        y: baseY + lastXY.current.y + (Math.random() - 0.5) * 12,
        rot: Math.random() * 360, size: 4 + Math.random() * 6,
        drift: 4 + Math.random() * 12, delay: 0,
      }
      setParticles(prev => [...prev.slice(-12), newParticle])
    })
    const sub2 = swordY.addListener(({ value: y }) => { lastXY.current.y = y })
    return () => { swordX.removeListener(sub); swordY.removeListener(sub2) }
  }, [charSize, mirror])

  const removeParticle = (id: number) => setParticles(prev => prev.filter(p => p.id !== id))

  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', width: charSize * 0.50, height: charSize * 0.50,
      top: -charSize * 0.30, [mirror ? 'right' : 'left']: 0, opacity: swordOpacity,
    }}>
      {particles.map(p => (
        <SwordTrailParticle key={p.id} particle={p}
          color={colors.core} glow={colors.glow} onDone={removeParticle} />
      ))}
    </Animated.View>
  )
}

// ─── STAT ROW & LOG ROW ──────────────────────────────────────────────────────
function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <Text style={srStyles.row}>
      <Text style={srStyles.label}>{label} </Text>
      <Text style={srStyles.val}>{value}</Text>
    </Text>
  )
}
const srStyles = StyleSheet.create({
  row:   { fontSize: 10, color: '#ffffff', lineHeight: 15 },
  label: { fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  val:   { fontWeight: '900', color: '#ffffff' },
})

function LogRow({ entry }: { entry: LogEntry }) {
  const opacity = useRef(new Animated.Value(0)).current
  const slideY  = useRef(new Animated.Value(8)).current
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(slideY,  { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start()
  }, [])
  return (
    <Animated.View style={[lStyles.row, { opacity, transform: [{ translateY: slideY }] }]}>
      <Text style={[lStyles.cell, { color: entry.p1Color, textAlign: 'left' }]}>{entry.p1Text}</Text>
      <View style={lStyles.divider} />
      <Text style={[lStyles.cell, { color: entry.p2Color, textAlign: 'right' }]}>{entry.p2Text}</Text>
    </Animated.View>
  )
}
const lStyles = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)' },
  cell:    { flex: 1, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  divider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 8 },
})

// ─── MAIN MODAL ──────────────────────────────────────────────────────────────
interface Props {
  visible: boolean
  result: ArenaBattleResult | null
  onClose: () => void
  playerName: string
  playerClass: ClassType | null
  playerSwordRarity?: string
  playerStats?: PlayerStats
  defenderStats?: DefenderStats
  defenderClass?: ClassType
  defenderSwordRarity?: string
}

export default function ArenaBattleModal({
  visible, result, onClose, playerName, playerClass,
  playerSwordRarity = 'Common', defenderSwordRarity = 'Common',
  playerStats, defenderStats, defenderClass,
}: Props) {

  const p1Ref = useRef<SpriteCharacterRef | null>(null)
  const p2Ref = useRef<SpriteCharacterRef | null>(null)
  const isMounted = useRef(true)
  const isSkipped = useRef(false)
  const logScrollRef = useRef<ScrollView>(null)
  const logIdRef = useRef(0)
  const floatIdRef = useRef(0)
  const battleStartedRef = useRef(false)
  const entranceDoneRef = useRef(false)

  const flashOp = useRef(new Animated.Value(0)).current
  const resultOp = useRef(new Animated.Value(0)).current
  const logOp = useRef(new Animated.Value(1)).current
  const rootFadeOp = useRef(new Animated.Value(0)).current
  const p1ShakeX = useRef(new Animated.Value(0)).current
  const p2ShakeX = useRef(new Animated.Value(0)).current
  const p1SquishY = useRef(new Animated.Value(1)).current
  const p2SquishY = useRef(new Animated.Value(1)).current
  const p1EntOp = useRef(new Animated.Value(0)).current
  const p1EntScale = useRef(new Animated.Value(0)).current
  const p2EntOp = useRef(new Animated.Value(0)).current
  const p2EntScale = useRef(new Animated.Value(0)).current

  const swordX = useRef(new Animated.Value(0)).current
  const swordY = useRef(new Animated.Value(0)).current
  const swordRot = useRef(new Animated.Value(0)).current
  const swordOpacity = useRef(new Animated.Value(0)).current
  const p2SwordX = useRef(new Animated.Value(0)).current
  const p2SwordY = useRef(new Animated.Value(0)).current
  const p2SwordRot = useRef(new Animated.Value(0)).current
  const p2SwordOp = useRef(new Animated.Value(0)).current

  const [p1Hp, setP1Hp] = useState(0)
  const [p2Hp, setP2Hp] = useState(0)
  const [p1HpMax, setP1HpMax] = useState(1)
  const [p2HpMax, setP2HpMax] = useState(1)
  const [roundNum, setRoundNum] = useState(0)
  const [total, setTotal] = useState(0)
  const [phase, setPhase] = useState<'battle'|'result'>('battle')
  const [showSkip, setShowSkip] = useState(false)
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [floatDmgs, setFloatDmgs] = useState<FloatDmg[]>([])
  const [battleReady, setBattleReady] = useState(false)
  const [battleKey, setBattleKey] = useState(0)
  const [p1HitFx, setP1HitFx] = useState<number|null>(null)
  const [p1HitCrit, setP1HitCrit] = useState(false)
  const [p2HitFx, setP2HitFx] = useState<number|null>(null)
  const [p2HitCrit, setP2HitCrit] = useState(false)

  // ✅ Champion skill state
  const [skillEvent, setSkillEvent] = useState<ChampionSkillEvent | null>(null)
  const [p1Effects, setP1Effects] = useState<ActiveEffect[]>([])
  const [p2Effects, setP2Effects] = useState<ActiveEffect[]>([])
  const skillResolveRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  const playEntrance = () => {
    p1EntOp.setValue(0); p1EntScale.setValue(0)
    p2EntOp.setValue(0); p2EntScale.setValue(0)
    Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.timing(p1EntOp, { toValue: 1, duration: 55, useNativeDriver: true }),
        Animated.timing(p2EntOp, { toValue: 1, duration: 55, useNativeDriver: true }),
        Animated.spring(p1EntScale, { toValue: 1, tension: 220, friction: 7, useNativeDriver: true }),
        Animated.spring(p2EntScale, { toValue: 1, tension: 220, friction: 7, useNativeDriver: true }),
      ]),
    ]).start(() => {
      entranceDoneRef.current = true
      setBattleReady(true)
    })
  }

  useLayoutEffect(() => {
    if (visible && result) {
      resultOp.setValue(0)
      setPhase('battle')
      p1EntOp.setValue(0); p1EntScale.setValue(0)
      p2EntOp.setValue(0); p2EntScale.setValue(0)
    }
  }, [visible, result])

  useEffect(() => {
    if (!visible || !result) { battleStartedRef.current = false; return }
    if (battleStartedRef.current) return
    battleStartedRef.current = true

    rootFadeOp.setValue(0)
    Animated.timing(rootFadeOp, { toValue: 1, duration: 200, useNativeDriver: true }).start()

    isSkipped.current = false
    entranceDoneRef.current = false
    setBattleReady(false)
    resultOp.setValue(0)
    logOp.setValue(1)
    flashOp.setValue(0)
    setPhase('battle')
    setLogEntries([])
    setFloatDmgs([])
    setP1HitFx(null); setP2HitFx(null)
    attackCount.current = 0
    setP1Hp(result.attacker_hp_start)
    setP2Hp(result.defender_hp_start)
    setP1HpMax(result.attacker_hp_start)
    setP2HpMax(result.defender_hp_start)
    setRoundNum(0)
    setTotal(result.round_logs.length)
    setShowSkip(false)
    setSkillEvent(null)
    setP1Effects([])
    setP2Effects([])

    setBattleKey(k => k + 1)
    p1EntOp.setValue(0); p1EntScale.setValue(0)
    p2EntOp.setValue(0); p2EntScale.setValue(0)
    p1SquishY.stopAnimation(); p1SquishY.setValue(1)
    p2SquishY.stopAnimation(); p2SquishY.setValue(1)

    setTimeout(() => { if (isMounted.current) playEntrance() }, 250)

    const skipTimer = setTimeout(() => { if (isMounted.current) setShowSkip(true) }, 1500)
    runBattle(result)
    return () => clearTimeout(skipTimer)
  }, [visible, result])

  // ─── FX ────────────────────────────────────────────────────────────────────
  const doShake = (anim: Animated.Value, dir: 1 | -1 = 1) => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 12 * dir, duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -8 * dir, duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 4 * dir,  duration: 30, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0,         duration: 30, useNativeDriver: true }),
    ]).start()
  }

  const doSquish = (side: 'p1' | 'p2') => {
    const anim = side === 'p1' ? p1SquishY : p2SquishY
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.72, duration: 55, useNativeDriver: true }),
      Animated.spring(anim,  { toValue: 1,   tension: 280, friction: 5, useNativeDriver: true }),
    ]).start()
  }

  const doHitFx = (side: 'p1' | 'p2', isCrit: boolean, isKill = false) => {
    if (!entranceDoneRef.current) return
    const sq = side === 'p1' ? p1SquishY : p2SquishY
    sq.stopAnimation()
    sq.setValue(1)
    if (!isKill) doSquish(side)
    if (side === 'p1') { setP1HitFx(Date.now()); setP1HitCrit(isCrit) }
    else               { setP2HitFx(Date.now()); setP2HitCrit(isCrit) }
  }

  const spawnFloat = (
    dmg: number, isCrit: boolean, side: 'p1' | 'p2', isDouble: boolean,
    customText?: string, color?: string, size?: number,
  ) => {
    if (!isMounted.current) return
    const text = customText ?? (isCrit
      ? (isDouble ? `×2 💥${dmg.toLocaleString()}!` : `💥${dmg.toLocaleString()}!`)
      : (isDouble ? `×2 ${dmg.toLocaleString()}` : `-${dmg.toLocaleString()}`))
    setFloatDmgs(prev => [...prev, { id: floatIdRef.current++, text, isCrit, side, color, size }])
  }

  const removeFloat = (id: number) => setFloatDmgs(prev => prev.filter(f => f.id !== id))

  const attackCount = useRef(0)

  const throwSword = (side: 'p1' | 'p2', onHit: () => void, isCrit = false) => {
    const variant = attackCount.current % 3
    attackCount.current += 1
    const ox  = side === 'p1' ? swordX    : p2SwordX
    const oy  = side === 'p1' ? swordY    : p2SwordY
    const rot = side === 'p1' ? swordRot  : p2SwordRot
    const op  = side === 'p1' ? swordOpacity : p2SwordOp
    const dir = side === 'p1' ? 1 : -1

    op.setValue(1); ox.setValue(0); oy.setValue(0); rot.setValue(0)

    const angleToTarget = (tx: number, ty: number) => {
      const rad = Math.atan2(Math.abs(tx), ty)
      return (rad * 180 / Math.PI) * dir
    }

    if (isCrit) {
      const pierceX = dir * CHAR_SIZE * 1.35
      const pierceY = CHAR_SIZE * 0.50
      const spin = side === 'p1' ? 360 : -360
      Animated.parallel([
        Animated.timing(ox, { toValue: pierceX, duration: 200, useNativeDriver: true }),
        Animated.timing(oy, { toValue: pierceY, duration: 200, useNativeDriver: true }),
        Animated.timing(rot, { toValue: spin, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        onHit()
        Animated.parallel([
          Animated.timing(ox, { toValue: dir * CHAR_SIZE * 0.70, duration: 90, useNativeDriver: true }),
          Animated.timing(oy, { toValue: CHAR_SIZE * 0.40, duration: 90, useNativeDriver: true }),
          Animated.timing(rot, { toValue: spin + dir * 25, duration: 90, useNativeDriver: true }),
        ]).start(() => {
          Animated.parallel([
            Animated.timing(ox, { toValue: pierceX, duration: 110, useNativeDriver: true }),
            Animated.timing(oy, { toValue: pierceY, duration: 110, useNativeDriver: true }),
            Animated.timing(rot, { toValue: spin + dir * 10, duration: 110, useNativeDriver: true }),
          ]).start(() => {
            Animated.parallel([
              Animated.timing(ox, { toValue: 0, duration: 260, useNativeDriver: true }),
              Animated.timing(oy, { toValue: 0, duration: 260, useNativeDriver: true }),
              Animated.timing(rot, { toValue: 0, duration: 260, useNativeDriver: true }),
            ]).start(() => op.setValue(0))
          })
        })
      })
    } else {
      const variants = [
        { tx: dir * CHAR_SIZE * 1.20, ty: CHAR_SIZE * 0.50, d: 240, rd: 210 },
        { tx: dir * CHAR_SIZE * 1.10, ty: CHAR_SIZE * 0.38, d: 200, rd: 190 },
        { tx: dir * CHAR_SIZE * 1.25, ty: CHAR_SIZE * 0.62, d: 260, rd: 220 },
      ]
      const v = variants[variant]
      const flyRot = angleToTarget(v.tx, v.ty)
      rot.setValue(flyRot)
      Animated.parallel([
        Animated.timing(ox, { toValue: v.tx, duration: v.d, useNativeDriver: true }),
        Animated.timing(oy, { toValue: v.ty, duration: v.d, useNativeDriver: true }),
        Animated.timing(rot, { toValue: flyRot + dir * 15, duration: v.d, useNativeDriver: true }),
      ]).start(() => {
        onHit()
        Animated.parallel([
          Animated.timing(ox, { toValue: 0, duration: v.rd, useNativeDriver: true }),
          Animated.timing(oy, { toValue: 0, duration: v.rd, useNativeDriver: true }),
          Animated.timing(rot, { toValue: flyRot, duration: v.rd, useNativeDriver: true }),
        ]).start(() => op.setValue(0))
      })
    }
  }

  const addLog = (p1Text: string, p1Color: string, p2Text: string, p2Color: string) => {
    if (!isMounted.current) return
    setLogEntries(prev => [...prev, { id: logIdRef.current++, p1Text, p1Color, p2Text, p2Color }])
    setTimeout(() => { if (isMounted.current) logScrollRef.current?.scrollToEnd({ animated: true }) }, 50)
  }

  // ─── EFFECT STATE HELPERS ─────────────────────────────────────────────────
  // Round başında her effect'in turn'ünü -1 yap, 0'a düşeni sil
  const tickEffects = (setFn: React.Dispatch<React.SetStateAction<ActiveEffect[]>>) => {
    setFn(prev =>
      prev.map(e =>
        e.turnsLeft !== undefined ? { ...e, turnsLeft: e.turnsLeft - 1 } : e
      ).filter(e => e.turnsLeft === undefined || e.turnsLeft > 0)
    )
  }

  // Aynı kind varsa replace, yoksa ekle
  const upsertEffect = (
    setFn: React.Dispatch<React.SetStateAction<ActiveEffect[]>>,
    kind: ActiveEffect['kind'], turnsLeft?: number, amount?: number,
  ) => {
    setFn(prev => [...prev.filter(e => e.kind !== kind), { kind, turnsLeft, amount }])
  }

  // Skill event'inden hangi state değişikliklerini yapacağımızı bul
  const applyEventToEffects = (ev: ChampionSkillEvent) => {
    const isP1 = ev.side === 'attacker'
    const setSelf = isP1 ? setP1Effects : setP2Effects
    const setEnemy = isP1 ? setP2Effects : setP1Effects

    if (ev.add_burn_turns)        upsertEffect(setEnemy, 'burn', ev.add_burn_turns, ev.add_burn_dmg)
    if (ev.add_poison_turns)      upsertEffect(setEnemy, 'poison', ev.add_poison_turns, ev.add_poison_dmg)
    if (ev.add_freeze_turns)      upsertEffect(setEnemy, 'freeze', ev.add_freeze_turns)
    if (ev.add_stun_turns)        upsertEffect(setEnemy, 'stun', ev.add_stun_turns)
    if (ev.add_blind_turns)       upsertEffect(setEnemy, 'blind', ev.add_blind_turns, ev.add_blind_chance)
    if (ev.add_enemy_atk_debuff)  upsertEffect(setEnemy, 'atk_debuff', ev.debuff_turns ?? 3, ev.add_enemy_atk_debuff)
    if (ev.add_enemy_def_debuff)  upsertEffect(setEnemy, 'def_debuff', ev.debuff_turns ?? 3, ev.add_enemy_def_debuff)

    if (ev.add_self_shield)       upsertEffect(setSelf, 'shield', undefined, ev.add_self_shield)
    if (ev.add_self_atk_buff)     upsertEffect(setSelf, 'atk_buff', ev.buff_turns ?? 3, ev.add_self_atk_buff)
    if (ev.add_self_def_buff)     upsertEffect(setSelf, 'def_buff', ev.buff_turns ?? 3, ev.add_self_def_buff)
    if (ev.add_self_dodge_buff)   upsertEffect(setSelf, 'dodge_buff', ev.buff_turns ?? 2, ev.add_self_dodge_buff)
    if (ev.add_self_crit_buff)    upsertEffect(setSelf, 'crit_buff', ev.buff_turns ?? 2, ev.add_self_crit_buff)
    if (ev.add_self_reflect)      upsertEffect(setSelf, 'reflect', 3, ev.add_self_reflect)
    if (ev.add_self_revive_pct)   upsertEffect(setSelf, 'revive', undefined, ev.add_self_revive_pct)

    if (ev.cleanse) {
      // self'ten tüm debuff'ları kaldır
      setSelf(prev => prev.filter(e => !['burn','poison','bleed','atk_debuff','def_debuff','blind','freeze','stun'].includes(e.kind)))
    }
  }

  // ─── CHAMPION SKILL CAST ──────────────────────────────────────────────────
  // Overlay'i göster, animasyon bitene kadar bekle
  const playSkillCast = async (ev: ChampionSkillEvent) => {
    if (isSkipped.current || !isMounted.current) return
    setSkillEvent(ev)
    // Overlay onDone resolve eder
    await new Promise<void>(res => {
      skillResolveRef.current = res
      setTimeout(() => {
        if (skillResolveRef.current) { skillResolveRef.current(); skillResolveRef.current = null }
      }, 1500) // safety timeout
    })
  }

  // ─── SALDIRI ───────────────────────────────────────────────────────────────
  const playAttack = async (
    attackerRef: React.RefObject<SpriteCharacterRef | null>,
    defenderRef: React.RefObject<SpriteCharacterRef | null>,
    dmg: number, isCrit: boolean, isDouble: boolean,
    isBlocked: boolean, isDodged: boolean,
    attackerSide: 'p1' | 'p2',
    newAttackerHp?: number, newDefenderHp?: number,
  ) => {
    if (!isMounted.current || isSkipped.current) return
    const defenderShake = attackerSide === 'p1' ? p2ShakeX : p1ShakeX
    const shakeDir      = attackerSide === 'p1' ? (1 as 1|-1) : (-1 as 1|-1)

    const punchPromise = attackerRef.current?.play('punch')
    await sleep(TIMING.SWORD_DELAY)
    if (!isMounted.current || isSkipped.current) return

    const reactionDone = new Promise<void>((resolve) => {
      if (isDodged) {
        throwSword(attackerSide, () => {
          spawnFloat(0, false, attackerSide === 'p1' ? 'p2' : 'p1', false, 'DODGE')
          if (attackerSide === 'p1') addLog('', COLORS.neonGreen as string, 'DODGE', '#00FFFF')
          else                       addLog('DODGE', '#00FFFF', '', COLORS.error as string)
          resolve()
        })
      } else if (isBlocked) {
        throwSword(attackerSide, () => {
          doShake(defenderShake, shakeDir)
          doHitFx(attackerSide === 'p1' ? 'p2' : 'p1', false, (attackerSide === 'p1' ? newDefenderHp : newAttackerHp) === 0)
          spawnFloat(0, false, attackerSide === 'p1' ? 'p2' : 'p1', false, 'BLOCK 🛡')
          if (attackerSide === 'p1' && newDefenderHp !== undefined) setP2Hp(Math.max(0, newDefenderHp))
          else if (newAttackerHp !== undefined) setP1Hp(Math.max(0, newAttackerHp))
          const dmgTxt = isDouble ? `×2 -${dmg}` : `-${dmg}`
          if (attackerSide === 'p1') addLog(dmgTxt, COLORS.neonGreen as string, 'BLOCK 🛡', '#3B82F6')
          else                       addLog('BLOCK 🛡', '#3B82F6', dmgTxt, COLORS.error as string)
          resolve()
        })
      } else if (isCrit) {
        throwSword(attackerSide, () => {
          doShake(defenderShake, shakeDir)
          doHitFx(attackerSide === 'p1' ? 'p2' : 'p1', true, (attackerSide === 'p1' ? newDefenderHp : newAttackerHp) === 0)
          spawnFloat(dmg, true, attackerSide === 'p1' ? 'p2' : 'p1', isDouble)
          if (attackerSide === 'p1' && newDefenderHp !== undefined) setP2Hp(Math.max(0, newDefenderHp))
          else if (newAttackerHp !== undefined) setP1Hp(Math.max(0, newAttackerHp))
          const dmgTxt = isDouble ? `×2 CRIT -${dmg}!` : `CRIT -${dmg}!`
          if (attackerSide === 'p1') addLog(dmgTxt, '#FFD700', '', '')
          else                       addLog('', '', dmgTxt, '#FFD700')
          resolve()
        }, true)
      } else {
        throwSword(attackerSide, () => {
          doShake(defenderShake, shakeDir)
          doHitFx(attackerSide === 'p1' ? 'p2' : 'p1', false, (attackerSide === 'p1' ? newDefenderHp : newAttackerHp) === 0)
          spawnFloat(dmg, false, attackerSide === 'p1' ? 'p2' : 'p1', isDouble)
          if (attackerSide === 'p1' && newDefenderHp !== undefined) setP2Hp(Math.max(0, newDefenderHp))
          else if (newAttackerHp !== undefined) setP1Hp(Math.max(0, newAttackerHp))
          const dmgTxt = isDouble ? `×2 -${dmg}` : `-${dmg}`
          if (attackerSide === 'p1') addLog(dmgTxt, COLORS.neonGreen as string, '', '')
          else                       addLog('', '', dmgTxt, COLORS.error as string)
          resolve()
        })
      }
    })
    await Promise.all([punchPromise, reactionDone])
  }

  // ─── SAVAŞ AKIŞI ───────────────────────────────────────────────────────────
  const runBattle = useCallback(async (r: ArenaBattleResult) => {
    await sleep(TIMING.START_DELAY)
    let p1HpCurrent = r.attacker_hp_start
    let p2HpCurrent = r.defender_hp_start

    for (let i = 0; i < r.round_logs.length; i++) {
      if (!isMounted.current || isSkipped.current) break
      const log = r.round_logs[i]
      setRoundNum(i + 1)
      // ✅ Her round başında effect timer'larını azalt (stun/burn/freeze expire olsun)
      tickEffects(setP1Effects)
      tickEffects(setP2Effects)

      // ✅ Bu round'daki champion skills array'ini parse et
      const skillsThisRound = log.champion_skills || []
      const attackerSkills = skillsThisRound.filter((ev: any) => ev.side === 'attacker' && ev.effect_type !== 'dot_tick' && ev.effect_type !== 'revive')
      const defenderSkills = skillsThisRound.filter((ev: any) => ev.side === 'defender' && ev.effect_type !== 'dot_tick' && ev.effect_type !== 'revive')

      // ── SKILL HELPER: skill cast oynat + HP güncelle ───────────────────────
      const playSkillGroup = async (skills: any[]) => {
        for (const ev of skills) {
          if (isSkipped.current) break
          await playSkillCast(ev)
          if (isSkipped.current) break
          applyEventToEffects(ev)
          const skillName = ev.skill_name ?? 'Skill'
          if (ev.dmg_to_enemy && ev.dmg_to_enemy > 0) {
            const txt = `✨ ${skillName} -${ev.dmg_to_enemy}`
            if (ev.side === 'attacker') addLog(txt, '#A855F7', '', '')
            else                        addLog('', '', txt, '#A855F7')
            const targetSide = ev.side === 'attacker' ? 'p2' : 'p1'
            spawnFloat(ev.dmg_to_enemy, false, targetSide, false, `✨ -${ev.dmg_to_enemy}`, '#A855F7', 20)
            if (ev.side === 'attacker') {
              p2HpCurrent = Math.max(0, p2HpCurrent - ev.dmg_to_enemy)
              setP2Hp(p2HpCurrent)
            } else {
              p1HpCurrent = Math.max(0, p1HpCurrent - ev.dmg_to_enemy)
              setP1Hp(p1HpCurrent)
            }
          }
          if (ev.heal_self && ev.heal_self > 0) {
            const txt = `✨ ${skillName} +${ev.heal_self}HP`
            if (ev.side === 'attacker') addLog(txt, '#00FF88', '', '')
            else                        addLog('', '', txt, '#00FF88')
            const selfSide = ev.side === 'attacker' ? 'p1' : 'p2'
            spawnFloat(ev.heal_self, false, selfSide, false, `💚 +${ev.heal_self}`, '#00FF88', 18)
            // ✅ HP bar'ı anında güncelle — heal animasyonuyla senkron
            if (ev.side === 'attacker') {
              p1HpCurrent = Math.min(r.attacker_hp_start, p1HpCurrent + ev.heal_self)
              setP1Hp(p1HpCurrent)
            } else {
              p2HpCurrent = Math.min(r.defender_hp_start, p2HpCurrent + ev.heal_self)
              setP2Hp(p2HpCurrent)
            }
          }
          if (ev.add_self_shield) {
            const selfSide = ev.side === 'attacker' ? 'p1' : 'p2'
            spawnFloat(ev.add_self_shield, false, selfSide, false, `🛡 +${ev.add_self_shield}`, '#3B82F6', 18)
          }
          if (ev.cleanse) {
            const selfSide = ev.side === 'attacker' ? 'p1' : 'p2'
            spawnFloat(0, false, selfSide, false, '✨ CLEANSE', '#00FF88', 16)
          }
          // ✅ Revive event — HP bar'ı 0'dan revive HP'sine atla
          if (ev.effect_type === 'revive_setup' && ev.heal_self && ev.heal_self > 0) {
            const selfSide = ev.side === 'attacker' ? 'p1' : 'p2'
            spawnFloat(ev.heal_self, false, selfSide, false, `⚡ REVIVE +${ev.heal_self}`, '#FFD700', 20)
            if (ev.side === 'attacker') {
              p1HpCurrent = ev.heal_self
              setP1Hp(p1HpCurrent)
            } else {
              p2HpCurrent = ev.heal_self
              setP2Hp(p2HpCurrent)
            }
          }
        }
      }

      // 1. ÖNCE: dot_tick'ler (renkli floating damage + HP düş)
      for (const ev of skillsThisRound) {
        if (ev.effect_type !== 'dot_tick' || isSkipped.current) continue
        const side = ev.side === 'attacker' ? 'p1' : 'p2'
        const dotKind = ev.dot_kind ?? 'burn'
        const dotColor = DOT_COLORS[dotKind] ?? '#FF6600'
        const emoji = dotKind === 'burn' ? '🔥' : dotKind === 'poison' ? '☠' : '🩸'
        const dotDmg = ev.dmg_to_enemy ?? ev.value ?? 0
        spawnFloat(dotDmg, false, side, false,
          `${emoji} -${dotDmg}`, dotColor, 16)
        if (side === 'p1') {
          p1HpCurrent = Math.max(0, p1HpCurrent - dotDmg)
          setP1Hp(p1HpCurrent)
        } else {
          p2HpCurrent = Math.max(0, p2HpCurrent - dotDmg)
          setP2Hp(p2HpCurrent)
        }
      }

      // 2. Normal saldırılar + champion skill'ler — SIRA:
      // attacker_first: P1 saldırı → P1 skill → P2 saldırı → P2 skill
      // defender_first: P2 saldırı → P2 skill → P1 saldırı → P1 skill
      if (r.attacker_first) {
        // ── P1 saldırı ──────────────────────────────────────────────────────
        const p2After = (log.defender_dodged || log.defender_blocked)
          ? p2HpCurrent
          : Math.max(0, p2HpCurrent - log.attacker_dmg)
        await playAttack(p1Ref, p2Ref, log.attacker_dmg, log.attacker_crit, log.attacker_double, log.defender_blocked, log.defender_dodged, 'p1', undefined, p2After)
        p2HpCurrent = p2After
        if (!isMounted.current || isSkipped.current) break

        // ── P1 champion skill (CD hazırsa SQL zaten koyar) ─────────────────
        if (attackerSkills.length > 0) {
          await sleep(300)
          if (!isMounted.current || isSkipped.current) break
          await playSkillGroup(attackerSkills)
          if (!isMounted.current || isSkipped.current) break
        }

        // ── P2 saldırı (stun/freeze varsa dmg=0 olabilir, ama blok kontrol et) ─
        if (log.defender_hp_after > 0 && (log.defender_dmg > 0 || log.attacker_blocked || log.attacker_dodged)) {
          await sleep(TIMING.BETWEEN)
          if (!isMounted.current || isSkipped.current) break
          const p1After = (log.attacker_dodged || log.attacker_blocked)
            ? p1HpCurrent
            : Math.max(0, p1HpCurrent - log.defender_dmg)
          await playAttack(p2Ref, p1Ref, log.defender_dmg, log.defender_crit, log.defender_double, log.attacker_blocked, log.attacker_dodged, 'p2', p1After, undefined)
          p1HpCurrent = p1After
          if (!isMounted.current || isSkipped.current) break
        }

        // ── P2 champion skill — ATTACK'TAN BAĞIMSIZ: stun olsa da skill atar ─
        // SQL defender canlıysa skill ekler, yoksa eklemiyor zaten
        if (defenderSkills.length > 0) {
          await sleep(300)
          if (!isMounted.current || isSkipped.current) break
          await playSkillGroup(defenderSkills)
          if (!isMounted.current || isSkipped.current) break
        }

      } else {
        // ── P2 saldırı ──────────────────────────────────────────────────────
        if (log.defender_dmg > 0 || log.attacker_blocked || log.attacker_dodged) {
          const p1After = (log.attacker_dodged || log.attacker_blocked)
            ? p1HpCurrent
            : Math.max(0, p1HpCurrent - log.defender_dmg)
          await playAttack(p2Ref, p1Ref, log.defender_dmg, log.defender_crit, log.defender_double, log.attacker_blocked, log.attacker_dodged, 'p2', p1After, undefined)
          p1HpCurrent = p1After
          if (!isMounted.current || isSkipped.current) break
        }

        // ── P2 champion skill — ATTACK'TAN BAĞIMSIZ ───────────────────────
        if (defenderSkills.length > 0) {
          await sleep(300)
          if (!isMounted.current || isSkipped.current) break
          await playSkillGroup(defenderSkills)
          if (!isMounted.current || isSkipped.current) break
        }

        // ── P1 saldırı ──────────────────────────────────────────────────────
        if (log.attacker_hp_after > 0) {
          await sleep(TIMING.BETWEEN)
          if (!isMounted.current || isSkipped.current) break
          const p2After = (log.defender_dodged || log.defender_blocked)
            ? p2HpCurrent
            : Math.max(0, p2HpCurrent - log.attacker_dmg)
          await playAttack(p1Ref, p2Ref, log.attacker_dmg, log.attacker_crit, log.attacker_double, log.defender_blocked, log.defender_dodged, 'p1', undefined, p2After)
          p2HpCurrent = p2After
          if (!isMounted.current || isSkipped.current) break

          // ── P1 champion skill — ATTACK'TAN BAĞIMSIZ ─────────────────────
          if (attackerSkills.length > 0) {
            await sleep(300)
            if (!isMounted.current || isSkipped.current) break
            await playSkillGroup(attackerSkills)
            if (!isMounted.current || isSkipped.current) break
          }
        }
      }
      if (!isMounted.current || isSkipped.current) break

      // Revive skill'leri (sıradan bağımsız)
      for (const ev of skillsThisRound) {
        if (ev.effect_type !== 'revive' || isSkipped.current) continue
        await playSkillCast(ev)
        applyEventToEffects(ev)
      }

      // ✅ FINAL HP SYNC — round sonu HP'lerini bar'a kesin yansıt
      // Bu blok dodge/block/freeze/stun gibi durumlarda da, çünkü skill damage veya
      // DoT tick'ler HP'yi etkilemiş olabilir. Backend zaten round sonu HP'sini gönderiyor.
      if (isMounted.current && !isSkipped.current) {
        setP1Hp(Math.max(0, log.attacker_hp_after))
        setP2Hp(Math.max(0, log.defender_hp_after))
        p1HpCurrent = Math.max(0, log.attacker_hp_after)
        p2HpCurrent = Math.max(0, log.defender_hp_after)
      }

      if (i === r.round_logs.length - 1) break
      await sleep(TIMING.ROUND_GAP)
    }

    if (!isMounted.current) return
    if (isSkipped.current) { finishBattle(r); return }
    const p1Won = r.result === 'attacker_win'
    if (p1Won) {
      p2SquishY.stopAnimation()
      p2SquishY.setValue(1)
      p2Ref.current?.play('dead')
    } else {
      p1SquishY.stopAnimation()
      p1SquishY.setValue(1)
      p1Ref.current?.play('dead')
    }
    await sleep(TIMING.DEATH_DELAY)
    if (isMounted.current) finishBattle(r)
  }, [])

  const finishBattle = (r: ArenaBattleResult) => {
    if (!isMounted.current) return
    setShowSkip(false)
    Animated.timing(logOp, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
      if (!isMounted.current) return
      setPhase('result')
      Animated.timing(resultOp, { toValue: 1, duration: 500, useNativeDriver: true }).start()
    })
  }

  const handleSkip = () => {
    isSkipped.current = true
    if (skillResolveRef.current) { skillResolveRef.current(); skillResolveRef.current = null }
    if (result) { setP1Hp(Math.max(0, result.attacker_hp_end)); setP2Hp(Math.max(0, result.defender_hp_end)) }
    setShowSkip(false)
    if (result) finishBattle(result)
  }

  if (!result) return null
  const isVictory = result.result === 'attacker_win'

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.root, { opacity: rootFadeOp }]}>

        <ImageBackground source={require('../../assets/images/arena_bg.jpg')} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.30)' }]} />

        {/* ══ STATS PANEL ══ */}
        {!!(battleReady) && <Animated.View style={styles.statsPanel}>
          <View style={styles.statsPlayerCol}>
            <Text style={[styles.statsName, { color: COLORS.neonGreen as string }]} numberOfLines={1}>{playerName}</Text>
            {!!(playerStats) && (
              <View style={styles.miniStats}>
                <StatRow label="ATK:"  value={playerStats.atk.toLocaleString()} />
                <StatRow label="HP:"   value={playerStats.hp.toLocaleString()} />
                <StatRow label="DEF:"  value={playerStats.def} />
                <StatRow label="CRT:"  value={`${playerStats.crit}%`} />
                <StatRow label="CRTD:" value={`${playerStats.critDmg}%`} />
                <StatRow label="SPD:"  value={playerStats.spd} />
              </View>
            )}
          </View>
          <View style={styles.roundBox}>
            <Text style={styles.roundNum}>{phase === 'battle' ? roundNum || '—' : '✓'}</Text>
            <Text style={styles.roundSub}>/{total}</Text>
          </View>
          <View style={[styles.statsPlayerCol, { alignItems: 'flex-end' }]}>
            <Text style={[styles.statsName, { color: COLORS.error as string }]} numberOfLines={1}>{result.defender_name}</Text>
            {!!(defenderStats) && (
              <View style={[styles.miniStats, { alignItems: 'flex-end' }]}>
                <StatRow label="ATK:"  value={defenderStats.atk.toLocaleString()} />
                <StatRow label="HP:"   value={defenderStats.hp.toLocaleString()} />
                <StatRow label="DEF:"  value={defenderStats.def} />
                <StatRow label="CRT:"  value={`${defenderStats.crit}%`} />
                <StatRow label="CRTD:" value={`${defenderStats.critDmg}%`} />
                <StatRow label="SPD:"  value={defenderStats.spd} />
              </View>
            )}
          </View>
        </Animated.View>}

        {/* ══ ARENA ══ */}
        <View style={styles.arenaSection}>
          {/* P1 */}
          <View style={styles.charWrap}>
            {!!(battleReady) && (
              <View style={{ width: CHAR_SIZE * 0.88, alignSelf: 'center' }}>
                {p1Effects.some(e => e.kind === 'stun' && typeof e.turnsLeft === 'number' && e.turnsLeft > 0) ? (
                  <View style={styles.stunBadgeRow}>
                    <View style={styles.stunBadge}><Text style={styles.stunBadgeIcon}>💫 STUNNED</Text></View>
                  </View>
                ) : (
                  <View style={styles.stunBadgeRowEmpty} />
                )}
                <CharHpBar current={p1Hp} max={p1HpMax} color={COLORS.neonGreen as string} width={CHAR_SIZE * 0.88} align="left" />
              </View>
            )}
            <Animated.View style={{
              marginRight: -CHAR_SIZE * CHAR_OVERLAP,
              transform: [
                { translateX: p1ShakeX },
                { scale: p1EntScale },
                { scaleY: p1SquishY },
              ],
              opacity: p1EntOp,
            }}>
              <SpriteCharacter key={`p1-${battleKey}`} ref={p1Ref} mirror={false} size={CHAR_SIZE} classType={playerClass ?? 'vanguard'} />
            </Animated.View>
            {battleReady && p1HitFx !== null && <HitFx key={`hfx1-${p1HitFx}`} isCrit={p1HitCrit} charSize={CHAR_SIZE} />}
            <SwordTrail rarity={playerSwordRarity} charSize={CHAR_SIZE}
              swordX={swordX} swordY={swordY} swordOpacity={swordOpacity} />
            <Animated.Image
              source={SWORD_IMAGES[playerSwordRarity] || SWORD_IMAGES['Common']}
              style={{
                position: 'absolute', width: CHAR_SIZE * 0.50, height: CHAR_SIZE * 0.50,
                top: -CHAR_SIZE * 0.30, left: CHAR_SIZE * 0,
                opacity: swordOpacity,
                transform: [
                  { translateX: swordX }, { translateY: swordY },
                  { rotate: swordRot.interpolate({ inputRange: [-720, 720], outputRange: ['-720deg', '720deg'] }) },
                ],
              }}
            />
            <View style={styles.floatArea}>
              {battleReady && floatDmgs.filter(f => f.side === 'p1').map(f => (
                <FloatingDamageItem key={f.id} item={f} onDone={removeFloat} />
              ))}
            </View>
          </View>

          {/* P2 */}
          <View style={styles.charWrap}>
            {!!(battleReady) && (
              <View style={{ width: CHAR_SIZE * 0.88, alignSelf: 'center' }}>
                {p2Effects.some(e => e.kind === 'stun' && typeof e.turnsLeft === 'number' && e.turnsLeft > 0) ? (
                  <View style={[styles.stunBadgeRow, { justifyContent: 'flex-end' }]}>
                    <View style={styles.stunBadge}><Text style={styles.stunBadgeIcon}>💫 STUNNED</Text></View>
                  </View>
                ) : (
                  <View style={styles.stunBadgeRowEmpty} />
                )}
                <CharHpBar current={p2Hp} max={p2HpMax} color={COLORS.error as string} width={CHAR_SIZE * 0.88} align="right" />
              </View>
            )}
            <Animated.View style={{
              marginLeft: -CHAR_SIZE * CHAR_OVERLAP,
              transform: [
                { translateX: p2ShakeX },
                { scale: p2EntScale },
                { scaleY: p2SquishY },
              ],
              opacity: p2EntOp,
            }}>
              <SpriteCharacter key={`p2-${battleKey}`} ref={p2Ref} mirror={true} size={CHAR_SIZE} classType={defenderClass ?? 'vanguard'} />
            </Animated.View>
            {battleReady && p2HitFx !== null && <HitFx key={`hfx2-${p2HitFx}`} isCrit={p2HitCrit} charSize={CHAR_SIZE} />}
            <SwordTrail rarity={defenderSwordRarity} charSize={CHAR_SIZE}
              swordX={p2SwordX} swordY={p2SwordY} swordOpacity={p2SwordOp} mirror />
            <Animated.Image
              source={SWORD_IMAGES[defenderSwordRarity] || SWORD_IMAGES['Common']}
              style={{
                position: 'absolute', width: CHAR_SIZE * 0.50, height: CHAR_SIZE * 0.50,
                top: -CHAR_SIZE * 0.30, right: CHAR_SIZE * 0.0,
                opacity: p2SwordOp,
                transform: [
                  { translateX: p2SwordX }, { translateY: p2SwordY },
                  { rotate: p2SwordRot.interpolate({ inputRange: [-720, 720], outputRange: ['-720deg', '720deg'] }) },
                  { scaleX: -1 },
                ],
              }}
            />
            <View style={styles.floatArea}>
              {battleReady && floatDmgs.filter(f => f.side === 'p2').map(f => (
                <FloatingDamageItem key={f.id} item={f} onDone={removeFloat} />
              ))}
            </View>
          </View>
        </View>

        {/* ══ LOG / SONUÇ ══ */}
        <View style={styles.bottomSection}>
          {phase === 'battle' && (
            <Animated.View style={[styles.logPanel, { opacity: logOp }]}>
              <View style={styles.logHeader}>
                <Text style={[styles.logHeaderText, { color: COLORS.neonGreen as string }]}>{playerName}</Text>
                <Text style={[styles.logHeaderText, { color: COLORS.error as string, textAlign: 'right' }]}>{result.defender_name}</Text>
              </View>
              <View style={styles.logDivider} />
              <ScrollView ref={logScrollRef} style={styles.logScroll} showsVerticalScrollIndicator={false}>
                {logEntries.map(entry => <LogRow key={entry.id} entry={entry} />)}
                {logEntries.length === 0 && <Text style={styles.logEmpty}>Battle starting...</Text>}
              </ScrollView>
            </Animated.View>
          )}
          {phase === 'result' && (
            <Animated.View style={[styles.resultPanel, { opacity: resultOp }]}>
              <Text style={[styles.resultTitle, { color: isVictory ? COLORS.neonGreen : COLORS.error }]}>
                {isVictory ? 'VICTORY' : 'DEFEAT'}
              </Text>
              <View style={styles.resultRow}>
                <View style={styles.resultStat}>
                  <Text style={styles.resultVal}>{total}</Text>
                  <Text style={styles.resultLabel}>ROUNDS</Text>
                </View>
                <View style={styles.resultDiv} />
                <View style={styles.resultStat}>
                  <Text style={[styles.resultVal, { color: isVictory ? COLORS.neonGreen : COLORS.error }]}>{isVictory ? '+20' : '-15'}</Text>
                  <Text style={styles.resultLabel}>POINTS</Text>
                </View>
                <View style={styles.resultDiv} />
                <View style={styles.resultStat}>
                  <Text style={styles.resultVal}>{result.battles_remaining}</Text>
                  <Text style={styles.resultLabel}>LEFT</Text>
                </View>
              </View>
              <Text style={styles.resultPts}>{result.attacker_points_before} → {result.attacker_points_after} PTS</Text>
              <TouchableOpacity
                style={[styles.continueBtn, {
                  borderColor: isVictory ? COLORS.neonGreen : COLORS.error,
                  backgroundColor: isVictory ? 'rgba(0,255,136,0.08)' : 'rgba(255,68,68,0.08)',
                }]}
                onPress={onClose}
              >
                <Text style={[styles.continueBtnText, { color: isVictory ? COLORS.neonGreen : COLORS.error }]}>CONTINUE</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        {showSkip && phase === 'battle' && (
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>SKIP ▶▶</Text>
          </TouchableOpacity>
        )}

        {/* ✅ Champion skill overlay — modal'ın en üstünde */}
        <ChampionSkillOverlay
          event={skillEvent}
          onDone={() => {
            setSkillEvent(null)
            if (skillResolveRef.current) {
              skillResolveRef.current()
              skillResolveRef.current = null
            }
          }}
        />

      </Animated.View>
    </Modal>
  )
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const STATS_H  = 145
const BOTTOM_H = 210

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050A0F' },
  statsPanel: {
    position: 'absolute', top: 44, left: 10, right: 10, height: STATS_H,
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', zIndex: 20,
  },
  statsPlayerCol: { flex: 1 },
  statsName:  { fontSize: 13, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
  hpText:     { fontSize: 11, fontWeight: '700', marginTop: 2, marginBottom: 4 },
  miniStats:  { flexDirection: 'column', marginTop: 4, gap: 0 },
  roundBox:   { width: 44, alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  roundNum:   { fontSize: 22, fontWeight: '900', color: '#fff' },
  roundSub:   { fontSize: 9, color: 'rgba(255,255,255,0.35)' },
  arenaSection: {
    position: 'absolute',
    bottom: BOTTOM_H - -40,
    left: 10, right: 10,
    height: height - STATS_H - 44 - BOTTOM_H + 20,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
  },
  charWrap: { position: 'relative' },
  floatArea: {
    position: 'absolute', top: -60, left: 0, right: 0,
    height: 80, alignItems: 'center', pointerEvents: 'none',
  } as any,
  bottomSection: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: BOTTOM_H,
    backgroundColor: 'rgba(2,6,12,0.92)', borderTopWidth: 1, borderTopColor: 'rgba(0,212,255,0.12)',
  },
  logPanel:      { flex: 1, paddingHorizontal: 14, paddingTop: 8 },
  logHeader:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  logHeaderText: { fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  logDivider:    { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 4 },
  logScroll:     { flex: 1 },
  logEmpty:      { fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 20 },
  resultPanel:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  resultTitle:     { fontSize: 32, fontWeight: '900', letterSpacing: 6 },
  resultRow:       { flexDirection: 'row', alignItems: 'center', gap: 16 },
  resultStat:      { alignItems: 'center', gap: 2 },
  resultVal:       { fontSize: 20, fontWeight: '900', color: '#fff' },
  resultLabel:     { fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 2 },
  resultDiv:       { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.08)' },
  resultPts:       { fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 2 },
  continueBtn:     { borderWidth: 1, borderRadius: 2, paddingHorizontal: 36, paddingVertical: 11 },
  continueBtnText: { fontSize: 13, fontWeight: '900', letterSpacing: 4 },
  skipBtn: {
    position: 'absolute', bottom: BOTTOM_H + 10, right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7, zIndex: 40,
  },
  skipText: { fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 2 },
  stunBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 18,
    marginBottom: 4,
  },
  stunBadgeRowEmpty: {
    height: 18,
    marginBottom: 4,
  },
  stunBadge: {
    backgroundColor: 'rgba(255, 220, 0, 0.15)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 220, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  stunBadgeIcon: {
    fontSize: 10,
    color: '#FFD700',
    fontWeight: '700',
  },
})