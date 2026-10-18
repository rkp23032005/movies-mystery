import Button from './Button';
import Navbar from './Navbar';
import Footer from './Footer';

// ── Spinner ───────────────────────────────────────────────────────────────────
// Full-screen by default (route-level loading). `inline` renders just the ring.
export function Spinner({ label = 'Loading…', inline = false }) {
  const ring = (
    <div
      role="status"
      aria-label={label}
      className="size-10 animate-spin rounded-full border-[3px] border-brass-400 border-t-transparent"
    />
  );
  if (inline) return ring;
  return <div className="flex min-h-dvh items-center justify-center bg-gray-950">{ring}</div>;
}

// ── EmptyState ────────────────────────────────────────────────────────────────
// `icon` accepts a node (an SVG) or a string; omit it for the default film-frame glyph.
const FilmGlyph = (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="size-12 text-brass-400/70"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
  </svg>
);

// `action` is an optional node (a Button / Link) shown under the text.
export function EmptyState({ icon = FilmGlyph, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <span className="mb-4 text-5xl" aria-hidden="true">
        {icon}
      </span>
      <p className="font-display text-xl font-bold text-white">{title}</p>
      {body && <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-400">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// A failed request: says what happened and offers a retry (`onRetry`) plus any extra actions.
export function ErrorState({ title = 'Something went wrong', message, onRetry, children }) {
  return (
    <div role="alert" className="flex flex-col items-center px-4 py-20 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-red-500/10 text-red-400 ring-1 ring-red-400/30">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M12 7v6M12 17h.01" />
        </svg>
      </span>
      <p className="mt-4 font-display text-xl font-bold text-white">{title}</p>
      {message && <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-400">{message}</p>}
      {(onRetry || children) && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

// ── ErrorMessage ──────────────────────────────────────────────────────────────
export function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-center text-sm text-red-400">
      {message}
    </p>
  );
}

// ── PageShell ─────────────────────────────────────────────────────────────────
// Navbar + main + footer. `back` adds a back arrow; `footer={false}` for immersive screens.
export function PageShell({ children, back = false, footer = true }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gray-950 text-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-70 focus:rounded-lg focus:bg-curtain-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <Navbar back={back} />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      {footer && <Footer />}
    </div>
  );
}
