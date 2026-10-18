// Display formatting for movie metadata. Pure functions over real API values.

/** 139 → "2h 19m", 120 → "2h", 45 → "45m". null when the runtime is unknown (0 / missing). */
export function formatRuntime(minutes) {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Intl.DisplayNames ships with the browser, so "hi" → "Hindi" and "IN" → "India" need no data table.
const makeNames = (type) => {
  try {
    return new Intl.DisplayNames(['en'], { type, fallback: 'code' });
  } catch {
    return null;
  }
};
const languages = makeNames('language');
const regions = makeNames('region');

const safeName = (names, code) => {
  try {
    return names?.of(code) ?? code;
  } catch {
    return code; // malformed code
  }
};

export const languageName = (code) => (code ? safeName(languages, code) : '');
// Intl.DisplayNames only resolves region codes in UPPER case ("us" comes back unchanged).
export const regionName = (code) => (code ? safeName(regions, String(code).toUpperCase()) : '');
