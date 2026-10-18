import { Link } from 'react-router-dom';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { PageShell } from '../components/ui';
import Button from '../components/Button';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <PageShell>
      <div className="page-container flex min-h-[calc(100dvh-var(--nav-h)-9rem)] flex-col items-center justify-center py-16 text-center">
        <p
          aria-hidden="true"
          className="font-display text-[8rem] font-black leading-none text-brass-400/90 sm:text-[11rem]"
        >
          404
        </p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
          This scene doesn't exist.
        </h1>
        <p className="mt-3 max-w-md text-gray-400">
          The page you're looking for was cut from the final edit, or the link is wrong.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button as={Link} to="/" size="lg">
            Back to home
          </Button>
          <Button as={Link} to="/explore" variant="secondary" size="lg">
            Browse movies
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
