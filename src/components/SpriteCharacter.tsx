// =============================================
// ECHO RIFT — SPRITE CHARACTER v7
// classType prop ile vanguard/riftmage/phantom
// Timing, crop, hitFrame ayarları korundu
// =============================================

import React, {
  useEffect, useMemo, useRef, useImperativeHandle, forwardRef,
} from 'react'
import { View, StyleSheet, Animated } from 'react-native'

// ─── ASSET MAP ───────────────────────────────────────────────────────────────
// React Native statik require — tümü önceden tanımlı
const CHAR_ASSETS = {
  vanguard: {
    idle:  { image: require('../../assets/characters/vanguard/idle/spritesheet.png'),  json: require('../../assets/characters/vanguard/idle/spritesheet.json')  },
    punch: { image: require('../../assets/characters/vanguard/punch/spritesheet.png'), json: require('../../assets/characters/vanguard/punch/spritesheet.json') },
    dead:  { image: require('../../assets/characters/vanguard/dead/spritesheet.png'),  json: require('../../assets/characters/vanguard/dead/spritesheet.json')  },
  },
  riftmage: {
    idle:  { image: require('../../assets/characters/riftmage/idle/spritesheet.png'),  json: require('../../assets/characters/riftmage/idle/spritesheet.json')  },
    punch: { image: require('../../assets/characters/riftmage/punch/spritesheet.png'), json: require('../../assets/characters/riftmage/punch/spritesheet.json') },
    dead:  { image: require('../../assets/characters/riftmage/dead/spritesheet.png'),  json: require('../../assets/characters/riftmage/dead/spritesheet.json')  },
  },
  phantom: {
    idle:  { image: require('../../assets/characters/phantom/idle/spritesheet.png'),  json: require('../../assets/characters/phantom/idle/spritesheet.json')  },
    punch: { image: require('../../assets/characters/phantom/punch/spritesheet.png'), json: require('../../assets/characters/phantom/punch/spritesheet.json') },
    dead:  { image: require('../../assets/characters/phantom/dead/spritesheet.png'),  json: require('../../assets/characters/phantom/dead/spritesheet.json')  },
  },
} as const

export type ClassType = keyof typeof CHAR_ASSETS

// ─── ANIM CONFIG ─────────────────────────────────────────────────────────────
// Her class için ayrı, eksiksiz config
// Vanguard source 30fps, Riftmage/Phantom source 60fps
// Hepsini 30fps display hızında oynatıyoruz (~33ms/frame)
type AnimConfig = {
  durationMs: number; loop: boolean; freeze: boolean
  maxFrames: number | null; crop: number; biasX: number; biasY: number
  hitFrame: number | null
}

const PER_CLASS_CONFIGS: Record<ClassType, Record<AnimationName, AnimConfig>> = {
  vanguard: {
    idle:  { durationMs: 500,  loop: true,  freeze: false, maxFrames: 5,    crop: 80, biasX: 0, biasY: 0, hitFrame: null },
    punch: { durationMs: 500,  loop: false, freeze: false, maxFrames: 30,   crop: 80, biasX: 0, biasY: 0, hitFrame: 30   },
    dead:  { durationMs: 2000, loop: false, freeze: true,  maxFrames: 60,   crop: 80, biasX: 0, biasY: 0, hitFrame: null },
  },
  riftmage: {
    // 60fps source — 30fps display için 33ms/frame
    idle:  { durationMs: 500,  loop: true,  freeze: false, maxFrames: 5,    crop: 80, biasX: 0, biasY: 0, hitFrame: null },
    punch: { durationMs: 1200,  loop: false, freeze: false, maxFrames: 30, crop: 80, biasX: 0, biasY: 0, hitFrame: null },
    // 63 frame × 33ms = 2100ms — vanguard pace
    dead:  { durationMs: 2000, loop: false, freeze: true,  maxFrames: 30, crop: 80, biasX: 0, biasY: 0, hitFrame: null },
  },
  phantom: {
    // 60fps source — 30fps display için 33ms/frame
    idle:  { durationMs: 500,  loop: true,  freeze: false, maxFrames: 5,    crop: 80, biasX: 0, biasY: 0, hitFrame: null },
    punch: { durationMs: 1000,  loop: false, freeze: false, maxFrames: null, crop: 80, biasX: 0, biasY: 0, hitFrame: null },
    // 59 frame × 33ms = 1970ms — vanguard pace
    dead:  { durationMs: 2000, loop: false, freeze: true,  maxFrames: 45, crop: 80, biasX: 0, biasY: 0, hitFrame: null },
  },
}

