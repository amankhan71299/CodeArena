'use client';

import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await register(username, email, password);
    
    if (!result.success) {
      setError(result.error || 'Failed to register');
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-[calc(100vh-100px)]">
      <div className="bg-slate-900 p-8 rounded-lg shadow-xl w-full max-w-md border border-slate-800">
        <h2 className="text-3xl font-bold text-center text-white mb-6">Create an Account</h2>
        
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-1" htmlFor="username">Username</label>
            <input 
              id="username"
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-1" htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-1" htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded transition disabled:opacity-50"
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>
        
        <p className="mt-4 text-center text-gray-400">
          Already have an account? <Link href="/login" className="text-emerald-400 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
