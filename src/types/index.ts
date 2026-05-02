// =============================================
// FRIEND & REFERRAL — Backend RPC return shapes
// =============================================
export interface Friend {
  friend_id: string
  username: string
  level: number
  class_type: ClassType | null
  power_score: number
  last_active_at: string
  is_online: boolean
  source: 'manual' | 'referral'
  is_referral: boolean
  friendship_created_at: string
  gift_sent_today: boolean
  gift_received_pending: boolean
}

export interface FriendRequestIncoming {
  request_id: string
  from_player_id: string
  from_username: string
  from_level: number
  from_class_type: ClassType | null
  from_power_score: number
  created_at: string
}

export interface FriendRequestOutgoing {
  request_id: string
  to_player_id: string
  to_username: string
  to_level: number
  created_at: string
}

export interface FriendsListData {
  success: boolean
  count: number
  max_friends: number
  friends: Friend[]
  pending_incoming: FriendRequestIncoming[]
  pending_outgoing: FriendRequestOutgoing[]
  pending_incoming_count: number
  pending_outgoing_count: number
}

export interface FriendSuggestion {
  player_id: string
  username: string
  level: number
  class_type: ClassType | null
  power_score: number
  last_active_at: string
  is_online: boolean
  level_diff: number
  sort_score: number
}

export interface SearchPlayerResult {
  player_id: string
  username: string
  level: number
  class_type: ClassType | null
  power_score: number
  last_active_at: string
  is_online: boolean
  referral_code: string
  is_friend: boolean
  request_sent: boolean
  request_received: boolean
}

export interface ReferredPlayer {
  player_id: string
  username: string
  level: number
  milestones_reached: number
  last_active_at: string
}

export interface ReferralSummaryData {
  success: boolean
  my_referral_code: string
  can_redeem: boolean
  already_redeemed: boolean
  level_limit: number
  referrer: { id: string; username: string; level: number } | null
  referred_players: ReferredPlayer[]
  total_referrals: number
  total_energy_earned_as_referrer: number
  total_energy_earned_as_referred: number
  rc_earned_from_referrals: number
  rc_per_referral: number
  rc_ip_cap: number
}
// =============================================
// ECHO RIFT — TYPE DEFINITIONS
// =============================================

export type PassType = 'free' | 'silver' | 'gold'
export type ClassType = 'vanguard' | 'riftmage' | 'phantom'
export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Dimensional'
export type ItemType = 'sword' | 'helmet' | 'chest' | 'gloves' | 'crystal' | 'necklace'
export type QuestDurationKey = '15s' | '5m' | '15m' | '1h' | '4h' | '8h'

export interface Player {
  id: string
  username: string
  class_type: ClassType | null
  season_id: number
  level: number
  xp: number
  xp_to_next_level: number
  prestige_xp: number
  prestige_tier: number
  last_rebirth_at: string | null
  gold: number
  rc_balance: number
  rc_total_earned: number
  rc_total_spent: number
  stamina_current: number
  stamina_max: number
  last_stamina_update: string
  pass_type: PassType
  pass_expires_at: string | null
  inventory_count: number
  dungeon_floor: number
  dungeon_attempts: number
  dungeon_max_floor: number
  arena_points: number
  arena_wins: number
  arena_losses: number
  arena_battles_today: number
  scrap_metal: number
  echo_pass_points: number
  echo_pass_purchased: boolean
  echo_pass_milestone: number
  guild_id: string | null
  consecutive_login_days: number
  last_login_date: string | null
  created_at: string
}

// =============================================
// ECHO REBIRTH (PRESTIGE)
// =============================================
export interface EchoRebirthResult {
  success: boolean
  error?: string
  current_level?: number
  required_level?: number
  next_tier?: number
  // success payload
  old_tier?: number
  new_tier?: number
  old_level?: number
  prestige_xp_gained?: number
  prestige_xp_total?: number
  items_halved?: number
  rewards?: { rc: number; scrap: number }
  new_stat_bonus_pct?: number
  new_xp_mult?: number
  new_regen_seconds?: number
  new_max_friends?: number
}

export interface PlayerStats {
  power_score: number
  total_atk: number
  total_hp: number
  total_def: number
  total_dex: number
  total_str: number
  total_vit: number
  total_crit: number
  total_crit_dmg: number
  total_pierce: number
  total_atk_spd: number
  total_crit_res: number
  total_dmg_red: number
}

export interface ItemAffix { type: string; value: number }
export interface Item {
  id: string
  item_type: ItemType
  rarity: Rarity
  level: number
  base_attack: number | null
  power_score: number
  is_equipped: boolean
  source: string
  tier: number
  affixes: ItemAffix[]
}

