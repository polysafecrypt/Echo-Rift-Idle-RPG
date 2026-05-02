# Echo Rift — CLAUDE.md
# Bu dosyayı her oturumda oku. Projenin hafızasısın.

## Proje Kimliği
- **Oyun:** Mobile idle RPG, S&F (Shakes & Fidget) esinli, sci-fi/karanlık fütürizm teması
- **Stack:** React Native + Expo SDK 54, Supabase (PostgreSQL), Zustand state
- **Supabase project_id:** niajnrjqrzratfoetpbz
- **Frontend dizin:** EchoRift/echo-rift/src/
- **Solo dev:** Türkçe konuş. Kısa ve net iletişim.
- **Başlangıç:** Nisan 2026 — "S&F tarzı mobile oyun" fikriyle başladı

---

## Çalışma Stili
- **2'şer 2'şer çalış** — her 2 adımdan sonra dur, raporla, onay bekle
- **Büyük değişiklik = önce analiz, sonra onay, sonra uygula**
- Neyi değiştiriyorsan neyle bağlantılı olduğunu düşün
- Hata çıkınca kökeni araştır, bandaj koyma

---

## KRİTİK KOD KURALLARI

### TypeScript / React Native
```
1. Supabase RPC: ASLA .then().catch() — async/await + try/catch
   ✅ const { data, error } = await supabase.rpc(...)
   ✅ useEffect içi: ;(async () => { try {} catch {} finally {} })()
   ❌ supabase.rpc(...).then(...).catch(...)

2. Alert.alert YASAK → ThemedAlert.alert (drop-in, zaten import'lu)

3. console.log YASAK → console.error (sadece catch içinde)

4. useEffect kullan, useFocusEffect değil
   (useFocusEffect her modal açılışında tetiklenir → sonsuz döngü)

5. Yeni renk açma yasak → COLORS paletinden seç:
   bg, bgCard, bgPanel, border, neonGreen, cyan, gold, error,
   textPrimary, textSecondary, textMuted

6. PlayerActionMenu, ReportModal, ThemedAlert zaten var — yeniden oluşturma
```

### SQL / Supabase
```
7. CREATE POLICY IF NOT EXISTS YOKTUR → DROP + CREATE kullan

8. players tablosunda: rc_balance (rc değil)

9. Migration yazmadan önce ilgili tablonun constraint'lerini kontrol et:
   SELECT conname, pg_get_constraintdef(oid)
   FROM pg_constraint
   WHERE conrelid = 'public.TABLO'::regclass AND contype = 'c';

10. Yeni source/type/status değeri eklerken constraint'i de güncelle
```

---

## KRİTİK LAYOUT KURALLARI (BOZMA)

```
SLOT_SIZE = Math.floor((width - 52) / 5)    ← bu formüle dokunma
charFrame: flex:1, aspectRatio:1             ← TAM KARE, bozma
slotCol: gap:6                               ← 3 slot = charFrame yüksekliği
ITEM_SIZE = (width - GRID_PAD*2 - GRID_GAP*4) / 5

RarityAura:
  - size prop kabul eder AMA wrapper'a uygulanmaz
  - Boyutu children (slot/itemCard style) belirler
  - useNativeDriver: true (opacity animasyonu)
  - Dimensional hariç renk animasyonu yok
```

---

## CHECK CONSTRAINT'LER (Güncel Liste)

| Tablo | Constraint | Değerler |
|-------|-----------|----------|
| mailbox | source_check | quest, dungeon, arena, system, shop, admin, guild, daily_mission, friend_gift, referral_milestone, daily_login, echo_pass |
| daily_login_rewards | day_number_check | 1-30 |
| items | level_check | 1-500 |
| items | rarity_check | Common, Uncommon, Rare, Epic, Legendary, Dimensional |
| items | source_check | quest, dungeon, mailbox, echo_pass, daily_login, achievement, season_reward, admin |
| notifications | type_check | quest_complete, daily_login, season_ending, achievement, mailbox, stamina_full, echo_pass, limited_offer, returning_player, friend_request, friend_accepted, referral_redeemed, referral_reward, energy_gift, arena, guild, dungeon, system |
| rc_transactions | type_check | purchase, echo_pass_reward, achievement, season_reward, daily_login, first_purchase_bonus, refund, admin, dungeon_attempt_buy, arena_token_buy, stamina_buy, echo_pass_buy, guild_boss_top3, summon, shop_purchase, rename, echo_pass_milestone, referral_signup_bonus, echo_rebirth |
| player_activity_log | activity_type_check | level_up, legendary_drop, dimensional_drop, dungeon_floor, arena_top, enhancement_max, achievement, rebirth |

**KURAL:** Yeni değer ekleyeceksen yukarıdaki listeyi güncelle + migration yaz.

---

## SİSTEMLER — Mevcut Durum

