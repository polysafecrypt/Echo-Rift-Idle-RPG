// =============================================
// ECHO RIFT — HIT FX (Pure Animated)
// Skia yok, reanimated yok
// Katmanlı: glow daire + çift halka + spark mix
// =============================================

import React, { useEffect, useRef, useMemo } from 'react'
import { View, Animated, StyleSheet } from 'react-native'

interface Props {
  isCrit:   boolean
  charSize: number
}

const NUM_SPARKS = 10

export default function HitFx({ isCrit, charSize }: Props) {
  const cx  = charSize * 0.50
  const cy  = charSize * 0.30
  const dur = isCrit ? 420 : 280
  const col = isCrit ? '#FFD700' : '#AACCFF'

  // ── Glow (merkez daire — opacity + scale) ───────────────────────
  const glowScale = useRef(new Animated.Value(0.1)).current
  const glowOp    = useRef(new Animated.Value(isCrit ? 0.9 : 0.7)).current

  // ── Halka 1 ─────────────────────────────────────────────────────
  const r1Scale   = useRef(new Animated.Value(0.05)).current
  const r1Op      = useRef(new Animated.Value(0.95)).current

  // ── Halka 2 (gecikmeli) ─────────────────────────────────────────
  const r2Scale   = useRef(new Animated.Value(0.05)).current
  const r2Op      = useRef(new Animated.Value(0.6)).current

  // ── Spark animasyonları ─────────────────────────────────────────
  const sparks = useMemo(() =>
    Array.from({ length: NUM_SPARKS }, (_, i) => ({
      angle:  (i / NUM_SPARKS) * Math.PI * 2 + (i % 2 === 0 ? 0.2 : -0.15),
      speed:  (isCrit ? 68 : 46) + (i % 4) * 8,
      isLine: i % 3 !== 0,
      prog:   new Animated.Value(0),
      op:     new Animated.Value(1),
    }))
  , [isCrit])

  useEffect(() => {
    Animated.parallel([
      // Glow
      Animated.timing(glowScale, { toValue: 1,   duration: dur * 0.6, useNativeDriver: true }),
      Animated.timing(glowOp,    { toValue: 0,   duration: dur * 0.6, useNativeDriver: true }),

      // Halka 1 — hızlı
      Animated.timing(r1Scale, { toValue: 1,     duration: dur * 0.75, useNativeDriver: true }),
      Animated.timing(r1Op,    { toValue: 0,     duration: dur * 0.75, useNativeDriver: true }),

      // Halka 2 — yavaş, gecikmeli
      Animated.sequence([
        Animated.delay(dur * 0.12),
        Animated.timing(r2Scale, { toValue: 1,   duration: dur, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(dur * 0.12),
        Animated.timing(r2Op,    { toValue: 0,   duration: dur, useNativeDriver: true }),
      ]),

      // Sparklar
      ...sparks.flatMap(s => [
        Animated.timing(s.prog, { toValue: 1, duration: dur, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(dur * 0.3),
          Animated.timing(s.op, { toValue: 0, duration: dur * 0.7, useNativeDriver: true }),
        ]),
      ]),
    ]).start()
  }, [])

  // Boyutlar
  const GLOW_SIZE = isCrit ? 80 : 54
  const R1_SIZE   = isCrit ? 140 : 96
  const R2_SIZE   = isCrit ? 200 : 136

  return (
    <View
      style={{ position: 'absolute', left: 0, top: 0, width: charSize, height: charSize }}
      pointerEvents="none"
    >
      {/* Glow — merkez parlama (3 katmanlı daire = blur hissi) */}
      {[1.0, 0.65, 0.35].map((sizeRatio, i) => (
        <Animated.View key={`glow-${i}`} style={{
          position: 'absolute',
          left: cx - GLOW_SIZE * sizeRatio / 2,
          top:  cy - GLOW_SIZE * sizeRatio / 2,
          width:  GLOW_SIZE * sizeRatio,
          height: GLOW_SIZE * sizeRatio,
          borderRadius: GLOW_SIZE * sizeRatio,
          backgroundColor: i === 2 ? '#ffffff' : col,
          opacity: Animated.multiply(glowOp, new Animated.Value(i === 2 ? 0.9 : 0.5 - i * 0.15)),
          transform: [{ scale: glowScale }],
        }} />
      ))}

      {/* Halka 1 */}
      <Animated.View style={{
        position: 'absolute',
        left: cx - R1_SIZE / 2,
        top:  cy - R1_SIZE / 2,
        width: R1_SIZE, height: R1_SIZE,
        borderRadius: R1_SIZE,
        borderWidth: isCrit ? 2.5 : 1.8,
        borderColor: col,
        opacity: r1Op,
        transform: [{ scale: r1Scale }],
      }} />

      {/* Halka 1 — iç beyaz kenar */}
      <Animated.View style={{
        position: 'absolute',
        left: cx - R1_SIZE / 2,
        top:  cy - R1_SIZE / 2,
        width: R1_SIZE, height: R1_SIZE,
        borderRadius: R1_SIZE,
        borderWidth: isCrit ? 0.8 : 0.6,
        borderColor: 'rgba(255,255,255,0.6)',
        opacity: r1Op,
        transform: [{ scale: r1Scale }],
      }} />

      {/* Halka 2 */}
      <Animated.View style={{
        position: 'absolute',
        left: cx - R2_SIZE / 2,
        top:  cy - R2_SIZE / 2,
        width: R2_SIZE, height: R2_SIZE,
        borderRadius: R2_SIZE,
        borderWidth: 1.2,
        borderColor: col,
        opacity: r2Op,
        transform: [{ scale: r2Scale }],
      }} />

      {/* Sparklar */}
      {sparks.map((s, i) => {
        const dist = isCrit ? 65 : 44
        const tx = s.prog.interpolate({ inputRange: [0,1], outputRange: [0, Math.cos(s.angle) * dist] })
        const ty = s.prog.interpolate({ inputRange: [0,1], outputRange: [0, Math.sin(s.angle) * dist] })

        return s.isLine ? (
          // Çizgi spark
          <Animated.View key={i} style={{
            position: 'absolute',
            left: cx - (isCrit ? 1.5 : 1),
            top:  cy - (isCrit ? 10 : 7),
            width:  isCrit ? 3 : 2,
            height: isCrit ? 20 : 13,
            borderRadius: 2,
            backgroundColor: col,
            opacity: s.op,
            transform: [
              { translateX: tx },
              { translateY: ty },
              { rotate: `${(s.angle * 180 / Math.PI) + 90}deg` },
            ],
          }} />
        ) : (
          // Nokta spark
          <Animated.View key={i} style={{
            position: 'absolute',
            left: cx - (isCrit ? 4 : 3),
            top:  cy - (isCrit ? 4 : 3),
            width:  isCrit ? 8 : 6,
            height: isCrit ? 8 : 6,
            borderRadius: 10,
            backgroundColor: i % 2 === 0 ? col : '#ffffff',
            opacity: s.op,
            transform: [{ translateX: tx }, { translateY: ty }],
          }} />
        )
      })}
    </View>
  )
}