export interface QuestConfig {
  id: string
  duration_key: QuestDurationKey
  duration_seconds: number
  stamina_cost: number
  name: string
  bonus_item_chance: number
}
export interface ActiveQuest {
  id: string
  name: string
  duration_key: QuestDurationKey
  status: 'active' | 'queued' | 'completed' | 'cancelled'
  started_at: string | null
  ends_at: string | null
  stamina_spent: number
  slot_number: number
}

export interface DungeonState {
  current_floor: number
  max_floor: number
  attempts_today: number
  max_attempts: number
  extra_attempts_ad?: number
  extra_attempts_rc?: number
  max_extra_ad?: number
  max_extra_rc?: number
}

export interface DungeonBattleResult {
  success: boolean
  battle_id: string
  result: 'victory' | 'defeat'
  floor: number
  rounds: number
  player_hp_start: number
  player_hp_end: number
  boss_hp_start: number
  boss_hp_end: number
  rewards: { gold: number; scrap: number; rc: number; items: number } | null
  lore: { title: string; content: string } | null
  attempts_remaining: number
  fails_remaining?: number
  next_floor: number
  champion_1_id?: string
  champion_1_name?: string
  champion_1_element?: string
  champion_2_id?: string
  champion_2_name?: string
  champion_2_element?: string
  round_logs?: RoundLog[]
}

export interface ArenaOpponent {
  player_id: string
  username: string
  level: number
  class_type: ClassType
  power_score: number
  total_atk: number
  total_hp: number
  total_def: number
  total_dex: number
  total_crit: number
  arena_points: number
  arena_wins: number
  arena_losses: number
  is_bot: boolean
}

// ✅ Champion skill event — round_logs[].champion_skills[] içinden
export interface ChampionSkillEvent {
  side: 'attacker' | 'defender'
  effect_type: string
  champion_name?: string
  element?: string
  skill_name?: string
  effect_raw?: string
  value?: number
  dmg_to_enemy?: number
  heal_self?: number
  hits?: number
  add_burn_turns?: number
  add_burn_dmg?: number
  add_poison_turns?: number
  add_poison_dmg?: number
  add_freeze_turns?: number
  add_stun_turns?: number
  add_blind_turns?: number
  add_blind_chance?: number
  add_self_shield?: number
  add_self_atk_buff?: number
  add_self_def_buff?: number
  add_self_dodge_buff?: number
  add_self_crit_buff?: number
  add_self_reflect?: number
  add_self_revive_pct?: number
  add_enemy_atk_debuff?: number
  add_enemy_def_debuff?: number
  buff_turns?: number
  debuff_turns?: number
  cleanse?: boolean
  executed?: boolean
  break_shield?: boolean
  dot_kind?: 'burn' | 'poison' | 'bleed'
}

export interface RoundLog {
  round: number
  attacker_dmg: number
  attacker_crit: boolean
  attacker_blocked: boolean
  attacker_dodged: boolean
  attacker_double: boolean
  attacker_hp_after: number
  attacker_passive_heal?: number   // ✅ Pasif regen miktarı (round sonunda)
  defender_dmg: number
  defender_crit: boolean
  defender_blocked: boolean
  defender_dodged: boolean
  defender_double: boolean
  defender_hp_after: number
  defender_passive_heal?: number   // ✅ Pasif regen miktarı (round sonunda)
  attacker_shield?: number   // ✅ attacker'ın aktif shield miktarı (0 = yok)
  defender_shield?: number   // ✅ defender'ın aktif shield miktarı
  champion_skill?: { skill_name: string; type: string; value: number } | null
  champion_skills?: ChampionSkillEvent[]
}

export interface ArenaBattleResult {
  success: boolean
  battle_id: string
  result: 'attacker_win' | 'defender_win' | 'draw_attacker_loses'
  winner_id: string
  rounds: number
  attacker_name: string
  defender_name: string
  attacker_class: ClassType
  defender_class: ClassType
  attacker_sword_rarity?: Rarity
  defender_sword_rarity?: Rarity
  attacker_hp_start: number
  attacker_hp_end: number
  defender_hp_start: number
  defender_hp_end: number
  attacker_points_before: number
  attacker_points_after: number
  defender_points_before: number
  defender_points_after: number
  battles_remaining: number
  attacker_first: boolean
  round_logs: RoundLog[]
  is_bot?: boolean
  error?: string
  attacker_champion_1_id?: string | null
  attacker_champion_1_name?: string | null
  attacker_champion_1_element?: string | null
  attacker_champion_2_id?: string | null
  attacker_champion_2_name?: string | null
  attacker_champion_2_element?: string | null
  defender_champion_1_id?: string | null
  defender_champion_1_name?: string | null
  defender_champion_1_element?: string | null
  defender_champion_2_id?: string | null
  defender_champion_2_name?: string | null
  defender_champion_2_element?: string | null
  attacker_champion_1_cd?: number | null
  attacker_champion_1_skill_name?: string | null
  attacker_champion_2_cd?: number | null
  attacker_champion_2_skill_name?: string | null
  defender_champion_1_cd?: number | null
  defender_champion_1_skill_name?: string | null
  defender_champion_2_cd?: number | null
  defender_champion_2_skill_name?: string | null
}

