import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchWatchlist } from '../services/movieService';
import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../context/WatchlistContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { PageShell, EmptyState, ErrorState } from '../components/ui';
import Button from '../components/Button';
import { Select } from '../components/FormControls';
import MovieCard from '../components/MovieCard';
import OrderToggle from '../components/OrderToggle';
import { GridSkeleton } from '../components/Skeletons';

const SORT_OPTIONS = [
  { value: 'addedAt', label: 'Date added' },
  { value: 'rating', label: 'Rating' },
  { value: 'year', label: 'Year' },
  { value: 'title', label: 'Title' },
];

export default function WatchlistPage() {
  useDocumentTitle('My Watchlist');
  const { user } = useAuth();
  const { savedIds } = useWatchlist();
  const region = user?.profile?.region ?? 'IN';

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [sortBy, setSortBy] = useState('addedAt');
  const [order, setOrder] = useState('desc');
  const [platform, setPlatform] = useState('');

  const myPlatforms = user?.profile?.ownedPlatforms ?? [];

  // Reload when sort/filter changes or when savedIds changes (add/remove)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const params = { sortBy, order, region };
    if (platform) params.platform = platform;
    fetchWatchlist(params)
      .then((r) => !cancelled && setMovies(r.data.movies))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [sortBy, order, platform, region, savedIds, reloadKey]);

  // A movie you just un-saved leaves the grid immediately; the refetch then confirms it. (Saving
  // it again before the refetch lands brings it straight back, because it's still in `movies`.)
  const visible = movies.filter((m) => savedIds.has(m._id));
  const firstLoad = loading && movies.length === 0;

  return (
    <PageShell>
      <div className="page-container py-10 lg:py-14">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <h1 className="text-4xl font-black leading-none text-white sm:text-5xl">
              My Watchlist
            </h1>
            <p className="mt-3 min-h-6 text-sm text-gray-400" aria-live="polite">
              {!firstLoad && !error && (
                <>
                  <span className="font-semibold text-white">{visible.length}</span> movie
                  {visible.length !== 1 ? 's' : ''} saved
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {myPlatforms.length > 0 && (
              <>
                <label htmlFor="watchlist-platform" className="sr-only">
                  Platform
                </label>
                <Select
                  id="watchlist-platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-48"
                >
                  <option value="">All platforms</option>
                  {myPlatforms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </>
            )}
            <label htmlFor="watchlist-sort" className="sr-only">
              Sort by
            </label>
            <Select
              id="watchlist-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-40"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <OrderToggle
              order={order}
              onToggle={() => setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            />
          </div>
        </div>

        <div className="mt-8" aria-busy={loading}>
          {error && (
            <ErrorState
              title="Couldn’t load your watchlist"
              message={error}
              onRetry={() => setReloadKey((k) => k + 1)}
            />
          )}

          {firstLoad && !error && <GridSkeleton count={10} />}

          {!firstLoad && !error && visible.length === 0 && (
            <EmptyState
              title="Your watchlist is empty"
              body="Tap the heart on any movie to save it here for later."
              action={
                <Button as={Link} to="/explore">
                  Browse movies
                </Button>
              }
            />
          )}

          {!error && visible.length > 0 && (
            <div
              className={`grid grid-cols-2 gap-x-4 gap-y-8 transition-opacity duration-200 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ${
                loading ? 'opacity-60' : ''
              }`}
            >
              {visible.map((m) => (
                <MovieCard key={m._id} movie={m} region={region} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
