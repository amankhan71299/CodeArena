'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

const DSA_TOPICS = [
  'ARRAY', 'BINARY_SEARCH', 'STRING', 'LINKED_LIST', 'RECURSION', 
  'BIT_MANIPULATION', 'STACK_QUEUE', 'SLIDING_WINDOW_TWO_POINTER', 
  'GREEDY', 'BINARY_TREE', 'BINARY_SEARCH_TREE', 'GRAPH', 
  'DYNAMIC_PROGRAMMING', 'HEAPS', 'TRIES'
];

export default function ProblemsPage() {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [solvedProblemIds, setSolvedProblemIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Accordion state
  const [expandedTopics, setExpandedTopics] = useState(new Set([DSA_TOPICS[0]]));

  // Filters
  const [difficulty, setDifficulty] = useState('');
  const [search, setSearch] = useState('');

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (difficulty) queryParams.append('difficulty', difficulty);
      if (search) queryParams.append('search', search);

      const res = await fetch(`/api/problems?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch problems');
      
      const data = await res.json();
      setProblems(data);

      if (user) {
        const solvedRes = await fetch('/api/submissions/me/solved', { credentials: 'include' });
        if (solvedRes.ok) {
          const solvedData = await solvedRes.json();
          setSolvedProblemIds(new Set(solvedData));
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, [difficulty, search, user]);

  const toggleTopic = (topic) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topic)) {
      newExpanded.delete(topic);
    } else {
      newExpanded.add(topic);
    }
    setExpandedTopics(newExpanded);
  };

  // Group problems
  const groupedProblems = DSA_TOPICS.reduce((acc, topic) => {
    acc[topic] = problems.filter(p => p.topics.includes(topic));
    return acc;
  }, {});

  // For problems that have no matched topic or a topic not in the standard list
  const otherProblems = problems.filter(p => !p.topics.some(t => DSA_TOPICS.includes(t)));
  if (otherProblems.length > 0) {
    groupedProblems['OTHER'] = otherProblems;
    if (!DSA_TOPICS.includes('OTHER')) DSA_TOPICS.push('OTHER');
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8 text-white">Coding Problems</h1>
      
      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8 bg-slate-900 p-4 rounded-lg border border-slate-800">
        <div className="flex-grow">
          <input 
            type="text" 
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <select 
            value={difficulty} 
            onChange={(e) => setDifficulty(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading problems...</div>
      ) : problems.length === 0 ? (
        <div className="text-center py-10 text-gray-400 bg-slate-900 rounded-lg border border-slate-800">
          No problems found.
        </div>
      ) : (
        <div className="space-y-4">
          {DSA_TOPICS.map((topic) => {
            const topicProblems = groupedProblems[topic];
            if (!topicProblems || topicProblems.length === 0) return null;

            const isExpanded = expandedTopics.has(topic);
            const topicSolvedCount = topicProblems.filter(p => solvedProblemIds.has(p._id)).length;
            const topicTotal = topicProblems.length;

            return (
              <div key={topic} className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden shadow-sm">
                {/* Accordion Header */}
                <div 
                  onClick={() => toggleTopic(topic)}
                  className="w-full flex items-center justify-between p-4 bg-slate-800/80 hover:bg-slate-700/80 cursor-pointer transition select-none"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-emerald-500 font-bold text-xl">{isExpanded ? '−' : '+'}</span>
                    <h2 className="text-xl font-bold text-white capitalize">{topic.replace(/_/g, ' ').toLowerCase()}</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-900 px-3 py-1 rounded-full text-sm font-semibold border border-slate-700">
                      <span className="text-emerald-400">{topicSolvedCount}</span>
                      <span className="text-gray-500 mx-1">/</span>
                      <span className="text-gray-300">{topicTotal}</span>
                    </div>
                  </div>
                </div>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-y border-slate-800 text-gray-400 text-sm">
                          <th className="p-4 font-semibold w-16 text-center">Status</th>
                          <th className="p-4 font-semibold">Title</th>
                          <th className="p-4 font-semibold w-32">Difficulty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topicProblems.map((problem) => {
                          const isSolved = solvedProblemIds.has(problem._id);
                          return (
                            <tr key={problem._id} className="border-b border-slate-800 hover:bg-slate-800/50 transition">
                              <td className="p-4 text-center">
                                {isSolved ? (
                                  <span className="text-emerald-500 text-lg" title="Solved">✓</span>
                                ) : (
                                  <span className="text-gray-600 text-lg">-</span>
                                )}
                              </td>
                              <td className="p-4">
                                <Link href={`/problems/${problem.slug}`} className="text-blue-400 hover:text-blue-300 hover:underline font-medium">
                                  {problem.title}
                                </Link>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  problem.difficulty === 'Easy' ? 'bg-green-900/50 text-green-400' :
                                  problem.difficulty === 'Medium' ? 'bg-yellow-900/50 text-yellow-400' :
                                  'bg-red-900/50 text-red-400'
                                }`}>
                                  {problem.difficulty}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
