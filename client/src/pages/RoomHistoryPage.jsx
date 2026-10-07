import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRoomHistory } from '../services/roomService';

export default function RoomHistoryPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRoomHistory()
      .then((res) => setRooms(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">Loading…</div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">📽️ What We Watched</h1>
          <Link to="/" className="text-sm text-gray-400 hover:text-white transition">🏠 Home</Link>
        </div>

        {rooms.length === 0 && (
          <p className="text-center text-gray-400">No completed rooms yet.</p>
        )}

        {rooms.map((room) => (
          <Link
            key={room._id}
            to={`/rooms/${room.code}/reveal`}
            className="flex gap-4 bg-gray-900 rounded-2xl p-4 hover:bg-gray-800 transition"
          >
            {room.result?.posterPath && (
              <img
                src={`https://image.tmdb.org/t/p/w92${room.result.posterPath}`}
                alt={room.result.title}
                className="w-12 h-16 rounded-lg object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{room.result?.title ?? 'Unknown'}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Room {room.code} · {room.members?.length} members · {new Date(room.updatedAt).toLocaleDateString()}
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {room.result?.genres?.slice(0, 3).map((g) => (
                  <span key={g} className="text-xs bg-gray-800 px-2 py-0.5 rounded-full">{g}</span>
                ))}
              </div>
            </div>
            <span className="text-gray-600 self-center">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
