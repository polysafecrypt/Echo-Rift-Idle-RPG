// =============================================
// ECHO RIFT — RARITY AURA (v5, neon + cool)
// All rarities (Uncommon+) get a neon pulse, but only the OPACITY
// animates. useNativeDriver=true so the work runs on the GPU/UI
// thread, not the JS thread. borderWidth + borderColor stay static,
// so there's no layout recalc per frame either.
//
// Result: 50 items in a FlatList = 50 GPU opacity animations, near-
// zero CPU cost. The JS thread sits idle.
//
// Dimensional adds one extra RGB color cycle — that one needs JS
// driver (color interpolation), but Dimensional drops are rare and
// FlatList's removeClippedSubviews+windowSize keep the active set
// small.
// =============================================

import React, { useEffect, useRef } from 'react'
import { View, Animated, Easing, StyleSheet } from 'react-native'
import { Rarity, RARITY_COLORS } from '../types'

interface Props {
  rarity: Rarity
  children: React.ReactNode
  borderRadius?: number
  size?: number        // wrapper View boyutu (width + height)
  reduced?: boolean    // daha hafif animasyon (yoğun listeler için)
}

interface Config {
  width: number
  minOp: number
  maxOp: number
  shadowOpacity: number
  shadowRadius: number
  elevation: number
  cycleMs: number
}

const CONFIG: Partial<Record<Rarity, Config>> = {
  Uncommon:    { width: 1.4, minOp: 0.50, maxOp: 0.90, shadowOpacity: 0.55, shadowRadius: 4, elevation: 3, cycleMs: 1300 },
  Rare:        { width: 1.7, minOp: 0.55, maxOp: 0.95, shadowOpacity: 0.65, shadowRadius: 5, elevation: 4, cycleMs: 1200 },
  Epic:        { width: 2.0, minOp: 0.55, maxOp: 1.00, shadowOpacity: 0.75, shadowRadius: 6, elevation: 5, cycleMs: 1100 },
  Legendary:   { width: 2.3, minOp: 0.40, maxOp: 1.00, shadowOpacity: 0.85, shadowRadius: 7, elevation: 6, cycleMs: 1000 },
  Dimensional: { width: 2.6, minOp: 0.40, maxOp: 1.00, shadowOpacity: 1.00, shadowRadius: 9, elevation: 8, cycleMs: 950 },
}

export function RarityAura({ rarity, children, borderRadius = 8, size, reduced }: Props) {
  if (rarity === 'Common') {
    return <View style={{ position: 'relative' }}>{children}</View>
  }

  const color = RARITY_COLORS[rarity] || '#888'
  const cfg = CONFIG[rarity]
  if (!cfg) {
    return <View style={{ position: 'relative' }}>{children}</View>
  }

  return (
    <View style={{ position: 'relative' }}>
      {children}
      <PulseBorder color={color} borderRadius={borderRadius} cfg={cfg} reduced={reduced} />
      {rarity === 'Dimensional' && !reduced && <RgbShiftBorder borderRadius={borderRadius} />}
    </View>
  )
}

// ─── PULSE BORDER — opacity-only, GPU thread ────────────────────────────────
function PulseBorder({
  color, borderRadius, cfg, reduced = false,
}: { color: string; borderRadius: number; cfg: Config; reduced?: boolean }) {
  const opacity = useRef(new Animated.Value(cfg.minOp)).current
  useEffect(() => {
    const ms = reduced ? cfg.cycleMs * 1.8 : cfg.cycleMs
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, {
        toValue: reduced ? cfg.maxOp * 0.7 : cfg.maxOp,
        duration: ms,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: cfg.minOp,
        duration: ms,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [reduced])
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, {
        borderRadius,
        borderWidth: cfg.width,
        borderColor: color,
        shadowColor: color,
        shadowOpacity: cfg.shadowOpacity,
        shadowRadius: cfg.shadowRadius,
        shadowOffset: { width: 0, height: 0 },
        elevation: cfg.elevation,
        opacity,
      }]}
    />
  )
}

// ─── DIMENSIONAL: RGB COLOR CYCLE ───────────────────────────────────────────
function RgbShiftBorder({ borderRadius }: { borderRadius: number }) {
  const t = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, {
      toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: false,
    }))
    loop.start()
    return () => loop.stop()
  }, [])
  const borderColor = t.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: ['#EC4899', '#00D4FF', '#A855F7', '#EC4899'],
  })
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, {
        borderRadius,
        borderWidth: 1.2,
        borderColor,
      }]}
    />
  )
}