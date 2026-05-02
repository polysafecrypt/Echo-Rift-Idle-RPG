// =============================================
// ECHO RIFT — ITEM IMAGE MAPPING
// Class + item_type → require() statik mapping
// Oyuncunun class'ına göre item görseli döndürür
// =============================================

import type { ClassType } from '../types'

const ITEM_IMAGES: Record<string, any> = {
  // ── RIFTMAGE ────────────────────────────────────────────────────────
  'riftmage_helmet':   require('../../assets/items/riftmage/helmet.png'),
  'riftmage_chest':    require('../../assets/items/riftmage/chest.png'),
  'riftmage_gloves':   require('../../assets/items/riftmage/gloves.png'),
  'riftmage_necklace': require('../../assets/items/riftmage/necklace.png'),
  'riftmage_crystal':  require('../../assets/items/riftmage/crystal.png'),

  // ── VANGUARD ────────────────────────────────────────────────────────
  'vanguard_helmet':   require('../../assets/items/vanguard/helmet.png'),
  'vanguard_chest':    require('../../assets/items/vanguard/chest.png'),
  'vanguard_gloves':   require('../../assets/items/vanguard/gloves.png'),
  'vanguard_necklace': require('../../assets/items/vanguard/necklace.png'),
  'vanguard_crystal':  require('../../assets/items/vanguard/crystal.png'),

  // ── PHANTOM ─────────────────────────────────────────────────────────
  'phantom_helmet':    require('../../assets/items/phantom/helmet.png'),
  'phantom_chest':     require('../../assets/items/phantom/chest.png'),
  'phantom_gloves':    require('../../assets/items/phantom/gloves.png'),
  'phantom_necklace':  require('../../assets/items/phantom/necklace.png'),
  'phantom_crystal':   require('../../assets/items/phantom/crystal.png'),
}

export function getItemImage(
  classType: ClassType | string | null | undefined,
  itemType: string | null | undefined
): any | null {
  if (!classType || !itemType) return null
  const key = `${String(classType).toLowerCase()}_${String(itemType).toLowerCase()}`
  return ITEM_IMAGES[key] ?? null
}