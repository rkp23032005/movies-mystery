import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { submitPreferences } from '../services/roomService';
import { useState } from 'react';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { PageShell } from '../components/ui';
import Button from '../components/Button';
import { ChipToggle, Field, Input } from '../components/FormControls';
import RoomHeader from '../components/RoomHeader';
import Surface from '../components/Surface';
import { languageName } from '../utils/format';

const GENRE_OPTIONS = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Mystery',
  'Romance',
  'Science Fiction',
  'Thriller',
  'War',
  'Western',
];
const PLATFORM_OPTIONS = [
  'Netflix',
  'Amazon Prime Video',
  'Disney Plus',
  'Hotstar',
  'Max',
  'Hulu',
  'Paramount Plus',
  'Apple TV Plus',
];
const LANGUAGE_OPTIONS = ['en', 'hi', 'es', 'fr', 'de', 'ja', 'ko', 'pt', 'it', 'zh'];
const MOOD_OPTIONS = ['light', 'dark', 'romantic', 'adventurous', 'thoughtful', 'scary'];

function MultiSelect({ label, options, value = [], onChange, format = (o) => o }) {
  const toggle = (opt) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-medium text-gray-300">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <ChipToggle key={opt} pressed={value.includes(opt)} onClick={() => toggle(opt)}>
            {format(opt)}
          </ChipToggle>
        ))}
      </div>
    </fieldset>
  );
}

export default function PreferencesPage() {
  const { code } = useParams();
  useDocumentTitle('Your preferences');
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({ defaultValues: { minRating: 0, maxRuntime: '' } });
  const [genres, setGenres] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [mood, setMood] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (data) => {
    setError('');
    try {
      await submitPreferences(code, {
        genres,
        platforms,
        languages,
        mood: mood || null,
        minRating: Number(data.minRating) || 0,
        maxRuntime: data.maxRuntime ? Number(data.maxRuntime) : null,
      });
      navigate(`/rooms/${code}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <PageShell footer={false}>
      <div className="page-container py-8 lg:py-12">
        <RoomHeader code={code.toUpperCase()} step="lobby" />
        <div className="mx-auto mt-8 max-w-3xl">
          <h1 className="text-4xl font-black leading-none text-white sm:text-5xl">
            Your preferences
          </h1>
          <p className="mt-3 text-gray-400">
            Pick what you're in the mood for — the group's picks are merged into one shortlist.
          </p>

          <Surface
            as="form"
            variant="raised"
            padding="lg"
            onSubmit={handleSubmit(onSubmit)}
            className="mt-8 space-y-8"
            aria-busy={isSubmitting}
          >
            <MultiSelect
              label="Genres"
              options={GENRE_OPTIONS}
              value={genres}
              onChange={setGenres}
            />
            <div className="perforation-t pt-8">
              <MultiSelect
                label="Streaming platforms"
                options={PLATFORM_OPTIONS}
                value={platforms}
                onChange={setPlatforms}
              />
            </div>
            <div className="perforation-t pt-8">
              <MultiSelect
                label="Languages"
                options={LANGUAGE_OPTIONS}
                value={languages}
                onChange={setLanguages}
                format={languageName}
              />
            </div>

            <div className="perforation-t pt-8">
              <fieldset>
                <legend className="mb-3 text-sm font-medium text-gray-300">Mood (optional)</legend>
                <div className="flex flex-wrap gap-2">
                  {MOOD_OPTIONS.map((m) => (
                    <ChipToggle
                      key={m}
                      tone="brass"
                      pressed={mood === m}
                      className="capitalize"
                      onClick={() => setMood(mood === m ? '' : m)}
                    >
                      {m}
                    </ChipToggle>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="perforation-t grid gap-5 pt-8 sm:grid-cols-2">
              <Field label="Min Rating (0–10)" htmlFor="pref-rating">
                <Input
                  id="pref-rating"
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  {...register('minRating')}
                />
              </Field>
              <Field label="Max Runtime (min)" htmlFor="pref-runtime">
                <Input
                  id="pref-runtime"
                  type="number"
                  min="30"
                  max="300"
                  placeholder="Any"
                  {...register('maxRuntime')}
                />
              </Field>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-500/10 px-4 py-3 text-center text-sm text-red-300 ring-1 ring-inset ring-red-400/30"
              >
                {error}
              </p>
            )}

            <div className="sticky bottom-0 -mx-6 -mb-6 flex gap-3 rounded-b-2xl border-t border-white/10 bg-gray-900/95 px-6 py-4 sm:-mx-8 sm:-mb-8 sm:px-8">
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => navigate(`/rooms/${code}`)}
              >
                Cancel
              </Button>
              <Button type="submit" size="lg" className="flex-1" loading={isSubmitting}>
                Save Preferences
              </Button>
            </div>
          </Surface>
        </div>
      </div>
    </PageShell>
  );
}
