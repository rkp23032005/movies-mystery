import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white text-center px-4">
      <span className="text-7xl mb-6" aria-hidden="true">🎭</span>
      <h1 className="text-4xl font-black mb-2">404</h1>
      <p className="text-gray-400 mb-8">This scene doesn't exist.</p>
      <Link
        to="/"
        className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        Back to home
      </Link>
    </div>
  );
}
