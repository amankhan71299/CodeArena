'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Leaderboard() {
  const [data, setData] = useState({ users: [], page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard(1);
  }, []);

  const fetchLeaderboard = async (page) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/leaderboard?page=${page}&limit=50`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Global Leaderboard</h1>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Solved</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="4" className="text-center py-8">Loading...</td></tr>
              ) : data.users.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-8 text-gray-500">No users found.</td></tr>
              ) : (
                data.users.map((user) => (
                  <tr key={user.username} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{user.rank}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 hover:text-indigo-900">
                      <Link href={`/profile/${user.username}`}>
                        <div className="flex items-center">
                          {user.avatar ? (
                            <img src={user.avatar} alt="avatar" className="h-8 w-8 rounded-full mr-3" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 mr-3 font-bold">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {user.username}
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-semibold">{user.globalScore}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{user.problemsSolvedCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data.totalPages > 1 && (
          <div className="mt-6 flex justify-center space-x-4">
            <button
              disabled={data.page === 1 || loading}
              onClick={() => fetchLeaderboard(data.page - 1)}
              className="px-4 py-2 border rounded-md bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="flex items-center">Page {data.page} of {data.totalPages}</span>
            <button
              disabled={data.page === data.totalPages || loading}
              onClick={() => fetchLeaderboard(data.page + 1)}
              className="px-4 py-2 border rounded-md bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
