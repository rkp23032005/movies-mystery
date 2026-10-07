import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { register as registerApi } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { saveAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const res = await registerApi(data);
      saveAuth(res.data.token, res.data.user);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setServerError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-900 p-8 rounded-2xl w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Create account</h1>

        {serverError && <p className="text-red-400 text-sm text-center">{serverError}</p>}

        <div>
          <input
            placeholder="Name"
            className="w-full bg-gray-800 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Min 2 chars' } })}
          />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
        </div>

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
            {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 chars' } })}
          />
          {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-lg py-2 font-semibold transition">
          Register
        </button>

        <p className="text-center text-sm text-gray-400">
          Already have an account? <Link to="/login" className="text-indigo-400 hover:underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}