function getAnimConfig(classType: ClassType, anim: AnimationName, frameCount: number): AnimConfig {
  const cfg = { ...PER_CLASS_CONFIGS[classType][anim] }
  // maxFrames null ise tüm frame'ler oynar; değilse gerçek count'u geçmesin
  if (cfg.maxFrames !== null) {
    cfg.maxFrames = Math.min(cfg.maxFrames, frameCount)
  }
  // hitFrame de maxFrames'i geçmesin
  if (cfg.hitFrame !== null) {
    const maxF = cfg.maxFrames ?? frameCount
    cfg.hitFrame = Math.min(cfg.hitFrame, maxF)
  }
  return cfg
}

export type AnimationName = 'idle' | 'punch' | 'dead'
const ANIM_NAMES: AnimationName[] = ['idle', 'punch', 'dead']
const FRAME_SIZE = 512

function getSheetInfo(json: any) {
  return {
    frameCount: Object.keys(json.frames).length,
    sheetW:     json.meta.size.w,
    sheetH:     json.meta.size.h,
    cols:       Math.floor(json.meta.size.w / FRAME_SIZE),
  }
}

function calcOffset(
  frameIndex: number,
  cols: number,
  config: AnimConfig,
  size: number,
) {
  const col         = frameIndex % cols
  const row         = Math.floor(frameIndex / cols)
  const visibleSize = FRAME_SIZE - config.crop * 2
  const scale       = size / visibleSize
  return {
    x: -(col * FRAME_SIZE + config.crop - config.biasX) * scale,
    y: -(row * FRAME_SIZE + config.crop - config.biasY) * scale,
  }
}

export interface SpriteCharacterRef {
  play: (anim: AnimationName) => Promise<void>
  reset: () => void   // isDead temizle, idle'a dön
  getCurrentAnim: () => AnimationName
  setHitCallback: (cb: (() => void) | null) => void
}

interface Props {
  classType?: ClassType
  mirror?:    boolean
  size?:      number
  onAnimComplete?: (anim: AnimationName) => void
}

