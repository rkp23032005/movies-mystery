import Button from './Button';
import { Field, Input, Range, Select } from './FormControls';
import { languageName, regionName } from '../utils/format';
import { REGIONS, withoutFilters } from '../utils/filters';

// A deep link or "My platforms" can put a value in the URL that isn't one of the listed options
// (e.g. ?platform=Netflix,Hotstar). Show it as its own option instead of rendering a blank select.
function extraOption(value, known, label) {
  if (!value || known.includes(value)) return null;
  return <option value={value}>{label ?? value.replaceAll(',', ', ')}</option>;
}

/**
 * The Explore filter panel. It only reads `filters` (the URL params as an object) and reports
 * changes through `onChange(nextFilters)`; every change resets to page 1. `idPrefix` keeps field
 * ids unique when the panel is mounted twice (desktop sidebar + mobile sheet).
 */
export default function FilterSidebar({ filters, meta, region, onChange, idPrefix = '' }) {
  const set = (key, val) => onChange({ ...filters, [key]: val, page: 1 });
  const id = (name) => `${idPrefix}filter-${name}`;

  const platform = filters.platform ?? '';
  const genre = filters.genre ?? '';
  const language = filters.language ?? '';

  return (
    <div aria-label="Filters" role="group" className="space-y-6 text-sm">
      <div className="space-y-5">
        <Field
          label="Streaming region"
          htmlFor={id('region')}
          hint="Availability badges use this region."
        >
          <Select id={id('region')} value={region} onChange={(e) => set('region', e.target.value)}>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {regionName(r)} ({r})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Platform" htmlFor={id('platform')}>
          <Select
            id={id('platform')}
            value={platform}
            onChange={(e) => set('platform', e.target.value || undefined)}
          >
            <option value="">All platforms</option>
            {extraOption(
              platform,
              meta.platforms,
              platform.includes(',')
                ? `My platforms (${platform.replaceAll(',', ', ')})`
                : undefined
            )}
            {meta.platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="perforation-t space-y-5 pt-6">
        <Field label="Genre" htmlFor={id('genre')}>
          <Select
            id={id('genre')}
            value={genre}
            onChange={(e) => set('genre', e.target.value || undefined)}
          >
            <option value="">All genres</option>
            {extraOption(genre, meta.genres)}
            {meta.genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Language" htmlFor={id('language')}>
          <Select
            id={id('language')}
            value={language}
            onChange={(e) => set('language', e.target.value || undefined)}
          >
            <option value="">All languages</option>
            {extraOption(language, meta.languages, languageName(language))}
            {meta.languages.map((l) => (
              <option key={l} value={l}>
                {languageName(l)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="perforation-t space-y-5 pt-6">
        <Field label="Minimum rating" htmlFor={id('rating')} aside={filters.minRating ?? 'Any'}>
          <Range
            id={id('rating')}
            min={0}
            max={10}
            step={0.5}
            value={filters.minRating ?? 0}
            onChange={(e) => set('minRating', e.target.value === '0' ? undefined : e.target.value)}
          />
        </Field>

        <Field
          label="Max runtime"
          htmlFor={id('runtime')}
          aside={filters.maxRuntime ? `${filters.maxRuntime} min` : 'Any'}
        >
          <Range
            id={id('runtime')}
            min={60}
            max={240}
            step={10}
            value={filters.maxRuntime ?? 240}
            onChange={(e) =>
              set('maxRuntime', e.target.value === '240' ? undefined : e.target.value)
            }
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="From year" htmlFor={id('year-from')}>
            <Input
              id={id('year-from')}
              type="number"
              inputMode="numeric"
              placeholder="1990"
              min={1900}
              max={2030}
              value={filters.yearFrom ?? ''}
              onChange={(e) => set('yearFrom', e.target.value || undefined)}
            />
          </Field>
          <Field label="To year" htmlFor={id('year-to')}>
            <Input
              id={id('year-to')}
              type="number"
              inputMode="numeric"
              placeholder="2025"
              min={1900}
              max={2030}
              value={filters.yearTo ?? ''}
              onChange={(e) => set('yearTo', e.target.value || undefined)}
            />
          </Field>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={() => onChange(withoutFilters(filters))}
      >
        Reset filters
      </Button>
    </div>
  );
}
