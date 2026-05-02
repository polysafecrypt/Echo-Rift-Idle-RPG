// =============================================
// ECHO RIFT — CHAMPION SKILL OVERLAY
// Skill cast'inde:
//   1. Element renkli full-screen flash (200ms)
//   2. Champion portrait slide-in (sağdan veya soldan, attacker/defender'a göre)
//   3. Skill ismi merkezi büyük text (600ms görünür, fade out)
//   4. Champion 800ms beklevip slide-out
// =============================================

import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native'
import { ChampionSkillEvent, ELEMENT_COLORS, ELEMENT_GLOW, ELEMENT_ICONS, ElementType } from '../types'

const { width, height } = Dimensions.get('window')

export interface SkillCastProps {
  event: ChampionSkillEvent | null
  onDone: () => void
}

// Effect type'a göre subtitle (kısa ve etkili)
function getEffectSubtitle(ev: ChampionSkillEvent): string {
  switch (ev.effect_type) {
    case 'damage':         return `${ev.value} DAMAGE`
    case 'multi_damage':   return `${ev.value} × ${ev.hits ?? 3} HITS`
    case 'pierce_damage':  return `${ev.value} PIERCING`
    case 'heal':           return `+${ev.heal_self} HP`
    case 'lifesteal':      return `${ev.dmg_to_enemy} + LIFESTEAL`
    case 'lifesteal_burst':return `+${ev.heal_self} HP DRAIN`
    case 'execute':        return ev.executed ? '☠ EXECUTE!' : `${ev.value} DMG`
    case 'dot_burn':       return `BURN — ${ev.add_burn_dmg}/turn × ${ev.add_burn_turns}`
    case 'dot_poison':     return `POISON — ${ev.add_poison_dmg}/turn × ${ev.add_poison_turns}`
    case 'dot_periodic':   return `PERIODIC — ${ev.add_burn_dmg}/turn`
    case 'stun':           return `${ev.value} + STUN!`
    case 'freeze':         return `${ev.value} + FREEZE!`
    case 'shield':         return `+${ev.add_self_shield} SHIELD`
    case 'reflect':        return `${ev.add_self_reflect}% REFLECT × 3`
    case 'revive_setup':   return `REVIVE READY @ ${ev.add_self_revive_pct}% HP`
    case 'atk_buff':       return `+${ev.add_self_atk_buff}% ATK × ${ev.buff_turns}`
    case 'def_buff':       return `+${ev.add_self_def_buff} DEF × ${ev.buff_turns}`
    case 'dodge_buff':     return `+${ev.add_self_dodge_buff}% DODGE × ${ev.buff_turns}`
    case 'crit_buff':      return `+${ev.add_self_crit_buff}% CRIT × ${ev.buff_turns}`
    case 'atk_debuff':     return `−${ev.add_enemy_atk_debuff}% ENEMY ATK`
    case 'def_debuff':     return `−${ev.add_enemy_def_debuff}% ENEMY DEF`
    case 'blind':          return `BLIND — ${ev.add_blind_chance}% MISS`
    case 'cleanse':        return 'CLEANSED!'
    case 'ultimate':       return `⚡ ULT — ${ev.value} DMG`
    default:               return (ev.value ? `${ev.value}` : '')
  }
}

