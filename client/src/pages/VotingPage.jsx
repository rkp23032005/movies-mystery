import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoom, castVote, revealRoom } from '../services/roomService';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';

export default function VotingPage() {
  const { code }  = useParams();
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [room, setRoom]         = useState(null);
  const [voteCounts, setVoteCounts] = useState({});
  const [myVote, setMyVote]     = useState(null);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getRoom(code);
      const r = res.data.data;
      setRoom(r);
      if (r.status === 'revealed') navigate(`/rooms/${code}/reveal`);
      // Server sends aggregate counts + my own vote only (never who voted for what)
      setVoteCounts(r.voteCounts || {});
      if (r.myVote) setMyVote(r.myVote);
    } catch (e) { setError(e.message); }
  }, [code, navigate]);

  useEffect(() => { load(); }, [load]);

  useSocket(code, {
    'state-snapshot': (r) => { setRoom(r); setVoteCounts(r.voteCounts || {}); if (r.myVote) setMyVote(r.myVote); if (r.status === 'revealed') navigate(`/rooms/${code}/reveal`); },
    'vote-cast':      ({ voteCounts: vc }) => setVoteCounts(vc),
    'result-revealed': () => navigate(`/rooms/${code}/reveal`),
  });

  const handleVote = async (movieId) => {
    try {
      const res = await castVote(code, movieId);
      setMyVote(movieId);
      setVoteCounts(res.data.data.voteCounts);
    } catch (e) { setError(e.message); }
  };

  const handleReveal = async () => {
    try { await revealRoom(code); navigate(`/rooms/${code}/reveal`); }
    catch (e) { setError(e.message); }
  };

  if (!room) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
      {error || 'Loading…'}
    </div>
  );

  const hostId = room.host?._id ?? room.host;
  const isHost = hostId?.toString() === user?._id?.toString();
  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">🗳️ Vote</h1>
          <p className="text-gray-400 text-sm mt-1">{totalVotes} vote{totalVotes !== 1 ? 's' : ''} cast</p>
        </div>

        {room.relaxedConstraints?.length > 0 && (
          <p className="text-yellow-400 text-sm text-center">
            ⚠️ Relaxed: {room.relaxedConstraints.join(', ')}
          </p>
        )}

        {room.shortlist.map((item, i) => {
          const movieId = (item.movie?._id ?? item.movie)?.toString();
          const votes   = voteCounts[movieId] || 0;
          const voted   = myVote === movieId;
          const isMystery = !item.movie?.title;

          return (
            <div
              key={item._id}
              className={`bg-gray-900 rounded-2xl p-4 flex gap-4 transition ring-2 ${voted ? 'ring-indigo-500' : 'ring-transparent'}`}
            >
              <div className="text-2xl font-bold text-indigo-400 w-7 shrink-0">{i + 1}</div>

              {!isMystery && item.movie?.posterPath && (
                <img
                  src={`https://image.tmdb.org/t/p/w92${item.movie.posterPath}`}
                  alt={item.movie.title}
                  className="rounded-lg w-12 h-18 object-cover shrink-0"
                />
              )}

              {isMystery && (
                <div className="w-12 h-16 bg-gray-800 rounded-lg flex items-center justify-center text-2xl shrink-0">
                  🎭
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {isMystery ? `Mystery #${i + 1}` : item.movie?.title}
                </p>
                {isMystery ? (
                  <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                    <p>Genres: {item.movie?.genres?.join(', ')}</p>
                    <p>{item.movie?.runtime} min · {item.movie?.decade} · {item.movie?.ratingBand}</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">{item.explanation}</p>
                )}

                {/* Vote bar */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all"
                      style={{ width: totalVotes ? `${(votes / totalVotes) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-6 text-right">{votes}</span>
                </div>
              </div>

              <button
                onClick={() => handleVote(movieId)}
                className={`self-center px-3 py-1.5 rounded-lg text-sm font-medium transition shrink-0 ${
                  voted ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                {voted ? '✓' : 'Vote'}
              </button>
            </div>
          );
        })}

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        {isHost && (
          <button
            onClick={handleReveal}
            className="w-full mt-4 bg-purple-600 hover:bg-purple-500 rounded-xl py-3 font-bold text-lg transition"
          >
            🎬 Reveal the Winner
          </button>
        )}
      </div>
    </div>
  );
}
