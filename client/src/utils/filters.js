// The Explore page's filter contract. Everything lives in the URL query string, so these keys
// are the public API of /explore — deep links like /explore?genre=Drama&minRating=8 rely on them.
import { languageName } from './format';

export const REGIONS = ['IN', 'US', 'GB', 'AU', 'CA'];

export const SORT_OPTIONS = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'rating', label: 'Rating' },
  { value: 'year', label: 'Year' },
  { value: 'runtime', label: 'Runtime' },
];

// Keys that narrow the result set. (sortBy / order / region / page are not "filters".)
export const FILTER_KEYS = [
  'q',
  'genre',
  'language',
  'platform',
  'minRating',
  'maxRuntime',
  'yearFrom',
  'yearTo',
];

/** URLSearchParams → plain object, dropping empty values. */
export const paramsToObj = (sp) => {
  const obj = {};
  for (const [k, v] of sp.entries()) if (v) obj[k] = v;
  return obj;
};

/** [{ key, label }] for every filter currently applied — drives the removable chips. */
export function activeFilterList(filters, { myPlatformStr = '' } = {}) {
  const out = [];
  const add = (key, label) => out.push({ key, label });
  if (filters.q) add('q', `“${filters.q}”`);
  if (filters.genre) add('genre', filters.genre.replaceAll(',', ', '));
  if (filters.language) add('language', languageName(filters.language));
  if (filters.platform) {
    const mine = myPlatformStr && filters.platform === myPlatformStr;
    add('platform', mine ? 'My platforms' : filters.platform.replaceAll(',', ', '));
  }
  if (filters.minRating) add('minRating', `Rating ${filters.minRating}+`);
  if (filters.maxRuntime) add('maxRuntime', `Up to ${filters.maxRuntime} min`);
  if (filters.yearFrom && filters.yearTo) add('yearFrom', `${filters.yearFrom}–${filters.yearTo}`);
  else if (filters.yearFrom) add('yearFrom', `From ${filters.yearFrom}`);
  else if (filters.yearTo) add('yearTo', `Until ${filters.yearTo}`);
  return out;
}

/** Remove one chip's filter (a combined year range chip clears both ends). */
export function withoutFilter(filters, key) {
  const next = { ...filters, page: 1 };
  delete next[key];
  if (key === 'yearFrom' || key === 'yearTo') {
    delete next.yearFrom;
    delete next.yearTo;
  }
  return next;
}

/** Keep sorting and region, drop every filter (and the search text). */
export function withoutFilters(filters) {
  const next = { ...filters, page: 1 };
  for (const k of FILTER_KEYS) delete next[k];
  return next;
}
