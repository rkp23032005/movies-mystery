import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRoomHistory } from '../services/roomService';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { PageShell, EmptyState, ErrorState } from '../components/ui';
import Badge from '../components/Badge';
import Button from '../components/Button';
import TmdbImage from '../components/TmdbImage';

function HistorySkeleton() {
  return (
    <div role="status" aria-label="Loading room history" className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton h-28 rounded-2xl" />
      ))}
    </div>
  );
}

export default function RoomHistoryPage() {
  useDocumentTitle('What we watched');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getRoomHistory()
      .then((res) => !cancelled && setRooms(res.data.data))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <PageShell>
      <div className="page-container py-10 lg:py-14">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-black leading-none text-white sm:text-5xl">
            What we watched
          </h1>
          <p className="mt-3 text-gray-400">Every movie night you've finished, newest first.</p>

          <div className="mt-10">
            {loading && <HistorySkeleton />}

            {!loading && error && (
              <ErrorState
                title="Couldn’t load your history"
                message={error}
                onRetry={() => {
                  setLoading(true);
                  setError('');
                  setReloadKey((k) => k + 1);
                }}
              />
            )}

            {!loading && !error && rooms.length === 0 && (
              <EmptyState
                title="No completed rooms yet"
                body="Once a group votes and the winner is revealed, the night is kept here."
                action={
                  <Button as={Link} to="/rooms/create">
                    Create a room
                  </Button>
                }
              />
            )}

            {!loading && !error && rooms.length > 0 && (
              <ul className="space-y-4">
                {rooms.map((room) => (
                  <li key={room._id}>
                    {/* A ticket stub: the film on the left, the room it was decided in on the right.
                        The drop-shadow sits on the wrapper because the ticket mask would clip it. */}
                    <div className="drop-shadow-[0_14px_20px_rgba(8,1,4,0.5)]">
                      <Link
                        to={`/rooms/${room.code}/reveal`}
                        className="ticket group flex bg-gray-900 transition-colors hover:bg-gray-800 focus-ring"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-4 p-4 pr-3 sm:gap-5 sm:p-5">
                          {room.result?.posterPath && (
                            <TmdbImage
                              path={room.result.posterPath}
                              kind="thumb"
                              alt=""
                              sizes="64px"
                              className="w-14 shrink-0 rounded-md sm:w-16"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-xl font-bold text-white sm:text-2xl">
                              {room.result?.title ?? 'Unknown'}
                            </p>
                            {room.result?.genres?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {room.result.genres.slice(0, 3).map((g) => (
                                  <Badge key={g}>{g}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="perforation-l my-3" aria-hidden="true" />
                        <div className="flex w-28 shrink-0 flex-col items-center justify-center gap-1 px-3 text-center sm:w-36">
                          <p className="text-xs text-gray-400">Room</p>
                          <p className="font-mono text-lg font-bold tracking-[0.15em] text-brass-300">
                            {room.code}
                          </p>
                          <p className="text-xs text-gray-400">
                            {room.members?.length ?? 0} member
                            {room.members?.length === 1 ? '' : 's'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(room.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
