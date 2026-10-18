// Single source of truth for movie-image URLs, sizes and aspect ratios.
//
// TMDB serves only a fixed set of widths (anything else 404s):
//   posters   w92 w154 w185 w342 w500 w780 original      (2:3)
//   backdrops w300 w780 w1280 original                   (16:9)
//
// Base URL: defaults to TMDB's CDN. Set VITE_IMAGE_BASE=/tmdb-img to route every image through
// the same-origin proxy (vite.config.js in dev, vercel.json in production). That makes WebGL
// textures CORS-proof — see utils/imageLoader.js and .env.example.

const DEFAULT_BASE = 'https://image.tmdb.org/t/p';

export const IMAGE_BASE = (import.meta.env.VITE_IMAGE_BASE || DEFAULT_BASE).replace(/\/+$/, '');

// True when images are served from this site's own origin (no CORS involved at all).
export const IMAGE_BASE_IS_SAME_ORIGIN = IMAGE_BASE.startsWith('/');

export const POSTER_ASPECT = 2 / 3;
export const BACKDROP_ASPECT = 16 / 9;

export const POSTER_WIDTHS = [92, 154, 185, 342, 500, 780];
export const BACKDROP_WIDTHS = [300, 780, 1280];

// TMDB file paths look like "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg". Validating keeps empty strings
// (the schema default), nulls and malformed values from ever becoming a request.
const VALID_PATH = /^\/[\w-]{8,}\.(?:jpe?g|png)$/i;
export const isValidImagePath = (path) => typeof path === 'string' && VALID_PATH.test(path);

/** Full URL for a path at a TMDB size token ('w342', 'w1280', 'original'). null if path is unusable. */
export const tmdbImage = (path, size = 'w342') =>
  isValidImagePath(path) ? `${IMAGE_BASE}/${size}${path}` : null;

/** `srcset` string: "…/w185/x.jpg 185w, …/w342/x.jpg 342w". undefined if path is unusable. */
export const tmdbSrcSet = (path, widths = [185, 342, 500]) =>
  isValidImagePath(path)
    ? widths.map((w) => `${IMAGE_BASE}/w${w}${path} ${w}w`).join(', ')
    : undefined;

/** Smallest TMDB width that covers `cssPx` at the device pixel ratio (DPR capped at 2). */
export function bestWidth(kind, cssPx, dpr = 1) {
  const list = kind === 'backdrop' ? BACKDROP_WIDTHS : POSTER_WIDTHS;
  const target = cssPx * Math.min(dpr || 1, 2);
  return list.find((w) => w >= target) ?? list[list.length - 1];
}

/**
 * Center-crop ("object-fit: cover") maths for textures, as UV transform values:
 *   uv' = uv * [scaleX, scaleY] + [offsetX, offsetY]
 * so a 2:3 poster texture fills a 16:9 (or any) frame without stretching.
 */
export function coverCrop(srcAspect, dstAspect) {
  if (!(srcAspect > 0) || !(dstAspect > 0)) return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
  if (srcAspect > dstAspect) {
    const s = dstAspect / srcAspect; // source is wider than frame → trim the sides
    return { scaleX: s, scaleY: 1, offsetX: (1 - s) / 2, offsetY: 0 };
  }
  const s = srcAspect / dstAspect; // source is taller than frame → trim top and bottom
  return { scaleX: 1, scaleY: s, offsetX: 0, offsetY: (1 - s) / 2 };
}
