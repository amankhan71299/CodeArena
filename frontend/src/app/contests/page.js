'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export default function ContestsList() {
  const { user, loading } = useAuth();
  const [contests, setContests] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchContests();
  }, [user]);

  const fetchContests = async () => {
    try {
      const res = await fetch('/api/contests', {
        headers: user ? { 'Authorization': `Bearer ${user.token}` } : {},
        credentials: 'omit' // public route potentially, but we're requiring auth now
      });
      // In Phase 7, the route requires auth
      const headers = {};
      if (!res.ok) throw new Error('Failed to fetch contests');
      const data = await res.json();
      setContests(data);
    } catch (err) {
      // If unauthorized, probably not logged in.
      // But we will handle fetching via credentials: 'include'
    }
  };

  useEffect(() => {
    const doFetch = async () => {
      if (!loading && user) {
        try {
          const res = await fetch('/api/contests', { credentials: 'include' });
          if (!res.ok) throw new Error('Failed to fetch contests');
          const data = await res.json();
          setContests(data);
        } catch (err) {
          setError(err.message);
        }
      }
    };
    doFetch();
  }, [user, loading]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  if (!user) {
    return (
      <div className="container mx-auto p-8 text-center mt-20">
        <h1 className="text-3xl font-bold mb-4">CodeArena Contests</h1>
        <p className="mb-4">Please log in to view and join contests.</p>
        <Link href="/login" className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded">
          Log In
        </Link>
      </div>
    );
  }

  const getStatusColor = (status) => {
    if (status === 'RUNNING') return 'bg-green-100 text-green-800';
    if (status === 'UPCOMING') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Contests</h1>
      
      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {contests.map(contest => (
          <div key={contest._id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 flex flex-col">
            <div className="p-6 flex-grow">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">{contest.title}</h2>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contest.status)}`}>
                  {contest.status}
                </span>
              </div>
              <p className="text-gray-600 mb-4 line-clamp-2">{contest.description}</p>
              
              <div className="text-sm text-gray-500 mb-2">
                <strong>Start:</strong> {new Date(contest.startTime).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">
                <strong>Duration:</strong> {contest.duration} minutes
              </div>
            </div>
            <div className="bg-gray-50 p-4 border-t border-gray-200">
              <Link 
                href={`/contests/${contest.slug}`}
                className="w-full block text-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition"
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
        {contests.length === 0 && !error && (
          <div className="col-span-full text-center p-8 bg-white shadow rounded border border-gray-200">
            <h3 className="text-xl text-gray-700">No active or upcoming contests at the moment.</h3>
          </div>
        )}
      </div>
    </div>
  );
}
