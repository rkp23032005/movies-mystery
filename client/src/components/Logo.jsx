import { cx } from '../utils/cx';

// A ticket stub with a question mark: the product in one glyph. Same artwork as public/favicon.svg.
export function LogoMark({ className = 'size-8' }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path
        d="M4 6h24a2 2 0 0 1 2 2v5a3 3 0 0 0 0 6v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5a3 3 0 0 0 0-6V8a2 2 0 0 1 2-2Z"
        fill="#c0233f"
      />
      <path
        d="M12.8 13.2c0-1.9 1.4-3 3.2-3s3.2 1.1 3.2 2.8c0 2.4-3.2 2.4-3.2 4.6"
        fill="none"
        stroke="#efd68c"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="16" cy="21.7" r="1.2" fill="#efd68c" />
    </svg>
  );
}

export default function Logo({ className }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <LogoMark className="size-8 shrink-0" />
      <span className="font-display text-xl font-bold leading-none tracking-tight whitespace-nowrap text-white">
        Movie Mystery
      </span>
    </span>
  );
}
