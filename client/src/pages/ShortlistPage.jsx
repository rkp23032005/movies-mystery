import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getRoom } from '../services/roomService';

export default function ShortlistPage() {
  const { code } = useParams();
  const [room, setRoom]   = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getRoom(code)
      .then((res) => setRoom(res.data.data))
      .catch((err) => setError(err.message));
  }, [code]);

  if (!room) return <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">{error || 'Loading…'}</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-center">🏆 Shortlist</h1>

        {room.relaxedConstraints?.length > 0 && (
          <p className="text-yellow-400 text-sm text-center">
            ⚠️ Relaxed constraints: {room.relaxedConstraints.join(', ')}
          </p>
        )}

        {room.shortlist.map((item, i) => (
          <div key={item._id} className="bg-gray-900 rounded-2xl p-4 flex gap-4">
            <div className="text-3xl font-bold text-indigo-400 w-8 shrink-0">{i + 1}</div>
            {item.movie?.posterPath && (
              <img
                src={`https://image.tmdb.org/t/p/w92${item.movie.posterPath}`}
                alt={item.movie.title}
                className="rounded-lg w-14 h-20 object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{item.movie?.title ?? `Mystery #${i + 1}`}</p>
              {!item.movie?.title && (
                <p className="text-xs text-gray-400">{item.movie?.genres?.join(', ')} · {item.movie?.runtime} min · {item.movie?.decade} · {item.movie?.ratingBand}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{item.explanation}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                <span>Score: {(item.score * 100).toFixed(0)}%</span>
                <span>·</span>
                <span>{item.matchedMembers} member{item.matchedMembers !== 1 ? 's' : ''} matched</span>
              </div>
            </div>
          </div>
        ))}

        {room.shortlist.length === 0 && (
          <p className="text-center text-gray-400">No movies matched the group's preferences.</p>
        )}
      </div>
    </div>
  );
}
