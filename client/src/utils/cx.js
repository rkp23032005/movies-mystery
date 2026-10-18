// Tiny class-name joiner (no clsx / tailwind-merge dependency).
// Tailwind 4 resolves conflicting utilities by stylesheet order, not class order, so pass only
// non-conflicting layout classes (width, margin, flex, …) through `className` props.
export const cx = (...parts) => parts.filter(Boolean).join(' ');
