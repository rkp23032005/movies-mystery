import { PLATFORM_COLORS, platformKey } from '../utils/platforms';

const DEFAULT_COLOR = 'bg-gray-700/70 text-gray-300';

const TYPE_LABEL = { flatrate: 'Stream', rent: 'Rent', buy: 'Buy' };

export default function PlatformBadge({ name, type, showType = false }) {
  const color = PLATFORM_COLORS[platformKey(name)] ?? DEFAULT_COLOR;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${color}`}>
      {name}
      {showType && type && (
        <span className="opacity-60 text-[10px]">· {TYPE_LABEL[type] ?? type}</span>
      )}
    </span>
  );
}
