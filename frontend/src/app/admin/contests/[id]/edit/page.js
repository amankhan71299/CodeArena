'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../../context/AuthContext';
import Link from 'next/link';

export default function EditContest() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    duration: 120
  });
  
  const [contest, setContest] = useState(null);
  const [allProblems, setAllProblems] = useState([]);
  
  const [newProblemId, setNewProblemId] = useState('');
  const [newProblemOrder, setNewProblemOrder] = useState(1);
  const [newProblemPoints, setNewProblemPoints] = useState(100);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'admin') {
        router.push('/');
      } else {
        fetchContest();
        fetchAllProblems();
      }
    }
  }, [user, loading, router, params.id]);

  const fetchContest = async () => {
    try {
      const res = await fetch(`/api/admin/contests/${params.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch contest details');
      const data = await res.json();
      setContest(data);
      
      const start = new Date(data.startTime);
      const startLocal = new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      
      setFormData({
        title: data.title,
        description: data.description,
        startTime: startLocal,
        duration: data.duration
      });
      setIsFetching(false);
    } catch (err) {
      setError(err.message);
      setIsFetching(false);
    }
  };

  const fetchAllProblems = async () => {
    try {
      const res = await fetch(`/api/admin/problems`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAllProblems(data);
        if (data.length > 0) setNewProblemId(data[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch problems', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateContest = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const start = new Date(formData.startTime);
      if (isNaN(start.getTime())) throw new Error('Invalid start time');
      const end = new Date(start.getTime() + formData.duration * 60000);
      
      const payload = {
        title: formData.title,
        description: formData.description,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration: parseInt(formData.duration, 10)
      };

      const res = await fetch(`/api/admin/contests/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update contest');
      
      alert('Contest details updated successfully');
      fetchContest();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProblem = async (e) => {
    e.preventDefault();
    if (!newProblemId) return alert('Select a problem');
    
    try {
      const payload = {
        problemId: newProblemId,
        order: parseInt(newProblemOrder, 10),
        points: parseInt(newProblemPoints, 10)
      };

      const res = await fetch(`/api/admin/contests/${params.id}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add problem');
      
      setNewProblemOrder(prev => prev + 1);
      fetchContest();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveProblem = async (problemId) => {
    if (!confirm('Remove this problem from the contest?')) return;
    try {
      const res = await fetch(`/api/admin/contests/${params.id}/problems/${problemId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to remove problem');
      fetchContest();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading || isFetching || !user || user.role !== 'admin') return <div className="p-8">Loading...</div>;

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Edit Contest: {contest?.title}</h1>
        <Link href="/admin/contests" className="text-gray-600 hover:text-gray-900 transition">
          &larr; Back to Contests
        </Link>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-6">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Contest Details */}
        <div>
          <form onSubmit={handleUpdateContest} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Contest Details</h2>
            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">Title</label>
              <input 
                type="text" 
                name="title"
                value={formData.title} 
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">Slug</label>
              <input 
                type="text" 
                value={contest?.slug || ''} 
                className="w-full border border-gray-300 p-2 rounded bg-gray-100 text-gray-500"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Slug cannot be changed after creation.</p>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">Description</label>
              <textarea 
                name="description"
                value={formData.description} 
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-indigo-500 h-24"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-700 font-bold mb-2">Start Time</label>
                <input 
                  type="datetime-local" 
                  name="startTime"
                  value={formData.startTime} 
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Duration (mins)</label>
                <input 
                  type="number" 
                  name="duration"
                  value={formData.duration} 
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-indigo-500"
                  required
                  min="1"
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded transition disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Update Details'}
            </button>
          </form>
        </div>

        {/* Right Column: Manage Problems */}
        <div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Add Problem</h2>
            <form onSubmit={handleAddProblem} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Select Problem</label>
                <select
                  value={newProblemId}
                  onChange={(e) => setNewProblemId(e.target.value)}
                  className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-indigo-500"
                  required
                >
                  {allProblems.map(p => (
                    <option key={p._id} value={p._id}>{p.title} ({p.difficulty})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Order Index</label>
                  <input 
                    type="number" 
                    value={newProblemOrder}
                    onChange={(e) => setNewProblemOrder(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Points</label>
                  <input 
                    type="number" 
                    value={newProblemPoints}
                    onChange={(e) => setNewProblemPoints(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded transition"
              >
                Add Problem to Contest
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <h2 className="text-xl font-bold p-6 border-b bg-gray-50">Contest Problems</h2>
            <ul className="divide-y divide-gray-200">
              {contest?.problems.map(p => (
                <li key={p.problem._id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <span className="font-bold text-gray-600 mr-2">#{p.order}</span>
                    <span className="font-medium text-gray-900">{p.problem.title}</span>
                    <span className="ml-3 text-sm text-emerald-600 font-semibold">{p.points} pts</span>
                  </div>
                  <button 
                    onClick={() => handleRemoveProblem(p.problem._id)}
                    className="text-red-500 hover:text-red-700 font-bold text-sm"
                  >
                    Remove
                  </button>
                </li>
              ))}
              {contest?.problems.length === 0 && (
                <li className="p-4 text-gray-500 text-center">No problems added yet.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
