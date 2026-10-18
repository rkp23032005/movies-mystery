import { cx } from '../utils/cx';

const VARIANTS = {
  solid: 'bg-gray-900 ring-1 ring-white/[0.07]',
  raised: 'bg-gray-900 ring-1 ring-white/[0.07] shadow-panel',
  glass: 'bg-gray-900/60 ring-1 ring-white/10 backdrop-blur-xl',
  inset: 'bg-gray-950/60 ring-1 ring-white/[0.05]',
};

const PADDING = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-6 sm:p-8' };

// A panel. Use `raised` for the main card on a page (forms, lobby), `solid` for repeated items,
// `glass` over imagery, `inset` for wells inside another surface.
export default function Surface({
  as: Comp = 'div',
  variant = 'solid',
  padding = 'md',
  className,
  ...props
}) {
  return (
    <Comp
      className={cx('rounded-2xl', VARIANTS[variant], PADDING[padding], className)}
      {...props}
    />
  );
}
