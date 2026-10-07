import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { joinRoom } from '../services/roomService';
import { useToast } from '../context/ToastContext';
import { PageShell } from '../components/ui';

export default function JoinRoomPage() {
  const [searchParams] = useSearchParams();
  const { register, handleSubmit, formState: { errors } } = useForm({
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
    <PageShell back>
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)] px-4">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-gray-900 p-8 rounded-2xl w-full max-w-sm space-y-4"
          noValidate
        >
          <h1 className="text-2xl font-bold text-center">🔑 Join a Room</h1>

          <div>
            <label htmlFor="code" className="sr-only">Invite code</label>
            <input
              id="code"
              placeholder="6-character invite code"
              autoComplete="off"
              className="w-full bg-gray-800 rounded-lg px-4 py-2 uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500"
              maxLength={6}
              aria-describedby={errors.code ? 'code-error' : undefined}
              {...register('code', {
                required: 'Code is required',
                minLength: { value: 6, message: 'Must be 6 characters' },
              })}
            />
            {errors.code && (
              <p id="code-error" role="alert" className="text-red-400 text-xs mt-1">
                {errors.code.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-lg py-2 font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Join
          </button>
        </form>
      </div>
    </PageShell>
  );
}
