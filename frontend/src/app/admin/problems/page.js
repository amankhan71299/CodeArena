'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/problems');
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          throw new Error('Unauthorized. Admin access required.');
        }
        throw new Error('Failed to fetch problems');
      }
      const data = await res.json();
      setProblems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  const handleArchive = async (id, isArchived) => {
    if (!confirm(isArchived ? 'Are you sure you want to restore this problem?' : 'Are you sure you want to archive this problem?')) return;
    
    try {
      // For restore we'd update `archived: false`, for archive `archived: true`
      // But the spec says DELETE /api/admin/problems/:id archives it.
      // So if it's already archived, we can't unarchive with DELETE, we'd need PUT.
      // Let's use PUT to toggle the archived state for simplicity and full control.
      const res = await fetch(`/api/admin/problems/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !isArchived })
      });
      
      if (!res.ok) throw new Error('Failed to update problem status');
      fetchProblems();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to permanently remove this problem? This action cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/admin/problems/${id}/permanent`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete problem');
      }
      fetchProblems();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white">Manage Problems</h1>
        <Link 
          href="/admin/problems/create" 
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded transition"
        >
          + Create Problem
        </Link>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-gray-400">
              <th className="p-4 font-semibold">Title</th>
              <th className="p-4 font-semibold">Difficulty</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {problems.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-500">No problems found.</td>
              </tr>
            ) : (
              problems.map((problem) => (
                <tr key={problem._id} className="border-b border-slate-800 hover:bg-slate-800/50 transition">
                  <td className="p-4 font-medium text-white">{problem.title}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      problem.difficulty === 'Easy' ? 'bg-green-900/50 text-green-400' :
                      problem.difficulty === 'Medium' ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-red-900/50 text-red-400'
                    }`}>
                      {problem.difficulty}
                    </span>
                  </td>
                  <td className="p-4">
                    {problem.archived ? (
                      <span className="bg-gray-800 text-gray-400 px-2 py-1 rounded text-xs">Archived</span>
                    ) : (
                      <span className="bg-emerald-900/50 text-emerald-400 px-2 py-1 rounded text-xs">Published</span>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-3">
                    <Link href={`/admin/problems/${problem._id}/edit`} className="text-blue-400 hover:text-blue-300">
                      Edit
                    </Link>
                    <button 
                      onClick={() => handleArchive(problem._id, problem.archived)}
                      className={problem.archived ? "text-emerald-400 hover:text-emerald-300" : "text-orange-400 hover:text-orange-300"}
                    >
                      {problem.archived ? "Restore" : "Archive"}
                    </button>
                    <button 
                      onClick={() => handleDelete(problem._id)}
                      className="text-red-500 hover:text-red-400 font-semibold"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
