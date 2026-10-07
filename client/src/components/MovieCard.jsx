import { Link } from 'react-router-dom';
import PlatformBadge from './PlatformBadge';
import SaveButton from './SaveButton';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342';

export default function MovieCard({ movie, region = 'IN' }) {
  const src = movie.posterPath ? `${TMDB_IMG}${movie.posterPath}` : null;
  // providers is a plain object after JSON serialisation (Map → object)
  const regionProviders = movie.providers?.[region] ?? [];
  const uniquePlatforms = [...new Map(regionProviders.map((p) => [p.name, p])).values()].slice(0, 3);

  return (
    <Link
      to={`/movies/${movie._id}`}
      className="bg-gray-900 rounded-xl overflow-hidden hover:ring-2 hover:ring-indigo-500 transition group block relative"
    >
      {/* Save button — top-right corner */}
      <div className="absolute top-2 right-2 z-10">
        <SaveButton movieId={movie._id} className="bg-black/50 rounded-full p-1.5" />
      </div>

      <div className="relative aspect-[2/3] bg-gray-800">
        {src ? (
          <img src={src} alt={movie.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">No image</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition p-3 flex flex-col justify-end">
          <p className="text-xs text-gray-300 line-clamp-3">{movie.overview}</p>
        </div>
      </div>

      <div className="p-3 space-y-1.5">
        <p className="font-semibold text-sm leading-tight line-clamp-2">{movie.title}</p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{movie.releaseYear ?? '—'}</span>
          <span className="text-yellow-400">★ {movie.rating?.toFixed(1)}</span>
        </div>
        {uniquePlatforms.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {uniquePlatforms.map((p) => <PlatformBadge key={p.name} name={p.name} />)}
          </div>
        )}
      </div>
    </Link>
  );
}
