import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoom, castVote, revealRoom } from '../services/roomService';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { PageShell, Spinner, ErrorState } from '../components/ui';
import Button from '../components/Button';
import MysteryTile from '../components/MysteryTile';
import RoomHeader from '../components/RoomHeader';
import TmdbImage from '../components/TmdbImage';
import { cx } from '../utils/cx';

export default function VotingPage() {
  const { code } = useParams();
  useDocumentTitle('Vote');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [voteCounts, setVoteCounts] = useState({});
  const [myVote, setMyVote] = useState(null);
  const [error, setError] = useState('');
  const [pendingVote, setPendingVote] = useState(null);
  const [revealing, setRevealing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getRoom(code);
      const r = res.data.data;
      setRoom(r);
      if (r.status === 'revealed') navigate(`/rooms/${code}/reveal`);
      // Server sends aggregate counts + my own vote only (never who voted for what)
      setVoteCounts(r.voteCounts || {});
      if (r.myVote) setMyVote(r.myVote);
    } catch (e) {
      setError(e.message);
    }
  }, [code, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useSocket(code, {
    'state-snapshot': (r) => {
      setRoom(r);
      setVoteCounts(r.voteCounts || {});
      if (r.myVote) setMyVote(r.myVote);
      if (r.status === 'revealed') navigate(`/rooms/${code}/reveal`);
    },
    'vote-cast': ({ voteCounts: vc }) => setVoteCounts(vc),
    'result-revealed': () => navigate(`/rooms/${code}/reveal`),
  });

  const handleVote = async (movieId) => {
    setPendingVote(movieId);
    try {
      const res = await castVote(code, movieId);
      setMyVote(movieId);
      setVoteCounts(res.data.data.voteCounts);
    } catch (e) {
      setError(e.message);
    } finally {
      setPendingVote(null);
    }
  };

  const handleReveal = async () => {
    setRevealing(true);
    try {
      await revealRoom(code);
      navigate(`/rooms/${code}/reveal`);
    } catch (e) {
      setError(e.message);
      setRevealing(false);
    }
  };

  if (!room)
    return (
      <PageShell footer={false}>
        {error ? (
          <ErrorState title="Couldn’t load the vote" message={error}>
            <Button onClick={() => navigate('/')}>Back to home</Button>
          </ErrorState>
        ) : (
          <div className="grid min-h-[60dvh] place-items-center">
            <Spinner inline label="Loading vote…" />
          </div>
        )}
      </PageShell>
    );

  const hostId = room.host?._id ?? room.host;
  const isHost = hostId?.toString() === user?._id?.toString();
  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);

  return (
    <PageShell footer={false}>
      <div className="page-container py-8 lg:py-12">
        <RoomHeader code={room.code ?? code.toUpperCase()} mode={room.mode} step="vote" />

        <div className="mx-auto mt-8 max-w-3xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-4xl font-black leading-none text-white sm:text-5xl">Vote</h1>
              <p className="mt-3 text-sm text-gray-300" aria-live="polite">
                <span className="font-semibold tabular-nums text-white">{totalVotes}</span> vote
                {totalVotes !== 1 ? 's' : ''} cast
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              ← Leave to Home
            </Button>
          </div>

          {room.relaxedConstraints?.length > 0 && (
            <p
              role="note"
              className="mt-6 rounded-lg bg-brass-400/10 px-4 py-3 text-sm text-brass-200 ring-1 ring-inset ring-brass-400/30"
            >
              ⚠️ Relaxed: {room.relaxedConstraints.join(', ')}
            </p>
          )}

          <ol className="mt-8 space-y-4">
            {room.shortlist.map((item, i) => {
              const movieId = (item.movie?._id ?? item.movie)?.toString();
              const votes = voteCounts[movieId] || 0;
              const voted = myVote === movieId;
              const isMystery = !item.movie?.title;
              const pct = totalVotes ? (votes / totalVotes) * 100 : 0;

              return (
                <li
                  key={item._id}
                  className={cx(
                    'grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 rounded-2xl bg-gray-900 p-3 ring-2 transition-colors sm:gap-x-5 sm:p-5',
                    voted ? 'ring-curtain-500' : 'ring-white/[0.07]'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="w-6 shrink-0 text-center font-display text-3xl font-black leading-none text-brass-400 sm:w-9 sm:text-4xl"
                  >
                    {i + 1}
                  </span>

                  {isMystery ? (
                    <MysteryTile className="w-12 shrink-0 sm:w-16" />
                  ) : (
                    <TmdbImage
                      path={item.movie.posterPath}
                      kind="thumb"
                      alt={item.movie.title}
                      sizes="64px"
                      className="w-12 shrink-0 rounded-lg sm:w-16"
                    />
                  )}

                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-bold text-white sm:text-xl">
                      {isMystery ? `Mystery #${i + 1}` : item.movie?.title}
                    </p>
                    {isMystery ? (
                      <div className="mt-0.5 space-y-0.5 text-xs text-gray-400 sm:text-sm">
                        <p>Genres: {item.movie?.genres?.join(', ')}</p>
                        <p>
                          {item.movie?.runtime} min · {item.movie?.decade} ·{' '}
                          {item.movie?.ratingBand}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-400 sm:text-sm">
                        {item.explanation}
                      </p>
                    )}
                  </div>

                  <Button
                    variant={voted ? 'primary' : 'secondary'}
                    size="sm"
                    aria-pressed={voted}
                    aria-label={`${voted ? 'Your vote:' : 'Vote for'} ${isMystery ? `Mystery #${i + 1}` : item.movie?.title}`}
                    loading={pendingVote === movieId}
                    onClick={() => handleVote(movieId)}
                    className="shrink-0"
                  >
                    {voted ? '✓ Voted' : 'Vote'}
                  </Button>

                  {/* Vote bar: the full width of the card on phones, under the text from sm up. */}
                  <div className="col-span-full flex items-center gap-3 sm:col-span-1 sm:col-start-3 sm:row-start-2">
                    <div
                      role="progressbar"
                      aria-label={`Votes for ${isMystery ? `Mystery #${i + 1}` : item.movie?.title}`}
                      aria-valuemin={0}
                      aria-valuemax={Math.max(totalVotes, 1)}
                      aria-valuenow={votes}
                      className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800"
                    >
                      <div
                        className="h-full rounded-full bg-curtain-500 transition-[width] duration-500 ease-cinema"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-xs tabular-nums text-gray-300">
                      {votes} · {Math.round(pct)}%
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>

          {error && (
            <p
              role="alert"
              className="mt-6 rounded-lg bg-red-500/10 px-4 py-3 text-center text-sm text-red-300 ring-1 ring-inset ring-red-400/30"
            >
              {error}
            </p>
          )}

          {isHost ? (
            <Button size="lg" className="mt-8 w-full" onClick={handleReveal} loading={revealing}>
              🎬 Reveal the Winner
            </Button>
          ) : (
            <p className="mt-8 text-center text-sm text-gray-400">
              The host reveals the winner when everyone has voted.
            </p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
