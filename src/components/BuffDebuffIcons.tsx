// =============================================
// ECHO RIFT — BUFF / DEBUFF ICONS
// HP bar üstünde aktif effect'leri gösterir
// 🔥 Burn, ❄️ Freeze, 💀 Poison, 🛡 Shield, ⚔️ Atk Buff, vs.
// Üzerinde duran sayı = kalan turn
// =============================================

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export interface ActiveEffect {
  kind: 'burn' | 'poison' | 'bleed' | 'freeze' | 'stun' | 'shield' | 'atk_buff' | 'def_buff' | 'dodge_buff' | 'crit_buff' | 'atk_debuff' | 'def_debuff' | 'reflect' | 'blind' | 'revive'
  turnsLeft?: number   // kalan turn (1+)
  amount?: number      // shield miktarı, % buff, vs.
}

const EFFECT_META: Record<string, { icon: string; color: string; isDebuff: boolean }> = {
  burn:        { icon: '🔥', color: '#FF6600', isDebuff: true  },
  poison:      { icon: '💚', color: '#88FF00', isDebuff: true  },
  bleed:       { icon: '🩸', color: '#FF2244', isDebuff: true  },
  freeze:      { icon: '❄️', color: '#00D4FF', isDebuff: true  },
  stun:        { icon: '💫', color: '#FFEE00', isDebuff: true  },
  shield:      { icon: '🛡',  color: '#3B82F6', isDebuff: false },
  atk_buff:    { icon: '⚔️', color: '#FF4444', isDebuff: false },
  def_buff:    { icon: '🛡',  color: '#22C55E', isDebuff: false },
  dodge_buff:  { icon: '👁',  color: '#A855F7', isDebuff: false },
  crit_buff:   { icon: '💥', color: '#FFD700', isDebuff: false },
  atk_debuff:  { icon: '⚔️', color: '#666666', isDebuff: true  },
  def_debuff:  { icon: '🛡',  color: '#666666', isDebuff: true  },
  reflect:     { icon: '🪞', color: '#EC4899', isDebuff: false },
  blind:       { icon: '🌑', color: '#444444', isDebuff: true  },
  revive:      { icon: '✨', color: '#00FF88', isDebuff: false },
}

interface Props {
  effects: ActiveEffect[]
  align?: 'left' | 'right'
  width?: number
}

export default function BuffDebuffIcons({ effects, align = 'left', width: widthProp }: Props) {
  if (effects.length === 0) return null
  return (
    <View style={[
      styles.row,
      { justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        width: widthProp },
    ]}>
      {effects.slice(0, 6).map((eff, i) => {
        const meta = EFFECT_META[eff.kind] || EFFECT_META.burn
        return (
          <View
            key={`${eff.kind}-${i}`}
            style={[styles.iconBox, { borderColor: meta.color + 'A0', backgroundColor: meta.color + '22' }]}
          >
            <Text style={styles.icon}>{meta.icon}</Text>
            {eff.turnsLeft !== undefined && eff.turnsLeft > 0 && (
              <Text style={[styles.turnsLeft, { color: meta.color }]}>{eff.turnsLeft}</Text>
            )}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  iconBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  icon: { fontSize: 11 },
  turnsLeft: {
    position: 'absolute',
    bottom: -4,
    right: -3,
    fontSize: 8,
    fontWeight: '900',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 2,
    borderRadius: 2,
    minWidth: 9,
    textAlign: 'center',
  },
})
