// =============================================
// ECHO RIFT — CONSTANTS
// =============================================

// QUEST CONFIGS
export const QUEST_CONFIGS = {
  '15s': { name: 'Quick Scan',          stamina: 1,  seconds: 15    },
  '5m':  { name: 'Signal Trace',        stamina: 2,  seconds: 300   },
  '15m': { name: 'Debris Field Recon',  stamina: 5,  seconds: 900   },
  '1h':  { name: 'Corrupted Zone Sweep',stamina: 15, seconds: 3600  },
  '4h':  { name: 'Dark Matter Hunt',    stamina: 25, seconds: 14400 },
  '8h':  { name: 'Rift Anomaly Scan',   stamina: 50, seconds: 28800 },
} as const

// PASS CONFIG
export const PASS_CONFIG = {
  free:   { stamina_max: 100, quest_slots: 2, arena_battles: 10 },
  silver: { stamina_max: 125, quest_slots: 4, arena_battles: 12 },
  gold:   { stamina_max: 150, quest_slots: 5, arena_battles: 15 },
} as const

// STAMINA REGEN
export const STAMINA_REGEN_SECONDS = 1800 // 30 dakika

// DUNGEON
export const DUNGEON_MAX_ATTEMPTS = 3
export const DUNGEON_EXTRA_ATTEMPT_RC = 150

// ARENA
export const ARENA_REFRESH_RC = 50
export const ARENA_TOKEN_RC = 50

// RC PRICES
export const RC_PRICES = {
  DUNGEON_ATTEMPT: 150,
  ARENA_REFRESH:    50,
  ECHO_PASS:       800,
} as const

// ECHO PASS
export const ECHO_PASS_POINTS_PER_MILESTONE = 52
export const ECHO_PASS_MAX_MILESTONE = 40

// INVENTORY
export const MAX_INVENTORY = 200
export const MAX_MAILBOX = 500

// LEADERBOARD
export const LEADERBOARD_TOP = 100

// COLORS
export const COLORS = {
  // Background
  bg: '#050A0F',
  bgCard: '#0A1628',
  bgPanel: '#0D1F3C',

  // Neon Green (primary)
  neonGreen: '#00FF88',
  neonGreenDim: '#00CC6A',
  neonGreenGlow: 'rgba(0, 255, 136, 0.15)',

  // Cyan (secondary)
  cyan: '#00D4FF',
  cyanDim: '#00A8CC',
  cyanGlow: 'rgba(0, 212, 255, 0.15)',

  // Text
  textPrimary: '#E8F4FD',
  textSecondary: '#7B9DB4',
  textMuted: '#3D5A73',

  // Borders
  border: '#1A3A5C',
  borderBright: '#2A5A8C',

  // Status
  success: '#00FF88',
  warning: '#FFB800',
  error: '#FF4444',
  info: '#00D4FF',

  // Gold
  gold: '#FFB800',
  goldDim: '#CC9200',

  // Rarity
  common: '#9CA3AF',
  uncommon: '#22C55E',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F97316',
  dimensional: '#EC4899',

  // Class
  vanguard: '#F97316',
  riftmage: '#00FF88',
  phantom: '#A855F7',

  // Transparent
  overlay: 'rgba(5, 10, 15, 0.85)',
  cardOverlay: 'rgba(10, 22, 40, 0.9)',
} as const

// FONTS
export const FONTS = {
  regular: 'System',
  mono: 'System',
} as const

// ANIMATION DURATIONS
export const ANIM = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const

// LORE LOADING MESSAGES
export const LOADING_MESSAGES = [
  'Signal detected...',
  'Scanning dimensional frequency...',
  'Alpha-0 holds many secrets...',
  'Your ship remembers what you forgot...',
  'The rift cascade changed everything...',
  'Calibrating implant systems...',
  'Dimensional coordinates locked...',
  'The signal grows stronger...',
  'Corrupted data fragments found...',
  'UNIT-7 systems initializing...',
] as const

// CLASS INFO
export const CLASS_INFO = {
  vanguard: {
    name: 'Vanguard',
    protocol: 'Iron Protocol',
    description: 'Heavy combat unit. Nearly indestructible.',
    bonuses: ['+15% HP', '+10% DEF', '+10 CRIT RES', '-10% ATK'],
    color: '#F97316',
    icon: '🛡️',
  },
  riftmage: {
    name: 'Riftmage',
    protocol: 'Echo Protocol',
    description: 'Dimensional energy flows through your circuits.',
    bonuses: ['+15% ATK', '+10 CRIT', '-8% HP', '-5% DEF'],
    color: '#00FF88',
    icon: '⚡',
  },
  phantom: {
    name: 'Phantom',
    protocol: 'Ghost Protocol',
    description: 'Strike fast, vanish faster.',
    bonuses: ['+15% DEX', '+25 CRIT DMG', '+12 CRIT', '-3% HP', '-10% DEF'],
    color: '#A855F7',
    icon: '👁️',
  },
} as const
export { RARITY_COLORS, RARITY_GLOW, CLASS_COLORS, CLASS_NAMES } from '../types'