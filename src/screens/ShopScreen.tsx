-- =============================================================================
-- ECHO RIFT — RIFT SHOP
-- =============================================================================
-- Quartermaster Nyx's marketplace.
-- Categories: war_pass, echo_pass, summon, dungeon_key, arena_token, gold, offer
-- Currencies: rc (rift crystal — premium), gold (in-game), real (IAP — placeholder)
-- =============================================================================

-- ── 1. SHOP ITEMS TABLE ─────────────────────────────────────────────────────
create table if not exists public.shop_items (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,           -- 'echo_pass', 'pass_gold_14', 'dungeon_key_1', etc.
  category        text not null check (category in (
                    'war_pass', 'echo_pass', 'summon', 'dungeon_key',
                    'arena_token', 'gold', 'offer', 'rc_pack'
                  )),
  name            text not null,                  -- "Echo Pass — Battle Pass", "Gold War Pass · 14 days"
  description     text not null,                  -- short helper text
  lore            text,                           -- in-universe flavor: "From beyond the veil..."
  icon            text not null,                  -- emoji fallback, will be replaced by image asset
  asset_url       text,                           -- nullable, image override
  rarity_tier     text not null default 'common'  -- common | rare | epic | legendary | dimensional
                  check (rarity_tier in ('common','rare','epic','legendary','dimensional')),

  -- Pricing
  currency        text not null check (currency in ('rc','gold','real')),
  price           integer not null check (price >= 0),
  discount_pct    integer not null default 0 check (discount_pct >= 0 and discount_pct <= 100),
  bundle_value    text,                           -- "BEST VALUE" / "FIRST TIME" / "LIMITED"

  -- Reward (what player gets)
  reward_type     text not null check (reward_type in (
                    'rc','gold','summon_scroll','dungeon_key','arena_token',
                    'pass_silver','pass_gold','echo_pass','bundle','first_purchase_bonus'
                  )),
  reward_amount   integer not null default 0,     -- units of reward (e.g. 5 keys, 5000 gold, 7 days pass)
  reward_extra    jsonb,                          -- bundle contents: {"rc": 100, "scrolls": 5}

  -- Limits
  daily_limit     integer,                        -- max purchases per player per day (null = unlimited)
  weekly_limit    integer,
  account_limit   integer,                        -- one-time purchases (e.g. starter pack)
  min_player_lvl  integer not null default 1,

  -- Visibility
  is_active       boolean not null default true,
  is_featured     boolean not null default false, -- "TODAY'S DEAL" hero banner
  available_from  timestamptz,                    -- null = always; for time-limited offers
  available_until timestamptz,
  sort_order      integer not null default 100,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_shop_items_category   on public.shop_items(category) where is_active = true;
create index if not exists idx_shop_items_featured   on public.shop_items(is_featured) where is_featured = true;
create index if not exists idx_shop_items_window     on public.shop_items(available_from, available_until) where is_active = true;

-- Idempotent constraint update (eski tablo zaten varsa max=90 olabilir, yenisi max=100)
alter table public.shop_items drop constraint if exists shop_items_discount_pct_check;
alter table public.shop_items add  constraint shop_items_discount_pct_check
  check (discount_pct >= 0 and discount_pct <= 100);

-- ── 2. PURCHASE LOG ─────────────────────────────────────────────────────────
create table if not exists public.shop_purchase_log (
  id                uuid primary key default gen_random_uuid(),
  player_id         uuid not null references public.players(id) on delete cascade,
  item_code         text not null,
  category          text not null,
  currency          text not null,
  price_paid        integer not null,
  reward_type       text not null,
  reward_amount     integer not null,
  reward_extra      jsonb,
  idempotency_key   text,
  purchased_at      timestamptz not null default now()
);

create index if not exists idx_shop_log_player on public.shop_purchase_log(player_id, purchased_at desc);
create index if not exists idx_shop_log_player_item on public.shop_purchase_log(player_id, item_code, purchased_at desc);
create unique index if not exists idx_shop_log_idempotency on public.shop_purchase_log(player_id, idempotency_key)
  where idempotency_key is not null;

alter table public.shop_purchase_log enable row level security;

drop policy if exists "shop_log_select_own" on public.shop_purchase_log;
create policy "shop_log_select_own" on public.shop_purchase_log
  for select using (auth.uid() = player_id);

drop policy if exists "shop_log_no_direct_write" on public.shop_purchase_log;
create policy "shop_log_no_direct_write" on public.shop_purchase_log
  for insert with check (false);

-- ── 3. PLAYER COLUMNS (idempotent, won't overwrite existing) ───────────────
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='players' and column_name='dungeon_extra_today') then
    alter table public.players add column dungeon_extra_today integer not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='players' and column_name='arena_extra_today') then
    alter table public.players add column arena_extra_today integer not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='players' and column_name='echo_pass_expires_at') then
    alter table public.players add column echo_pass_expires_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='players' and column_name='pass_expires_at') then
    alter table public.players add column pass_expires_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='players' and column_name='first_purchase_made') then
    alter table public.players add column first_purchase_made boolean not null default false;
  end if;
