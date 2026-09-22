'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';

export default function ContestDetails() {
  const { slug } = useParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [contest, setContest] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user) {
      fetchContestData();
    }
  }, [slug, user, loading, router]);

  const fetchContestData = async () => {
    try {
      const res = await fetch(`/api/contests/${slug}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch contest details');
      const data = await res.json();
      setContest(data);
      
      // Fetch participant status
      const partRes = await fetch(`/api/contests/${data._id}/participant`, { credentials: 'include' });
      if (partRes.ok) {
        const partData = await partRes.json();
        setParticipant(partData);
        setIsJoined(true);
      }
      
      // Fetch ranking
      fetchRanking(data._id);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchRanking = async (contestId) => {
    try {
      const rankRes = await fetch(`/api/contests/${contestId}/ranking`, { credentials: 'include' });
      if (rankRes.ok) {
        const rankData = await rankRes.json();
        setRanking(rankData);
      }
    } catch (err) {
      console.error('Failed to fetch ranking', err);
    }
  };

  const joinContest = async () => {
    if (!contest) return;
    try {
      const res = await fetch(`/api/contests/${contest._id}/join`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to join contest');
      }
      const data = await res.json();
      setParticipant(data);
      setIsJoined(true);
      fetchRanking(contest._id);
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    if (!contest) return;
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(contest.startTime).getTime();
      const end = new Date(contest.endTime).getTime();
      
      if (now < start) {
        const diff = start - now;
        setTimeLeft(`Starts in: ${formatTime(diff)}`);
      } else if (now < end) {
        const diff = end - now;
        setTimeLeft(`Time remaining: ${formatTime(diff)}`);
        // Refresh ranking periodically when running
        if (Math.floor(diff / 1000) % 30 === 0) {
          fetchRanking(contest._id);
        }
      } else {
        setTimeLeft('Contest has ended');
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [contest]);

  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading || (!contest && !error)) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  if (error) return <div className="p-8 text-red-600 bg-red-100 rounded text-center m-8">{error}</div>;

  const canSeeProblems = contest.status === 'ENDED' || (contest.status === 'RUNNING' && isJoined);

  return (
    <div className="container mx-auto p-8">
      <div className="bg-slate-900 text-white rounded-t-lg p-8 shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-emerald-400">{contest.title}</h1>
            <p className="text-gray-300">{contest.description}</p>
          </div>
          <div className="mt-4 md:mt-0 text-center md:text-right bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className={`text-xl font-bold mb-2 ${contest.status === 'RUNNING' ? 'text-green-400' : 'text-yellow-400'}`}>
              {timeLeft}
            </div>
            {!isJoined && contest.status === 'RUNNING' && (
              <button 
                onClick={joinContest}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-md font-bold transition w-full"
              >
                Join Contest
              </button>
            )}
            {!isJoined && contest.status === 'UPCOMING' && (
              <button 
                onClick={joinContest}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-md font-bold transition w-full"
              >
                Register Now
              </button>
            )}
            {isJoined && (
              <div className="text-sm text-emerald-400 font-semibold border-t border-slate-700 pt-2 mt-2">
                Registered! Your Score: {participant.score} | Penalty: {participant.penalty}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mt-8">
        {/* Problems List */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-4 text-slate-800">Problems</h2>
          {canSeeProblems ? (
            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Problem</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Points</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contest.problems.map((p, index) => (
                    <tr key={p.problem._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{String.fromCharCode(65 + index)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        <Link href={`/contests/${contest.slug}/problems/${p.problem.slug}`} className="text-indigo-600 hover:text-indigo-800">
                          {p.problem.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center font-semibold text-emerald-600">
                        {p.points}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link 
                          href={`/contests/${contest.slug}/problems/${p.problem.slug}`}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-xs transition"
                        >
                          Solve
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {contest.problems.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No problems have been added to this contest yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-gray-100 p-8 text-center rounded-lg border border-gray-200">
              <p className="text-gray-600">
                {contest.status === 'UPCOMING' 
                  ? 'Problems will be visible once the contest starts.' 
                  : 'You must join the contest to see the problems.'}
              </p>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="w-full md:w-96">
          <h2 className="text-2xl font-bold mb-4 text-slate-800">Leaderboard</h2>
          <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">Rank</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">User</th>
                  <th className="px-4 py-2 text-center text-xs font-medium uppercase">Solved</th>
                  <th className="px-4 py-2 text-center text-xs font-medium uppercase">Wrong (-5)</th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase">Penalty Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ranking.map((rank) => (
                  <tr key={rank.username} className={user?.username === rank.username ? 'bg-indigo-50' : ''}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-gray-900">{rank.rank}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-indigo-600 truncate max-w-[120px]" title={rank.username}>{rank.username}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center font-semibold">{rank.solvedCount}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-red-500 text-center">{rank.wrongSubmissionCount}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-orange-500 text-right">{rank.penalty}</td>
                  </tr>
                ))}
                {ranking.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-gray-500 text-sm">No participants yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
