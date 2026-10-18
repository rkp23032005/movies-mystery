import { cx } from '../utils/cx';

// Search box: icon, clear button, 16px text (stops iOS zooming on focus). Controlled by the page,
// which owns the debounce. The native cancel button is hidden in favour of our own.
export default function SearchField({ value, onChange, label = 'Search movies', className }) {
  return (
    <form role="search" onSubmit={(e) => e.preventDefault()} className={cx('relative', className)}>
      <label htmlFor="explore-search" className="sr-only">
        {label}
      </label>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-gray-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="m20 20-4-4" />
      </svg>
      <input
        id="explore-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by title or plot…"
        autoComplete="off"
        className="h-12 w-full rounded-xl border border-white/10 bg-gray-800/70 pl-12 pr-12 text-base text-white outline-none transition duration-200 placeholder:text-gray-500 hover:border-white/20 focus:border-brass-400/70 focus:ring-2 focus:ring-brass-400/25 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-gray-400 touch-manipulation transition-colors hover:bg-white/10 hover:text-white focus-ring before:absolute before:-inset-1 before:content-['']"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </form>
  );
}
