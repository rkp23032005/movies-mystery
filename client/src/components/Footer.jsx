import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="perforation-t mt-16">
      <div className="page-container flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-md text-sm leading-relaxed text-gray-400">
            Movie data and images are provided by{' '}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brass-300 underline decoration-brass-400/40 underline-offset-4 transition-colors hover:text-brass-200 focus-ring rounded-sm"
            >
              TMDB
            </a>
            . This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>
        <nav aria-label="Footer" className="flex gap-6 text-sm text-gray-400">
          <Link to="/explore" className="rounded-sm transition-colors hover:text-white focus-ring">
            Explore
          </Link>
          <Link
            to="/rooms/join"
            className="rounded-sm transition-colors hover:text-white focus-ring"
          >
            Join a room
          </Link>
        </nav>
      </div>
    </footer>
  );
}
