import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useNavigate } from 'react-router-dom';

/**
 * Heart toggle for the watchlist. Icon-only by default (cards); `showLabel` renders
 * "Add to watchlist" / "In your watchlist" beside the heart (detail page) — in that mode the
 * caller supplies the shape/size/colours through `className`.
 */
export default function SaveButton({ movieId, className = '', showLabel = false }) {
  const { user } = useAuth();
  const { savedIds, toggle } = useWatchlist();
  const navigate = useNavigate();
  const saved = savedIds.has(movieId);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    toggle(movieId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={showLabel ? undefined : saved ? 'Remove from watchlist' : 'Add to watchlist'}
      className={`relative touch-manipulation transition duration-200 ease-cinema focus-ring active:scale-95 ${
        showLabel
          ? 'inline-flex items-center justify-center gap-2'
          : 'rounded-full active:scale-90 before:absolute before:-inset-1.5 before:content-[\'\']'
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`size-5 shrink-0 transition-colors ${saved ? 'fill-brass-400 stroke-brass-400' : 'fill-none stroke-white'}`}
        strokeWidth={2}
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {showLabel && (
        <span className="text-sm font-semibold">
          {saved ? 'In your watchlist' : 'Add to watchlist'}
        </span>
      )}
    </button>
  );
}
