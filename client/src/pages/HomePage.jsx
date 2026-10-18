import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchMovies } from '../services/movieService';
import { PageShell } from '../components/ui';
import Button from '../components/Button';
import MorphGallery from '../components/MorphGallery';
import PlatformBadge from '../components/PlatformBadge';
import { cx } from '../utils/cx';

const AUTOPLAY_MS = 6500;

const STEPS = [
  {
    title: 'Create a room',
    body: 'Get a 6-character invite code in one click. Choose Normal or Mystery mode.',
  },
  {
    title: 'Set preferences',
    body: 'Each member picks genres, platforms, mood, runtime, and rating floor.',
  },
  {
    title: 'Engine picks',
    body: 'Our ranking engine finds movies everyone can actually watch, scored for the whole group.',
  },
  {
    title: 'Vote',
    body: 'Live voting with real-time progress bars. In Mystery mode the title stays hidden.',
  },
  {
    title: 'Reveal',
    body: 'Countdown, clue-by-clue reveal, then the poster drops. Where to watch included.',
  },
];

const FEATURES = [
  { term: 'Mystery mode', body: 'Vote blind, reveal together' },
  { term: 'Real-time via Socket.io', body: 'No refresh needed' },
  { term: 'Smart ranking', body: 'Fairness-weighted, not just popularity' },
  { term: 'Streaming filter', body: 'Only shows what your group has' },
  { term: 'Constraint relaxation', body: 'Always finds something' },
  { term: 'Room history', body: '“What we watched” archive' },
];

