import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getRoom } from '../services/roomService';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import useReducedMotion from '../hooks/useReducedMotion';
import Button from '../components/Button';
import Logo, { LogoMark } from '../components/Logo';
import PlatformBadge from '../components/PlatformBadge';
import TmdbImage from '../components/TmdbImage';
import { formatRuntime } from '../utils/format';

const CLUE_KEYS = ['genres', 'decade', 'runtime', 'ratingBand'];
const CLUE_LABELS = {
  genres: 'Genres',
  decade: 'Decade',
  runtime: 'Runtime',
  ratingBand: 'Rating',
};

function clueValue(movie, key) {
  if (!movie) return undefined;
  if (key === 'decade')
    return movie.releaseYear ? `${Math.floor(movie.releaseYear / 10) * 10}s` : '—';
  if (key === 'ratingBand') {
    const r = movie.rating ?? 0;
    return r >= 8
      ? 'Excellent (8+)'
      : r >= 7
        ? 'Good (7–8)'
        : r >= 6
          ? 'Decent (6–7)'
          : 'Mixed (<6)';
  }
  return movie[key];
}

function formatClue(key, val) {
  if (key === 'genres') return Array.isArray(val) ? val.join(', ') : val;
  if (key === 'runtime') return `${val} min`;
  return val;
}

// The reveal is a full-screen moment: no site navigation, just the logo (a way home) over the stage.
function Stage({ children }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-gray-950 text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(75%_60%_at_50%_25%,var(--color-curtain-900),var(--color-gray-950)_72%)]"
      />
      <header className="page-container flex h-16 shrink-0 items-center">
        <Link to="/" aria-label="Movie Mystery — home" className="rounded-md focus-ring">
          <Logo />
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-4 pb-12 pt-4">
        {children}
      </main>
    </div>
  );
}

export default function RevealPage() {
  const { code } = useParams();
  useDocumentTitle('Reveal');
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const region = user?.profile?.region ?? 'IN';
  const [room, setRoom] = useState(null);
  const [phase, setPhase] = useState(() => (reduced ? 'reveal' : 'countdown')); // countdown | clues | reveal
  const [countdown, setCountdown] = useState(3);
  const [visibleClues, setVisibleClues] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getRoom(code);
      setRoom(res.data.data);
    } catch (e) {
      setError(e.message);
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  useSocket(code, {
    'result-revealed': (r) => setRoom(r),
    'state-snapshot': (r) => {
      if (r.status === 'revealed') setRoom(r);
    },
  });

  // Countdown → clues → reveal animation (skipped under reduced motion)
  useEffect(() => {
    if (!room || room.status !== 'revealed') return;

    if (reduced) {
      if (phase !== 'reveal') setPhase('reveal');
      return;
    }

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
  }, [room, phase, countdown, visibleClues, reduced]);

  if (!room)
    return (
      <Stage>
        {error ? (
          <div role="alert" className="text-center">
            <p className="text-red-300">{error}</p>
            <Button as={Link} to="/" className="mt-6">
              Back to home
            </Button>
          </div>
        ) : (
          <div
            role="status"
            aria-label="Loading"
            className="size-10 animate-spin rounded-full border-[3px] border-brass-400 border-t-transparent"
          />
        )}
      </Stage>
    );

  if (room.status !== 'revealed')
    return (
      <Stage>
        <div className="text-center" role="status">
          <LogoMark className="mx-auto size-16 animate-pulse" />
          <p className="mt-6 font-display text-3xl font-bold text-white">
            Waiting for the host to reveal…
          </p>
          <p className="mt-2 text-gray-400">
            This page updates by itself the moment the winner is revealed.
          </p>
        </div>
      </Stage>
    );

  const winner = room.result;
  // Only the viewer's region (providers is keyed by region code)
  const providers = (winner?.providers?.[region] ?? []).filter((p) => p.type === 'flatrate');
  const uniquePlatforms = [...new Map(providers.map((p) => [p.name, p])).values()];
  const runtime = formatRuntime(winner?.runtime);
  const facts = [winner?.releaseYear, runtime].filter(Boolean);

  return (
    <Stage>
      {/* Countdown */}
      {phase === 'countdown' && (
        <div className="text-center" role="timer" aria-live="off">
          <p className="mb-2 text-lg text-gray-300">Get ready…</p>
          <p className="animate-pulse font-display text-[9rem] font-black leading-none text-brass-300 sm:text-[14rem]">
            {countdown || <LogoMark className="mx-auto size-40 sm:size-56" />}
          </p>
        </div>
      )}

      {/* Clue-by-clue */}
      {phase === 'clues' && (
        <div className="w-full max-w-md space-y-3" aria-live="polite">
          <h1 className="mb-6 text-center text-3xl font-black text-white sm:text-4xl">
            Your clues
          </h1>
          {CLUE_KEYS.slice(0, visibleClues).map((key) => (
            <div
              key={key}
              className="flex animate-fade-in items-center justify-between gap-6 rounded-xl bg-gray-900/80 px-6 py-4 ring-1 ring-inset ring-white/10"
            >
              <span className="text-gray-400">{CLUE_LABELS[key]}</span>
              <span className="text-right font-display text-xl font-bold text-brass-200">
                {formatClue(key, clueValue(winner, key))}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Full reveal */}
      {phase === 'reveal' && winner && (
        <div className="grid w-full max-w-4xl animate-fade-in items-center gap-8 text-center md:grid-cols-[15rem_minmax(0,1fr)] md:gap-12 md:text-left">
          <TmdbImage
            path={winner.posterPath}
            kind="poster"
            alt={winner.title}
            sizes="(min-width: 768px) 240px, 192px"
            priority
            className="mx-auto w-48 rounded-xl shadow-poster ring-1 ring-white/10 md:w-60"
          />

          <div className="space-y-6">
            <p className="flex items-center justify-center gap-2 text-base font-semibold text-brass-300 md:justify-start">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
                <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
              </svg>
              Tonight's pick
            </p>

            <div>
              <h1 className="text-4xl font-black leading-[1.05] text-white sm:text-6xl">
                {winner.title}
              </h1>
              <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-gray-300 md:justify-start">
                {facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
                {winner.rating != null && (
                  <li className="font-bold text-brass-300">★ {winner.rating.toFixed(1)}</li>
                )}
              </ul>
              {winner.overview && (
                <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-200">
                  {winner.overview}
                </p>
              )}
            </div>

            {/* Where to watch */}
            {uniquePlatforms.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-400">Where to watch</p>
                <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                  {uniquePlatforms.map((p) => (
                    <PlatformBadge key={p.name} name={p.name} />
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap md:items-center">
              <Button as={Link} to="/" size="lg">
                🏠 Back to Home
              </Button>
              <Button as={Link} to={`/rooms/${code}/shortlist`} variant="secondary" size="lg">
                See the full shortlist →
              </Button>
              <Button as={Link} to="/rooms/history" variant="ghost" size="lg">
                View room history →
              </Button>
            </div>
          </div>
        </div>
      )}
    </Stage>
  );
}
