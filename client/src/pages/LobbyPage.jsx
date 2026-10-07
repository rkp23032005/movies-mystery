import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoom, startVoting } from '../services/roomService';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';

export default function LobbyPage() {
  const { code }  = useParams();
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [room, setRoom]     = useState(null);
  const [error, setError]   = useState('');
  const [copied, setCopied] = useState(false);

  const applySnapshot = useCallback((r) => {
    setRoom(r);
    if (r.status === 'voting')   navigate(`/rooms/${code}/vote`);
    if (r.status === 'revealed') navigate(`/rooms/${code}/reveal`);
  }, [code, navigate]);

  // Initial HTTP fetch
  useEffect(() => {
    getRoom(code).then((res) => applySnapshot(res.data.data)).catch((e) => setError(e.message));
  }, [code, applySnapshot]);

  // Socket events
  useSocket(code, {
    'state-snapshot':       applySnapshot,
    'member-joined':        () => getRoom(code).then((r) => setRoom(r.data.data)),
    'member-left':          () => getRoom(code).then((r) => setRoom(r.data.data)),
    'preferences-submitted': ({ readyCount, totalCount }) =>
      setRoom((prev) => prev ? { ...prev, _readyCount: readyCount, _totalCount: totalCount } : prev),
    'voting-started':       (r) => { setRoom(r); navigate(`/rooms/${code}/vote`); },
  });

  const handleStartVoting = async () => {
    try { await startVoting(code); navigate(`/rooms/${code}/vote`); }
    catch (e) { setError(e.message); }
  };

  const inviteLink = `${window.location.origin}/rooms/join?code=${code}`;
  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!room) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
      {error || 'Loading…'}
    </div>
  );

  const hostId = room.host?._id ?? room.host;
  const isHost = hostId?.toString() === user?._id?.toString();
  const readyCount  = room._readyCount  ?? room.members.filter((m) => m.preferencesSubmitted).length;
  const totalCount  = room._totalCount  ?? room.members.length;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center py-16 px-4">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">🎬 Room Lobby</h1>
          <p className="text-gray-400 text-sm mt-1">
            Mode: <span className="capitalize text-indigo-400">{room.mode}</span>
          </p>
        </div>

        {/* Invite code */}
        <div className="bg-gray-800 rounded-xl p-4 text-center space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-widest">Invite Code</p>
          <p className="text-4xl font-mono font-bold tracking-widest text-indigo-400">{room.code}</p>
          <button onClick={copyLink} className="text-xs text-gray-400 hover:text-white transition">
            {copied ? '✓ Copied!' : 'Copy invite link'}
          </button>
        </div>

        {/* Ready indicator */}
        <p className="text-center text-sm text-gray-400">
          {readyCount}/{totalCount} members ready
        </p>

        {/* Members */}
        <ul className="space-y-2">
          {room.members.map((m) => {
            const memberId = m.user?._id ?? m.user;
            const isThisHost = memberId?.toString() === hostId?.toString();
            return (
              <li key={m._id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-2">
                <span className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
                  {(m.user?.name || '?')[0].toUpperCase()}
                </span>
                <span className="flex-1">{m.user?.name || 'Unknown'}</span>
                {m.preferencesSubmitted && <span className="text-green-400 text-xs">✓ ready</span>}
                {isThisHost && <span className="text-yellow-400 text-xs ml-1">host</span>}
              </li>
            );
          })}
        </ul>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <div className="space-y-2">
          <button
            onClick={() => navigate(`/rooms/${code}/preferences`)}
            className="w-full bg-gray-700 hover:bg-gray-600 rounded-lg py-2 font-medium transition"
          >
            Set My Preferences
          </button>
          {isHost && (
            <button
              onClick={handleStartVoting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-lg py-2 font-semibold transition"
            >
              Start Voting →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
