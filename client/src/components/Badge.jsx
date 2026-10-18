import { cx } from '../utils/cx';

const TONES = {
  neutral: 'bg-white/[0.07] text-gray-300 ring-white/10',
  brass: 'bg-brass-400/15 text-brass-300 ring-brass-400/30',
  curtain: 'bg-curtain-500/20 text-curtain-200 ring-curtain-400/30',
  success: 'bg-green-500/15 text-green-300 ring-green-400/25',
  mystery: 'bg-purple-500/20 text-purple-200 ring-purple-400/30',
};

export default function Badge({ tone = 'neutral', className, ...props }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className
      )}
      {...props}
    />
  );
}
