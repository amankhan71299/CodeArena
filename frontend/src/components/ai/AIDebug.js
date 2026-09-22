import React, { useState } from 'react';

export default function AIDebug({ problemId, language, sourceCode, status, errorMessage, output, onClose }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleDebug = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ problemId, language, sourceCode, submissionStatus: status, errorMessage, output })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate debug info');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e2e] border border-gray-700 p-6 rounded-xl w-full max-w-2xl text-gray-200 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          ✕
        </button>
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-red-400 to-rose-500 bg-clip-text text-transparent">AI Debugger</h2>
        
        {!result && !loading && !error && (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-6">Your submission failed with status <span className="font-mono text-red-400">{status}</span>.<br/>Let the AI analyze the error and your code to find the bug.</p>
            <button onClick={handleDebug} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
              Analyze Failure
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-400 mb-4"></div>
            <p className="text-red-300 animate-pulse">Debugging your code...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-800 rounded text-red-300 my-4">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Why it failed</h3>
              <p className="bg-[#2a2a3c] p-3 rounded text-red-200 border-l-4 border-red-500">{result.whyFailed}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Likely Bug Location</h3>
              <p className="bg-[#2a2a3c] p-3 rounded font-mono text-orange-300">{result.likelyBug}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Edge Case to Consider</h3>
              <p className="bg-[#2a2a3c] p-3 rounded">{result.edgeCase}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Suggested Direction</h3>
              <p className="bg-[#2a2a3c] p-3 rounded text-green-300 border-l-4 border-green-500">{result.suggestedDirection}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
