'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AIRecommendations from '@/components/ai/AIRecommendations';

export default function Profile() {
  const { user } = useAuth();
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [username]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const pRes = await fetch(`/api/users/${username}`);
      if (!pRes.ok) throw new Error('User not found');
      const pData = await pRes.json();
      setProfile(pData);

      const sRes = await fetch(`/api/users/${username}/submissions`);
      if (sRes.ok) {
        setSubmissions(await sRes.json());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50"><div className="p-8 text-center">Loading...</div></div>;
  if (error) return <div className="min-h-screen bg-gray-50"><div className="p-8 text-center text-red-500">{error}</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white shadow rounded-lg p-6 mb-8 flex items-start space-x-6">
          <div className="flex-shrink-0">
            {profile.avatar ? (
              <img src={profile.avatar} alt="avatar" className="h-24 w-24 rounded-full border border-gray-200 object-cover" />
            ) : (
              <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 text-3xl font-bold">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-3xl font-bold">{profile.username}</h1>
              {user && user.username === profile.username && (
                <Link href="/settings/profile" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition">
                  Edit Profile
                </Link>
              )}
            </div>
            <p className="text-gray-600 mb-4 whitespace-pre-wrap">{profile.bio || 'No bio provided.'}</p>
            <div className="flex space-x-8">
              <div>
                <span className="block text-sm text-gray-500 uppercase tracking-wider">Global Rank</span>
                <span className="block text-2xl font-semibold text-indigo-600">
                  {profile.globalRank !== 'Unranked' ? `#${profile.globalRank}` : 'Unranked'}
                </span>
              </div>
              <div>
                <span className="block text-sm text-gray-500 uppercase tracking-wider">Problems Solved</span>
                <span className="block text-2xl font-semibold text-emerald-600">{profile.problemsSolvedCount}</span>
              </div>
              <div>
                <span className="block text-sm text-gray-500 uppercase tracking-wider">Joined</span>
                <span className="block text-lg font-medium text-gray-700 mt-1">{new Date(profile.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="flex space-x-8 mt-6 pt-4 border-t border-gray-200">
              <div>
                <span className="block text-sm text-gray-500 uppercase tracking-wider">Discussions</span>
                <span className="block text-xl font-semibold text-gray-700">{profile.discussionCount || 0}</span>
              </div>
              <div>
                <span className="block text-sm text-gray-500 uppercase tracking-wider">Replies</span>
                <span className="block text-xl font-semibold text-gray-700">{profile.replyCount || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {user && user.username === profile.username && (
          <AIRecommendations />
        )}

        <h2 className="text-2xl font-bold mb-4">Activity Heatmap (Last 90 Days)</h2>
        <div className="bg-white shadow rounded-lg p-6 mb-8 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const startDate = new Date(today);
              startDate.setDate(today.getDate() - 90);

              const activityMap = {};
              submissions.forEach(sub => {
                const d = new Date(sub.submittedAt);
                const dateStr = d.toISOString().split('T')[0];
                activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
              });

              const grid = [];
              for (let i = 0; i <= 90; i++) {
                const d = new Date(startDate);
                d.setDate(startDate.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                const count = activityMap[dateStr] || 0;
                grid.push({ date: dateStr, count });
              }

              const getColor = (count) => {
                if (count === 0) return 'bg-gray-200';
                if (count === 1) return 'bg-emerald-300';
                if (count === 2) return 'bg-emerald-500';
                if (count >= 3) return 'bg-emerald-700';
              };

              return grid.map((day, idx) => (
                <div
                  key={idx}
                  title={`${day.date}: ${day.count} submissions`}
                  className={`w-4 h-4 rounded-sm ${getColor(day.count)} cursor-help transition-transform hover:scale-110`}
                />
              ));
            })()}
          </div>
          <div className="mt-4 text-xs text-gray-500 flex justify-between min-w-max">
            <span>90 Days Ago</span>
            <div className="flex items-center space-x-1">
              <span>Less</span>
              <div className="w-3 h-3 bg-gray-200 rounded-sm"></div>
              <div className="w-3 h-3 bg-emerald-300 rounded-sm"></div>
              <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
              <div className="w-3 h-3 bg-emerald-700 rounded-sm"></div>
              <span>More</span>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-4">Recent Submissions</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Problem</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {submissions.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-4 text-gray-500">No recent submissions.</td></tr>
              ) : (
                submissions.map((sub) => (
                  <tr key={sub._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                      <Link href={`/problems/${sub.problem?.slug || '#'}`}>{sub.problem?.title || 'Unknown Problem'}</Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={`px-2 py-1 rounded text-xs ${
                        sub.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                        sub.status.includes('ERROR') || sub.status.includes('EXCEEDED') ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sub.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">{sub.language}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(sub.submittedAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
