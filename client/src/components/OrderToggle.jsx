import { cx } from '../utils/cx';

// Ascending / descending toggle button used next to a sort <select>.
export default function OrderToggle({ order, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
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
        className={cx('size-5 transition-transform duration-200', order === 'asc' && 'rotate-180')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 5v14M6 13l6 6 6-6" />
      </svg>
    </button>
  );
}
