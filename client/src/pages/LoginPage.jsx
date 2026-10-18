import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login as loginApi } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import useDocumentTitle from '../hooks/useDocumentTitle';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';
import { Field, Input, PasswordInput } from '../components/FormControls';

export default function LoginPage() {
  useDocumentTitle('Log in');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();
  const { saveAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const res = await loginApi(data);
      saveAuth(res.data.token, res.data.user);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setServerError(err.message);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-4xl font-black leading-none text-white">Welcome back</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" aria-busy={isSubmitting}>
        {serverError && (
          <p
            role="alert"
            className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-inset ring-red-400/30"
          >
            {serverError}
          </p>
        )}

        <Field label="Email" htmlFor="login-email" error={errors.email?.message}>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register('email', { required: 'Email is required' })}
          />
        </Field>

        <Field label="Password" htmlFor="login-password" error={errors.password?.message}>
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register('password', { required: 'Password is required' })}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Log in
        </Button>

        <p className="text-center text-sm text-gray-400">
          No account?{' '}
          <Link
            to="/register"
            state={location.state}
            className="rounded-sm font-medium text-brass-300 underline-offset-4 hover:underline focus-ring"
          >
            Register
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
