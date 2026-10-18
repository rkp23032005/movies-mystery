import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { joinRoom } from '../services/roomService';
import { useToast } from '../context/ToastContext';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { PageShell } from '../components/ui';
import Button from '../components/Button';
import Surface from '../components/Surface';
import { Field, Input } from '../components/FormControls';

export default function JoinRoomPage() {
  useDocumentTitle('Join a room');
  const [searchParams] = useSearchParams();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { code: (searchParams.get('code') ?? '').toUpperCase().slice(0, 6) },
  });
  const navigate = useNavigate();
  const toast = useToast();

  const onSubmit = async ({ code }) => {
    try {
      const upper = code.trim().toUpperCase();
      await joinRoom(upper);
      navigate(`/rooms/${upper}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <PageShell back footer={false}>
      <div className="page-container flex min-h-[calc(100dvh-var(--nav-h))] items-center justify-center py-10">
        <Surface
          as="form"
          variant="raised"
          padding="lg"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-busy={isSubmitting}
          className="w-full max-w-lg space-y-8"
        >
          <div>
            <h1 className="text-3xl font-black text-white sm:text-4xl">Join a room</h1>
            <p className="mt-2 text-gray-400">
              Enter the 6-character code the host shared with you.
            </p>
          </div>

          <Field label="Invite code" htmlFor="code" error={errors.code?.message}>
            <Input
              id="code"
              placeholder="ABC123"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={6}
              aria-invalid={!!errors.code}
              aria-describedby={errors.code ? 'code-error' : undefined}
              className="h-16 text-center font-mono text-3xl! font-bold uppercase tracking-[0.4em] placeholder:tracking-[0.4em] placeholder:text-gray-600"
              {...register('code', {
                required: 'Code is required',
                minLength: { value: 6, message: 'Must be 6 characters' },
              })}
            />
          </Field>

          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            Join
          </Button>
        </Surface>
      </div>
    </PageShell>
  );
}
