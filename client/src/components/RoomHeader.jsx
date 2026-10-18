import Badge from './Badge';
import { cx } from '../utils/cx';

const STEPS = [
  { id: 'lobby', label: 'Lobby' },
  { id: 'vote', label: 'Vote' },
  { id: 'reveal', label: 'Reveal' },
];

/**
 * Where you are in a movie night: the room's code and mode, and the three stages
 * (Lobby → Vote → Reveal). `step` is 'lobby' | 'vote' | 'reveal'. Purely presentational.
 */
export default function RoomHeader({ code, mode, step }) {
  const at = STEPS.findIndex((s) => s.id === step);
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">Room</span>
        <span className="font-mono text-lg font-bold tracking-[0.2em] text-brass-300">{code}</span>
        {mode && (
          <Badge tone={mode === 'mystery' ? 'mystery' : 'neutral'}>
            {mode === 'mystery' ? 'Mystery' : 'Normal'} mode
          </Badge>
        )}
      </div>
      <ol aria-label="Progress" className="flex items-center gap-2 text-sm">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            className="flex items-center gap-2"
            aria-current={i === at ? 'step' : undefined}
          >
            {i > 0 && <span aria-hidden="true" className="h-px w-4 bg-white/20 sm:w-6" />}
            <span
              className={cx(
                'inline-flex items-center gap-1.5',
                i === at ? 'font-semibold text-white' : i < at ? 'text-gray-300' : 'text-gray-500'
              )}
            >
              <span
                aria-hidden="true"
                className={cx(
                  'grid size-5 place-items-center rounded-full text-[11px] font-bold',
                  i === at
                    ? 'bg-curtain-600 text-white'
                    : i < at
                      ? 'bg-white/15 text-white'
                      : 'bg-white/[0.07] text-gray-400'
                )}
              >
                {i + 1}
              </span>
              {s.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
