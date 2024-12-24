'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signup } from '../login/actions';
import { toast, Toaster } from 'sonner';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    const result = await signup(formData);

    if (result && result.error) {
      toast.error(result.error);
    } else if (result) {
      router.push('/dashboard');
    } else {
      toast.error('An unexpected error occurred.');
    }
  };


    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <form className="bg-gray-800 p-8 rounded-lg shadow-md w-96" onSubmit={handleSubmit}>
          <h2 className="text-2xl font-bold mb-6 text-center text-white">Sign Up</h2>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <div className="mb-4">
            <label className="block text-gray-300 mb-2" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded bg-gray-700 text-white border-gray-600 focus:ring-blue-400 focus:border-blue-400"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-300 mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded bg-gray-700 text-white border-gray-600 focus:ring-blue-400 focus:border-blue-400"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          >
            Sign Up
          </button>
          <p className="mt-4 text-center text-gray-300">
            Already have an account? <Link href="/login" className="text-blue-400 hover:underline">Login</Link>
          </p>
        </form>
        <Toaster />
      </div>
    );
  } 