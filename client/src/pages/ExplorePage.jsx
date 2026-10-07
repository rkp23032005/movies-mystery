import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchMovies, fetchFilters } from '../services/movieService';
import { useAuth } from '../context/AuthContext';
import useDebounce from '../hooks/useDebounce';
import MovieCard from '../components/MovieCard';
import FilterSidebar from '../components/FilterSidebar';
import Pagination from '../components/Pagination';
import { GridSkeleton } from '../components/Skeletons';

const SORT_OPTIONS = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'rating',     label: 'Rating' },
  { value: 'year',       label: 'Year' },
  { value: 'runtime',    label: 'Runtime' },
];

const REGIONS = ['IN', 'US', 'GB', 'AU', 'CA'];

const paramsToObj = (sp) => {
  const obj = {};
  for (const [k, v] of sp.entries()) if (v) obj[k] = v;
  return obj;
};

export default function ExplorePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const filtersFromUrl = paramsToObj(searchParams);
  const [rawQ, setRawQ] = useState(filtersFromUrl.q ?? '');
  const debouncedQ = useDebounce(rawQ, 400);

  const [movies, setMovies]           = useState([]);
  const [pagination, setPagination]   = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [meta, setMeta]               = useState({ genres: [], languages: [], platforms: [] });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const region = filtersFromUrl.region ?? user?.profile?.region ?? 'IN';

  useEffect(() => {
    fetchFilters().then((r) => setMeta(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setSearchParams((prev) => {
      const next = paramsToObj(prev);
      if ((next.q ?? '') === debouncedQ) return prev; // unchanged (e.g. first render): keep current page
      if (debouncedQ) next.q = debouncedQ; else delete next.q;
      next.page = '1';
      return next;
    }, { replace: true });
  }, [debouncedQ]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchMovies({ ...paramsToObj(searchParams), region })
      .then((r) => {
        if (cancelled) return;
        setMovies(r.data.data);
        setPagination(r.data.pagination);
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [searchParams, region]);

  const updateFilters = useCallback((next) => {
    setSearchParams(
      Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined && v !== '')),
      { replace: true }
    );
  }, [setSearchParams]);

  const currentFilters = paramsToObj(searchParams);

  const myPlatforms = user?.profile?.ownedPlatforms ?? [];
  const myPlatformStr = myPlatforms.join(',');
  const myPlatformsActive = currentFilters.platform === myPlatformStr && myPlatforms.length > 0;

  const toggleMyPlatforms = () => {
    if (myPlatformsActive) {
      updateFilters({ ...currentFilters, platform: undefined, page: 1 });
    } else {
      updateFilters({ ...currentFilters, platform: myPlatformStr, page: 1 });
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3 flex-wrap">
        <Link to="/" className="text-lg font-bold shrink-0">🎬</Link>

        <input
          type="search"
          placeholder="Search movies…"
          value={rawQ}
          onChange={(e) => setRawQ(e.target.value)}
          className="flex-1 min-w-[160px] bg-gray-800 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <select
          value={region}
          onChange={(e) => updateFilters({ ...currentFilters, region: e.target.value, page: 1 })}
          className="bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <select
          value={currentFilters.sortBy ?? 'popularity'}
          onChange={(e) => updateFilters({ ...currentFilters, sortBy: e.target.value, page: 1 })}
          className="bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 hidden sm:block"
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <button
          onClick={() => updateFilters({ ...currentFilters, order: currentFilters.order === 'asc' ? 'desc' : 'asc', page: 1 })}
          className="bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 text-sm transition hidden sm:block"
        >
          {currentFilters.order === 'asc' ? '↑ Asc' : '↓ Desc'}
        </button>

        {user && myPlatforms.length > 0 && (
          <button
            onClick={toggleMyPlatforms}
            className={`rounded-lg px-3 py-2 text-sm transition ${myPlatformsActive ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
          >
            My platforms
          </button>
        )}

        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 text-sm transition lg:hidden"
        >
          Filters
        </button>

        {user && (
          <Link to="/watchlist" className="text-sm text-gray-400 hover:text-white transition hidden sm:block">
            Watchlist
          </Link>
        )}
      </div>

      <div className="flex max-w-screen-xl mx-auto px-4 py-6 gap-6">
        <div className={`lg:block lg:w-56 lg:shrink-0 ${sidebarOpen ? 'fixed inset-0 z-30 bg-gray-950/95 p-6 overflow-y-auto' : 'hidden'}`}>
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} className="mb-4 text-gray-400 hover:text-white text-sm">✕ Close</button>
          )}
          <FilterSidebar filters={currentFilters} meta={meta} onChange={updateFilters} />
        </div>

        <div className="flex-1 min-w-0">
          {!loading && !error && (
            <p className="text-sm text-gray-400 mb-4">
              {pagination.total.toLocaleString()} movie{pagination.total !== 1 ? 's' : ''} found
            </p>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
              <p className="text-red-400 text-lg">Something went wrong</p>
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
          )}

          {loading && <GridSkeleton count={20} />}

          {!loading && !error && movies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
              <p className="text-4xl">🎬</p>
              <p className="text-gray-300 text-lg">No movies found</p>
              <p className="text-gray-500 text-sm">Try adjusting your filters or search term.</p>
            </div>
          )}

          {!loading && !error && movies.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {movies.map((m) => <MovieCard key={m._id} movie={m} region={region} />)}
            </div>
          )}

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onChange={(p) => updateFilters({ ...currentFilters, page: p })}
          />
        </div>
      </div>
    </div>
  );
}
