import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom } from '../services/roomService';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { PageShell } from '../components/ui';
import Button from '../components/Button';
import Surface from '../components/Surface';
import { cx } from '../utils/cx';

const MODES = [
  {
    id: 'normal',
    title: 'Normal',
    body: 'Everyone sees the movie titles while they vote.',
    on: 'border-curtain-500 bg-curtain-500/10',
  },
  {
    id: 'mystery',
    title: 'Mystery',
    body: 'Movie titles stay hidden until the host reveals.',
    on: 'border-purple-400 bg-purple-500/10',
  },
];

export default function CreateRoomPage() {
  useDocumentTitle('Create a room');
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
    <PageShell back footer={false}>
      <div className="page-container flex min-h-[calc(100dvh-var(--nav-h))] items-center justify-center py-10">
        <Surface variant="raised" padding="lg" className="w-full max-w-lg space-y-8">
          <div>
            <h1 className="text-3xl font-black text-white sm:text-4xl">Create a room</h1>
            <p className="mt-2 text-gray-400">
              You'll get a 6-character invite code to share with your group.
            </p>
          </div>

          <fieldset>
            <legend className="mb-3 text-sm font-medium text-gray-300">Mode</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {MODES.map((m) => (
                <label key={m.id} className="cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value={m.id}
                    checked={mode === m.id}
                    onChange={() => setMode(m.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={cx(
                      'block h-full rounded-xl border-2 p-4 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brass-400',
                      mode === m.id ? m.on : 'border-white/10 bg-gray-800/50 hover:border-white/25'
                    )}
                  >
                    <span className="block font-display text-xl font-bold text-white">
                      {m.title}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-gray-300">
                      {m.body}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Button size="lg" className="w-full" onClick={handleCreate} loading={loading}>
            {loading ? 'Creating…' : 'Create Room'}
          </Button>
        </Surface>
      </div>
    </PageShell>
  );
}
