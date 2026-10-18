import { useState } from 'react';
import { isValidImagePath, tmdbImage, tmdbSrcSet } from '../utils/tmdbImage';
import { cx } from '../utils/cx';

// kind decides aspect ratio, which widths are offered to the browser, and the default fallback.
const KINDS = {
  poster: { aspect: 'aspect-[2/3]', widths: [185, 342, 500], base: 'w342' },
  thumb: { aspect: 'aspect-[2/3]', widths: [92, 154, 185], base: 'w154' },
  backdrop: { aspect: 'aspect-video', widths: [780, 1280], base: 'w1280' },
};

const FilmGlyph = ({ label }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-2 text-center text-gray-500">
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-6 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </svg>
    {label && <span className="text-xs">{label}</span>}
  </div>
);

/**
 * A movie image that never breaks the layout.
 *  - responsive srcset from the TMDB sizes that actually exist
 *  - aspect ratio reserved up front (no layout shift) unless the caller sets an explicit height
 *  - lazy by default; `priority` for above-the-fold images
 *  - on a missing path or a load error: renders `fallback` (default: a film-frame glyph for
 *    posters/thumbs, nothing for backdrops). Pass fallback={null} for nothing.
 *
 * Deliberately has NO crossorigin attribute: display images must keep working even if the CDN
 * omits CORS headers. WebGL textures go through utils/imageLoader.js instead.
 *
 * Always pass `sizes` (the CSS width the image is displayed at). Without it the browser assumes the
 * image is viewport-wide and downloads the largest candidate.
 *
 * `className` goes on the <img> (and on the fallback box, so sizing matches).
 */
export default function TmdbImage({
  path,
  kind = 'poster',
  alt = '',
  sizes,
  priority = false,
  fallback,
  className,
  ...props
}) {
  const [failedPath, setFailedPath] = useState(null);
  const cfg = KINDS[kind] ?? KINDS.poster;
  const usable = isValidImagePath(path) && failedPath !== path;

  if (!usable) {
    const node = fallback !== undefined ? fallback : kind === 'backdrop' ? null : <FilmGlyph />;
    if (node === null) return null;
    return (
      <div
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={cx(cfg.aspect, 'overflow-hidden bg-gray-800', className)}
      >
        {node}
      </div>
    );
  }

  return (
    <img
      src={tmdbImage(path, cfg.base)}
      srcSet={tmdbSrcSet(path, cfg.widths)}
      sizes={sizes}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      onError={() => setFailedPath(path)}
      className={cx(cfg.aspect, 'bg-gray-800 object-cover', className)}
      {...props}
    />
  );
}

export { FilmGlyph };
