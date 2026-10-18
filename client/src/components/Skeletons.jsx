// Mirrors MovieCard's structure (poster block, title, details) so the grid doesn't jump.
export function MovieCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton aspect-[2/3] rounded-lg" />
      <div className="mt-3 space-y-2">
        <div className="skeleton h-4 w-4/5 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}

// `className` sets the grid columns; the default matches the original 2→5 column layout, so
// pages that still use it (Watchlist) are unchanged.
export function GridSkeleton({
  count = 20,
  className = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
}) {
  return (
    <div role="status" aria-label="Loading movies" className={`grid gap-x-4 gap-y-8 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}
