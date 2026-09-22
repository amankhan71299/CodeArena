'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] text-center">
      <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-600 mb-6">
        Welcome to CodeArena
      </h1>
      <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl">
        The ultimate platform to hone your coding skills, prepare for technical interviews, and compete in algorithmic challenges.
      </p>
      
      {!loading && (
        <div className="flex space-x-6">
          <Link 
            href="/problems" 
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-emerald-500/30 transition transform hover:-translate-y-1"
          >
            Start Coding
          </Link>
          {user ? (
            <Link 
              href="/problems" 
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-full shadow-lg border border-slate-700 transition transform hover:-translate-y-1"
            >
              Continue Coding
            </Link>
          ) : (
            <Link 
              href="/register" 
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-full shadow-lg border border-slate-700 transition transform hover:-translate-y-1"
            >
              Create Account
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
