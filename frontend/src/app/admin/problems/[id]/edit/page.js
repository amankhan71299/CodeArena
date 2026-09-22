'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ProblemForm from '../../../../../components/ProblemForm';

export default function EditProblemPage() {
  const params = useParams();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [editorialFormData, setEditorialFormData] = useState({
    explanation: '',
    approach: '',
    algorithm: '',
    complexity: '',
    codeExplanation: ''
  });

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await fetch(`/api/admin/problems/${params.id}`);
        if (!res.ok) throw new Error('Failed to fetch problem for editing');
        const data = await res.json();
        setProblem(data);
        if (data.editorial) {
          setEditorialFormData({
            explanation: data.editorial.explanation || '',
            approach: data.editorial.approach || '',
            algorithm: data.editorial.algorithm || '',
            complexity: data.editorial.complexity || '',
            codeExplanation: data.editorial.codeExplanation || ''
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (params.id) fetchProblem();
  }, [params.id]);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading problem data...</div>;
  if (error) return <div className="max-w-4xl mx-auto mt-10 bg-red-900/50 text-red-200 p-4 rounded">{error}</div>;
  if (!problem) return null;

  const handleSaveEditorial = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/problems/${problem._id}/editorial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editorialFormData)
      });
      if (!res.ok) throw new Error('Failed to save editorial');
      alert('Editorial saved successfully');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteEditorial = async () => {
    if (!confirm('Are you sure you want to delete the editorial?')) return;
    try {
      const res = await fetch(`/api/admin/problems/${problem._id}/editorial`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete editorial');
      setEditorialFormData({ explanation: '', approach: '', algorithm: '', complexity: '', codeExplanation: '' });
      alert('Editorial deleted successfully');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGenerateAIEditorial = async () => {
    if (!confirm('This will overwrite your current draft. Continue?')) return;
    setAiLoading(true);
    try {
      const res = await fetch(`/api/ai/admin/problems/${problem._id}/editorial/generate`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate AI editorial');
      
      setEditorialFormData({
        explanation: data.explanation || '',
        approach: data.approach || '',
        algorithm: data.algorithm || '',
        complexity: data.complexity || '',
        codeExplanation: data.codeExplanation || ''
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Edit Problem: {problem.title}</h1>
      <ProblemForm initialData={problem} isEdit={true} />

      <div className="mt-12 bg-slate-900 border border-slate-700 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Manage Editorial</h2>
        <form onSubmit={handleSaveEditorial} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Explanation</label>
            <textarea
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-md p-3"
              rows={4}
              value={editorialFormData.explanation}
              onChange={(e) => setEditorialFormData({ ...editorialFormData, explanation: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Approach</label>
            <textarea
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-md p-3"
              rows={4}
              value={editorialFormData.approach}
              onChange={(e) => setEditorialFormData({ ...editorialFormData, approach: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Algorithm</label>
            <textarea
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-md p-3"
              rows={4}
              value={editorialFormData.algorithm}
              onChange={(e) => setEditorialFormData({ ...editorialFormData, algorithm: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Complexity</label>
            <textarea
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-md p-3"
              rows={3}
              value={editorialFormData.complexity}
              onChange={(e) => setEditorialFormData({ ...editorialFormData, complexity: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Code Explanation</label>
            <textarea
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-md p-3"
              rows={4}
              value={editorialFormData.codeExplanation}
              onChange={(e) => setEditorialFormData({ ...editorialFormData, codeExplanation: e.target.value })}
            />
          </div>
          <div className="flex justify-between items-center mt-6">
            <button
              type="button"
              onClick={handleGenerateAIEditorial}
              disabled={aiLoading}
              className="px-4 py-2 bg-purple-600/30 text-purple-300 border border-purple-500/50 rounded hover:bg-purple-600/50 disabled:opacity-50"
            >
              {aiLoading ? 'Generating AI Draft...' : '✨ Generate AI Editorial'}
            </button>
            
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handleDeleteEditorial}
                className="px-4 py-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600/40"
              >
                Delete Editorial
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500 font-bold"
              >
                Save Editorial
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
