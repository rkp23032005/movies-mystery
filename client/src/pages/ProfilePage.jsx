import { useForm, useWatch } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/authService';
import { useState } from 'react';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { PageShell } from '../components/ui';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Surface from '../components/Surface';
import { CheckChip, Field, Input } from '../components/FormControls';
import { languageName, regionName } from '../utils/format';

const PLATFORMS = [
  'Netflix',
  'Amazon Prime Video',
  'Disney Plus',
  'Hotstar',
  'Max',
  'Hulu',
  'Paramount Plus',
  'Apple TV Plus',
];
const LANGUAGES = ['en', 'hi', 'ta', 'te', 'ml', 'kn', 'bn', 'mr'];

export default function ProfilePage() {
  useDocumentTitle('Profile');
  const { user, setUser, logout } = useAuth();
  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      region: user?.profile?.region ?? 'IN',
      languages: user?.profile?.languages ?? [],
      ownedPlatforms: user?.profile?.ownedPlatforms ?? [],
    },
  });
  // "Saved!" is shown only while the form still equals what was saved: remember a snapshot of the
  // saved values and compare — editing anything makes it stale without any effect or extra state.
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const [error, setError] = useState('');
  const values = useWatch({ control });
  const saved = savedSnapshot !== null && savedSnapshot === JSON.stringify(values);

  const onSubmit = async (data) => {
    setError('');
    setSavedSnapshot(null);
    try {
      const res = await updateProfile(data);
      setUser((prev) => ({ ...prev, profile: res.data.user.profile }));
      setSavedSnapshot(JSON.stringify(data));
    } catch (err) {
      setError(err.message);
    }
  };

  const region = (values.region ?? '').trim();

  return (
    <PageShell back>
      <div className="page-container py-10 lg:py-14">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={user?.name} size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">Profile</h1>
              <p className="truncate text-gray-400">
                {user?.name} · {user?.email}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              Log out
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" aria-busy={isSubmitting}>
            <Surface as="section" variant="raised" aria-labelledby="profile-where">
              <h2 id="profile-where" className="text-xl font-black text-white">
                Where you watch
              </h2>
              <div className="mt-5 space-y-6">
                <Field
                  label="Region (2-letter code)"
                  htmlFor="profile-region"
                  hint={
                    region.length === 2 && regionName(region) !== region.toUpperCase()
                      ? regionName(region)
                      : 'Used for streaming availability.'
                  }
                >
                  <Input
                    id="profile-region"
                    className="uppercase sm:max-w-40"
                    maxLength={2}
                    autoComplete="country"
                    {...register('region')}
                  />
                </Field>

                <fieldset>
                  <legend className="mb-2.5 text-sm font-medium text-gray-300">
                    Streaming platforms you own
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => (
                      <CheckChip key={p} value={p} {...register('ownedPlatforms')}>
                        {p}
                      </CheckChip>
                    ))}
                  </div>
                </fieldset>
              </div>
            </Surface>

            <Surface as="section" variant="raised" aria-labelledby="profile-languages">
              <h2 id="profile-languages" className="text-xl font-black text-white">
                Languages
              </h2>
              <fieldset className="mt-5">
                <legend className="sr-only">Languages</legend>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <CheckChip key={lang} value={lang} {...register('languages')}>
                      {languageName(lang)}
                    </CheckChip>
                  ))}
                </div>
              </fieldset>
            </Surface>

            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" size="lg" loading={isSubmitting}>
                Save changes
              </Button>
              <div aria-live="polite" className="text-sm">
                {error && (
                  <p role="alert" className="text-red-400">
                    {error}
                  </p>
                )}
                {saved && <p className="font-medium text-green-400">Saved!</p>}
              </div>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