end $$;

-- ── 4. SEED DATA — RIFT SHOP CATALOG ────────────────────────────────────────
-- Idempotent: re-running this won't duplicate
insert into public.shop_items (code, category, name, description, lore, icon, rarity_tier,
                                currency, price, discount_pct, bundle_value,
                                reward_type, reward_amount, reward_extra,
                                daily_limit, weekly_limit, account_limit, min_player_lvl,
                                is_active, is_featured, sort_order)
values

-- ═══ RC PACKS (real money — placeholders, IAP later) ═══
('rc_pack_80',     'rc_pack', 'Stardust Vial',          'A small handful of compressed rift energy.',
 'Common drop in the outer sectors. Useful for a quick spark.',
 '💠', 'common',    'real', 99,    0, null,
 'rc', 80, null, null, null, null, 1, true, false, 1),

('rc_pack_450',    'rc_pack', 'Crystal Cluster',        '450 RC. The standard miner''s yield.',
 'Carved from frozen rift veins. Powers a fleet for a week.',
 '💎', 'rare',      'real', 499,   0, null,
 'rc', 450, null, null, null, null, 1, true, false, 2),

('rc_pack_950',    'rc_pack', 'Voidcore Shard',         '950 RC. Best ratio for active commanders.',
 'Pried from the heart of a dying anomaly.',
 '💎', 'epic',      'real', 999,   5, 'POPULAR',
 'rc', 950, null, null, null, null, 1, true, false, 3),

('rc_pack_2000',   'rc_pack', 'Singularity Core',       '2000 RC. For those who plan ahead.',
 'They say one shard could power an entire colony.',
 '🔮', 'epic',      'real', 1999,  10, 'BEST VALUE',
 'rc', 2000, null, null, null, null, 1, true, true, 4),

('rc_pack_5500',   'rc_pack', 'Rift Heart',             '5500 RC. Commander''s arsenal.',
 'A relic of the first Rift War. Reserved for veterans.',
 '🌌', 'legendary', 'real', 4999,  15, null,
 'rc', 5500, null, null, null, null, 1, true, false, 5),

('rc_pack_12000',  'rc_pack', 'Dimensional Vault',      '12000 RC. The Quartermaster''s top shelf.',
 'Whispered about, rarely seen. The ultimate stockpile.',
 '⚡', 'dimensional','real', 9999, 20, 'LEGENDARY',
 'rc', 12000, null, null, null, null, 1, true, false, 6),

-- ═══ WAR PASS ═══
('pass_silver_7',  'war_pass', 'Silver War Pass',       '7 days · +50% XP, +25% Gold, +1 quest slot',
 'Standard issue for active operatives.',
 '🥈', 'rare',      'rc', 290, 0, null,
 'pass_silver', 7, null, null, null, null, 1, true, false, 10),

('pass_gold_14',   'war_pass', 'Gold War Pass · 14d',   '14 days · +100% XP, +50% Gold, +2 quest slots, daily login bonus',
 'Reserved for commanders. Doubles your accumulated essence.',
 '🥇', 'epic',      'rc', 990, 0, 'POPULAR',
 'pass_gold', 14, null, null, null, null, 5, true, true, 11),

('pass_gold_21',   'war_pass', 'Gold War Pass · 21d',   '21 days · all Gold benefits + bonus chest',
 'A campaign-length stockpile. Rumored to grant favors from Nyx herself.',
 '👑', 'legendary', 'rc', 1390, 10, 'BEST VALUE',
 'pass_gold', 21, jsonb_build_object('bonus_scrolls', 10, 'bonus_rc', 200), null, null, null, 10, true, false, 12),