const SpriteCharacter = forwardRef<SpriteCharacterRef, Props>(({
  classType = 'vanguard',
  mirror    = false,
  size      = 240,
  onAnimComplete,
}, ref) => {

  const isMounted      = useRef(true)
  const isDead         = useRef(false)
  const currentAnim    = useRef<AnimationName>('idle')
  const timeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const genRef         = useRef(0)
  const hitCallbackRef = useRef<(() => void) | null>(null)
  const hitFiredRef    = useRef(false)

  const assets = CHAR_ASSETS[classType] ?? CHAR_ASSETS.vanguard

  const animValues = useMemo(() => {
    const map = {} as Record<AnimationName, {
      opacity: Animated.Value
      offsetX: Animated.Value
      offsetY: Animated.Value
    }>

    for (const name of ANIM_NAMES as AnimationName[]) {
      const info   = getSheetInfo(assets[name as keyof typeof assets].json)
      const config = getAnimConfig(classType, name, info.frameCount)
      const off0   = calcOffset(0, info.cols, config, size)
      map[name as AnimationName] = {
        opacity: new Animated.Value(name === 'idle' ? 1 : 0),
        offsetX: new Animated.Value(off0.x),
        offsetY: new Animated.Value(off0.y),
      }
    }
    return map
  }, [size, classType])

  const runAnim = (name: AnimationName, gen: number): Promise<void> => {
    return new Promise((resolve) => {
      if (!isMounted.current || gen !== genRef.current) { resolve(); return }

      const info     = getSheetInfo(assets[name as keyof typeof assets].json)
      const config   = getAnimConfig(classType, name, info.frameCount)
      const maxFrame = config.maxFrames ?? info.frameCount
      const ms       = Math.max(16, Math.floor(config.durationMs / maxFrame))

      const prev = currentAnim.current
      if (prev !== name) {
        animValues[prev].opacity.setValue(0)
        animValues[name].opacity.setValue(1)
        currentAnim.current = name
      }

      hitFiredRef.current = false
      const off0 = calcOffset(0, info.cols, config, size)
      animValues[name].offsetX.setValue(off0.x)
      animValues[name].offsetY.setValue(off0.y)

      let frame = 0

      const tick = () => {
        if (!isMounted.current || gen !== genRef.current) { resolve(); return }

        frame++

        if (config.loop) {
          if (frame >= maxFrame) frame = 0
          const off = calcOffset(frame, info.cols, config, size)
          animValues[name].offsetX.setValue(off.x)
          animValues[name].offsetY.setValue(off.y)
          timeoutRef.current = setTimeout(tick, ms)
          return
        }

        if (
          config.hitFrame !== null &&
          frame === config.hitFrame &&
          !hitFiredRef.current
        ) {
          hitFiredRef.current = true
          hitCallbackRef.current?.()
        }

        if (frame >= maxFrame) {
          if (config.freeze) {
            const last = calcOffset(maxFrame - 1, info.cols, config, size)
            animValues[name].offsetX.setValue(last.x)
            animValues[name].offsetY.setValue(last.y)
          }
          onAnimComplete?.(name)
          resolve()
          return
        }

        const off = calcOffset(frame, info.cols, config, size)
        animValues[name].offsetX.setValue(off.x)
        animValues[name].offsetY.setValue(off.y)
        timeoutRef.current = setTimeout(tick, ms)
      }

      timeoutRef.current = setTimeout(tick, ms)
    })
  }

  useEffect(() => {
    isMounted.current = true
    const gen = ++genRef.current
    runAnim('idle', gen)
    return () => {
      isMounted.current = false
      genRef.current++
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    }
  }, [])

  useImperativeHandle(ref, () => ({
    play: async (name: AnimationName) => {
      if (!isMounted.current || isDead.current) return
      if (name === 'dead') isDead.current = true
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
      const gen = ++genRef.current
      await runAnim(name, gen)
      if (isMounted.current && !isDead.current && gen === genRef.current) {
        const idleGen = ++genRef.current
        runAnim('idle', idleGen)
      }
    },
    reset: () => {
      // Yeni savaş başlamadan önce çağrılır — isDead temizle, idle'a dön
      isDead.current = false
      hitFiredRef.current = false
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
      const gen = ++genRef.current
      if (isMounted.current) runAnim('idle', gen)
    },
    getCurrentAnim: () => currentAnim.current,
    setHitCallback: (cb) => { hitCallbackRef.current = cb },
  }), [])

  return (
    <View style={[styles.viewport, { width: size, height: size }, mirror && styles.mirror]}>
      {ANIM_NAMES.map((name) => {
        const info        = getSheetInfo(assets[name as keyof typeof assets].json)
        const config      = getAnimConfig(classType, name, info.frameCount)
        const visibleSize = FRAME_SIZE - config.crop * 2
        const scale       = size / visibleSize
        return (
          <Animated.Image
            key={name}
            source={assets[name as keyof typeof assets].image}
            style={{
              position: 'absolute',
              width:    info.sheetW * scale,
              height:   info.sheetH * scale,
              opacity:  animValues[name as AnimationName].opacity,
              transform: [
                { translateX: animValues[name as AnimationName].offsetX },
                { translateY: animValues[name as AnimationName].offsetY },
              ],
            }}
            resizeMode="cover"
            fadeDuration={0}
          />
        )
      })}
    </View>
  )
})

SpriteCharacter.displayName = 'SpriteCharacter'
export default SpriteCharacter

const styles = StyleSheet.create({
  viewport: { overflow: 'hidden', backgroundColor: 'transparent' },
  mirror:   { transform: [{ scaleX: -1 }] },
})