import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { submitPreferences } from '../services/roomService';
import { useState } from 'react';

const GENRE_OPTIONS   = ['Action','Adventure','Animation','Comedy','Crime','Documentary','Drama','Family','Fantasy','History','Horror','Mystery','Romance','Science Fiction','Thriller','War','Western'];
const PLATFORM_OPTIONS = ['Netflix','Amazon Prime Video','Disney Plus','Hotstar','Max','Hulu','Paramount Plus','Apple TV Plus'];
const LANGUAGE_OPTIONS = ['en','hi','es','fr','de','ja','ko','pt','it','zh'];
const MOOD_OPTIONS    = ['light','dark','romantic','adventurous','thoughtful','scary'];

function MultiSelect({ label, options, value = [], onChange }) {
  const toggle = (opt) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  return (
    <div>
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-1 rounded-full text-sm transition ${
              value.includes(opt) ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PreferencesPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm({ defaultValues: { minRating: 0, maxRuntime: '' } });
  const [genres,    setGenres]    = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [mood,      setMood]      = useState('');
  const [error,     setError]     = useState('');

  const onSubmit = async (data) => {
    setError('');
    try {
      await submitPreferences(code, {
        genres,
        platforms,
        languages,
        mood:       mood || null,
        minRating:  Number(data.minRating) || 0,
        maxRuntime: data.maxRuntime ? Number(data.maxRuntime) : null,
      });
      navigate(`/rooms/${code}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center py-12 px-4">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-900 rounded-2xl p-8 w-full max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-center">🎭 Your Preferences</h1>

        <MultiSelect label="Genres" options={GENRE_OPTIONS} value={genres} onChange={setGenres} />
        <MultiSelect label="Streaming Platforms" options={PLATFORM_OPTIONS} value={platforms} onChange={setPlatforms} />
        <MultiSelect label="Languages" options={LANGUAGE_OPTIONS} value={languages} onChange={setLanguages} />

        <div>
          <p className="text-sm text-gray-400 mb-1">Mood (optional)</p>
          <div className="flex flex-wrap gap-2">
            {MOOD_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(mood === m ? '' : m)}
                className={`px-3 py-1 rounded-full text-sm capitalize transition ${
                  mood === m ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">Min Rating (0–10)</label>
            <input
              type="number" min="0" max="10" step="0.5"
              className="w-full mt-1 bg-gray-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              {...register('minRating')}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">Max Runtime (min)</label>
            <input
              type="number" min="30" max="300"
              placeholder="Any"
              className="w-full mt-1 bg-gray-800 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              {...register('maxRuntime')}
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(`/rooms/${code}`)}
            className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-lg py-2 font-medium transition"
          >
            Cancel
          </button>
          <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg py-2 font-semibold transition">
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
