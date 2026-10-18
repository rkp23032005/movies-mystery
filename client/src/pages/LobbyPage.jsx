import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoom, startVoting } from '../services/roomService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../hooks/useSocket';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { PageShell, Spinner, ErrorState } from '../components/ui';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import Button from '../components/Button';
import RoomHeader from '../components/RoomHeader';
import Surface from '../components/Surface';

export default function LobbyPage() {
  const { code } = useParams();
  useDocumentTitle(`Room ${code}`);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  const applySnapshot = useCallback(
    (r) => {
      setRoom(r);
      if (r.status === 'voting') navigate(`/rooms/${code}/vote`);
      if (r.status === 'revealed') navigate(`/rooms/${code}/reveal`);
    },
    [code, navigate]
  );

  // Initial HTTP fetch
  useEffect(() => {
    getRoom(code)
      .then((res) => applySnapshot(res.data.data))
      .catch((e) => setError(e.message));
  }, [code, applySnapshot]);

  // Socket events
  useSocket(code, {
    'state-snapshot': applySnapshot,
    'member-joined': () => getRoom(code).then((r) => setRoom(r.data.data)),
    'member-left': () => getRoom(code).then((r) => setRoom(r.data.data)),
    'preferences-submitted': ({ readyCount, totalCount }) => {
      setRoom((prev) =>
        prev ? { ...prev, _readyCount: readyCount, _totalCount: totalCount } : prev
      );
      // The event carries only counts. Refresh the members too so each person's "Ready" badge
      // matches the number above it (the fresh room replaces the counts with the same values).
      getRoom(code)
        .then((r) => setRoom(r.data.data))
        .catch(() => {});
    },
    'voting-started': (r) => {
      setRoom(r);
      navigate(`/rooms/${code}/vote`);
    },
  });

  const handleStartVoting = async () => {
    setStarting(true);
    try {
      await startVoting(code);
      navigate(`/rooms/${code}/vote`);
    } catch (e) {
      setError(e.message);
      setStarting(false);
    }
  };

  const inviteLink = `${window.location.origin}/rooms/join?code=${code}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Couldn’t copy automatically — share the code instead.', 'error');
    }
  };

  if (!room)
    return (
      <PageShell footer={false}>
        {error ? (
          <ErrorState title="Couldn’t open this room" message={error}>
            <Button onClick={() => navigate('/')}>Back to home</Button>
          </ErrorState>
        ) : (
          <div className="grid min-h-[60dvh] place-items-center">
            <Spinner inline label="Loading room…" />
          </div>
        )}
      </PageShell>
    );

  const hostId = room.host?._id ?? room.host;
  const isHost = hostId?.toString() === user?._id?.toString();
  const readyCount = room._readyCount ?? room.members.filter((m) => m.preferencesSubmitted).length;
  const totalCount = room._totalCount ?? room.members.length;
  const readyPct = totalCount ? Math.round((readyCount / totalCount) * 100) : 0;

  return (
    <PageShell footer={false}>
      <div className="page-container py-8 lg:py-12">
        <RoomHeader code={room.code} mode={room.mode} step="lobby" />
        <h1 className="mt-8 text-4xl font-black leading-none text-white sm:text-5xl">Room lobby</h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
          <div className="space-y-6">
            {/* The invite: a ticket. The drop-shadow is on the wrapper — the ticket's mask would clip it. */}
            <div className="drop-shadow-[0_18px_24px_rgba(8,1,4,0.55)]">
              <div className="ticket bg-gray-900">
                <div className="px-6 pb-6 pt-7 text-center">
                  <p className="text-sm font-medium text-gray-400">Invite code</p>
                  <p
                    className="mt-2 font-mono text-5xl font-bold tracking-[0.25em] text-brass-300 sm:text-6xl"
                    aria-label={`Invite code ${room.code.split('').join(' ')}`}
                  >
                    {room.code}
                  </p>
                </div>
                <div className="perforation-t" aria-hidden="true" />
                <div className="p-4">
                  <Button variant="secondary" className="w-full" onClick={copyLink}>
                    {copied ? '✓ Copied!' : 'Copy invite link'}
                  </Button>
                </div>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-500/10 px-4 py-3 text-center text-sm text-red-300 ring-1 ring-inset ring-red-400/30"
              >
                {error}
              </p>
            )}

            <div className="space-y-3">
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={() => navigate(`/rooms/${code}/preferences`)}
              >
                Set My Preferences
              </Button>
              {isHost ? (
                <Button size="lg" className="w-full" onClick={handleStartVoting} loading={starting}>
                  Start Voting →
                </Button>
              ) : (
                <p className="text-center text-sm text-gray-400">
                  Waiting for the host to start voting…
                </p>
              )}
              <Button variant="ghost" className="w-full" onClick={() => navigate('/')}>
                ← Leave Room
              </Button>
            </div>
          </div>

          <Surface as="section" variant="raised" aria-labelledby="members-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="members-heading" className="text-2xl font-black text-white">
                Members
              </h2>
              <p className="text-sm text-gray-300" aria-live="polite">
                <span className="font-semibold text-white">{readyCount}</span> of {totalCount}{' '}
                members ready
              </p>
            </div>
            <div
              role="progressbar"
              aria-label="Members ready"
              aria-valuemin={0}
              aria-valuemax={totalCount}
              aria-valuenow={readyCount}
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-800"
            >
              <div
                className="h-full rounded-full bg-curtain-500 transition-[width] duration-500 ease-cinema"
                style={{ width: `${readyPct}%` }}
              />
            </div>

            <ul className="mt-6 space-y-2">
              {room.members.map((m) => {
                const memberId = m.user?._id ?? m.user;
                const isThisHost = memberId?.toString() === hostId?.toString();
                return (
                  <li
                    key={m._id}
                    className="flex items-center gap-3 rounded-xl bg-gray-800/60 px-4 py-3 ring-1 ring-inset ring-white/[0.05]"
                  >
                    <Avatar name={m.user?.name} />
                    <span className="min-w-0 flex-1 truncate font-medium text-white">
                      {m.user?.name || 'Unknown'}
                    </span>
                    {isThisHost && <Badge tone="brass">Host</Badge>}
                    {m.preferencesSubmitted && <Badge tone="success">✓ Ready</Badge>}
                  </li>
                );
              })}
            </ul>
          </Surface>
        </div>
      </div>
    </PageShell>
  );
}
