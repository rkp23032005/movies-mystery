import { cx } from '../utils/cx';

const SIZES = { sm: 'size-8 text-sm', md: 'size-10 text-base', lg: 'size-16 text-2xl' };

// A person's initial in a curtain-red disc. Decorative: the name is always shown beside it.
export default function Avatar({ name, size = 'md', className }) {
  const letter = (name || '?').trim()[0]?.toUpperCase() || '?';
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-grid shrink-0 place-items-center rounded-full bg-curtain-700 font-display font-bold text-white ring-1 ring-white/10',
        SIZES[size],
        className
      )}
    >
      {letter}
    </span>
  );
}
