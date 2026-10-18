import { cx } from '../utils/cx';

// Stands in for a poster in Mystery mode, where the server withholds title and artwork on purpose.
// Never shows (or receives) any real movie data. Same 2:3 shape as a poster so rows stay aligned.
export default function MysteryTile({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        'grid aspect-[2/3] place-items-center rounded-lg bg-linear-to-b from-purple-950 to-gray-900 text-purple-300 ring-1 ring-inset ring-purple-400/30',
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-1/2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      >
        <path d="M9 9.2c0-1.6 1.3-2.7 3-2.7s3 1.1 3 2.6c0 2.3-3 2.3-3 4.4" />
        <path d="M12 17.4h.01" />
      </svg>
    </div>
  );
}
