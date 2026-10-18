import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cx } from '../utils/cx';
import Button from './Button';
import Logo from './Logo';

const MEMBER_LINKS = [
  { to: '/explore', label: 'Explore' },
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/rooms/join', label: 'Join a room' },
  { to: '/rooms/history', label: 'History' },
  { to: '/profile', label: 'Profile' },
];
const GUEST_LINKS = [{ to: '/explore', label: 'Explore' }];

// Desktop: full-height link with a brass rule marking the current page.
function DesktopLink({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx(
          'relative flex h-full items-center px-3 text-sm font-medium transition-colors duration-200 focus-ring',
          isActive ? 'text-white' : 'text-gray-400 hover:text-white'
        )
      }
    >
      {({ isActive }) => (
        <>
          {children}
          <span
            aria-hidden="true"
            className={cx(
              'absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brass-400 transition-opacity duration-200',
              isActive ? 'opacity-100' : 'opacity-0'
            )}
          />
        </>
      )}
    </NavLink>
  );
}

function MobileLink({ to, onClick, children }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cx(
          'flex items-center rounded-lg px-3 py-3 text-base font-medium transition-colors focus-ring',
          isActive
            ? 'bg-white/[0.06] text-white'
            : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
        )
      }
    >
      {children}
    </NavLink>
  );
}

const Icon = ({ children }) => (
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
    {children}
  </svg>
);

export default function Navbar({ back = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever the route changes (state adjusted during render, no effect).
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const links = user ? MEMBER_LINKS : GUEST_LINKS;
  const close = () => setOpen(false);
  const handleLogout = () => {
    close();
    logout();
  };

  // No backdrop-filter here: the bar sits over pages with animating content (the Home gallery), and a
  // blur behind it is re-rendered every frame. A 90% tint reads the same on this dark palette.
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-gray-950/90">
      <div className="page-container relative flex h-16 items-center justify-between gap-4">
        <div className="flex h-full items-center gap-3">
          {back && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="-ml-1.5 grid size-11 place-items-center rounded-full text-gray-400 touch-manipulation transition-colors hover:bg-white/[0.06] hover:text-white focus-ring"
            >
              <Icon>
                <path d="m15 18-6-6 6-6" />
              </Icon>
            </button>
          )}
          <Link to="/" aria-label="Movie Mystery — home" className="rounded-md focus-ring">
            <Logo />
          </Link>
          <nav aria-label="Primary" className="ml-6 hidden h-full lg:flex">
            {links.map((l) => (
              <DesktopLink key={l.to} to={l.to}>
                {l.label}
              </DesktopLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Visibility lives on wrappers, never on <Button className>: Button owns its own `display`. */}
          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <Button as={Link} to="/rooms/create" size="sm">
                Create room
              </Button>
            ) : (
              <>
                <Button as={Link} to="/login" variant="ghost" size="sm">
                  Log in
                </Button>
                <Button as={Link} to="/register" size="sm">
                  Register
                </Button>
              </>
            )}
          </div>
          {user && (
            <div className="hidden lg:block">
              <Button variant="ghost" size="sm" onClick={logout}>
                Log out
              </Button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="grid size-11 place-items-center rounded-lg text-gray-300 touch-manipulation transition-colors hover:bg-white/[0.06] hover:text-white focus-ring lg:hidden"
          >
            <Icon>
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </Icon>
          </button>
        </div>

        {open && (
          <div
            id="mobile-nav"
            className="absolute inset-x-0 top-full animate-pop border-b border-white/[0.07] bg-gray-950 shadow-panel lg:hidden"
          >
            <nav aria-label="Mobile" className="page-container flex flex-col gap-1 py-3">
              {links.map((l) => (
                <MobileLink key={l.to} to={l.to} onClick={close}>
                  {l.label}
                </MobileLink>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-white/[0.07] pt-4 sm:hidden">
                {user ? (
                  <Button as={Link} to="/rooms/create" onClick={close}>
                    Create room
                  </Button>
                ) : (
                  <>
                    <Button as={Link} to="/register" onClick={close}>
                      Register
                    </Button>
                    <Button as={Link} to="/login" variant="secondary" onClick={close}>
                      Log in
                    </Button>
                  </>
                )}
              </div>
              {user && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 rounded-lg px-3 py-3 text-left text-base font-medium text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-white focus-ring"
                >
                  Log out
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
