'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';

export default function AdminContests() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [contests, setContests] = useState([]);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'admin') {
        router.push('/');
      } else {
        fetchContests();
      }
    }
  }, [user, loading, router]);

  const fetchContests = async () => {
    try {
      const res = await fetch('/api/admin/contests', {credentials: 'include'});
      if (!res.ok) throw new Error('Failed to fetch contests');
      const data = await res.json();
      setContests(data);
    } catch (err) {
      setFetchError(err.message);
    }
  };

  const publishContest = async (id) => {
    try {
      const res = await fetch(`/api/admin/contests/${id}/publish`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        fetchContests();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to publish');
      }
    } catch (err) {
      alert('Error publishing contest');
    }
  };

  const archiveContest = async (id) => {
    if (!confirm('Are you sure you want to archive this contest?')) return;
    try {
      const res = await fetch(`/api/admin/contests/${id}/archive`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        fetchContests();
      }
    } catch (err) {
      alert('Error archiving contest');
    }
  };

  const finalizeContest = async (id) => {
    if (!confirm('Are you sure you want to finalize this contest? This will permanently distribute rewards to participants and update the global leaderboard.')) return;
    try {
      const res = await fetch(`/api/admin/contests/${id}/finalize`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        alert('Contest finalized successfully. Rewards have been distributed!');
        fetchContests();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to finalize');
      }
    } catch (err) {
      alert('Error finalizing contest');
    }
  };

  if (loading || !user || user.role !== 'admin') return <div className="p-8">Loading...</div>;

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Manage Contests</h1>
        <div>
          <Link href="/admin/problems" className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-md transition mr-4">
            Global Problem Library
          </Link>
          <Link href="/admin/contests/create" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md transition">
            Create Contest
          </Link>
        </div>
      </div>

      {fetchError && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{fetchError}</div>}

      <div className="bg-white shadow rounded-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contests.map((contest) => (
              <tr key={contest._id} className={contest.archived ? 'opacity-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{contest.title}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {contest.archived ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Archived</span>
                  ) : contest.published ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Published ({contest.status}) {contest.isFinalized && '✓ Finalized'}</span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Draft</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                  {new Date(contest.startTime).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href={`/admin/contests/${contest._id}/edit`} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit Details & Problems</Link>
                  {!contest.published && !contest.archived && (
                    <button onClick={() => publishContest(contest._id)} className="text-emerald-600 hover:text-emerald-900 mr-4">Publish</button>
                  )}
                  {contest.published && contest.status === 'ENDED' && !contest.isFinalized && !contest.archived && (
                    <button onClick={() => finalizeContest(contest._id)} className="text-blue-600 hover:text-blue-900 mr-4 font-bold">Finalize</button>
                  )}
                  {!contest.archived && (
                    <button onClick={() => archiveContest(contest._id)} className="text-red-600 hover:text-red-900">Archive</button>
                  )}
                </td>
              </tr>
            ))}
            {contests.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No contests found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
