// Choosing WHICH real movie images to show. Works only on movies the API already returned —
// nothing is hardcoded and nothing is invented.
import { isValidImagePath, tmdbImage } from './tmdbImage';
import { preloadTextures } from './imageLoader';

const FIELD = { poster: 'posterPath', backdrop: 'backdropPath' };
const OTHER = { poster: 'backdropPath', backdrop: 'posterPath' };

/**
 * Pick up to `count` movies that have a usable image of the requested `kind` ('poster' |
 * 'backdrop'), de-duplicated, preserving API order (the API sorts by popularity). Movies that
 * also have the other image are preferred; order within each group is unchanged.
 */
export function selectGalleryMovies(movies, { count = 24, kind = 'poster' } = {}) {
  const field = FIELD[kind] ?? FIELD.poster;
  const other = OTHER[kind] ?? OTHER.poster;
  const seenIds = new Set();
  const seenPaths = new Set();
  const usable = [];
  for (const m of movies ?? []) {
    if (!m || !isValidImagePath(m[field])) continue;
    if (seenIds.has(m._id) || seenPaths.has(m[field])) continue;
    seenIds.add(m._id);
    seenPaths.add(m[field]);
    usable.push(m);
  }
  const both = usable.filter((m) => isValidImagePath(m[other]));
  const single = usable.filter((m) => !isValidImagePath(m[other]));
  return [...both, ...single].slice(0, count);
}

/**
 * Turn candidate movies into CORS-clean textures (posters or backdrops) for WebGL.
 *
 * Loads in batches and stops as soon as `count` textures are ready. Movies whose poster can't be
 * used (CORS blocked, missing) are skipped and reported — never replaced with a placeholder.
 *
 * Resolves { items, skipped, mode }:
 *   items    [{ movie, texture }]   texture = loadTexture result (source, width, height, aspect…)
 *   skipped  [{ movie, reason }]    reason: 'cors' | 'unavailable' | 'aborted'
 *   mode     'webgl' when at least `minimum` textures loaded, otherwise 'dom' — the caller should
 *            render ordinary <img> tiles instead of a canvas.
 */
export async function resolveGalleryTextures(
  movies,
  { count = 18, minimum = 8, kind = 'poster', width, concurrency = 6, signal, flipY = false } = {}
) {
  const field = FIELD[kind] ?? FIELD.poster;
  const size = `w${width ?? (kind === 'backdrop' ? 1280 : 500)}`;
  const items = [];
  const skipped = [];
  for (let i = 0; i < movies.length && items.length < count; i += concurrency) {
    if (signal?.aborted) break;
    const batch = movies.slice(i, i + concurrency);
    const results = await preloadTextures(
      batch.map((m) => tmdbImage(m[field], size)),
      { concurrency, signal, flipY }
    );
    results.forEach((r, j) => {
      if (r.ok && items.length < count) items.push({ movie: batch[j], texture: r.result });
      else if (!r.ok) skipped.push({ movie: batch[j], reason: r.error.reason });
    });
  }
  return { items, skipped, mode: items.length >= minimum ? 'webgl' : 'dom' };
}
