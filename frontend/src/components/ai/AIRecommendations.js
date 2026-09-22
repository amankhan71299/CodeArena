import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AIRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasRequested, setHasRequested] = useState(false);

  useEffect(() => {
    // Check if we already have cached recommendations from this session
    const cached = sessionStorage.getItem('ai_recommendations_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.quotaExceeded) {
          setError('AI usage limit reached. Please try again later.');
        } else {
          setRecommendations(parsed);
        }
        setHasRequested(true);
      } catch (e) {}
    }
  }, []);

  const fetchRecommendations = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setHasRequested(true);
    
    try {
      const res = await fetch('/api/ai/recommendations');
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 429 || data.code === 'AI_QUOTA_EXCEEDED') {
          sessionStorage.setItem('ai_recommendations_cache', JSON.stringify({ quotaExceeded: true }));
        }
        throw new Error(data.error || 'Failed to fetch recommendations');
      }
      
      setRecommendations(data);
      sessionStorage.setItem('ai_recommendations_cache', JSON.stringify(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!hasRequested && !loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6 mb-8 border border-indigo-100 flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          <span className="text-xl">✨</span> AI Recommended Next Steps
        </h2>
        <p className="text-gray-500 mb-6 max-w-md">
          Not sure what to solve next? Get AI-powered problem recommendations based on your unique solving history and progress.
        </p>
        <button 
          onClick={fetchRecommendations}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md shadow-sm transition flex items-center gap-2"
        >
          <span>🧠</span> Generate Recommendations
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6 mb-8 border border-indigo-100">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          <span className="text-xl">✨</span> AI Recommended Next Steps
        </h2>
        <div className="flex justify-center py-6">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 rounded-full border-2 border-t-indigo-600 animate-spin mb-3"></div>
            <p className="text-gray-400">Curating problems specifically for you...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6 mb-8 border border-red-100">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-red-600">
          <span className="text-xl">⚠️</span> AI Recommendation Failed
        </h2>
        <p className="text-red-500">{error}</p>
        {error !== 'AI usage limit reached. Please try again later.' && (
          <button 
            onClick={fetchRecommendations}
            className="mt-4 text-sm bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded transition"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null; 
  }

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'Easy': return 'text-green-600 bg-green-50';
      case 'Medium': return 'text-yellow-600 bg-yellow-50';
      case 'Hard': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-8 border border-indigo-100">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
        <span className="text-xl">✨</span> AI Recommended Next Steps
      </h2>
      <p className="text-sm text-gray-500 mb-6">Based on your past solved problems, here is what you should tackle next:</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map(prob => (
          <Link key={prob._id} href={`/problems/${prob.slug}`} className="block border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition group">
            <h3 className="font-semibold text-lg text-gray-900 group-hover:text-indigo-600 truncate">{prob.title}</h3>
            <div className="flex items-center gap-2 mt-2 mb-3">
              <span className={`text-xs px-2 py-1 rounded font-medium ${getDifficultyColor(prob.difficulty)}`}>
                {prob.difficulty}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {prob.topics && prob.topics.slice(0, 3).map(topic => (
                <span key={topic} className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                  {topic}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