const Chevron = ({ dir }) => (
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
    <path d={dir === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
  </svg>
);

const RoundButton = ({ label, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="relative grid size-11 shrink-0 place-items-center rounded-full bg-gray-950/75 text-white ring-1 ring-inset ring-white/15 touch-manipulation transition-colors hover:bg-gray-950/90 hover:ring-brass-400/50 focus-ring before:absolute before:-inset-1 before:content-['']"
  >
    {children}
  </button>
);

// No backdrop-filter on anything over the gallery: blurring a canvas that redraws every frame forces
// a re-blur per frame (measured ~4x slower frames). Use translucent tints instead.
// The "now showing" ticket: real data for whichever movie the gallery is on, linked to its page.
function NowShowing({ g, region }) {
  const m = g.slide;
  if (!m || g.count === 0) return null;

  const providers = [
    ...new Map((m.providers?.[region] ?? []).map((p) => [p.name, p])).values(),
  ].slice(0, 2);
  const genres = (m.genres ?? []).slice(0, 2).join(', ');

  return (
    <div className="w-full lg:w-[26rem] lg:shrink-0">
      <div className="drop-shadow-[0_18px_24px_rgba(8,1,4,0.6)]">
        <div className="ticket flex bg-gray-900/90">
          <div className="min-w-0 flex-1 p-5 pr-4">
            <p className="text-sm font-medium text-brass-300">Now showing</p>
            <p className="mt-1.5 font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
              <Link
                to={`/movies/${m._id}`}
                className="rounded-sm underline-offset-4 hover:underline focus-visible:underline"
              >
                {m.title}
              </Link>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-300">
              {m.releaseYear != null && <span>{m.releaseYear}</span>}
              {m.rating != null && (
                <span className="font-medium text-brass-300">★ {m.rating.toFixed(1)}</span>
              )}
              {genres && <span>{genres}</span>}
            </div>
            {providers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {providers.map((p) => (
                  <PlatformBadge key={p.name} name={p.name} />
                ))}
              </div>
            )}
          </div>
          <span className="perforation-l my-3" aria-hidden="true" />
          <div
            className="grid w-20 shrink-0 place-items-center px-3 text-center"
            aria-hidden="true"
          >
            <div>
              <p className="font-display text-3xl font-black leading-none tabular-nums text-white">
                {String(g.index + 1).padStart(2, '0')}
              </p>
              <p className="mt-1 text-xs text-gray-400">of {g.count}</p>
            </div>
          </div>
        </div>
      </div>

      {g.count > 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <RoundButton label="Previous movie" onClick={g.prev}>
            <Chevron dir="left" />
          </RoundButton>
          <RoundButton label="Next movie" onClick={g.next}>
            <Chevron dir="right" />
          </RoundButton>
          {g.canAutoplay && (
            <RoundButton
              label={g.playing ? 'Pause automatic slideshow' : 'Play automatic slideshow'}
              onClick={g.togglePlay}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="currentColor">
                {g.playing ? (
                  <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
                ) : (
                  <path d="M8 5.5v13a.5.5 0 0 0 .77.42l10-6.5a.5.5 0 0 0 0-.84l-10-6.5A.5.5 0 0 0 8 5.5z" />
                )}
              </svg>
            </RoundButton>
          )}
          <div className="ml-2 flex min-w-0 flex-1 items-center justify-end gap-1 max-[359px]:ml-0 max-[359px]:basis-full max-[359px]:justify-start sm:gap-1.5">
            {Array.from({ length: g.count }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => g.goTo(i)}
                aria-label={`Show movie ${i + 1} of ${g.count}`}
                aria-current={i === g.index ? 'true' : undefined}
                className="group rounded-full py-3 focus-ring"
              >
                <span
                  className={cx(
                    'relative block h-1 overflow-hidden rounded-full transition-all duration-300',
                    i === g.index
                      ? 'w-5 bg-white/25 sm:w-7'
                      : 'w-3 bg-white/25 group-hover:bg-white/50 sm:w-4'
                  )}
                >
                  {i === g.index && (
                    <span
                      key={`${i}-${g.running}`}
                      className="absolute inset-0 origin-left bg-brass-400"
                      style={
                        g.running
                          ? { animation: `pip-fill ${AUTOPLAY_MS}ms linear forwards` }
                          : undefined
                      }
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const region = user?.profile?.region ?? 'IN';
  const [movies, setMovies] = useState([]);

  // Real catalogue data for the gallery. The hero text never waits for this: if the request is
  // slow (cold start) or fails, the stage keeps its wine backdrop and the page is complete.
  useEffect(() => {
    if (loading) return undefined; // region comes from the profile; avoid fetching twice
    let alive = true;
    fetchMovies({ limit: 24, minRating: 7, region })
      .then((res) => alive && setMovies(res.data.data ?? []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [loading, region]);

  return (
    <PageShell>
      {/* Hero: the gallery is the stage, the headline sits on it. */}
      <MorphGallery
        movies={movies}
        count={10}
        autoplayMs={AUTOPLAY_MS}
        label="Featured movies"
        className="min-h-[max(36rem,min(48rem,calc(100dvh-var(--nav-h))))]"
      >
        {(g) => (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-linear-to-r from-gray-950/90 via-gray-950/50 to-gray-950/5"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-linear-to-t from-gray-950 via-gray-950/25 to-gray-950/40"
            />
            <div className="page-container relative flex min-h-[inherit] flex-col justify-end gap-8 pb-8 pt-16 sm:gap-10 sm:pb-10 sm:pt-24 lg:flex-row lg:items-end lg:justify-between lg:pb-14">
              <div className="max-w-2xl">
                <h1 className="text-[2.6rem] font-black leading-[0.95] max-[359px]:text-[2.15rem] tracking-tight text-white sm:text-7xl sm:leading-[0.92] xl:text-[5.5rem]">
                  Stop arguing.
                  <br />
                  <span className="text-brass-300">Start watching.</span>
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-200">
                  Movie Mystery merges everyone's preferences, filters by the streaming platforms
                  your group actually has, and picks a winner through a live vote — with an optional
                  mystery reveal.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {user ? (
                    <>
                      <Button as={Link} to="/rooms/create" size="lg">
                        Create a Room →
                      </Button>
                      <Button as={Link} to="/rooms/join" variant="secondary" size="lg">
                        Join with a Code
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button as={Link} to="/register" size="lg">
                        Get started — it's free
                      </Button>
                      <Button as={Link} to="/explore" variant="secondary" size="lg">
                        Browse movies
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <NowShowing g={g} region={region} />
            </div>
          </>
        )}
      </MorphGallery>

      {/* How it works */}
      <section
        className="page-container grid gap-10 py-20 lg:grid-cols-12 lg:gap-16 lg:py-28"
        aria-labelledby="how-it-works"
      >
        <div className="lg:col-span-4">
          <h2
            id="how-it-works"
            className="text-4xl font-black leading-tight text-white sm:text-5xl lg:sticky lg:top-28"
          >
            How it works
          </h2>
        </div>
        <ol className="lg:col-span-8">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className={cx(
                'grid grid-cols-[3.5rem_1fr] gap-x-5 py-7 sm:grid-cols-[5rem_1fr] sm:gap-x-8',
                i > 0 && 'perforation-t'
              )}
            >
              <span
                aria-hidden="true"
                className="font-display text-4xl font-black leading-none tabular-nums text-brass-400 sm:text-5xl"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="text-xl font-bold text-white sm:text-2xl">{s.title}</h3>
                <p className="mt-2 max-w-prose leading-relaxed text-gray-400">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="bg-gray-900/60" aria-labelledby="features">
        <div className="page-container py-16 lg:py-20">
          <h2 id="features" className="text-3xl font-black text-white sm:text-4xl">
            Features
          </h2>
          <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.term} className="border-l-2 border-brass-400/40 pl-4">
                <p className="font-semibold text-white">{f.term}</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-400">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Closing call to action (guests only, as before) */}
      {!user && (
        <section className="page-container pt-20">
          <div className="drop-shadow-[0_18px_24px_rgba(8,1,4,0.55)]">
            <div className="flex flex-col overflow-hidden rounded-2xl bg-gray-800 sm:ticket sm:flex-row sm:rounded-none">
              <div className="flex-1 p-8 sm:p-12">
                <h2 className="text-3xl font-black text-white sm:text-5xl">
                  Ready for movie night?
                </h2>
              </div>
              <span className="perforation-t sm:hidden" aria-hidden="true" />
              <span className="perforation-l my-4 hidden sm:block" aria-hidden="true" />
              <div className="flex items-center p-8 sm:p-12">
                <Button as={Link} to="/register" size="lg">
                  Create your first room →
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </PageShell>
  );
}
