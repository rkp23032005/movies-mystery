export default function FilterSidebar({ filters, meta, onChange }) {
  const set = (key, val) => onChange({ ...filters, [key]: val, page: 1 });

  return (
    <aside className="space-y-5 text-sm">
      {/* Genre */}
      <div>
        <p className="text-gray-400 mb-1.5 font-medium">Genre</p>
        <select
          value={filters.genre ?? ''}
          onChange={(e) => set('genre', e.target.value || undefined)}
          className="w-full bg-gray-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All genres</option>
          {meta.genres.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Language */}
      <div>
        <p className="text-gray-400 mb-1.5 font-medium">Language</p>
        <select
          value={filters.language ?? ''}
          onChange={(e) => set('language', e.target.value || undefined)}
          className="w-full bg-gray-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All languages</option>
          {meta.languages.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* Platform */}
      <div>
        <p className="text-gray-400 mb-1.5 font-medium">Platform</p>
        <select
          value={filters.platform ?? ''}
          onChange={(e) => set('platform', e.target.value || undefined)}
          className="w-full bg-gray-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All platforms</option>
          {meta.platforms.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Min rating */}
      <div>
        <p className="text-gray-400 mb-1.5 font-medium">
          Min rating: <span className="text-white">{filters.minRating ?? 0}</span>
        </p>
        <input
          type="range" min={0} max={10} step={0.5}
          value={filters.minRating ?? 0}
          onChange={(e) => set('minRating', e.target.value === '0' ? undefined : e.target.value)}
          className="w-full accent-indigo-500"
        />
      </div>

      {/* Max runtime */}
      <div>
        <p className="text-gray-400 mb-1.5 font-medium">
          Max runtime: <span className="text-white">{filters.maxRuntime ? `${filters.maxRuntime} min` : 'Any'}</span>
        </p>
        <input
          type="range" min={60} max={240} step={10}
          value={filters.maxRuntime ?? 240}
          onChange={(e) => set('maxRuntime', e.target.value === '240' ? undefined : e.target.value)}
          className="w-full accent-indigo-500"
        />
      </div>

      {/* Year range */}
      <div className="flex gap-2">
        <div className="flex-1">
          <p className="text-gray-400 mb-1.5 font-medium">From</p>
          <input
            type="number" placeholder="1990" min={1900} max={2030}
            value={filters.yearFrom ?? ''}
            onChange={(e) => set('yearFrom', e.target.value || undefined)}
            className="w-full bg-gray-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex-1">
          <p className="text-gray-400 mb-1.5 font-medium">To</p>
          <input
            type="number" placeholder="2025" min={1900} max={2030}
            value={filters.yearTo ?? ''}
            onChange={(e) => set('yearTo', e.target.value || undefined)}
            className="w-full bg-gray-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={() => onChange({ page: 1 })}
        className="w-full text-gray-400 hover:text-white text-xs underline transition"
      >
        Reset all filters
      </button>
    </aside>
  );
}
