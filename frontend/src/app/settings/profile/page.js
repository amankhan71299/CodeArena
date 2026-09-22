'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function ProfileSettings() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    // Fetch current user details
    fetch(`/api/users/${user.username}`)
      .then(res => res.json())
      .then(data => {
        setBio(data.bio || '');
        setAvatar(data.avatar || '');
      })
      .catch(() => {});
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bio, avatar })
      });
      
      if (!res.ok) throw new Error('Failed to update profile');
      setMessage('Profile updated successfully!');
      
      setTimeout(() => {
        router.push(`/profile/${user.username}`);
      }, 1500);
      
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>
        
        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Avatar URL</label>
              <input 
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {avatar && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Preview:</p>
                  <img src={avatar} alt="Avatar Preview" className="h-16 w-16 rounded-full border object-cover" />
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Tell us about yourself..."
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">{bio.length}/500 characters</p>
            </div>
            
            {message && (
              <div className={`p-3 rounded-md ${message.includes('success') ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                {message}
              </div>
            )}
            
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 text-white font-medium py-2 px-4 rounded-md hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