export default function ChampionSkillOverlay({ event, onDone }: SkillCastProps) {
  const flashOp     = useRef(new Animated.Value(0)).current
  const portraitX   = useRef(new Animated.Value(0)).current
  const portraitOp  = useRef(new Animated.Value(0)).current
  const portraitScale = useRef(new Animated.Value(0.5)).current
  const titleOp     = useRef(new Animated.Value(0)).current
  const titleScale  = useRef(new Animated.Value(0.6)).current
  const subOp       = useRef(new Animated.Value(0)).current

  const [activeEvent, setActiveEvent] = useState<ChampionSkillEvent | null>(null)

  useEffect(() => {
    if (!event) return
    setActiveEvent(event)

    const isAttacker = event.side === 'attacker'
    // Slide-in: ekran dışından (kendi tarafından) gelir, container kenarda durur
    // Container left:16 / right:16 → portrait kenardan iç tarafta görünür
    const startX = isAttacker ? -width * 0.6 : width * 0.6
    const settleX = 0

    flashOp.setValue(0)
    portraitX.setValue(startX)
    portraitOp.setValue(0)
    portraitScale.setValue(0.5)
    titleOp.setValue(0)
    titleScale.setValue(0.6)
    subOp.setValue(0)

    Animated.sequence([
      // 1. Element flash (200ms full-screen)
      Animated.parallel([
        Animated.timing(flashOp, { toValue: 0.32, duration: 100, useNativeDriver: true }),
        Animated.timing(flashOp, { toValue: 0,    duration: 100, useNativeDriver: true, delay: 100 }),
      ]),
      // 2. Portrait slide-in + title fade in (300ms parallel)
      Animated.parallel([
        Animated.timing(portraitOp, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(portraitX, { toValue: settleX, tension: 80, friction: 8, useNativeDriver: true }),
        Animated.spring(portraitScale, { toValue: 1, tension: 90, friction: 6, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(150),
          Animated.parallel([
            Animated.timing(titleOp,    { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.spring(titleScale, { toValue: 1, tension: 130, friction: 6, useNativeDriver: true }),
            Animated.timing(subOp,      { toValue: 1, duration: 250, useNativeDriver: true }),
          ]),
        ]),
      ]),
      // 3. Hold (550ms)
      Animated.delay(550),
      // 4. Fade out (250ms)
      Animated.parallel([
        Animated.timing(portraitOp, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(titleOp,    { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(subOp,      { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(portraitX,  { toValue: startX, duration: 280, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setActiveEvent(null)
      onDone()
    })
  }, [event])

  if (!activeEvent) return null

  const elem = (activeEvent.element ?? 'fire') as ElementType
  const flashColor = ELEMENT_COLORS[elem] ?? '#FF6600'
  const glowColor  = ELEMENT_GLOW[elem]   ?? 'rgba(255,102,0,0.55)'
  const skillName  = activeEvent.skill_name?.toUpperCase() ?? activeEvent.effect_raw ?? ''
  const subtitle   = getEffectSubtitle(activeEvent)
  const isAttacker = activeEvent.side === 'attacker'

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Element flash overlay */}
      <Animated.View style={[
        StyleSheet.absoluteFill,
        { backgroundColor: flashColor, opacity: flashOp },
      ]} />

      {/* Portrait sürgüsü */}
      <Animated.View style={[
        styles.portraitContainer,
        {
          [isAttacker ? 'left' : 'right']: 16,
          transform: [{ translateX: portraitX }, { scale: portraitScale }],
          opacity: portraitOp,
        },
      ]}>
        <View style={[styles.portraitCircle, { borderColor: flashColor, shadowColor: glowColor }]}>
          <Text style={styles.portraitEmoji}>{ELEMENT_ICONS[elem] ?? '✨'}</Text>
        </View>
        <View style={[styles.elementBadge, { backgroundColor: flashColor }]}>
          <Text style={styles.elementBadgeText}>{elem.toUpperCase()}</Text>
        </View>
      </Animated.View>

      {/* Skill ismi merkezi */}
      <View style={styles.titleWrap} pointerEvents="none">
        <Animated.Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={[
            styles.skillTitle,
            {
              color: flashColor,
              textShadowColor: glowColor,
              opacity: titleOp,
              transform: [{ scale: titleScale }],
            },
          ]}>
          {skillName}
        </Animated.Text>
        <Animated.Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={[
            styles.skillSub,
            { opacity: subOp, color: '#FFFFFF', textShadowColor: flashColor },
          ]}>
          {subtitle}
        </Animated.Text>
      </View>
    </View>
  )
}

const PORTRAIT_SIZE = 92

const styles = StyleSheet.create({
  portraitContainer: {
    position: 'absolute',
    top: height * 0.42,
    width: PORTRAIT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  portraitCircle: {
    width: PORTRAIT_SIZE,
    height: PORTRAIT_SIZE,
    borderRadius: PORTRAIT_SIZE / 2,
    borderWidth: 3,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  portraitEmoji: { fontSize: 46 },
  elementBadge: {
    position: 'absolute',
    bottom: -10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  elementBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1.5,
  },
  titleWrap: {
    position: 'absolute',
    top: height * 0.22,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 31,
  },
  skillTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    paddingHorizontal: 4,
    textAlign: 'center',
    width: '100%',
  },
  skillSub: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 6,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    paddingHorizontal: 4,
    textAlign: 'center',
    width: '100%',
  },
})