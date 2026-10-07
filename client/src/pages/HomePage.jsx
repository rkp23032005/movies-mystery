import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageShell } from '../components/ui';

const STEPS = [
  { icon: '🏠', title: 'Create a room', body: 'Get a 6-character invite code in one click. Choose Normal or Mystery mode.' },
  { icon: '📋', title: 'Set preferences', body: 'Each member picks genres, platforms, mood, runtime, and rating floor.' },
  { icon: '🤖', title: 'Engine picks', body: 'Our ranking engine finds movies everyone can actually watch, scored for the whole group.' },
  { icon: '🗳️', title: 'Vote', body: 'Live voting with real-time progress bars. In Mystery mode the title stays hidden.' },
  { icon: '🎬', title: 'Reveal', body: 'Countdown, clue-by-clue reveal, then the poster drops. Where to watch included.' },
];

const FEATURES = [
  '🎭 Mystery mode — vote blind, reveal together',
  '📡 Real-time via Socket.io — no refresh needed',
  '🎯 Smart ranking — fairness-weighted, not just popularity',
  '📺 Streaming filter — only shows what your group has',
  '🔄 Constraint relaxation — always finds something',
  '📜 Room history — "What we watched" archive',
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <PageShell>
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-4 py-20 sm:py-28">
        <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">
          Group movie night, solved
        </span>
        <h1 className="text-4xl sm:text-6xl font-black leading-tight max-w-2xl">
          Stop arguing.<br />
          <span className="text-indigo-400">Start watching.</span>
        </h1>
        <p className="mt-6 text-gray-400 text-lg max-w-xl leading-relaxed">
          Movie Mystery merges everyone's preferences, filters by the streaming platforms your group
          actually has, and picks a winner through a live vote — with an optional mystery reveal.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          {user ? (
            <>
              <Link
                to="/rooms/create"
                className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Create a Room →
              </Link>
              <Link
                to="/rooms/join"
                className="bg-gray-800 hover:bg-gray-700 px-6 py-3 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Join with a Code
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/register"
                className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Get started — it's free
              </Link>
              <Link
                to="/explore"
                className="bg-gray-800 hover:bg-gray-700 px-6 py-3 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Browse movies
              </Link>
            </>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 max-w-4xl mx-auto" aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="text-2xl font-bold text-center mb-10">How it works</h2>
        <ol className="grid sm:grid-cols-5 gap-6">
          {STEPS.map((s, i) => (
            <li key={i} className="flex flex-col items-center text-center gap-2">
              <span className="text-4xl" aria-hidden="true">{s.icon}</span>
              <span className="font-semibold text-sm">{s.title}</span>
              <span className="text-gray-400 text-xs leading-relaxed">{s.body}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="px-4 py-16 bg-gray-900" aria-labelledby="features">
        <div className="max-w-2xl mx-auto">
          <h2 id="features" className="text-2xl font-bold text-center mb-8">Features</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <li key={f} className="bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-200">
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA footer */}
      {!user && (
        <section className="px-4 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready for movie night?</h2>
          <Link
            to="/register"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 px-8 py-3 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Create your first room →
          </Link>
        </section>
      )}
    </PageShell>
  );
}
