import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TmdbImage from './TmdbImage';
import useReducedMotion from '../hooks/useReducedMotion';
import { createMorphRenderer } from '../utils/morphRenderer';
import { resolveGalleryTextures, selectGalleryMovies } from '../utils/imagery';
import { releaseTexture } from '../utils/imageLoader';
import { bestWidth } from '../utils/tmdbImage';
import { cx } from '../utils/cx';

const RESOLVE_TIMEOUT_MS = 10000; // give up on WebGL textures and use plain <img>s
const MIN_WEBGL_SLIDES = 5;
const POSTER_BELOW_ASPECT = 0.85; // stage narrower than this → posters; wider than 1.05 → backdrops
const BACKDROP_ABOVE_ASPECT = 1.05;

const initialKind = () =>
  typeof window !== 'undefined' && window.innerWidth / window.innerHeight < POSTER_BELOW_ASPECT
    ? 'poster'
    : 'backdrop';

/**
 * A full-bleed movie image stage whose slides dissolve into one another through animated noise
 * (WebGL), with a plain-<img> fallback that is always underneath.
 *
 * Images are real movies from `movies` (the API's list items). Landscape stages use backdrops,
 * portrait stages use posters, so a phone never gets a thin slice of a widescreen frame.
 *
 * How it can't end up black:
 *   1. a DOM layer of ordinary <img>s renders as soon as `movies` arrives (no CORS needed);
 *   2. the canvas fades in only after WebGL produced a successful first frame;
 *   3. CORS-blocked / missing images are skipped (never replaced with placeholders), and if too
 *      few are usable, a texture load times out, WebGL is missing/lost, or the user prefers
 *      reduced motion, the DOM layer simply stays.
 *   With no usable images at all the stage is the wine-coloured backdrop and `count` is 0.
 *
 * Composition is up to the caller: pass a function as `children` and it receives
 *   { slide, index, count, goTo, next, prev, playing, running, canAutoplay, togglePlay, engine, kind }
 * where `slide` is the current movie (or null) and `engine` is 'webgl' | 'dom' | 'none'.
 */
