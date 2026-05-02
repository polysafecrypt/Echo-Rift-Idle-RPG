# Patch Instructions for FriendsScreen + ReferralScreen

## Dosyaları Ekle (yeni dosyalar)

1. `src/screens/FriendsScreen.tsx` ← `FriendsScreen.tsx` artifact'tan kopyala
2. `src/screens/ReferralScreen.tsx` ← `ReferralScreen.tsx` artifact'tan kopyala

---

## `src/types/index.ts` — Sona Ekle

Aşağıdaki bloğu **dosyanın en sonuna** ekle (DOT_COLORS bloğundan sonra):

```typescript

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
```

---

## `src/hooks/useGame.ts` — İki yere değişiklik

### Değişiklik 1: Hook fonksiyonlarını ekle

Dosyanın **`return {`** satırından **HEMEN ÖNCE** (yani son `return { fetchPlayerState, ...` öncesinde) aşağıdaki bloğu ekle:

```typescript

  // =============================================
  // FRIENDS & REFERRAL
  // =============================================
  const getFriendsList = useCallback(async (playerId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_friends_list', { p_player_id: playerId })
      if (error) throw error
      return data
    } catch (err: any) { setError(err.message); return null }
  }, [])

  const getFriendSuggestions = useCallback(async (playerId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_friend_suggestions', { p_player_id: playerId })
      if (error) throw error
      return data
    } catch (err: any) { setError(err.message); return null }
  }, [])

  const searchPlayers = useCallback(async (playerId: string, query: string) => {
    try {
      const { data, error } = await supabase.rpc('search_players', { p_player_id: playerId, p_query: query })
      if (error) throw error
      return data
    } catch (err: any) { setError(err.message); return null }
  }, [])

  const sendFriendRequest = useCallback(
    async (playerId: string, opts: { username?: string; targetPlayerId?: string }) => {
      try {
        const { data, error } = await supabase.rpc('send_friend_request', {
          p_player_id: playerId,
          p_target_username: opts.username || null,
          p_target_player_id: opts.targetPlayerId || null,
        })
        if (error) throw error
        return data
      } catch (err: any) { setError(err.message); return null }
    }, []
  )

  const acceptFriendRequest = useCallback(async (playerId: string, requestId: string) => {
    try {
      const { data, error } = await supabase.rpc('accept_friend_request', {
        p_player_id: playerId, p_request_id: requestId,
      })
      if (error) throw error
      return data
    } catch (err: any) { setError(err.message); return null }
  }, [])

  const rejectFriendRequest = useCallback(async (playerId: string, requestId: string) => {
    try {
      const { data, error } = await supabase.rpc('reject_friend_request', {
        p_player_id: playerId, p_request_id: requestId,
      })
      if (error) throw error
      return data
    } catch (err: any) { setError(err.message); return null }
  }, [])

  const cancelFriendRequest = useCallback(async (playerId: string, requestId: string) => {
    try {
      const { data, error } = await supabase.rpc('cancel_friend_request', {
        p_player_id: playerId, p_request_id: requestId,
      })
      if (error) throw error
      return data
    } catch (err: any) { setError(err.message); return null }
  }, [])

  const addFriendByCode = useCallback(async (playerId: string, friendCode: string) => {
    try {
      const { data, error } = await supabase.rpc('add_friend_by_code', {
        p_player_id: playerId, p_friend_code: friendCode,
      })
      if (error) throw error
      return data
    } catch (err: any) { setError(err.message); return null }
  }, [])

  const removeFriend = useCallback(async (playerId: string, friendId: string) => {
    try {
      const { data, error } = await supabase.rpc('remove_friend', {
        p_player_id: playerId, p_friend_id: friendId,
      })
      if (error) throw error
      return data
    } catch (err: any) { setError(err.message); return null }
  }, [])

  const sendEnergyGift = useCallback(async (playerId: string, friendId: string) => {
    try {
      const { data, error } = await supabase.rpc('send_energy_gift', {
        p_player_id: playerId, p_friend_id: friendId,
      })
      if (error) throw error
      return data
    } catch (err: any) { setError(err.message); return null }
  }, [])

  const getReferralSummary = useCallback(async (playerId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_referral_summary', { p_player_id: playerId })
      if (error) throw error
      return data
    } catch (err: any) { setError(err.message); return null }
  }, [])

  const redeemReferralCode = useCallback(
    async (playerId: string, code: string, ipAddress: string | null) => {
      try {
        const { data, error } = await supabase.rpc('redeem_referral_code', {
          p_player_id: playerId,
          p_code: code,
          p_ip_address: ipAddress,
        })
        if (error) throw error
        return data
      } catch (err: any) { setError(err.message); return null }
    }, []
  )
```

### Değişiklik 2: `return { ... }` listesine ekle

`return {` bloğunun içinde, mevcut `summonChampion,` ve benzeri export listesinin **sonuna** (en son `}` öncesinde) şu isimleri ekle:

```typescript
    getFriendsList,
    getFriendSuggestions,
    searchPlayers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    addFriendByCode,
    removeFriend,
    sendEnergyGift,
    getReferralSummary,
    redeemReferralCode,
```

