import Button from './Button';
import { cx } from '../utils/cx';

// 1 … 4 5 6 … 20 — always the first, last and current ±1.
function pageWindow(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) out.push('…');
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push('…');
  out.push(total);
  return out;
}

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = pageWindow(page, totalPages);

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Prev
      </Button>

      {/* Small screens: a compact counter. From sm up: numbered pages. */}
      <span className="min-w-20 text-center text-sm text-gray-400 sm:hidden" aria-live="polite">
        {page} / {totalPages}
      </span>
      <ol className="hidden items-center gap-1 sm:flex">
        {pages.map((p, i) =>
          p === '…' ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-gray-500">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                onClick={() => p !== page && onChange(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={cx(
                  'grid h-10 min-w-10 place-items-center rounded-lg px-2 text-sm font-medium tabular-nums touch-manipulation transition-colors focus-ring',
                  p === page
                    ? 'bg-curtain-600 text-white'
                    : 'text-gray-300 hover:bg-white/[0.07] hover:text-white'
                )}
              >
                {p}
              </button>
            </li>
          )
        )}
      </ol>

      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next →
      </Button>
    </nav>
  );
}
