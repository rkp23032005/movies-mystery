import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/authService';
import { useState } from 'react';
import { PageShell } from '../components/ui';

const PLATFORMS = ['Netflix', 'Amazon Prime Video', 'Disney Plus', 'Hotstar', 'Max', 'Hulu', 'Paramount Plus', 'Apple TV Plus'];
const LANGUAGES = ['en', 'hi', 'ta', 'te', 'ml', 'kn', 'bn', 'mr'];

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      region: user?.profile?.region ?? 'IN',
      languages: user?.profile?.languages ?? [],
      ownedPlatforms: user?.profile?.ownedPlatforms ?? [],
    },
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (data) => {
    setError(''); setSaved(false);
    try {
      const res = await updateProfile(data);
      setUser((prev) => ({ ...prev, profile: res.data.user.profile }));
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <PageShell back>
    <div className="bg-gray-950 text-white p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Profile</h1>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-white transition">Log out</button>
        </div>

        <p className="text-gray-400">{user?.name} · {user?.email}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-900 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Region (2-letter code)</label>
            <input
              className="w-full bg-gray-800 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
              maxLength={2}
              {...register('region')}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Languages</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <label key={lang} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="checkbox" value={lang} {...register('languages')} className="accent-indigo-500" />
                  {lang}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Streaming platforms you own</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <label key={p} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="checkbox" value={p} {...register('ownedPlatforms')} className="accent-indigo-500" />
                  {p}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {saved && <p className="text-green-400 text-sm">Saved!</p>}

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-lg py-2 font-semibold transition">
            Save changes
          </button>
        </form>
      </div>
    </div>
    </PageShell>
  );
}
