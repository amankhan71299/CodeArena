'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';

export default function DiscussionTab({ problemId }) {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [activeDiscussion, setActiveDiscussion] = useState(null); // When viewing a single thread

  useEffect(() => {
    fetchDiscussions();
  }, [problemId]);

  const fetchDiscussions = async () => {
    try {
      const res = await fetch(`/api/discussions/problem/${problemId}`);
      if (!res.ok) throw new Error('Failed to load discussions');
      const data = await res.json();
      setDiscussions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiscussion = async (e) => {
    e.preventDefault();
    if (!user) return alert('Please log in');
    try {
      const res = await fetch(`/api/discussions/problem/${problemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, content: newContent })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDiscussions([data, ...discussions]);
      setCreating(false);
      setNewTitle('');
      setNewContent('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLike = async (discussionId) => {
    if (!user) return alert('Please log in');
    try {
      const res = await fetch(`/api/discussions/${discussionId}/like`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setDiscussions(discussions.map(d => d._id === discussionId ? { ...d, likes: data.likes } : d));
        if (activeDiscussion && activeDiscussion.discussion._id === discussionId) {
          setActiveDiscussion({ ...activeDiscussion, discussion: { ...activeDiscussion.discussion, likes: data.likes } });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReport = async (targetId, type) => {
    if (!user) return alert('Please log in');
    const reason = prompt('Reason for reporting:');
    if (!reason) return;
    try {
      const endpoint = type === 'discussion' ? `/api/discussions/${targetId}/report` : `/api/discussions/replies/${targetId}/report`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Reported successfully');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id, type) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    try {
      const endpoint = type === 'discussion' ? `/api/discussions/${id}` : `/api/discussions/replies/${id}`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      if (type === 'discussion') {
        setDiscussions(discussions.filter(d => d._id !== id));
        setActiveDiscussion(null);
      } else {
        setActiveDiscussion({
          ...activeDiscussion,
          replies: activeDiscussion.replies.filter(r => r._id !== id)
        });
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const openDiscussion = async (id) => {
    try {
      const res = await fetch(`/api/discussions/${id}`);
      if (!res.ok) throw new Error('Failed to load thread');
      const data = await res.json();
      setActiveDiscussion(data);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!user) return alert('Please log in');
    try {
      const res = await fetch(`/api/discussions/${activeDiscussion.discussion._id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActiveDiscussion({
        ...activeDiscussion,
        replies: [...activeDiscussion.replies, data]
      });
      setNewContent('');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-gray-400">Loading discussions...</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  if (activeDiscussion) {
    const { discussion, replies } = activeDiscussion;
    return (
      <div className="text-gray-300">
        <button onClick={() => setActiveDiscussion(null)} className="text-emerald-400 hover:underline mb-4 text-sm">&larr; Back to discussions</button>
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 mb-6">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-xl font-bold text-white">{discussion.title}</h2>
            <div className="flex gap-2">
              <button onClick={() => handleLike(discussion._id)} className="text-xs bg-slate-800 px-2 py-1 rounded hover:bg-slate-700">
                {discussion.likes.includes(user?.id) ? '♥' : '♡'} {discussion.likes.length}
              </button>
              {user && user.id === discussion.user._id && (
                <button onClick={() => handleDelete(discussion._id, 'discussion')} className="text-xs text-red-400 hover:underline">Delete</button>
              )}
              {user && user.id !== discussion.user._id && (
                <button onClick={() => handleReport(discussion._id, 'discussion')} className="text-xs text-yellow-400 hover:underline">Report</button>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">By <Link href={`/profile/${discussion.user.username}`} className="text-emerald-400 hover:underline">{discussion.user.username}</Link> on {new Date(discussion.createdAt).toLocaleString()}</p>
          <div className="whitespace-pre-wrap">{discussion.content}</div>
        </div>

        <h3 className="text-lg font-bold text-white mb-4">Replies ({replies.length})</h3>
        <div className="space-y-4 mb-6">
          {replies.map(reply => (
            <div key={reply._id} className="bg-slate-900 p-4 rounded-lg border border-slate-800">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm text-gray-500">
                  <Link href={`/profile/${reply.user.username}`} className="text-emerald-400 hover:underline">{reply.user.username}</Link> on {new Date(reply.createdAt).toLocaleString()}
                </p>
                <div className="flex gap-2">
                  {user && user.id === reply.user._id && (
                    <button onClick={() => handleDelete(reply._id, 'reply')} className="text-xs text-red-400 hover:underline">Delete</button>
                  )}
                  {user && user.id !== reply.user._id && (
                    <button onClick={() => handleReport(reply._id, 'reply')} className="text-xs text-yellow-400 hover:underline">Report</button>
                  )}
                </div>
              </div>
              <div className="whitespace-pre-wrap">{reply.content}</div>
            </div>
          ))}
        </div>

        {user ? (
          <form onSubmit={handleReply} className="mt-4">
            <textarea
              className="w-full bg-slate-950 border border-slate-700 text-white p-3 rounded mb-2"
              rows="3"
              placeholder="Write a reply..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              required
            ></textarea>
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-bold">Reply</button>
          </form>
        ) : (
          <p className="text-sm text-gray-500">Please log in to reply.</p>
        )}
      </div>
    );
  }

  return (
    <div className="text-gray-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Discussions</h2>
        {user && !creating && (
          <button onClick={() => setCreating(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-bold">
            New Discussion
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={handleCreateDiscussion} className="bg-slate-950 p-4 rounded-lg border border-slate-800 mb-6">
          <input
            type="text"
            className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded mb-3"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            minLength={3}
            maxLength={100}
          />
          <textarea
            className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded mb-3"
            rows="5"
            placeholder="Content"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            required
            maxLength={5000}
          ></textarea>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-bold">Post</button>
          </div>
        </form>
      )}

      {discussions.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No discussions yet. Be the first to start one!</p>
      ) : (
        <div className="space-y-4">
          {discussions.map(d => (
            <div key={d._id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex justify-between items-center cursor-pointer hover:border-slate-600 transition" onClick={() => openDiscussion(d._id)}>
              <div>
                <h3 className="text-white font-bold">{d.title}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  By {d.user.username} • {new Date(d.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-4 text-sm text-gray-400">
                <span>♥ {d.likes.length}</span>
                <span>💬 {d.replyCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