export default function MorphGallery({
  movies,
  count = 10,
  autoplayMs = 6500,
  label = 'Featured movies',
  className,
  children,
}) {
  const reduced = useReducedMotion();
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const swipeRef = useRef(null);

  const [kind, setKind] = useState(initialKind);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [keyFocus, setKeyFocus] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden'
  );
  const [resolved, setResolved] = useState(null); // { key, mode, slides:[{ movie, texture }] }
  const [shownFor, setShownFor] = useState(null); // `resolved` object whose first frame rendered
  const [failedFor, setFailedFor] = useState(null); // `resolved` object whose renderer failed

  const field = kind === 'backdrop' ? 'backdropPath' : 'posterPath';

  // Candidates: real movies with a usable image of this kind (a few spare in case some fail).
  const candidates = useMemo(
    () => selectGalleryMovies(movies, { count: count + 6, kind }),
    [movies, count, kind]
  );
  const baseSlides = useMemo(
    () => candidates.slice(0, count).map((movie) => ({ movie })),
    [candidates, count]
  );
  const key = useMemo(
    () => `${kind}|${candidates.map((m) => m._id).join(',')}`,
    [kind, candidates]
  );

  const webglSlides =
    resolved && resolved.key === key && resolved.mode === 'webgl' ? resolved : null;
  const wantsWebgl = Boolean(webglSlides) && failedFor !== resolved && !reduced;
  const slides = wantsWebgl ? webglSlides.slides : baseSlides;
  const n = slides.length;
  const safeIndex = n ? Math.min(index, n - 1) : 0;
  const movie = slides[safeIndex]?.movie ?? null;
  const engine = n === 0 ? 'none' : wantsWebgl && shownFor === resolved ? 'webgl' : 'dom';

  // Latest values for async callbacks / the renderer effect, without re-running them.
  const indexRef = useRef(0);
  const movieIdRef = useRef(null);
  useEffect(() => {
    indexRef.current = safeIndex;
    movieIdRef.current = movie?._id ?? null;
  });

  // ── Stage size → poster or backdrop ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      const aspect = width / height;
      setKind((k) =>
        aspect < POSTER_BELOW_ASPECT ? 'poster' : aspect > BACKDROP_ABOVE_ASPECT ? 'backdrop' : k
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Visibility: pause rendering/autoplay off-screen or in a background tab ───────────────
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    const onVis = () => setTabVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // ── Resolve CORS-clean textures (skipped for reduced motion: the DOM layer is enough) ─────
  useEffect(() => {
    if (reduced || candidates.length === 0) return undefined;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), RESOLVE_TIMEOUT_MS);
    const cssWidth = rootRef.current?.clientWidth || 1280;
    const width = bestWidth(kind, cssWidth, Math.min(window.devicePixelRatio || 1, 1.5));

    resolveGalleryTextures(candidates, {
      count,
      minimum: Math.min(MIN_WEBGL_SLIDES, count),
      kind,
      width,
      signal: ctrl.signal,
    })
      .then(({ items, mode }) => {
        if (ctrl.signal.aborted) return;
        const slidesWithTextures = items.map(({ movie: m, texture }) => ({ movie: m, texture }));
        setResolved({ key, mode, slides: slidesWithTextures });
        // Keep showing the same movie when the slide list is swapped for the textured one.
        setIndex((cur) => {
          const at = slidesWithTextures.findIndex((s) => s.movie._id === movieIdRef.current);
          return at >= 0 ? at : Math.min(cur, Math.max(0, slidesWithTextures.length - 1));
        });
      })
      .catch(() => {}) // resolveGalleryTextures never rejects; stay on the DOM layer regardless
      .finally(() => clearTimeout(timer));

    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [candidates, count, kind, key, reduced]);

  // Free the decoded bitmaps when the textured slide set is replaced or the gallery unmounts.
  useEffect(
    () => () => {
      resolved?.slides.forEach((s) => releaseTexture(s.texture));
    },
    [resolved]
  );

  // ── WebGL renderer lifecycle ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!wantsWebgl) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const renderer = createMorphRenderer(canvas, {
      sources: resolved.slides.map((s) => s.texture),
      onFirstFrame: () => setShownFor(resolved),
      onFail: () => setFailedFor(resolved),
    });
    if (!renderer) {
      setFailedFor(resolved); // no WebGL, shader error or first upload failed → DOM layer stays
      return undefined;
    }
    rendererRef.current = renderer;
    renderer.goTo(indexRef.current, { instant: true });

    const ro = new ResizeObserver(() => renderer.resize());
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      renderer.destroy();
      if (rendererRef.current === renderer) rendererRef.current = null;
    };
  }, [wantsWebgl, resolved]);

  useEffect(() => {
    rendererRef.current?.goTo(safeIndex);
  }, [safeIndex]);

  useEffect(() => {
    rendererRef.current?.setActive(inView && tabVisible);
  }, [inView, tabVisible, wantsWebgl, resolved, engine]);

  // ── Autoplay (never under reduced motion; pauses on hover / keyboard focus / off-screen) ──
  const canAutoplay = !reduced && n > 1;
  const running = canAutoplay && playing && !hovering && !keyFocus && inView && tabVisible;
  useEffect(() => {
    if (!running) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % n), autoplayMs);
    return () => clearTimeout(t);
  }, [running, safeIndex, n, autoplayMs]);

  // ── Navigation ─────────────────────────────────────────────────────────────────────────────
  const goTo = useCallback((i) => n && setIndex(((i % n) + n) % n), [n]);
  const next = useCallback(() => goTo(safeIndex + 1), [goTo, safeIndex]);
  const prev = useCallback(() => goTo(safeIndex - 1), [goTo, safeIndex]);
  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  const onKeyDown = (e) => {
    if (n < 2 || e.altKey || e.ctrlKey || e.metaKey) return;
    const actions = {
      ArrowRight: next,
      ArrowLeft: prev,
      Home: () => goTo(0),
      End: () => goTo(n - 1),
    };
    const act = actions[e.key];
    if (act) {
      e.preventDefault();
      act();
    }
  };

  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse') swipeRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e) => {
    const s = swipeRef.current;
    swipeRef.current = null;
    if (!s || n < 2) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)();
  };
  const onPointerMove = (e) => {
    if (e.pointerType !== 'mouse' || !rendererRef.current) return;
    const r = rootRef.current.getBoundingClientRect();
    rendererRef.current.setPointer((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  };

  const api = {
    slide: movie,
    index: safeIndex,
    count: n,
    goTo,
    next,
    prev,
    playing: canAutoplay && playing,
    running,
    canAutoplay,
    togglePlay,
    engine,
    kind,
  };

  const near = (i) =>
    n > 0 && (i === safeIndex || i === (safeIndex + 1) % n || i === (safeIndex - 1 + n) % n);

  return (
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label={label}
      data-engine={engine}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (swipeRef.current = null)}
      onPointerMove={onPointerMove}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovering(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHovering(false)}
      onFocus={(e) => setKeyFocus(Boolean(e.target?.matches?.(':focus-visible')))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setKeyFocus(false);
      }}
      className={cx('relative isolate touch-pan-y overflow-hidden bg-gray-950', className)}
    >
      {/* Wine-coloured stage: what you see before any image, and if there are none. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-[radial-gradient(90%_70%_at_75%_30%,var(--color-curtain-900),var(--color-gray-950)_70%)]"
      />

      {/* DOM layer: ordinary <img>s, no CORS involved. Always correct, always underneath. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {slides.map((s, i) =>
          near(i) ? (
            <div
              key={s.movie._id}
              className={cx(
                'absolute inset-0 transition-opacity duration-1000 ease-cinema',
                i === safeIndex ? 'opacity-100' : 'opacity-0'
              )}
            >
              <TmdbImage
                path={s.movie[field]}
                kind={kind}
                sizes="100vw"
                priority={i === 0}
                fallback={null}
                className="h-full w-full saturate-[0.88]"
              />
            </div>
          ) : null
        )}
      </div>

      {wantsWebgl && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={cx(
            'absolute inset-0 -z-10 h-full w-full transition-opacity duration-700',
            engine === 'webgl' ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {/* Announces slide changes to screen readers — but not while autoplay is rotating them. */}
      <p className="sr-only" aria-live={api.running ? 'off' : 'polite'} aria-atomic="true">
        {movie ? `Slide ${safeIndex + 1} of ${n}: ${movie.title}` : ''}
      </p>

      <div className="relative min-h-[inherit]">
        {typeof children === 'function' ? children(api) : children}
      </div>
    </section>
  );
}
