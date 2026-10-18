import { cx } from '../utils/cx';

const BASE =
  'relative inline-flex select-none touch-manipulation items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition duration-200 ease-cinema focus-ring active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50';

const VARIANTS = {
  // The one action per view: crimson curtain.
  primary:
    'bg-linear-to-b from-curtain-500 to-curtain-600 text-white shadow-curtain hover:from-curtain-500 hover:to-curtain-500 hover:brightness-110',
  // Everything else that is a real button.
  secondary:
    'bg-gray-800 text-gray-100 ring-1 ring-inset ring-white/10 hover:bg-gray-700 hover:ring-white/20',
  // Brass outline: highlighted but not the main action.
  outline:
    'text-brass-300 ring-1 ring-inset ring-brass-400/40 hover:bg-brass-400/10 hover:text-brass-200',
  // Quiet: navigation-like actions.
  ghost: 'text-gray-300 hover:bg-white/[0.06] hover:text-white',
};

const SIZES = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
};

/**
 * <Button>                          → <button type="button">
 * <Button as={Link} to="/explore">  → any element/component (Link, a, …)
 * Props: variant = primary | secondary | outline | ghost · size = sm | md | lg · loading
 * Note: renders type="button" by default — pass type="submit" inside forms.
 */
export default function Button({
  as: Comp = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}) {
  const isNativeButton = Comp === 'button';
  const extra = isNativeButton
    ? { type: props.type ?? 'button', disabled: disabled || loading }
    : { 'aria-disabled': disabled || loading ? true : undefined };

  return (
    <Comp
      className={cx(BASE, VARIANTS[variant], SIZES[size], className)}
      aria-busy={loading || undefined}
      {...props}
      {...extra}
    >
      {loading && (
        <>
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          <span className="sr-only">Loading...</span>
        </>
      )}
      {children}
    </Comp>
  );
}
