/**
 * Streaming-platform name normalisation.
 *
 * The UI, TMDB and the seed data spell the same service differently
 * ("Amazon Prime Video" / "Prime Video", "Disney Plus" / "Disney+", "Hotstar" /
 * "Disney Plus Hotstar" / "JioHotstar", ...). Everything that compares platform
 * names goes through platformKey() so they actually match.
 */
const PLATFORM_ALIASES = {
  amazonprime: 'primevideo', amazonprimevideo: 'primevideo', primevideo: 'primevideo',
  hbomax: 'max', max: 'max',
  disneyplus: 'disneyplus',
  disneyhotstar: 'hotstar', disneyplushotstar: 'hotstar', jiohotstar: 'hotstar', hotstar: 'hotstar',
  appletvplus: 'appletv', appletv: 'appletv',
  paramountplus: 'paramountplus',
};

function platformKey(name = '') {
  const k = String(name).toLowerCase().replace(/\+/g, 'plus').replace(/[^a-z0-9]/g, '');
  return PLATFORM_ALIASES[k] || k;
}

// Every spelling we know of per canonical key — used to expand DB `$in` filters.
const KNOWN_VARIANTS = {
  primevideo:    ['Amazon Prime Video', 'Prime Video', 'Amazon Prime'],
  max:           ['Max', 'HBO Max'],
  disneyplus:    ['Disney Plus', 'Disney+'],
  hotstar:       ['Hotstar', 'Disney Plus Hotstar', 'Disney+ Hotstar', 'Disney Hotstar', 'JioHotstar'],
  appletv:       ['Apple TV Plus', 'Apple TV+', 'Apple TV'],
  paramountplus: ['Paramount Plus', 'Paramount+'],
};

// ['Hotstar'] -> ['Hotstar', 'Disney Plus Hotstar', 'JioHotstar', ...] (original names are kept)
function expandPlatformNames(names = []) {
  const out = new Set(names);
  for (const n of names) for (const v of KNOWN_VARIANTS[platformKey(n)] ?? []) out.add(v);
  return [...out];
}

module.exports = { platformKey, expandPlatformNames, PLATFORM_ALIASES };
