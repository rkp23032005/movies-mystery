import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login as loginApi } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
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
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-900 p-8 rounded-2xl w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Welcome back</h1>

        {serverError && <p className="text-red-400 text-sm text-center">{serverError}</p>}

        <div>
          <input
            placeholder="Email"
            type="email"
            className="w-full bg-gray-800 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <input
            placeholder="Password"
            type="password"
            className="w-full bg-gray-800 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            {...register('password', { required: 'Password is required' })}
          />
          {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-lg py-2 font-semibold transition">
          Log in
        </button>

        <p className="text-center text-sm text-gray-400">
          No account? <Link to="/register" className="text-indigo-400 hover:underline">Register</Link>
        </p>
      </form>
    </div>
  );
}