export interface ArenaState {
  points: number
  wins: number
  losses: number
  battles_today: number
}

// =============================================
// CHAMPION
// =============================================
export type ElementType = 'fire' | 'water' | 'lightning' | 'earth' | 'shadow' | 'dimensional'

export interface ChampionSkillData {
  type: 'passive_1' | 'passive_2' | 'active'
  name: string
  effect_raw: string
  value: number
  cooldown?: number
  duration?: number
  description: string
  value_text: string
  level: number
}

export interface ChampionSkillPreview {
  success: boolean
  champion: {
    id: string
    name: string
    element: ElementType
    rarity: Rarity
    class_type: string
    level: number
    stars: number
    base_atk: number
    base_hp: number
    lore: string
    portrait_url: string | null
  }
  player_atk_used: number
  player_hp_used: number
  skills: ChampionSkillData[]
}

export interface EchoPassState {
  purchased: boolean
  points: number
  milestone: number
  points_per_milestone: number
}
export interface GameNotification {
  id: string; type: string; title: string; body: string; sent_at: string
}

export interface PlayerState {
  success: boolean
  player: Player
  stats: PlayerStats
  equipped_items: Item[]
  active_quest: ActiveQuest | null
  queued_quests: ActiveQuest[]
  completed_quests: any
  dungeon: DungeonState
  arena: ArenaState
  echo_pass: EchoPassState
  notifications: GameNotification[]
  guild?: {
    id: string; name: string; level: number; member_count: number;
    war_wins: number; role: string;
  } | null
}

export interface LeaderboardEntry {
  rank: number
  player_id: string
  username: string
  level: number
  class_type: ClassType
  power_score: number
  arena_points?: number
  max_floor?: number
  prestige_xp?: number
  guild_name?: string
}
export interface LeaderboardData {
  success: boolean
  type: string
  top100: LeaderboardEntry[]
  player: LeaderboardEntry & { rank: number }
}

// =============================================
// COLORS
// =============================================
export const RARITY_COLORS: Record<Rarity, string> = {
  Common: '#9CA3AF',
  Uncommon: '#22C55E',
  Rare: '#3B82F6',
  Epic: '#A855F7',
  Legendary: '#F97316',
  Dimensional: '#EC4899',
}
export const RARITY_GLOW: Record<Rarity, string> = {
  Common: 'rgba(156, 163, 175, 0.3)',
  Uncommon: 'rgba(34, 197, 94, 0.3)',
  Rare: 'rgba(59, 130, 246, 0.3)',
  Epic: 'rgba(168, 85, 247, 0.3)',
  Legendary: 'rgba(249, 115, 22, 0.3)',
  Dimensional: 'rgba(236, 72, 153, 0.5)',
}
export const CLASS_COLORS: Record<string, string> = {
  vanguard: '#F97316',
  riftmage: '#00FF88',
  phantom: '#A855F7',
}
export const CLASS_NAMES: Record<string, string> = {
  vanguard: 'Vanguard', riftmage: 'Riftmage', phantom: 'Phantom',
}
export const CLASS_ICONS: Record<string, string> = {
  vanguard: '🛡️', riftmage: '⚡', phantom: '👁️',
}

// ✅ Element renkleri — arena flash + DoT için
export const ELEMENT_COLORS: Record<ElementType, string> = {
  fire:        '#FF6600',
  water:       '#0099CC',
  lightning:   '#FFEE00',
  earth:       '#449922',
  shadow:      '#6600AA',
  dimensional: '#EC4899',
}
export const ELEMENT_GLOW: Record<ElementType, string> = {
  fire:        'rgba(255, 102, 0, 0.55)',
  water:       'rgba(0, 153, 204, 0.55)',
  lightning:   'rgba(255, 238, 0, 0.55)',
  earth:       'rgba(68, 153, 34, 0.55)',
  shadow:      'rgba(102, 0, 170, 0.55)',
  dimensional: 'rgba(236, 72, 153, 0.55)',
}
export const ELEMENT_ICONS: Record<ElementType, string> = {
  fire: '🔥', water: '💧', lightning: '⚡', earth: '🌿', shadow: '🌑', dimensional: '✨',
}

// DoT renkleri — floating damage için
export const DOT_COLORS: Record<string, string> = {
  burn:   '#FF6600',
  poison: '#88FF00',
  bleed:  '#FF2244',
}