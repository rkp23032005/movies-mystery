import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchMovie } from '../services/movieService';
import { useAuth } from '../context/AuthContext';
import PlatformBadge from '../components/PlatformBadge';
import SaveButton from '../components/SaveButton';
import MovieCard from '../components/MovieCard';
import { PLATFORM_LINKS, platformKey } from '../utils/platforms';

const TMDB_IMG_W500  = 'https://image.tmdb.org/t/p/w500';
const TMDB_IMG_ORIG  = 'https://image.tmdb.org/t/p/original';
function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-200">{title}</h2>
      {children}
    </div>
  );
}

function ProviderGroup({ label, providers }) {
  if (!providers?.length) return null;
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => {
          const href = PLATFORM_LINKS[platformKey(p.name)];
          const badge = <PlatformBadge key={p.name} name={p.name} showType={false} />;
          return href ? (
            <a key={p.name} href={href} target="_blank" rel="noopener noreferrer"
               className="hover:opacity-80 transition">
              {badge}
            </a>
          ) : badge;
        })}
      </div>
    </div>
  );
}

export default function MovieDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const region = user?.profile?.region ?? 'IN';

  const [movie, setMovie]   = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    fetchMovie(id)
      .then((r) => { setMovie(r.data.movie); setSimilar(r.data.similar); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <div className="animate-pulse text-gray-500">Loading…</div>
    </div>
  );

  if (error || !movie) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white gap-4">
      <p className="text-red-400">{error || 'Movie not found'}</p>
      <Link to="/explore" className="text-indigo-400 hover:underline text-sm">← Back to Explore</Link>
    </div>
  );

  const regionProviders = movie.providers?.[region] ?? [];
  const streaming = regionProviders.filter((p) => p.type === 'flatrate');
  const rent      = regionProviders.filter((p) => p.type === 'rent');
  const buy       = regionProviders.filter((p) => p.type === 'buy');
  const hasProviders = streaming.length + rent.length + buy.length > 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Backdrop */}
      {movie.backdropPath && (
        <div className="relative h-64 sm:h-80 overflow-hidden">
          <img
            src={`${TMDB_IMG_ORIG}${movie.backdropPath}`}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        {/* Back link */}
        <Link to="/explore" className="text-sm text-gray-400 hover:text-white transition">← Explore</Link>

        {/* Hero row */}
        <div className="flex gap-6 items-start">
          {movie.posterPath && (
            <img
              src={`${TMDB_IMG_W500}${movie.posterPath}`}
              alt={movie.title}
              className="w-32 sm:w-44 rounded-xl shrink-0 shadow-2xl"
            />
          )}
          <div className="space-y-3 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{movie.title}</h1>
              <SaveButton movieId={movie._id} className="shrink-0 mt-1" />
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-gray-400">
              {movie.releaseYear && <span>{movie.releaseYear}</span>}
              {movie.runtime > 0 && <span>{movie.runtime} min</span>}
              {movie.language && <span className="uppercase">{movie.language}</span>}
              <span className="text-yellow-400">★ {movie.rating?.toFixed(1)}</span>
            </div>

            {movie.genres?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {movie.genres.map((g) => (
                  <Link
                    key={g}
                    to={`/explore?genre=${encodeURIComponent(g)}`}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-2.5 py-1 rounded-full transition"
                  >
                    {g}
                  </Link>
                ))}
              </div>
            )}

            {movie.overview && (
              <p className="text-gray-300 text-sm leading-relaxed">{movie.overview}</p>
            )}
          </div>
        </div>

        {/* Where to watch */}
        <Section title="Where to watch">
          {hasProviders ? (
            <div className="bg-gray-900 rounded-xl p-4 space-y-4">
              {/* Region indicator */}
              <p className="text-xs text-gray-500">Showing availability for region: <span className="text-gray-300 font-medium">{region}</span></p>
              <ProviderGroup label="Stream" providers={streaming} />
              <ProviderGroup label="Rent"   providers={rent} />
              <ProviderGroup label="Buy"    providers={buy} />
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Not available on any tracked platform in {region}.</p>
          )}
        </Section>

        {/* Trailer */}
        {movie.trailerKey && (
          <Section title="Trailer">
            <div className="aspect-video rounded-xl overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${movie.trailerKey}`}
                title="Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </Section>
        )}

        {/* Cast */}
        {movie.cast?.length > 0 && (
          <Section title="Cast">
            <div className="flex flex-wrap gap-2">
              {movie.cast.map((name) => (
                <span key={name} className="bg-gray-800 text-gray-300 text-sm px-3 py-1 rounded-full">{name}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Similar movies */}
        {similar.length > 0 && (
          <Section title="Similar movies">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {similar.map((m) => <MovieCard key={m._id} movie={m} region={region} />)}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
