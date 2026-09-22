'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import Link from 'next/link';

export default function CreateContest() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    startTime: '',
    duration: 120
  });
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateSlug = () => {
    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setFormData(prev => ({ ...prev, slug }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Calculate endTime based on startTime and duration
      const start = new Date(formData.startTime);
      if (isNaN(start.getTime())) throw new Error('Invalid start time');
      
      const end = new Date(start.getTime() + formData.duration * 60000);
      
      const payload = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration: parseInt(formData.duration, 10)
      };

      const res = await fetch('/api/admin/contests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create contest');
      
      router.push(`/admin/contests/${data._id}/edit`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user || user.role !== 'admin') return <div className="p-8">Loading...</div>;

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Create New Contest</h1>
        <Link href="/admin/contests" className="text-gray-600 hover:text-gray-900 transition">
          &larr; Back to Contests
        </Link>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-6">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
        
        <div className="mb-6">
          <label className="block text-gray-700 font-bold mb-2">Title</label>
          <input 
            type="text" 
            name="title"
            value={formData.title} 
            onChange={handleChange}
            className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-indigo-500"
            required
            placeholder="e.g. Weekly Contest 1"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-bold mb-2">Slug</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              name="slug"
              value={formData.slug} 
              onChange={handleChange}
              className="flex-1 border border-gray-300 p-3 rounded focus:outline-none focus:border-indigo-500"
              required
              placeholder="e.g. weekly-contest-1"
            />
            <button 
              type="button"
              onClick={generateSlug}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition"
            >
              Generate from Title
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-bold mb-2">Description</label>
          <textarea 
            name="description"
            value={formData.description} 
            onChange={handleChange}
            className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-indigo-500 h-32"
            required
            placeholder="Contest description..."
          />
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-gray-700 font-bold mb-2">Start Time</label>
            <input 
              type="datetime-local" 
              name="startTime"
              value={formData.startTime} 
              onChange={handleChange}
              className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-bold mb-2">Duration (minutes)</label>
            <input 
              type="number" 
              name="duration"
              value={formData.duration} 
              onChange={handleChange}
              className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:border-indigo-500"
              required
              min="1"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded transition disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Contest'}
          </button>
        </div>
      </form>
    </div>
  );
}
