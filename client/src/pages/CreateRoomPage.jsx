import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom } from '../services/roomService';
import { useToast } from '../context/ToastContext';
import { PageShell } from '../components/ui';

export default function CreateRoomPage() {
  const [mode, setMode] = useState('normal');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await createRoom(mode);
      toast('Room created!', 'success');
      navigate(`/rooms/${res.data.data.code}`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell back>
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)] px-4">
        <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-sm space-y-6">
          <h1 className="text-2xl font-bold text-center">🎬 Create a Room</h1>

          <fieldset className="space-y-2">
            <legend className="text-sm text-gray-400">Mode</legend>
            <div className="flex gap-3">
              {['normal', 'mystery'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={`flex-1 py-2 rounded-lg capitalize font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                    mode === m ? 'bg-indigo-600' : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            {mode === 'mystery' && (
              <p className="text-xs text-purple-400">🎭 Movie titles stay hidden until the host reveals.</p>
            )}
          </fieldset>

          <button
            onClick={handleCreate}
            disabled={loading}
            aria-busy={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg py-2 font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {loading ? 'Creating…' : 'Create Room'}
          </button>
        </div>
      </div>
    </PageShell>
  );
}
