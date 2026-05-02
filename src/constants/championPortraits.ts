// =============================================
// ECHO RIFT — CHAMPION PORTRAIT MAPPING
// =============================================
// Champion name → require() statik mapping.
//
// React Native bundler (Metro) require() çağrılarını compile-time'da
// resolve eder — dosya yoksa hata atar. Bu yüzden asset gelmemiş
// champion'lar için satırı YORUM olarak bırakıyoruz.
//
// ASSET EKLEME WORKFLOW:
// 1. Sanatçıdan PNG geldi: ör. "amp.png"
// 2. Dosyayı echo-rift/assets/champions/amp.png içine koy
// 3. Aşağıdaki ilgili satırın başındaki "// " kaldır
// 4. App'i tekrar bundle et — portrait artık o champion için görünür
//
// Asset yoksa: emoji fallback (ELEMENT_ICONS) gösterilir, app crash etmez.
// =============================================

const PORTRAITS: Record<string, any> = {
  // ── COMMON / UNCOMMON ───────────────────────────────────────────────
  // 'amp':                require('../../assets/champions/amp.png'),
  // 'aqua':               require('../../assets/champions/aqua.png'),
  // 'ashen':              require('../../assets/champions/ashen.png'),
  // 'boulder':            require('../../assets/champions/boulder.png'),
  // 'briar':              require('../../assets/champions/briar.png'),
  // 'brook':              require('../../assets/champions/brook.png'),
  // 'cascade':            require('../../assets/champions/cascade.png'),
  // 'cinder':             require('../../assets/champions/cinder.png'),
  // 'conductor':          require('../../assets/champions/conductor.png'),
  // 'coral':              require('../../assets/champions/coral.png'),
  // 'dusk':               require('../../assets/champions/dusk.png'),
  // 'flare':              require('../../assets/champions/flare.png'),
  // 'gloom':              require('../../assets/champions/gloom.png'),
  // 'ironbark':           require('../../assets/champions/ironbark.png'),
  // 'jolt':               require('../../assets/champions/jolt.png'),
  // 'kindle':             require('../../assets/champions/kindle.png'),
  // 'mist':               require('../../assets/champions/mist.png'),
  // 'mossy':              require('../../assets/champions/mossy.png'),
  // 'pebble':             require('../../assets/champions/pebble.png'),
  // 'pyro':               require('../../assets/champions/pyro.png'),
  // 'ripple':             require('../../assets/champions/ripple.png'),
  // 'scorch':             require('../../assets/champions/scorch.png'),
  // 'shade':              require('../../assets/champions/shade.png'),
  // 'spark':              require('../../assets/champions/spark.png'),
  // 'tesla':              require('../../assets/champions/tesla.png'),
  // 'umbra':              require('../../assets/champions/umbra.png'),
  // 'verdant':            require('../../assets/champions/verdant.png'),
  // 'watt':               require('../../assets/champions/watt.png'),
  // 'wraith':             require('../../assets/champions/wraith.png'),
  // 'zap':                require('../../assets/champions/zap.png'),

  // ── RARE ────────────────────────────────────────────────────────────
  // 'emberlynn':          require('../../assets/champions/emberlynn.png'),
  // 'frostbite':          require('../../assets/champions/frostbite.png'),
  // 'glacier':            require('../../assets/champions/glacier.png'),
  // 'nightshade':         require('../../assets/champions/nightshade.png'),
  // 'phantom':            require('../../assets/champions/phantom.png'),
  // 'quake':              require('../../assets/champions/quake.png'),
  // 'reaper':             require('../../assets/champions/reaper.png'),
  // 'stormcaller':        require('../../assets/champions/stormcaller.png'),
  // 'thornwood':          require('../../assets/champions/thornwood.png'),
  // 'tidecaller':         require('../../assets/champions/tidecaller.png'),
  // 'voidwalker':         require('../../assets/champions/voidwalker.png'),
  // 'voltex':             require('../../assets/champions/voltex.png'),
  // 'vulkara':            require('../../assets/champions/vulkara.png'),

  // ── EPIC ────────────────────────────────────────────────────────────
  // 'golem_king':         require('../../assets/champions/golem_king.png'),
  // 'ignaros':            require('../../assets/champions/ignaros.png'),

  // ── LEGENDARY / DIMENSIONAL ─────────────────────────────────────────
  // 'leviax':             require('../../assets/champions/leviax.png'),
  // 'solarius_rex':       require('../../assets/champions/solarius_rex.png'),
  // 'stormgod_kael':      require('../../assets/champions/stormgod_kael.png'),
  // 'terra_magna':        require('../../assets/champions/terra_magna.png'),
  // 'void_lord_malachar': require('../../assets/champions/void_lord_malachar.png'),
}

/**
 * Champion ismi (backend'den gelen `champion.name`) verildiğinde,
 * portrait require sonucunu döndürür. Asset yoksa null.
 *
 * @example
 * const portrait = getChampionPortrait('Solarius Rex')
 * if (portrait) {
 *   <Image source={portrait} />
 * } else {
 *   <Text>{ELEMENT_ICONS[champ.element]}</Text>
 * }
 */
export function getChampionPortrait(name: string | undefined | null): any | null {
  if (!name) return null
  // Backend portrait_url path formatı ile aynı: lowercase + space → underscore
  const key = name.toLowerCase().replace(/\s+/g, '_')
  return PORTRAITS[key] || null
}