-- ═══ ECHO PASS ═══
('echo_pass_30',   'echo_pass', 'Echo Pass · Season',   '30 days · unlock all Echo milestones · +RC at every tier',
 'A scribed contract bound to the rift current. Records every echo of your battles.',
 '📜', 'legendary', 'rc', 990, 0, 'SEASON DEAL',
 'echo_pass', 30, null, null, null, 1, 5, true, false, 20),

-- ═══ SUMMON SCROLLS ═══
('summon_scroll_1',  'summon', 'Echo Sigil',            'Single summon scroll · pulls champion from beyond.',
 'A rune-etched glyph. One use. Calls a soul from the void.',
 '🪬', 'common',    'rc', 80, 0, null,
 'summon_scroll', 1, null, null, null, null, 1, true, false, 30),

('summon_scroll_10', 'summon', 'Echo Sigil · Bundle x10','10 scrolls bundle · 20% off bulk',
 'A sealed sigil cluster. Quartermaster keeps these in the back room.',
 '📜', 'rare',      'rc', 640, 20, 'BULK',
 'summon_scroll', 10, null, null, null, null, 1, true, false, 31),

('summon_scroll_30', 'summon', 'Echo Sigil · Cache x30', '30 scrolls · 30% off · pity carry guarantee',
 'A locked cache. Enough sigils for a guaranteed legendary pull.',
 '🗃️', 'epic',      'rc', 1680, 30, 'BEST VALUE',
 'summon_scroll', 30, null, null, null, null, 1, true, false, 32),

-- ═══ DUNGEON KEYS ═══
('dungeon_key_1',  'dungeon_key', 'Rift Key',           'Extra dungeon entry · max 5 per day',
 'Forged in starlight. Cracks open one fold in the rift.',
 '🗝️', 'common',    'rc', 40, 0, null,
 'dungeon_key', 1, null, 5, null, null, 5, true, false, 40),

('dungeon_key_3',  'dungeon_key', 'Rift Key · Triple',  '3 dungeon keys bundle · 15% off',
 'A small ring of tempered keys. For the persistent.',
 '🔑', 'rare',      'rc', 100, 15, null,
 'dungeon_key', 3, null, 1, null, null, 8, true, false, 41),

-- ═══ ARENA TOKENS ═══
('arena_token_1',  'arena_token', 'Arena Sigil',        'Extra arena battle · max 5 per day',
 'A duelist''s mark. Grants entry to the gladiator pits.',
 '⚔️', 'common',    'rc', 40, 0, null,
 'arena_token', 1, null, 5, null, null, 5, true, false, 50),

('arena_token_3',  'arena_token', 'Arena Sigil · Triple','3 arena tokens · 15% off',
 'A trio of sigils, freshly minted. The crowd waits.',
 '⚔️', 'rare',      'rc', 100, 15, null,
 'arena_token', 3, null, 1, null, null, 8, true, false, 51),

-- ═══ GOLD SACKS ═══
('gold_sack_small', 'gold', 'Gold Sack · Small',        '5,000 Gold · for everyday quartermastering',
 'Coins from a hundred fallen colonies. They clink with stories.',
 '💰', 'common',    'rc', 50, 0, null,
 'gold', 5000, null, 3, null, null, 1, true, false, 60),

('gold_sack_med',   'gold', 'Gold Sack · Medium',       '15,000 Gold · 10% off vs small',
 'A heavier bag. Nyx weighs it twice before handing it over.',
 '💰', 'rare',      'rc', 130, 10, null,
 'gold', 15000, null, 3, null, null, 5, true, false, 61),

('gold_sack_large', 'gold', 'Gold Vault',               '50,000 Gold · 20% off bulk',
 'Sealed vault, three locks. Worth a small fleet.',
 '💎', 'epic',      'rc', 400, 20, 'BEST VALUE',
 'gold', 50000, null, 1, null, null, 10, true, false, 62),

-- ═══ FIRST PURCHASE BONUS ═══
('first_buy_bonus', 'offer', 'First Purchase Bonus',    'DOUBLE RC on your first ever real-money purchase!',
 'Quartermaster smiles. New blood gets a welcoming gift.',
 '🎁', 'legendary', 'rc', 0, 100, 'FIRST TIME',
 'first_purchase_bonus', 1, null, null, null, 1, 1, true, false, 70),

