import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchMovies, fetchFilters } from '../services/movieService';
import { useAuth } from '../context/AuthContext';
import useDebounce from '../hooks/useDebounce';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { PageShell, EmptyState, ErrorState } from '../components/ui';
import Button from '../components/Button';
import { Select } from '../components/FormControls';
import MovieCard from '../components/MovieCard';
import SearchField from '../components/SearchField';
import FilterSidebar from '../components/FilterSidebar';
import FilterDrawer from '../components/FilterDrawer';
import FilterChips from '../components/FilterChips';
import Pagination from '../components/Pagination';
import { GridSkeleton } from '../components/Skeletons';
import { cx } from '../utils/cx';
import {
  SORT_OPTIONS,
  paramsToObj,
  activeFilterList,
  withoutFilter,
  withoutFilters,
} from '../utils/filters';

const GRID = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

export default function ExplorePage() {
  useDocumentTitle('Explore');
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const filtersFromUrl = paramsToObj(searchParams);
  const urlQ = filtersFromUrl.q ?? '';
  const [rawQ, setRawQ] = useState(urlQ);
  const debouncedQ = useDebounce(rawQ, 400);

  const [movies, setMovies] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [meta, setMeta] = useState({ genres: [], languages: [], platforms: [] });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const resultsRef = useRef(null);

  const region = filtersFromUrl.region ?? user?.profile?.region ?? 'IN';

  useEffect(() => {
    fetchFilters()
      .then((r) => setMeta(r.data))
      .catch(() => {});
  }, []);

  // Search box → URL (debounced). Unchanged behaviour: resets to page 1 only when q really changed.
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = paramsToObj(prev);
        if ((next.q ?? '') === debouncedQ) return prev; // unchanged (e.g. first render): keep current page
        if (debouncedQ) next.q = debouncedQ;
        else delete next.q;
        next.page = '1';
        return next;
      },
      { replace: true }
    );
  }, [debouncedQ]); // eslint-disable-line react-hooks/exhaustive-deps

  // URL → search box. If `q` changes from OUTSIDE the box (Reset / Clear all / a filter chip /
  // browser back), the box must follow; otherwise it keeps showing text that no longer filters.
  // A change that came from the box itself already equals rawQ or debouncedQ, so it's ignored.
  const typed = useRef({ rawQ, debouncedQ });
  useEffect(() => {
    typed.current = { rawQ, debouncedQ };
  });
  useEffect(() => {
    if (urlQ !== typed.current.debouncedQ && urlQ !== typed.current.rawQ) setRawQ(urlQ);
  }, [urlQ]);

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
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams, region, reloadKey]);

  const updateFilters = useCallback(
    (next) => {
      setSearchParams(
        Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined && v !== '')),
        { replace: true }
      );
    },
    [setSearchParams]
  );

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

  const activeFilters = activeFilterList(currentFilters, { myPlatformStr });
  const sortBy = currentFilters.sortBy ?? 'popularity';
  const order = currentFilters.order === 'asc' ? 'asc' : 'desc';

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  // The sheet is for small screens only; if the window grows past lg the sidebar takes over.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => mq.matches && setDrawerOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const goToPage = (p) => {
    updateFilters({ ...currentFilters, page: p });
    resultsRef.current?.scrollIntoView({ block: 'start' });
  };

  const hasFilters = activeFilters.length > 0;
  const total = pagination.total;

  return (
    <PageShell>
      <div className="page-container pb-8 pt-8 lg:pt-12">
        {/* Heading + search + genre quick-picks */}
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <h1 className="text-4xl font-black leading-none text-white sm:text-5xl">Explore</h1>
          <SearchField value={rawQ} onChange={setRawQ} className="w-full md:max-w-lg" />
        </div>

        {(meta.genres.length > 0 || myPlatforms.length > 0) && (
          <div
            role="group"
            aria-label="Quick filters"
            className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {user && myPlatforms.length > 0 && (
              <>
                <Chip pressed={myPlatformsActive} onClick={toggleMyPlatforms}>
                  My platforms
                </Chip>
                <span aria-hidden="true" className="my-1 w-px shrink-0 bg-white/10" />
              </>
            )}
            <Chip
              pressed={!currentFilters.genre}
              onClick={() => updateFilters({ ...currentFilters, genre: undefined, page: 1 })}
            >
              All genres
            </Chip>
            {meta.genres.map((g) => (
              <Chip
                key={g}
                pressed={currentFilters.genre === g}
                onClick={() =>
                  updateFilters({
                    ...currentFilters,
                    genre: currentFilters.genre === g ? undefined : g,
                    page: 1,
                  })
                }
              >
                {g}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="page-container grid gap-8 pb-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        {/* Desktop filter panel */}
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--nav-h)+1.5rem)] max-h-[calc(100dvh-var(--nav-h)-3rem)] overflow-y-auto rounded-2xl bg-gray-900/70 p-5 ring-1 ring-white/[0.07]">
            <FilterSidebar
              filters={currentFilters}
              meta={meta}
              region={region}
              onChange={updateFilters}
            />
          </div>
        </aside>

        <section ref={resultsRef} className="min-w-0 scroll-mt-24" aria-busy={loading}>
          {/* Results toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <p className="text-sm text-gray-300" aria-live="polite">
              {loading || error ? (
                <span
                  className="skeleton inline-block h-4 w-28 rounded align-middle"
                  aria-hidden="true"
                />
              ) : (
                <>
                  <span className="font-semibold text-white">{total.toLocaleString()}</span> movie
                  {total !== 1 ? 's' : ''}
                  {currentFilters.q && <> for “{currentFilters.q}”</>}
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="lg:hidden"
                onClick={() => setDrawerOpen(true)}
                aria-haspopup="dialog"
              >
                Filters
                {hasFilters && (
                  <span className="grid size-5 place-items-center rounded-full bg-brass-400 text-xs font-bold text-gray-950">
                    {activeFilters.length}
                  </span>
                )}
              </Button>
              <label htmlFor="explore-sort" className="sr-only">
                Sort by
              </label>
              <Select
                id="explore-sort"
                value={sortBy}
                onChange={(e) =>
                  updateFilters({ ...currentFilters, sortBy: e.target.value, page: 1 })
                }
                className="w-36"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() =>
                  updateFilters({
                    ...currentFilters,
                    order: order === 'asc' ? 'desc' : 'asc',
                    page: 1,
                  })
                }
                aria-label={
                  order === 'asc'
                    ? 'Sorted ascending — switch to descending'
                    : 'Sorted descending — switch to ascending'
                }
                className="grid size-11 place-items-center rounded-lg border border-white/10 bg-gray-800/70 text-gray-200 transition-colors hover:border-white/20 hover:text-white focus-ring"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className={cx(
                    'size-5 transition-transform duration-200',
                    order === 'asc' && 'rotate-180'
                  )}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M6 13l6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>

          <FilterChips
            className="mt-4"
            items={activeFilters}
            onRemove={(key) => updateFilters(withoutFilter(currentFilters, key))}
            onClearAll={() => updateFilters(withoutFilters(currentFilters))}
          />

          <div className="mt-6">
            {error && (
              <ErrorState
                title="Couldn’t load movies"
                message={error}
                onRetry={() => setReloadKey((k) => k + 1)}
              />
            )}

            {loading && <GridSkeleton count={20} className={GRID} />}

            {!loading && !error && movies.length === 0 && (
              <EmptyState
                title="No movies found"
                body={
                  hasFilters
                    ? 'Nothing matches this combination. Loosen a filter or clear them all to see everything.'
                    : 'There are no movies to show right now.'
                }
                action={
                  hasFilters && (
                    <Button onClick={() => updateFilters(withoutFilters(currentFilters))}>
                      Clear all filters
                    </Button>
                  )
                }
              />
            )}

            {!loading && !error && movies.length > 0 && (
              <div className={`grid gap-x-4 gap-y-8 ${GRID}`}>
                {movies.map((m) => (
                  <MovieCard key={m._id} movie={m} region={region} />
                ))}
              </div>
            )}
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onChange={goToPage}
          />
        </section>
      </div>

      {/* Mobile / tablet filter sheet */}
      <FilterDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        footer={
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="shrink-0"
              onClick={() => updateFilters(withoutFilters(currentFilters))}
              disabled={!hasFilters}
            >
              Clear
            </Button>
            <Button className="flex-1" onClick={closeDrawer}>
              {loading
                ? 'Show results'
                : `Show ${total.toLocaleString()} movie${total !== 1 ? 's' : ''}`}
            </Button>
          </div>
        }
      >
        <FilterSidebar
          idPrefix="sheet-"
          filters={currentFilters}
          meta={meta}
          region={region}
          onChange={updateFilters}
        />
      </FilterDrawer>
    </PageShell>
  );
}

// A toggle chip for quick filters.
function Chip({ pressed, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={cx(
        'h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-colors focus-ring',
        pressed
          ? 'bg-curtain-600 text-white'
          : 'bg-gray-800/70 text-gray-300 ring-1 ring-inset ring-white/10 hover:bg-gray-700 hover:text-white'
      )}
    >
      {children}
    </button>
  );
}
