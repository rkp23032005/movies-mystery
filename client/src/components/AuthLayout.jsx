import { Link } from 'react-router-dom';
import Logo from './Logo';

/**
 * Focused two-pane layout for Login / Register: brand statement on the left (desktop), the form
 * on the right. No site navigation — these are single-purpose screens. The caller supplies the
 * page's <h1> and form as children.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-dvh bg-gray-950 text-white lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden bg-[radial-gradient(90%_70%_at_20%_15%,var(--color-curtain-900),var(--color-gray-950)_75%)] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link to="/" aria-label="Movie Mystery — home" className="w-fit rounded-md focus-ring">
          <Logo />
        </Link>
        <div className="relative max-w-xl">
          <p className="font-display text-5xl font-black leading-[0.95] tracking-tight text-white xl:text-6xl 2xl:text-7xl">
            Stop arguing.
            <br />
            <span className="text-brass-300">Start watching.</span>
          </p>
          <p className="mt-6 text-lg leading-relaxed text-gray-300">
            Movie Mystery merges everyone's preferences, filters by the streaming platforms your
            group actually has, and picks a winner through a live vote.
          </p>
        </div>
        <span aria-hidden="true" className="perforation-t w-full" />
      </aside>

      <main className="flex flex-col">
        <div className="p-5 lg:hidden">
          <Link
            to="/"
            aria-label="Movie Mystery — home"
            className="inline-flex rounded-md focus-ring"
          >
            <Logo />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-12 pt-2 lg:py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