-- ═══ ROTATING DAILY OFFER (placeholder example) ═══
('daily_offer_chest','offer', 'Quartermaster''s Daily', 'Mystery cache · refreshes every 24h',
 'Nyx empties her pockets at sunrise. What''s inside today?',
 '📦', 'epic',      'rc', 240, 25, 'TODAY ONLY',
 'bundle', 1, jsonb_build_object('gold', 5000, 'scrolls', 3, 'rc', 50),
 1, null, null, 5, true, true, 80)

on conflict (code) do update set
  name           = excluded.name,
  description    = excluded.description,
  lore           = excluded.lore,
  icon           = excluded.icon,
  rarity_tier    = excluded.rarity_tier,
  price          = excluded.price,
  discount_pct   = excluded.discount_pct,
  bundle_value   = excluded.bundle_value,
  reward_type    = excluded.reward_type,
  reward_amount  = excluded.reward_amount,
  reward_extra   = excluded.reward_extra,
  daily_limit    = excluded.daily_limit,
  weekly_limit   = excluded.weekly_limit,
  account_limit  = excluded.account_limit,
  min_player_lvl = excluded.min_player_lvl,
  is_active      = excluded.is_active,
  is_featured    = excluded.is_featured,
  sort_order     = excluded.sort_order,
  updated_at     = now();

-- ═════════════════════════════════════════════════════════════════════════════
-- 5. RPC: GET_SHOP_OFFERS
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.get_shop_offers(p_player_id uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  v_player record;
  v_items  jsonb;
  v_today_purchases jsonb;
begin
  if auth.uid() is null or auth.uid() != p_player_id then
    return jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  end if;

  select id, level, rc_balance, gold, summon_scrolls, pass_type, pass_expires_at, echo_pass_expires_at,
         first_purchase_made, dungeon_extra_today, arena_extra_today
  into v_player
  from public.players where id = p_player_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'PLAYER_NOT_FOUND');
  end if;

  -- Today's purchases per item_code (for daily_limit enforcement)
  select coalesce(jsonb_object_agg(item_code, cnt), '{}'::jsonb)
  into v_today_purchases
  from (
    select item_code, count(*) as cnt
    from public.shop_purchase_log
    where player_id = p_player_id
      and purchased_at >= date_trunc('day', now())
    group by item_code
  ) t;

  -- All active items, with player-specific lock/limit info
  select coalesce(jsonb_agg(jsonb_build_object(
    'code',           si.code,
    'category',       si.category,
    'name',           si.name,
    'description',    si.description,
    'lore',           si.lore,
    'icon',           si.icon,
    'asset_url',      si.asset_url,
    'rarity_tier',    si.rarity_tier,
    'currency',       si.currency,
    'price',          si.price,
    'discounted_price', floor(si.price * (1 - si.discount_pct::numeric / 100)),
    'discount_pct',   si.discount_pct,
    'bundle_value',   si.bundle_value,
    'reward_type',    si.reward_type,
    'reward_amount',  si.reward_amount,
    'reward_extra',   si.reward_extra,
    'daily_limit',    si.daily_limit,
    'account_limit',  si.account_limit,
    'min_player_lvl', si.min_player_lvl,
    'is_featured',    si.is_featured,
    'sort_order',     si.sort_order,
    'purchased_today', coalesce((v_today_purchases->>si.code)::int, 0),
    'is_locked',      v_player.level < si.min_player_lvl,
    'lock_reason',    case when v_player.level < si.min_player_lvl
                        then 'Requires Lv ' || si.min_player_lvl::text
                        else null end,
    'is_sold_out',
      (si.daily_limit is not null and coalesce((v_today_purchases->>si.code)::int, 0) >= si.daily_limit)
      or (si.account_limit is not null and exists (
        select 1 from public.shop_purchase_log spl
        where spl.player_id = p_player_id and spl.item_code = si.code
        having count(*) >= si.account_limit
      )),
    'available_until', si.available_until
  ) order by si.sort_order, si.created_at), '[]'::jsonb)
  into v_items
  from public.shop_items si
  where si.is_active = true
    and (si.available_from is null or si.available_from <= now())
    and (si.available_until is null or si.available_until > now());

  return jsonb_build_object(
    'success', true,
    'player', jsonb_build_object(
      'level',              v_player.level,
      'rc',                 v_player.rc_balance,
      'gold',               v_player.gold,
      'summon_scrolls',     v_player.summon_scrolls,
      'pass_type',          v_player.pass_type,
      'pass_expires_at',    v_player.pass_expires_at,
      'echo_pass_expires_at', v_player.echo_pass_expires_at,
      'first_purchase_made',  v_player.first_purchase_made,
      'dungeon_extra_today',  v_player.dungeon_extra_today,
      'arena_extra_today',    v_player.arena_extra_today
    ),
    'items', v_items,
    'server_time', now()
  );
