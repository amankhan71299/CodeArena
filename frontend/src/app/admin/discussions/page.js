'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';

export default function AdminDiscussionsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingContent, setViewingContent] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchReports();
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/admin/reports');
      if (!res.ok) throw new Error('Failed to fetch reports');
      const data = await res.json();
      setReports(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id, action) => {
    if (action === 'delete' && !confirm('Are you sure you want to delete the reported content?')) return;
    
    try {
      const res = await fetch(`/api/admin/reports/${id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (!res.ok) throw new Error('Failed to resolve report');
      setReports(reports.filter(r => r._id !== id));
      if (action === 'delete') {
        alert('Content deleted and report resolved.');
      } else {
        alert('Report dismissed.');
      }
      setViewingContent(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const viewContent = async (report) => {
    try {
      const res = await fetch(`/api/admin/reports/content?targetModel=${report.targetModel}&targetId=${report.targetId}`);
      if (!res.ok) throw new Error('Content not found or already deleted');
      const data = await res.json();
      setViewingContent({ report, content: data });
    } catch (err) {
      alert(err.message);
    }
  };

  if (!user || user.role !== 'admin') {
    return <div className="text-center py-20 text-gray-400">Access Denied</div>;
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading reports...</div>;
  if (error) return <div className="text-red-400 text-center py-20">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Moderation Queue</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-800">Pending Reports ({reports.length})</h2>
          {reports.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow text-gray-500 text-center">
              No pending reports!
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map(report => (
                <div key={report._id} className="bg-white p-4 rounded-lg shadow flex flex-col border-l-4 border-yellow-500">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold text-gray-700">{report.targetModel}</span>
                    <span className="text-xs text-gray-400">{new Date(report.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2"><span className="font-semibold text-gray-800">Reason:</span> {report.reason}</p>
                  <p className="text-xs text-gray-500 mb-4">Reported by: {report.reporter?.username || 'Unknown'}</p>
                  <div className="flex gap-2 mt-auto">
                    <button 
                      onClick={() => viewContent(report)}
                      className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-sm hover:bg-indigo-200"
                    >
                      View Content
                    </button>
                    <button 
                      onClick={() => handleResolve(report._id, 'dismiss')}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200"
                    >
                      Dismiss
                    </button>
                    <button 
                      onClick={() => handleResolve(report._id, 'delete')}
                      className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200"
                    >
                      Delete Content
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-800">Content Viewer</h2>
          {viewingContent ? (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center border-b pb-2 mb-4">
                <h3 className="font-bold text-lg text-gray-800">{viewingContent.report.targetModel} Details</h3>
                <span className="text-xs text-gray-500">ID: {viewingContent.report.targetId}</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                <strong>Author:</strong> {viewingContent.content.user?.username || 'Unknown'}
              </p>
              {viewingContent.content.title && (
                <p className="text-md font-bold text-gray-900 mb-2">{viewingContent.content.title}</p>
              )}
              <div className="bg-gray-50 p-4 rounded border text-sm text-gray-800 whitespace-pre-wrap">
                {viewingContent.content.content}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-lg border border-dashed border-gray-300 text-gray-400 text-center h-48 flex items-center justify-center">
              Select a report to view its content
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