### ✅ Tamamlanmış (Dokunma)
- Temel oyun: stamina/quest/AFK/dungeon/arena/champion/echo_pass/guild
- FAZ 1: Player profile, action menu, report sistemi, friend activity feed
- Leaderboard: power, arena, dungeon, achievement, champion (5 tab)
- Echo Rebirth: perform_echo_rebirth RPC, prestige_tier, PRESTIGE sabit
- Effective level item drop: get_effective_level(level, tier) = level + tier×10
- Item tier badge: T{tier}·L{level} sağ altta (T0'da sadece level)
- RarityAura: opacity-only, GPU thread, size prop layout'a etkisiz
- TierBadge component: T1-4 neon, T5-9 gold, T10+ violet
- Referral sistemi, arkadaş sistemi, mailbox, notifications

### 🔄 Kısmen Yapılmış
- Echo Rebirth frontend: RebirthModal ✅, ProfileScreen tier rozeti ✅
  Eksik: Hall of Fame tier filtre, "rebirth hazır" bildirimi
- Tooltip/Skill fix: 3 bilinen hata bekliyor (format_skill_value, describe_skill_effect)
- PlayerProfileScreen: tier+level badge birleştirme eksik

### ❌ Henüz Yapılmamış (Öncelik Sırasıyla)
1. Tooltip/Skill 3 hata düzeltmesi (backend SQL)
2. PlayerProfileScreen T·L badge
3. Echo Rebirth frontend tamamlama
4. FAZ 2: Rarity Aura efekt iyileştirme, +15 görsel, profile parallax
5. FAZ 4: World Boss (world_bosses tablosu, aylık event)
6. FAZ 5: Push Notifications (Expo Push + Supabase cron)
7. FAZ 6: İçerik Rotation (aylık 1 yeni içerik, reskin)
8. IAP: RevenueCat (50+ DAU sonrası)

---

## PRESTIGE / REBIRTH SİSTEMİ (Kesinleşmiş)

```
threshold(tier) = (tier + 1) × 10   ← T0 için Lv10, T1 için Lv20...
xpMult(tier)   = 1.0 + tier × 0.20
statBonus(tier) = tier × 5%
regenSec(tier)  = max(600, 1800 - tier × 30)
maxFriends(tier) = min(15 + tier, 50)

Effective level item drop: level + (prestige_tier × 10)
Item level de effective level olur (Seçenek A — hızlı oyun kararı)
```

---

## FRONTEND-BACKEND SENKRON KONTROL LİSTESİ

Bir şey değiştirirken şunları kontrol et:

```
Backend RPC değiştirdim →
  ✓ Frontend bu RPC'yi çağırıyor mu? (hook güncel mi?)
  ✓ Dönen JSON field'ları aynı mı?
  ✓ TypeScript type tanımı güncellendi mi?

Yeni kolon ekledim →
  ✓ get_player_state bunu expose ediyor mu?
  ✓ Frontend state'de karşılığı var mı?
  ✓ types/index.ts güncellendi mi?

Yeni tablo/constraint ekledim →
  ✓ RLS policy var mı?
  ✓ İlgili RPC'ler bu tabloya erişebiliyor mu?
  ✓ CHECK constraint listesi yukarıda güncellendi mi?

Mailbox'a yeni source ekledim →
  ✓ mailbox_source_check constraint güncellendi mi?

Yeni notification type ekledim →
  ✓ notifications_type_check constraint güncellendi mi?
```

---

## OYUN TASARIMI — DEĞİŞMEZ KARARLAR

```
✅ Pay-to-skip, pay-to-win DEĞİL
✅ Stamina refill satışı YASAK (en agresif P2W)
✅ Premium-only champion YASAK
✅ Level cap YOK — soft wall var (prestige için motivasyon)
✅ Items rebirth'te korunuyor (level+enhancement değişmez)
✅ Co-op expedition YAPILMAYACAK (solo dev maliyeti)
✅ Forced/zorunlu rebirth YAPILMAYACAK
```

---

## MONETİZASYON (50+ DAU sonrası, RevenueCat)

```
Kabul edilenler:
- Quest skip, AFK skip, arena refresh, quest re-roll
- Echo Pass Silver ($4.99) / Gold ($9.99)
- First Purchase Pack ($4.99)
- Weekend bundles (%50 indirim, 48 saat)
- World Boss event bundle

Kesin YASAK:
- Stamina refill
- Direkt stat boost
- Echo Pass'te exclusive ekipman
```

---

## OYUNCULAR (Test)

| Kullanıcı | Email | Level | Prestige |
|-----------|-------|-------|---------|
| UNIT-9604 | test@test.com | ~10 | T1 |
| Osiposi | oguzhantusen@gmail.com | ~55 | T0 |
| FIRSTCLASS | tumaykahramanoglu@gmail.com | ~56 | T0 |
| Ozzi | oguzhantusen2@gmail.com | ~13 | T1 |
| Ozi2 | oguzhantusen3@gmail.com | ~3 | T0 |

Login ekranında "INITIALIZE UNIT-7" butonu → test@test.com hesabına giriş.
Butona basmadan önce signOut() yapılıyor (önceki session temizlenir).

---

## BİLİNEN TEKNIK BORÇLAR

1. `update_daily_mission` — 2 ayrı signature var (duplicate function). Sorun yaratmıyor ama temizlenmeli.
2. `slotLevel`, `hLvl` styles — JSX'te kullanılmıyor ama StyleSheet'te duruyor.
3. `getStatValue`'da `all_seasons` case — UI'dan kaldırıldı ama kod kaldı.
4. Test coverage yok — bir şey değişince yan etkiler manuel test ile bulunuyor.

---

## HEDEF METRİKLER (6 Ay)
MAU: 200-500 | DAU: 50-150 | D1: %30+ | D7: %15+ | D30: %5+ | ARPDAU: $0.20+

