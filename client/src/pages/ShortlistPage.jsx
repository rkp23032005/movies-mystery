import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getRoom } from '../services/roomService';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { PageShell, EmptyState, ErrorState, Spinner } from '../components/ui';
import Button from '../components/Button';
import MysteryTile from '../components/MysteryTile';
import Surface from '../components/Surface';
import TmdbImage from '../components/TmdbImage';

export default function ShortlistPage() {
  const { code } = useParams();
  useDocumentTitle('Shortlist');
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getRoom(code)
      .then((res) => setRoom(res.data.data))
      .catch((err) => setError(err.message));
  }, [code]);

  if (!room)
    return (
      <PageShell footer={false}>
        {error ? (
          <ErrorState title="Couldn’t load the shortlist" message={error}>
            <Button as={Link} to="/">
              Back to home
            </Button>
          </ErrorState>
        ) : (
          <div className="grid min-h-[60dvh] place-items-center">
            <Spinner inline label="Loading shortlist…" />
          </div>
        )}
      </PageShell>
    );

  return (
    <PageShell footer={false}>
      <div className="page-container py-10 lg:py-14">
        <div className="mx-auto max-w-3xl">
          <Link
            to={`/rooms/${code}/reveal`}
            className="inline-flex rounded-md text-sm font-medium text-gray-300 transition-colors hover:text-white focus-ring"
          >
            ← Back to Reveal
          </Link>
          <h1 className="mt-6 text-4xl font-black leading-none text-white sm:text-5xl">
            Shortlist
          </h1>
          <p className="mt-3 text-gray-400">
            The movies the group's preferences surfaced, best match first.
          </p>

          {room.relaxedConstraints?.length > 0 && (
            <p
              role="note"
              className="mt-6 rounded-lg bg-brass-400/10 px-4 py-3 text-sm text-brass-200 ring-1 ring-inset ring-brass-400/30"
            >
              ⚠️ Relaxed constraints: {room.relaxedConstraints.join(', ')}
            </p>
          )}

          <ol className="mt-8 space-y-4">
            {room.shortlist.map((item, i) => {
              const isMystery = !item.movie?.title;
              const score = Math.round((item.score ?? 0) * 100);
              return (
                <li key={item._id}>
                  <Surface variant="solid" padding="sm" className="flex gap-4 sm:gap-5 sm:p-5">
                    <span
                      aria-hidden="true"
                      className="w-8 shrink-0 font-display text-4xl font-black leading-none text-brass-400 sm:w-10 sm:text-5xl"
                    >
                      {i + 1}
                    </span>
                    {isMystery ? (
                      <MysteryTile className="w-14 shrink-0 sm:w-16" />
                    ) : (
                      <TmdbImage
                        path={item.movie.posterPath}
                        kind="thumb"
                        alt={item.movie.title}
                        sizes="64px"
                        className="w-14 shrink-0 rounded-lg sm:w-16"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-xl font-bold text-white sm:text-2xl">
                        {item.movie?.title ?? `Mystery #${i + 1}`}
                      </p>
                      {isMystery && (
                        <p className="mt-1 text-sm text-gray-400">
                          {item.movie?.genres?.join(', ')} · {item.movie?.runtime} min ·{' '}
                          {item.movie?.decade} · {item.movie?.ratingBand}
                        </p>
                      )}
                      {item.explanation && (
                        <p className="mt-1 text-sm text-gray-400">{item.explanation}</p>
                      )}
                      <div className="mt-3 flex items-center gap-3">
                        <div
                          role="progressbar"
                          aria-label="Match score"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={score}
                          className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-800"
                        >
                          <div
                            className="h-full rounded-full bg-curtain-500"
                            style={{ width: `${Math.min(100, score)}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-gray-300">Score: {score}%</span>
                      </div>
                      <p className="mt-1.5 text-xs text-gray-400">
                        {item.matchedMembers} member{item.matchedMembers !== 1 ? 's' : ''} matched
                      </p>
                    </div>
                  </Surface>
                </li>
              );
            })}
          </ol>

          {room.shortlist.length === 0 && (
            <EmptyState title="No matches" body="No movies matched the group's preferences." />
          )}
        </div>
      </div>
    </PageShell>
  );
}
