import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchWatchlist } from '../services/movieService';
import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../context/WatchlistContext';
import MovieCard from '../components/MovieCard';
import { GridSkeleton } from '../components/Skeletons';

const SORT_OPTIONS = [
  { value: 'addedAt', label: 'Date added' },
  { value: 'rating',  label: 'Rating' },
  { value: 'year',    label: 'Year' },
  { value: 'title',   label: 'Title' },
];

export default function WatchlistPage() {
  const { user } = useAuth();
  const { savedIds } = useWatchlist();
  const region = user?.profile?.region ?? 'IN';

  const [movies, setMovies]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [sortBy, setSortBy]   = useState('addedAt');
  const [order, setOrder]     = useState('desc');
  const [platform, setPlatform] = useState('');

  const myPlatforms = user?.profile?.ownedPlatforms ?? [];

  const load = () => {
    setLoading(true);
    setError('');
    const params = { sortBy, order, region };
    if (platform) params.platform = platform;
    fetchWatchlist(params)
      .then((r) => setMovies(r.data.movies))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  // Reload when sort/filter changes or when savedIds changes (add/remove)
  useEffect(load, [sortBy, order, platform, region, savedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-screen-xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">My Watchlist</h1>
            {!loading && <p className="text-sm text-gray-400 mt-1">{movies.length} movie{movies.length !== 1 ? 's' : ''}</p>}
          </div>
          <Link to="/explore" className="text-sm text-indigo-400 hover:underline">← Explore</Link>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <button
            onClick={() => setOrder((o) => o === 'asc' ? 'desc' : 'asc')}
            className="bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 text-sm transition"
          >
            {order === 'asc' ? '↑ Asc' : '↓ Desc'}
          </button>

          {/* Platform filter — only show platforms the user owns */}
          {myPlatforms.length > 0 && (
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All platforms</option>
              {myPlatforms.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {loading && <GridSkeleton count={10} />}

        {!loading && !error && movies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
            <p className="text-4xl">🎬</p>
            <p className="text-gray-300 text-lg">Your watchlist is empty</p>
            <Link to="/explore" className="text-indigo-400 hover:underline text-sm">Browse movies</Link>
          </div>
        )}

        {!loading && !error && movies.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {movies.map((m) => <MovieCard key={m._id} movie={m} region={region} />)}
          </div>
        )}
      </div>
    </div>
  );
}
