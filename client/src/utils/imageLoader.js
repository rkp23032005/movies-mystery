// WebGL-safe image loading.
//
// A WebGL texture may only be created from an image the browser considers CORS-clean: the request
// must be made in CORS mode AND the server must answer with Access-Control-Allow-Origin. TMDB's
// image CDN has had inconsistent CORS headers (some posters answer, some don't), so this module
// never assumes — it reports exactly why an image can't be used so callers can skip or degrade:
//
//   'cors'        the image displays fine in an <img> but is not usable as a texture
//   'unavailable' the image is missing / the network failed (a plain <img> would break too)
//   'aborted'     the caller's AbortSignal fired
//
// Display-only <img> tags should NOT use this module (or the crossorigin attribute): a CORS
// failure would blank an image that would otherwise render perfectly.

export class ImageLoadError extends Error {
  constructor(reason, url, cause) {
    super(`Image ${reason}: ${url}`);
    this.name = 'ImageLoadError';
    this.reason = reason;
    this.url = url;
    this.cause = cause;
  }
}

const cache = new Map(); // key → Promise<result>; failed entries are evicted so they can retry

const canBitmap = () => typeof createImageBitmap === 'function' && typeof fetch === 'function';

// Does the URL render in a plain (non-CORS) <img>? Tells "CORS blocked" apart from "broken".
function probeDisplayable(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

async function toBitmap(blob, flipY) {
  if (!flipY) return { source: await createImageBitmap(blob), flippedY: false };
  try {
    // UNPACK_FLIP_Y_WEBGL is ignored for ImageBitmap sources, so the flip must happen here.
    return { source: await createImageBitmap(blob, { imageOrientation: 'flipY' }), flippedY: true };
  } catch {
    // Older Safari: no options support. Report flippedY:false so the shader can flip instead.
    return { source: await createImageBitmap(blob), flippedY: false };
  }
}

async function fetchBitmap(url, flipY) {
  let lastError;
  // Second attempt bypasses the HTTP cache: an earlier non-CORS <img> load of the same URL can
  // leave a cached response without Access-Control-Allow-Origin that fails the CORS check.
  for (const cacheMode of ['default', 'reload']) {
    try {
      const res = await fetch(url, { mode: 'cors', credentials: 'omit', cache: cacheMode });
      if (!res.ok) throw new ImageLoadError('unavailable', url);
      return await toBitmap(await res.blob(), flipY);
    } catch (err) {
      if (err instanceof ImageLoadError) throw err; // real HTTP error: retrying won't help
      lastError = err; // TypeError → CORS rejection or network failure
    }
  }
  const displayable = await probeDisplayable(url);
  throw new ImageLoadError(displayable ? 'cors' : 'unavailable', url, lastError);
}

function loadViaElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // must be set BEFORE src
    img.onload = () => resolve({ source: img, flippedY: false });
    img.onerror = async () =>
      reject(new ImageLoadError((await probeDisplayable(url)) ? 'cors' : 'unavailable', url));
    img.src = url;
  });
}

function withAbort(promise, signal, url) {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new ImageLoadError('aborted', url));
    if (signal.aborted) return onAbort();
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

/**
 * Load an image as a CORS-clean WebGL texture source.
 * Resolves { url, source, width, height, aspect, flippedY } where `source` is an ImageBitmap
 * (or an HTMLImageElement on browsers without createImageBitmap) — pass it to gl.texImage2D.
 * Rejects with ImageLoadError. Results are cached per URL; an aborted caller doesn't cancel the
 * shared load, so the cache still warms.
 */
export function loadTexture(url, { signal, flipY = false } = {}) {
  const key = `${flipY ? 'f' : 'n'}|${url}`;
  let entry = cache.get(key);
  if (!entry) {
    entry = (canBitmap() ? fetchBitmap(url, flipY) : loadViaElement(url))
      .then(({ source, flippedY }) => {
        const width = source.width;
        const height = source.height;
        return { url, source, width, height, aspect: width / height, flippedY };
      })
      .catch((err) => {
        cache.delete(key);
        throw err;
      });
    cache.set(key, entry);
  }
  return withAbort(entry, signal, url);
}

/** Free GPU-adjacent memory for an ImageBitmap result and drop it from the cache. */
export function releaseTexture(result) {
  if (!result) return;
  for (const key of [...cache.keys()]) if (key.endsWith(`|${result.url}`)) cache.delete(key);
  result.source?.close?.();
}

/**
 * Load many URLs with bounded concurrency. Never rejects for individual failures:
 * resolves [{ url, ok: true, result } | { url, ok: false, error }] in input order.
 */
export async function preloadTextures(urls, { concurrency = 6, signal, flipY = false } = {}) {
  const out = new Array(urls.length);
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const i = next++;
      try {
        out[i] = { url: urls[i], ok: true, result: await loadTexture(urls[i], { signal, flipY }) };
      } catch (error) {
        out[i] = { url: urls[i], ok: false, error };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  return out;
}
