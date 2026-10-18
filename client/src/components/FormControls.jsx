import { useState } from 'react';
import { cx } from '../utils/cx';

// Shared look for text-like controls. Error state is driven by aria-invalid so the visual and
// the accessibility state can never disagree: <Input aria-invalid={!!errors.email} />
const CONTROL =
  'w-full rounded-lg border border-white/10 bg-gray-800/70 px-4 text-sm text-white outline-none transition duration-200 placeholder:text-gray-500 hover:border-white/20 focus:border-brass-400/70 focus:ring-2 focus:ring-brass-400/25 aria-invalid:border-red-400/70 aria-invalid:focus:ring-red-400/25 disabled:cursor-not-allowed disabled:opacity-50';

// React 19: `ref` is a regular prop, so react-hook-form's {...register('x')} works unchanged.
export function Input({ className, ref, ...props }) {
  return <input ref={ref} className={cx(CONTROL, 'h-11', className)} {...props} />;
}

// `className` goes on the wrapper (for width / margin); the <select> always fills it.
export function Select({ className, children, ref, ...props }) {
  return (
    <div className={cx('relative', className)}>
      <select
        ref={ref}
        className={cx(
          CONTROL,
          'h-11 appearance-none pr-10 [&_option]:bg-gray-900 [&_option]:text-white'
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m5 7.5 5 5 5-5" />
      </svg>
    </div>
  );
}

/**
 * Label + control + optional hint/error.
 *   <Field label="Email" htmlFor="email" error={errors.email?.message}><Input id="email" /></Field>
 * `aside` shows a muted value at the right of the label (e.g. a slider's current value).
 */
export function Field({ label, htmlFor, aside, hint, error, className, children }) {
  return (
    <div className={cx('space-y-1.5', className)}>
      {label && (
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={htmlFor} className="text-sm font-medium text-gray-300">
            {label}
          </label>
          {aside != null && <span className="text-sm text-white">{aside}</span>}
        </div>
      )}
      {children}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

// Slider with a filled track. Controlled like a normal <input type="range">; pass value as a
// number or numeric string. The fill is driven by the --pct custom property (see range-input).
export function Range({ min = 0, max = 100, value, className, style, ...props }) {
  const pct = ((Number(value) - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      className={cx('range-input', className)}
      style={{ '--pct': `${Math.min(100, Math.max(0, pct))}%`, ...style }}
      {...props}
    />
  );
}

// Password field with a show/hide toggle. Same props as Input (autoComplete, register(), …).
export function PasswordInput({ className, ref, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={cx(CONTROL, 'h-11 pr-12', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-gray-400 touch-manipulation transition-colors hover:text-white focus-ring before:absolute before:-inset-1 before:content-['']"
      >
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
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  );
}

const CHIP_BASE =
  'inline-flex h-9 items-center rounded-full px-4 text-sm font-medium ring-1 ring-inset transition-colors';
const CHIP_OFF = 'bg-gray-800/70 text-gray-300 ring-white/10 hover:bg-gray-700 hover:text-white';
const CHIP_ON = {
  curtain: 'bg-curtain-600 text-white ring-transparent',
  brass: 'bg-brass-400 text-gray-950 ring-transparent',
};

// A toggle button styled as a chip (multi-select / optional single-select groups). `pressed`
// drives aria-pressed, so the selected state is announced, not just coloured.
export function ChipToggle({ pressed, tone = 'curtain', className, children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cx(CHIP_BASE, 'focus-ring', pressed ? CHIP_ON[tone] : CHIP_OFF, className)}
      {...props}
    >
      {children}
    </button>
  );
}

// A real checkbox styled as a chip — for react-hook-form groups: <CheckChip value="en" {...register('languages')}>.
// The native input stays in the DOM (visually hidden) so form state, keyboard and screen readers are unchanged.
export function CheckChip({ children, className, ...inputProps }) {
  return (
    <label className={cx('cursor-pointer', className)}>
      <input type="checkbox" className="peer sr-only" {...inputProps} />
      <span
        className={cx(
          CHIP_BASE,
          CHIP_OFF,
          'peer-checked:bg-curtain-600 peer-checked:text-white peer-checked:ring-transparent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brass-400'
        )}
      >
        {children}
      </span>
    </label>
  );
}
