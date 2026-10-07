// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ label = 'Loading…' }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex items-center justify-center min-h-screen bg-gray-950"
    >
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon = '🎬', title, body }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <span className="text-5xl mb-4" aria-hidden="true">{icon}</span>
      <p className="text-white font-semibold text-lg">{title}</p>
      {body && <p className="text-gray-400 text-sm mt-1 max-w-xs">{body}</p>}
    </div>
  );
}

// ── ErrorMessage ──────────────────────────────────────────────────────────────
export function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-red-400 text-sm text-center">
      {message}
    </p>
  );
}

// ── PageShell ─────────────────────────────────────────────────────────────────
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function PageShell({ children, back }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          {back && (
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="text-gray-400 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
            >
              ←
            </button>
          )}
          <Link to="/" className="text-lg font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
            🎬 Movie Mystery
          </Link>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link to="/rooms/create" className="hidden sm:inline bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                Create Room
              </Link>
              <Link to="/rooms/join" className="text-gray-300 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                Join
              </Link>
              <Link to="/rooms/history" className="text-gray-300 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                History
              </Link>
              <Link to="/profile" className="text-gray-300 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                Profile
              </Link>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-300 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                Log in
              </Link>
              <Link to="/register" className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
