// =============================================
// ECHO RIFT — TIER BADGE
// Compact prestige tier indicator. Drop-in for headers, cards, lists.
// Hidden when tier <= 0 (no clutter for new players).
// Color tiers: T1-4 neon, T5-9 gold, T10+ violet (visible flex).
// =============================================

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { COLORS } from '../constants'

interface Props {
  tier: number | null | undefined
  size?: 'xs' | 'sm' | 'md' | 'lg'
  hideWhenZero?: boolean
}

export function TierBadge({ tier, size = 'sm', hideWhenZero = true }: Props) {
  const t = Math.max(0, tier ?? 0)
  if (hideWhenZero && t <= 0) return null

  const color =
    t >= 10 ? '#A855F7'
    : t >= 5  ? (COLORS.gold as string)
    : (COLORS.neonGreen as string)

  const dim = size === 'lg' ? { px: 10, py: 5, font: 16 }
            : size === 'md' ? { px: 7,  py: 3, font: 12 }
            : size === 'xs' ? { px: 4,  py: 1, font: 8  }
            : /* sm */         { px: 6,  py: 2, font: 10 }

  return (
    <View style={[
      styles.box,
      {
        borderColor: color,
        backgroundColor: color + '18',
        paddingHorizontal: dim.px,
        paddingVertical: dim.py,
      },
    ]}>
      <Text style={[styles.text, { fontSize: dim.font, color }]}>
        T{t}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '900',
    letterSpacing: 1,
  },
})