end;
$$;

grant execute on function public.get_shop_offers(uuid) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- 6. RPC: PURCHASE_SHOP_ITEM
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.purchase_shop_item(
  p_player_id       uuid,
  p_item_code       text,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_player    record;
  v_item      record;
  v_final_price integer;
  v_today_count integer;
  v_account_count integer;
  v_reward_summary jsonb;
  v_now timestamptz := now();
begin
  if auth.uid() is null or auth.uid() != p_player_id then
    return jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  end if;

  -- Idempotency check
  if p_idempotency_key is not null then
    if exists (select 1 from public.shop_purchase_log
               where player_id = p_player_id and idempotency_key = p_idempotency_key) then
      return jsonb_build_object('success', false, 'error', 'DUPLICATE_REQUEST');
    end if;
  end if;

  -- Lock player row
  select id, level, rc_balance, gold, summon_scrolls, pass_type, pass_expires_at,
         echo_pass_expires_at, first_purchase_made,
         coalesce(dungeon_extra_today, 0) as dungeon_extra_today,
         coalesce(arena_extra_today, 0)   as arena_extra_today
  into v_player
  from public.players where id = p_player_id for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'PLAYER_NOT_FOUND');
  end if;

  -- Get item
  select * into v_item
  from public.shop_items
  where code = p_item_code and is_active = true
    and (available_from is null or available_from <= v_now)
    and (available_until is null or available_until > v_now);

  if not found then
    return jsonb_build_object('success', false, 'error', 'ITEM_NOT_FOUND');
  end if;

  -- Level requirement
  if v_player.level < v_item.min_player_lvl then
    return jsonb_build_object('success', false, 'error', 'LEVEL_TOO_LOW',
      'required_level', v_item.min_player_lvl);
  end if;

  -- Daily limit
  if v_item.daily_limit is not null then
    select count(*) into v_today_count
    from public.shop_purchase_log
    where player_id = p_player_id and item_code = p_item_code
      and purchased_at >= date_trunc('day', v_now);
    if v_today_count >= v_item.daily_limit then
      return jsonb_build_object('success', false, 'error', 'DAILY_LIMIT_REACHED',
        'limit', v_item.daily_limit);
    end if;
  end if;

  -- Account limit (one-time / lifetime)
  if v_item.account_limit is not null then
    select count(*) into v_account_count
    from public.shop_purchase_log
    where player_id = p_player_id and item_code = p_item_code;
    if v_account_count >= v_item.account_limit then
      return jsonb_build_object('success', false, 'error', 'ALREADY_PURCHASED');
    end if;
  end if;

  -- Compute final price (after discount)
  v_final_price := floor(v_item.price * (1 - v_item.discount_pct::numeric / 100));

  -- Currency check & deduction
  if v_item.currency = 'rc' then
    if v_player.rc_balance < v_final_price then
      return jsonb_build_object('success', false, 'error', 'INSUFFICIENT_RC',
        'required', v_final_price, 'available', v_player.rc_balance);
    end if;
    update public.players set rc_balance = rc_balance - v_final_price, updated_at = v_now
    where id = p_player_id;
  elsif v_item.currency = 'gold' then
    if v_player.gold < v_final_price then
      return jsonb_build_object('success', false, 'error', 'INSUFFICIENT_GOLD',
        'required', v_final_price, 'available', v_player.gold);
    end if;
    update public.players set gold = gold - v_final_price, updated_at = v_now
    where id = p_player_id;
  elsif v_item.currency = 'real' then
    -- IAP placeholder — real payments via RevenueCat/Stripe webhook (separate flow)
    return jsonb_build_object('success', false, 'error', 'IAP_NOT_AVAILABLE',
      'message', 'Real-money purchases coming soon.');
  end if;

  -- Apply reward
  v_reward_summary := jsonb_build_object('type', v_item.reward_type, 'amount', v_item.reward_amount);

  if v_item.reward_type = 'rc' then
    update public.players set rc_balance = rc_balance + v_item.reward_amount where id = p_player_id;
  elsif v_item.reward_type = 'gold' then
    update public.players set gold = gold + v_item.reward_amount where id = p_player_id;
  elsif v_item.reward_type = 'summon_scroll' then
    update public.players set summon_scrolls = summon_scrolls + v_item.reward_amount where id = p_player_id;
  elsif v_item.reward_type = 'dungeon_key' then
    update public.players set
      dungeon_extra_today = coalesce(dungeon_extra_today, 0) + v_item.reward_amount
    where id = p_player_id;
  elsif v_item.reward_type = 'arena_token' then
    update public.players set
      arena_extra_today = coalesce(arena_extra_today, 0) + v_item.reward_amount
    where id = p_player_id;
  elsif v_item.reward_type = 'pass_silver' then
    update public.players set
      pass_type = 'silver',
      pass_expires_at = greatest(coalesce(pass_expires_at, v_now), v_now) + (v_item.reward_amount || ' days')::interval
    where id = p_player_id;
  elsif v_item.reward_type = 'pass_gold' then
    update public.players set
      pass_type = 'gold',
      pass_expires_at = greatest(coalesce(pass_expires_at, v_now), v_now) + (v_item.reward_amount || ' days')::interval
    where id = p_player_id;
    -- Apply bundle extras (bonus scrolls, rc)
    if v_item.reward_extra is not null then
      if (v_item.reward_extra->>'bonus_rc') is not null then
        update public.players set rc_balance = rc_balance + (v_item.reward_extra->>'bonus_rc')::int where id = p_player_id;
      end if;
      if (v_item.reward_extra->>'bonus_scrolls') is not null then
        update public.players set summon_scrolls = summon_scrolls + (v_item.reward_extra->>'bonus_scrolls')::int where id = p_player_id;
      end if;
    end if;
  elsif v_item.reward_type = 'echo_pass' then
    update public.players set
      echo_pass_expires_at = greatest(coalesce(echo_pass_expires_at, v_now), v_now) + (v_item.reward_amount || ' days')::interval
    where id = p_player_id;
  elsif v_item.reward_type = 'bundle' then
    -- Bundle: parse reward_extra and apply each
    if v_item.reward_extra is not null then
      if (v_item.reward_extra->>'rc') is not null then
        update public.players set rc_balance = rc_balance + (v_item.reward_extra->>'rc')::int where id = p_player_id;
      end if;
      if (v_item.reward_extra->>'gold') is not null then
        update public.players set gold = gold + (v_item.reward_extra->>'gold')::int where id = p_player_id;
      end if;
      if (v_item.reward_extra->>'scrolls') is not null then
        update public.players set summon_scrolls = summon_scrolls + (v_item.reward_extra->>'scrolls')::int where id = p_player_id;
      end if;
    end if;
  end if;

  -- Log purchase
  insert into public.shop_purchase_log (
    player_id, item_code, category, currency, price_paid,
    reward_type, reward_amount, reward_extra, idempotency_key
  ) values (
    p_player_id, v_item.code, v_item.category, v_item.currency, v_final_price,
    v_item.reward_type, v_item.reward_amount, v_item.reward_extra, p_idempotency_key
  );

  -- Refresh updated player snapshot
  select rc_balance, gold, summon_scrolls, pass_type, pass_expires_at, echo_pass_expires_at,
         dungeon_extra_today, arena_extra_today
  into v_player
  from public.players where id = p_player_id;

  return jsonb_build_object(
    'success',         true,
    'item_code',       p_item_code,
    'item_name',       v_item.name,
    'price_paid',      v_final_price,
    'currency',        v_item.currency,
    'reward',          v_reward_summary,
    'reward_extra',    v_item.reward_extra,
    'player', jsonb_build_object(
      'rc',                  v_player.rc_balance,
      'gold',                v_player.gold,
      'summon_scrolls',      v_player.summon_scrolls,
      'pass_type',           v_player.pass_type,
      'pass_expires_at',     v_player.pass_expires_at,
      'echo_pass_expires_at', v_player.echo_pass_expires_at,
      'dungeon_extra_today', v_player.dungeon_extra_today,
      'arena_extra_today',   v_player.arena_extra_today
    )
  );
end;
$$;

grant execute on function public.purchase_shop_item(uuid, text, text) to authenticated;