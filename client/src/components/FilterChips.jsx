import { cx } from '../utils/cx';

// Removable chips for every filter currently applied, plus "Clear all". `items` is
// [{ key, label }] from utils/filters.activeFilterList.
export default function FilterChips({ items, onRemove, onClearAll, className }) {
  if (!items.length) return null;
  return (
    <ul aria-label="Active filters" className={cx('flex flex-wrap items-center gap-2', className)}>
      {items.map((f) => (
        <li key={f.key}>
          <button
            type="button"
            onClick={() => onRemove(f.key)}
            aria-label={`Remove filter: ${f.label}`}
            className="group inline-flex h-8 items-center gap-1.5 rounded-full bg-brass-400/12 pl-3 pr-2 text-sm text-brass-200 ring-1 ring-inset ring-brass-400/30 transition-colors hover:bg-brass-400/20 focus-ring"
          >
            {f.label}
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-4 text-brass-300/70 transition-colors group-hover:text-brass-100"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M7 7l10 10M17 7 7 17" />
            </svg>
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={onClearAll}
          className="h-8 rounded-full px-3 text-sm text-gray-400 underline-offset-4 transition-colors hover:text-white hover:underline focus-ring"
        >
          Clear all
        </button>
      </li>
    </ul>
  );
}
