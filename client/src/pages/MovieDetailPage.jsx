import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { fetchMovie } from '../services/movieService';
import { useAuth } from '../context/AuthContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { PageShell, ErrorState } from '../components/ui';
import Button from '../components/Button';
import PlatformBadge from '../components/PlatformBadge';
import SaveButton from '../components/SaveButton';
import TmdbImage from '../components/TmdbImage';
import MovieCard from '../components/MovieCard';
import { PLATFORM_LINKS, platformKey } from '../utils/platforms';
import { formatRuntime, languageName, regionName } from '../utils/format';

function Section({ id, title, children, className = '' }) {
  return (
    <section id={id} className={`scroll-mt-24 space-y-4 ${className}`}>
      <h2 className="text-2xl font-black text-white">{title}</h2>
      {children}
    </section>
  );
}

function ProviderGroup({ label, providers }) {
  if (!providers?.length) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => {
          const href = PLATFORM_LINKS[platformKey(p.name)];
          const badge = <PlatformBadge key={p.name} name={p.name} showType={false} />;
          return href ? (
            <a
              key={p.name}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full transition-opacity hover:opacity-80 focus-ring"
            >
              {badge}
            </a>
          ) : (
            badge
          );
        })}
      </div>
    </div>
  );
}

// Placeholder shaped like the real page, so nothing jumps when the movie arrives.
function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading movie" className="page-container py-10">
      <div className="skeleton h-4 w-32 rounded" />
      <div className="mt-8 flex flex-col gap-8 sm:flex-row lg:gap-10">
        <div className="skeleton aspect-[2/3] w-44 shrink-0 rounded-lg lg:w-64" />
        <div className="flex-1 space-y-4">
          <div className="skeleton h-12 w-3/4 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
          <div className="skeleton h-8 w-2/3 rounded-full" />
          <div className="skeleton h-24 w-full max-w-2xl rounded" />
          <div className="skeleton h-11 w-48 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function MovieDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const region = user?.profile?.region ?? 'IN';

  const [movie, setMovie] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useDocumentTitle(movie?.title);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(''); // a previous failure must not stick to the next movie
    window.scrollTo(0, 0); // arriving from "similar movies" keeps the old scroll offset otherwise
    fetchMovie(id)
      .then((r) => {
        if (cancelled) return;
        setMovie(r.data.movie);
        setSimilar(r.data.similar);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  // Back to the exact Explore URL (filters, page) the user came from, when we know it.
  const from = location.state?.from;
  const backTo = typeof from === 'string' && from.startsWith('/explore') ? from : '/explore';
  const backLabel = backTo === '/explore' ? '← Explore' : '← Back to results';
  const BackLink = (
    <Link
      to={backTo}
      className="inline-flex rounded-md text-sm font-medium text-gray-300 transition-colors hover:text-white focus-ring"
    >
      {backLabel}
    </Link>
  );

  if (loading)
    return (
      <PageShell>
        <DetailSkeleton />
      </PageShell>
    );

  if (error || !movie)
    return (
      <PageShell>
        <ErrorState
          title={
            error === 'Movie not found' || !error ? 'Movie not found' : 'Couldn’t load this movie'
          }
          message={
            error === 'Movie not found' || !error
              ? 'It may have been removed, or the link is wrong.'
              : error
          }
          onRetry={
            error && error !== 'Movie not found' ? () => setReloadKey((k) => k + 1) : undefined
          }
        >
          <Button as={Link} to="/explore">
            Back to Explore
          </Button>
        </ErrorState>
      </PageShell>
    );

  const regionProviders = movie.providers?.[region] ?? [];
  const streaming = regionProviders.filter((p) => p.type === 'flatrate');
  const rent = regionProviders.filter((p) => p.type === 'rent');
  const buy = regionProviders.filter((p) => p.type === 'buy');
  const hasProviders = streaming.length + rent.length + buy.length > 0;
  const otherRegions = Object.entries(movie.providers ?? {})
    .filter(([r, list]) => r !== region && list?.length)
    .map(([r]) => r);

  const runtime = formatRuntime(movie.runtime);

  return (
    <PageShell>
      {/* Header: backdrop, scrims, poster and the essentials */}
      <header className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-[radial-gradient(90%_80%_at_80%_0%,var(--color-curtain-900),var(--color-gray-950)_70%)]"
        />
        <TmdbImage
          path={movie.backdropPath}
          kind="backdrop"
          sizes="100vw"
          priority
          fallback={null}
          className="absolute inset-0 -z-10 h-full w-full object-top opacity-60"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-linear-to-r from-gray-950 via-gray-950/75 to-gray-950/20"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-linear-to-t from-gray-950 via-gray-950/30 to-gray-950/30"
        />

        <div className="page-container pb-12 pt-8 lg:pb-16">
          {BackLink}

          <div className="mt-8 flex flex-col gap-8 sm:flex-row lg:gap-12">
            <TmdbImage
              path={movie.posterPath}
              kind="poster"
              alt={movie.title}
              sizes="(min-width: 1024px) 256px, (min-width: 640px) 208px, 176px"
              priority
              className="w-44 shrink-0 rounded-lg shadow-poster ring-1 ring-white/10 sm:w-52 lg:w-64"
            />

            <div className="min-w-0 flex-1 space-y-5 sm:pt-4">
              <h1 className="text-4xl font-black leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                {movie.title}
              </h1>

              <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-200">
                {movie.releaseYear && <li>{movie.releaseYear}</li>}
                {runtime && <li>{runtime}</li>}
                {movie.language && <li>{languageName(movie.language)}</li>}
                {movie.rating != null && (
                  <li className="font-bold text-brass-300">
                    ★ {movie.rating.toFixed(1)}
                    <span className="font-normal text-gray-400"> / 10</span>
                  </li>
                )}
              </ul>

              {movie.genres?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((g) => (
                    <Link
                      key={g}
                      to={`/explore?genre=${encodeURIComponent(g)}`}
                      className="rounded-full bg-white/[0.07] px-3.5 py-1.5 text-sm text-gray-200 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.14] hover:text-white focus-ring"
                    >
                      {g}
                    </Link>
                  ))}
                </div>
              )}

              {movie.overview && (
                <p className="max-w-2xl text-base leading-relaxed text-gray-200">
                  {movie.overview}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <SaveButton
                  movieId={movie._id}
                  showLabel
                  className="h-11 rounded-lg bg-gray-800 px-5 text-white ring-1 ring-inset ring-white/10 hover:bg-gray-700 hover:ring-white/20"
                />
                {movie.trailerKey && (
                  <Button as="a" href="#trailer" variant="outline">
                    Watch trailer
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Where to watch (a ticket), trailer, cast */}
      <div className="page-container grid gap-10 pb-4 pt-2 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
        <aside className="lg:order-2" aria-labelledby="where-to-watch">
          <div className="drop-shadow-[0_18px_24px_rgba(8,1,4,0.55)] lg:sticky lg:top-24">
            <div className="ticket bg-gray-900">
              <div className="p-6 pb-5">
                <h2 id="where-to-watch" className="text-2xl font-black text-white">
                  Where to watch
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Availability in{' '}
                  <span className="font-medium text-gray-200">
                    {regionName(region)} ({region})
                  </span>
                </p>
              </div>
              <div className="perforation-t" aria-hidden="true" />
              <div className="space-y-5 p-6 pt-5">
                {hasProviders ? (
                  <>
                    <ProviderGroup label="Stream" providers={streaming} />
                    <ProviderGroup label="Rent" providers={rent} />
                    <ProviderGroup label="Buy" providers={buy} />
                  </>
                ) : (
                  <p className="text-sm leading-relaxed text-gray-300">
                    Not available on any tracked platform in {regionName(region)}.
                  </p>
                )}
                {otherRegions.length > 0 && (
                  <p className="text-sm text-gray-400">
                    {hasProviders ? 'Also available in' : 'Available in'}{' '}
                    {otherRegions.map((r) => regionName(r)).join(', ')}.
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>
        <div className="space-y-12 lg:order-1">
          {movie.trailerKey && (
            <Section id="trailer" title="Trailer">
              <div className="aspect-video overflow-hidden rounded-xl bg-gray-900 ring-1 ring-white/10">
                <iframe
                  src={`https://www.youtube.com/embed/${movie.trailerKey}`}
                  title={`${movie.title} — trailer`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            </Section>
          )}

          {movie.cast?.length > 0 && (
            <Section title="Cast">
              <ul className="flex flex-wrap gap-2">
                {movie.cast.map((name) => (
                  <li
                    key={name}
                    className="rounded-full bg-gray-800/70 px-3.5 py-1.5 text-sm text-gray-200 ring-1 ring-inset ring-white/10"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>

      {/* Similar movies */}
      {similar.length > 0 && (
        <div className="page-container pb-4 pt-12">
          <Section title="Similar movies">
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
              {similar.map((m) => (
                <MovieCard
                  key={m._id}
                  movie={m}
                  region={region}
                  compact
                  sizes="(min-width: 1024px) 15vw, (min-width: 640px) 30vw, 46vw"
                />
              ))}
            </div>
          </Section>
        </div>
      )}
    </PageShell>
  );
}
