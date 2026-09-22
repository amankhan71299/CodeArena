import React, { useState } from 'react';

export default function AIHint({ problemId, language, sourceCode, onClose }) {
  const [loading, setLoading] = useState(false);
  const [hints, setHints] = useState({});
  const [error, setError] = useState(null);
  const [activeHintLevel, setActiveHintLevel] = useState(1);

  const requestHint = async (level) => {
    if (hints[level]) return; // Already have this hint
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/hint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ problemId, language, sourceCode, hintLevel: level })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate hint');
      
      setHints(prev => ({ ...prev, [level]: data.hint }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    1: 'Conceptual Hint',
    2: 'Approach Hint',
    3: 'Detailed Guidance'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e2e] border border-gray-700 p-6 rounded-xl w-full max-w-2xl text-gray-200 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          ✕
        </button>
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">AI Progressive Hints</h2>
        
        <p className="text-gray-400 mb-6 text-sm">Need help? Request hints progressively to avoid spoilers.</p>

        <div className="flex border-b border-gray-700 mb-4">
          {[1, 2, 3].map(level => (
            <button
              key={level}
              onClick={() => {
                setActiveHintLevel(level);
                if (!hints[level] && level === 1) requestHint(1);
              }}
              className={`py-2 px-4 font-semibold text-sm transition-colors ${
                activeHintLevel === level 
                  ? 'border-b-2 border-orange-500 text-orange-400' 
                  : 'text-gray-500 hover:text-gray-300'
              } ${level > 1 && !hints[level - 1] ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={level > 1 && !hints[level - 1]}
            >
              Hint {level}
            </button>
          ))}
        </div>

        <div className="min-h-[150px] flex flex-col justify-center">
          {loading && (
            <div className="flex flex-col items-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400 mb-4"></div>
              <p className="text-orange-300 animate-pulse text-sm">Generating {titles[activeHintLevel]}...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-900/30 border border-red-800 rounded text-red-300 my-4 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && !hints[activeHintLevel] && (
            <div className="text-center">
              <button 
                onClick={() => requestHint(activeHintLevel)}
                className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg font-semibold transition-colors text-sm"
              >
                Reveal {titles[activeHintLevel]}
              </button>
            </div>
          )}

          {!loading && !error && hints[activeHintLevel] && (
            <div className="bg-[#2a2a3c] p-4 rounded border-l-4 border-orange-500">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{titles[activeHintLevel]}</h3>
              <p className="whitespace-pre-wrap text-gray-200">{hints[activeHintLevel]}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
