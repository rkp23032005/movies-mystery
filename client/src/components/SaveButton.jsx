import { useAuth } from '../context/AuthContext';
import { useWatchlist } from '../context/WatchlistContext';
import { useNavigate } from 'react-router-dom';

export default function SaveButton({ movieId, className = '' }) {
  const { user } = useAuth();
  const { savedIds, toggle } = useWatchlist();
  const navigate = useNavigate();
  const saved = savedIds.has(movieId);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    toggle(movieId);
  };

  return (
    <button
      onClick={handleClick}
      aria-label={saved ? 'Remove from watchlist' : 'Add to watchlist'}
      className={`transition-transform active:scale-90 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`w-5 h-5 transition-colors ${saved ? 'fill-red-500 stroke-red-500' : 'fill-none stroke-white'}`}
        strokeWidth={2}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
