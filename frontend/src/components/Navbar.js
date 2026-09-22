'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, loading } = useAuth();

  return (
    <nav className="bg-slate-900 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold tracking-tight text-emerald-400">
          CodeArena
        </Link>
        <div className="flex space-x-6 items-center">
          <Link href="/problems" className="hover:text-emerald-300 transition">Problems</Link>
          <Link href="/contests" className="hover:text-emerald-300 transition">Contests</Link>
          <Link href="/leaderboard" className="hover:text-emerald-300 transition">Leaderboard</Link>
          
          {!loading && (
            <>
              {user ? (
                <div className="flex items-center space-x-4 ml-4">
                  <Link href={`/profile/${user.username}`} className="text-gray-300 hover:text-emerald-300 transition font-medium">
                    {user.username}
                  </Link>
                  {user.role === 'admin' && (
                    <>
                      <Link href="/admin/problems" className="text-orange-400 hover:text-orange-300 transition">Admin Problems</Link>
                      <Link href="/admin/contests" className="text-orange-400 hover:text-orange-300 transition">Admin Contests</Link>
                      <Link href="/admin/discussions" className="text-orange-400 hover:text-orange-300 transition">Moderation</Link>
                    </>
                  )}
                  <button 
                    onClick={logout}
                    className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-md font-medium transition"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex space-x-4 ml-4">
                  <Link href="/login" className="text-gray-300 hover:text-white transition py-2">
                    Log In
                  </Link>
                  <Link href="/register" className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-md font-medium transition">
                    Sign Up
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
