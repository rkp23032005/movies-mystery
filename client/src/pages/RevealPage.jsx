import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getRoom } from '../services/roomService';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';

const CLUE_KEYS = ['genres', 'decade', 'runtime', 'ratingBand'];
const CLUE_LABELS = { genres: 'Genres', decade: 'Decade', runtime: 'Runtime', ratingBand: 'Rating' };

function clueValue(movie, key) {
  if (!movie) return undefined;
  if (key === 'decade') return movie.releaseYear ? `${Math.floor(movie.releaseYear / 10) * 10}s` : '—';
  if (key === 'ratingBand') {
    const r = movie.rating ?? 0;
    return r >= 8 ? 'Excellent (8+)' : r >= 7 ? 'Good (7–8)' : r >= 6 ? 'Decent (6–7)' : 'Mixed (<6)';
  }
  return movie[key];
}

function formatClue(key, val) {
  if (key === 'genres') return Array.isArray(val) ? val.join(', ') : val;
  if (key === 'runtime') return `${val} min`;
  return val;
}

export default function RevealPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const region = user?.profile?.region ?? 'IN';
  const [room, setRoom]         = useState(null);
  const [phase, setPhase]       = useState('countdown'); // countdown | clues | reveal
  const [countdown, setCountdown] = useState(3);
  const [visibleClues, setVisibleClues] = useState(0);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getRoom(code);
      setRoom(res.data.data);
    } catch (e) { setError(e.message); }
  }, [code]);

  useEffect(() => { load(); }, [load]);

  useSocket(code, {
    'result-revealed': (r) => setRoom(r),
    'state-snapshot':  (r) => { if (r.status === 'revealed') setRoom(r); },
  });

  // Countdown → clues → reveal animation
  useEffect(() => {
    if (!room || room.status !== 'revealed') return;

    if (phase === 'countdown') {
      if (countdown > 0) {
        const t = setTimeout(() => setCountdown((c) => c - 1), 900);
        return () => clearTimeout(t);
      } else {
        setPhase('clues');
      }
    }

    if (phase === 'clues') {
      if (visibleClues < CLUE_KEYS.length) {
        const t = setTimeout(() => setVisibleClues((v) => v + 1), 700);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase('reveal'), 800);
        return () => clearTimeout(t);
      }
    }
  }, [room, phase, countdown, visibleClues]);

  if (!room) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
      {error || 'Loading…'}
    </div>
  );

  if (room.status !== 'revealed') return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
      <p className="text-gray-400">Waiting for the host to reveal…</p>
    </div>
  );

  const winner = room.result;
  // Only the viewer's region (providers is keyed by region code)
  const providers = (winner?.providers?.[region] ?? []).filter((p) => p.type === 'flatrate');
  const uniquePlatforms = [...new Map(providers.map((p) => [p.name, p])).values()];

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center py-12 px-4">

      {/* Countdown */}
      {phase === 'countdown' && (
        <div className="text-center animate-pulse">
          <p className="text-gray-400 text-lg mb-4">Get ready…</p>
          <p className="text-8xl font-black text-indigo-400">{countdown || '🎬'}</p>
        </div>
      )}

      {/* Clue-by-clue */}
      {phase === 'clues' && (
        <div className="text-center space-y-4 max-w-sm w-full">
          <p className="text-gray-400 text-sm uppercase tracking-widest mb-6">Your clues</p>
          {CLUE_KEYS.slice(0, visibleClues).map((key) => (
            <div
              key={key}
              className="bg-gray-900 rounded-xl px-6 py-3 flex justify-between items-center animate-fade-in"
            >
              <span className="text-gray-400 text-sm">{CLUE_LABELS[key]}</span>
              <span className="font-semibold text-indigo-300">
                {formatClue(key, clueValue(winner, key))}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Full reveal */}
      {phase === 'reveal' && winner && (
        <div className="text-center space-y-6 max-w-sm w-full">
          <p className="text-yellow-400 text-sm uppercase tracking-widest">🏆 Tonight's pick</p>

          {winner.posterPath && (
            <img
              src={`https://image.tmdb.org/t/p/w342${winner.posterPath}`}
              alt={winner.title}
              className="mx-auto rounded-2xl shadow-2xl w-48"
            />
          )}

          <div>
            <h1 className="text-3xl font-black">{winner.title}</h1>
            <p className="text-gray-400 text-sm mt-1">
              {winner.releaseYear} · {winner.runtime} min · ⭐ {winner.rating?.toFixed(1)}
            </p>
            <p className="text-gray-300 text-sm mt-3 leading-relaxed">{winner.overview}</p>
          </div>

          {/* Where to watch */}
          {uniquePlatforms.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Where to watch</p>
              <div className="flex flex-wrap justify-center gap-2">
                {uniquePlatforms.map((p) => (
                  <span key={p.name} className="bg-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Link
            to={`/rooms/${code}/shortlist`}
            className="block text-sm text-gray-400 hover:text-white transition"
          >
            See the full shortlist →
          </Link>

          <Link
            to="/rooms/history"
            className="block text-sm text-gray-400 hover:text-white transition"
          >
            View room history →
          </Link>

          <Link
            to="/"
            className="inline-block mt-2 w-full bg-indigo-600 hover:bg-indigo-500 rounded-xl py-3 font-bold text-base transition text-center"
          >
            🏠 Back to Home
          </Link>
        </div>
      )}
    </div>
  );
}
