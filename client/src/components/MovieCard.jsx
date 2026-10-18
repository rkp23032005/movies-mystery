import { Link, useLocation } from 'react-router-dom';
import PlatformBadge from './PlatformBadge';
import SaveButton from './SaveButton';
import TmdbImage, { FilmGlyph } from './TmdbImage';
import { formatRuntime } from '../utils/format';

// Default for the Explore grid (2 → 4 columns). Pass `sizes` where the grid differs.
const GRID_SIZES = '(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 46vw';

/**
 * A poster-first movie card. Fields are all optional because the API returns different shapes
 * (the list endpoint has runtime/overview/providers; "similar" has only title/poster/rating/year/
 * genres) — a missing field simply isn't shown.
 *
 * `compact` drops the hover synopsis and platform badges (used for the small "similar" row).
 *
 * Structure: the title is the card's one real link, stretched over the whole card; the save
 * <button> sits above it as a sibling, so no interactive element is nested inside an <a>.
 * The link carries `state.from` (the Explore URL with its filters) so the detail page can offer
 * "Back to results" without losing the user's search.
 */
export default function MovieCard({ movie, region = 'IN', sizes = GRID_SIZES, compact = false }) {
  const location = useLocation();
  // From Explore: remember where we are. From a detail page (similar movies): pass the original on.
  const from = location.pathname.startsWith('/movies/')
    ? location.state?.from
    : location.pathname + location.search;

  // providers is a plain object after JSON serialisation (Map → object)
  const regionProviders = compact ? [] : (movie.providers?.[region] ?? []);
  const platforms = [...new Map(regionProviders.map((p) => [p.name, p])).values()];
  const shownPlatforms = platforms.slice(0, 2);
  const morePlatforms = platforms.length - shownPlatforms.length;

  const runtime = formatRuntime(movie.runtime);
  const details = [movie.releaseYear, runtime, movie.genres?.[0]].filter(Boolean);

  return (
    <article className="group relative flex min-w-0 flex-col">
      <div className="absolute right-2 top-2 z-20">
        <SaveButton
          movieId={movie._id}
          className="grid size-9 place-items-center bg-gray-950/70 hover:bg-gray-950/90"
        />
      </div>

      <div className="relative overflow-hidden rounded-lg bg-gray-800 ring-1 ring-white/[0.08] transition duration-300 ease-cinema group-focus-within:ring-2 group-focus-within:ring-brass-400 group-hover:shadow-poster group-hover:ring-brass-400/50">
        <TmdbImage
          path={movie.posterPath}
          kind="poster"
          sizes={sizes}
          fallback={<FilmGlyph label="Poster unavailable" />}
          className="w-full transition-transform duration-500 ease-cinema group-hover:scale-[1.03]"
        />

        {!compact && movie.overview && (
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-linear-to-t from-gray-950/95 via-gray-950/70 to-gray-950/20 p-3 pb-11 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 group-hover:opacity-100">
            <p className="line-clamp-5 text-xs leading-relaxed text-gray-100">{movie.overview}</p>
          </div>
        )}

        {movie.rating != null && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-gray-950/90 to-transparent px-2.5 pb-2 pt-8">
            <span className="text-sm font-bold text-brass-300">★ {movie.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-1.5">
        <p
          className={`font-semibold leading-snug text-white ${compact ? 'text-sm' : 'text-[0.95rem]'}`}
        >
          <Link
            to={`/movies/${movie._id}`}
            state={from ? { from } : undefined}
            className="line-clamp-2 outline-none after:absolute after:inset-0 after:z-10 after:content-['']"
          >
            {movie.title}
          </Link>
        </p>
        {details.length > 0 && (
          <p className="flex flex-wrap gap-x-3 text-xs text-gray-400">
            {details.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </p>
        )}
        {shownPlatforms.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            {shownPlatforms.map((p) => (
              <PlatformBadge key={p.name} name={p.name} />
            ))}
            {morePlatforms > 0 && (
              <span className="text-[11px] text-gray-400">+{morePlatforms}</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
