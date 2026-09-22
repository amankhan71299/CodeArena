'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import CodeEditor from '../../../components/CodeEditor';
import DiscussionTab from '../../../components/DiscussionTab';
import EditorialTab from '../../../components/EditorialTab';
import AIChat from '@/components/ai/AIChat';
import AIHint from '@/components/ai/AIHint';
import AIDebug from '@/components/ai/AIDebug';
import { getLanguageTemplate, LANGUAGE_TEMPLATES } from '../../../utils/languageTemplates';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import { Panel, Group, Separator } from 'react-resizable-panels';
import ReactMarkdown from 'react-markdown';

export default function ProblemDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Editor State
  const [language, setLanguage] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runResults, setRunResults] = useState(null);
  
  // Socket State
  const { socket } = useSocket();
  const [liveSubmission, setLiveSubmission] = useState(null);
  
  // AI States
  const [showAIChat, setShowAIChat] = useState(false);
  const [showAIHint, setShowAIHint] = useState(false);
  const [showAIDebug, setShowAIDebug] = useState(false);
  const [debugData, setDebugData] = useState(null);
  
  // Submissions State
  const [submissions, setSubmissions] = useState([]);
  const [activeTab, setActiveTab] = useState('problem'); // 'problem', 'submissions', 'discussion', 'editorial'

  // Fetch Problem Data
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await fetch(`/api/problems/${params.slug}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Problem not found');
          throw new Error('Failed to fetch problem details');
        }
        const data = await res.json();
        setProblem(data);
        
        // Initialize language
        if (data.supportedLanguages && data.supportedLanguages.length > 0) {
          const initialLang = data.supportedLanguages[0];
          setLanguage(initialLang);
          setCode(getLanguageTemplate(initialLang, data.functionSignature));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (params.slug) fetchProblem();
  }, [params.slug]);

  // Fetch Submissions Data
  const fetchSubmissions = async () => {
    if (!user || !problem) return;
    try {
      const res = await fetch(`/api/submissions/problem/${problem._id}`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (err) {
      console.error('Failed to fetch submissions', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'submissions' && problem) {
      fetchSubmissions();
    }
  }, [activeTab, problem, user]);

  // Socket Listeners
  useEffect(() => {
    if (!socket || !liveSubmission?.id) return;

    const handleQueued = (data) => setLiveSubmission(prev => prev ? { ...prev, status: data.status } : null);
    const handleRunning = (data) => setLiveSubmission(prev => prev ? { ...prev, status: data.status } : null);
    const handleProgress = (data) => setLiveSubmission(prev => prev ? { 
      ...prev, 
      status: data.status,
      testCasesPassed: data.testCasesPassed,
      totalTestCases: data.totalTestCases
    } : null);
    
    const handleCompleted = (data) => {
      setLiveSubmission(prev => prev ? { ...prev, ...data } : null);
      if (activeTab === 'submissions') fetchSubmissions();
    };
    
    const handleError = (data) => {
      setLiveSubmission(prev => prev ? { ...prev, status: data.status, errorMessage: data.message } : null);
      if (activeTab === 'submissions') fetchSubmissions();
    };

    socket.on('submission:queued', handleQueued);
    socket.on('submission:running', handleRunning);
    socket.on('submission:progress', handleProgress);
    socket.on('submission:completed', handleCompleted);
    socket.on('submission:error', handleError);

    // Fetch initial state when tracking starts or on reconnect
    const fetchCurrentState = async () => {
      try {
        const res = await fetch(`/api/submissions/${liveSubmission.id}`);
        if (res.ok) {
          const data = await res.json();
          setLiveSubmission(prev => prev ? { ...prev, ...data } : null);
          if (['ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR', 'SYSTEM_ERROR'].includes(data.status)) {
            if (activeTab === 'submissions') fetchSubmissions();
          }
        }
      } catch (e) {
        console.error('Failed to fetch submission state', e);
      }
    };

    socket.on('connect', fetchCurrentState);
    fetchCurrentState(); // Fetch immediately on tracking start

    return () => {
      socket.off('submission:queued', handleQueued);
      socket.off('submission:running', handleRunning);
      socket.off('submission:progress', handleProgress);
      socket.off('submission:completed', handleCompleted);
      socket.off('submission:error', handleError);
      socket.off('connect', fetchCurrentState);
    };
  }, [socket, liveSubmission?.id, activeTab]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    const oldTemplate = getLanguageTemplate(language, problem?.functionSignature);
    
    // If the code is modified (not empty and not the default template)
    if (code.trim() !== '' && code !== oldTemplate) {
      if (!window.confirm('You have modified the code. Switching languages will overwrite your current code with the new template. Are you sure?')) {
        return; // Cancel switch
      }
    }
    
    setLanguage(newLang);
    setCode(getLanguageTemplate(newLang, problem?.functionSignature));
  };

  const handleRun = async () => {
    if (!user) {
      alert('Please log in to run your code.');
      return;
    }
    if (!code || code.trim() === '') {
      alert('Cannot run empty code.');
      return;
    }

    setIsRunning(true);
    setRunResults(null);
    try {
      const res = await fetch('/api/submissions/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem._id,
          language: language.toLowerCase(),
          sourceCode: code
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Run failed');
      
      setRunResults(data);
      setActiveTab('problem');
    } catch (err) {
      alert(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      alert('Please log in to submit your code.');
      return;
    }

    if (!code || code.trim() === '') {
      alert('Cannot submit empty code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem._id,
          language: language.toLowerCase(),
          sourceCode: code
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      
      // Real-time tracking
      setLiveSubmission({ id: data.id, status: 'QUEUED' });
      if (socket) {
        socket.emit('join_submission', { submissionId: data.id });
      }
      
      // Switch to submissions tab and refresh
      setActiveTab('submissions');
      fetchSubmissions();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (error) return <div className="max-w-4xl mx-auto mt-10 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">{error}</div>;
  if (!problem) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] p-2 md:p-4 min-h-0 bg-black">
      <Group direction="horizontal" className="w-full h-full rounded-lg overflow-hidden border border-slate-800">
        
        {/* Left side: Problem Description & Submissions Tabs */}
        <Panel 
          defaultSize={showAIChat ? 30 : 38} 
          minSize={25}
          className="flex flex-col h-full bg-slate-900 min-w-0 overflow-hidden"
        >
        
        {/* Tabs Header */}
        <div className="flex border-b border-slate-800 bg-slate-950">
          <button 
            onClick={() => setActiveTab('problem')}
            className={`flex-1 py-3 text-sm font-semibold transition ${activeTab === 'problem' ? 'bg-slate-800 text-white border-t-2 border-emerald-500' : 'text-gray-400 hover:bg-slate-900'}`}
          >
            Description
          </button>
          <button 
            onClick={() => setActiveTab('editorial')}
            className={`flex-1 py-3 text-sm font-semibold transition ${activeTab === 'editorial' ? 'bg-slate-800 text-white border-t-2 border-emerald-500' : 'text-gray-400 hover:bg-slate-900'}`}
          >
            Editorial
          </button>
          <button 
            onClick={() => setActiveTab('submissions')}
            className={`flex-1 py-3 text-sm font-semibold transition ${activeTab === 'submissions' ? 'bg-slate-800 text-white border-t-2 border-emerald-500' : 'text-gray-400 hover:bg-slate-900'}`}
          >
            Submissions
          </button>
          <button 
            onClick={() => setActiveTab('discussion')}
            className={`flex-1 py-3 text-sm font-semibold transition ${activeTab === 'discussion' ? 'bg-slate-800 text-white border-t-2 border-emerald-500' : 'text-gray-400 hover:bg-slate-900'}`}
          >
            Discussion
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {activeTab === 'problem' ? (
            <>
              <h1 className="text-3xl font-bold text-white mb-4">{problem.title}</h1>
              
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  problem.difficulty === 'Easy' ? 'bg-green-900/50 text-green-400' :
                  problem.difficulty === 'Medium' ? 'bg-yellow-900/50 text-yellow-400' :
                  'bg-red-900/50 text-red-400'
                }`}>
                  {problem.difficulty}
                </span>
                {problem.topics.map((topic, idx) => (
                  <span key={idx} className="bg-slate-800 text-gray-300 px-3 py-1 rounded-full text-sm">
                    {topic}
                  </span>
                ))}
              </div>

              <div className="prose prose-invert max-w-none mb-10 text-gray-300 whitespace-pre-wrap">
                <ReactMarkdown>{problem.description}</ReactMarkdown>
              </div>

              {problem.examples && problem.examples.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-xl font-bold text-white mb-4">Examples</h3>
                  {problem.examples.map((ex, idx) => (
                    <div key={idx} className="mb-6 bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-sm">
                      <div className="mb-2"><span className="text-gray-500 font-bold">Input:</span> <span className="text-gray-300">{ex.input}</span></div>
                      <div className="mb-2"><span className="text-gray-500 font-bold">Output:</span> <span className="text-gray-300">{ex.output}</span></div>
                      {ex.explanation && (
                        <div><span className="text-gray-500 font-bold">Explanation:</span> <span className="text-gray-300">{ex.explanation}</span></div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {problem.constraints && problem.constraints.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-xl font-bold text-white mb-4">Constraints</h3>
                  <ul className="list-disc pl-5 space-y-2 text-gray-300 font-mono text-sm">
                    {problem.constraints.map((constraint, idx) => (
                      <li key={idx}>{constraint}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Execution Limits */}
              <div className="flex gap-6 border-t border-slate-800 pt-6 mt-10 text-sm">
                <div className="text-gray-400">
                  <span className="block font-bold text-gray-500 mb-1">Time Limit</span>
                  {problem.timeLimit} ms
                </div>
                <div className="text-gray-400">
                  <span className="block font-bold text-gray-500 mb-1">Memory Limit</span>
                  {problem.memoryLimit} MB
                </div>
              </div>

              {/* Ephemeral Run Results */}
              {runResults && (
                <div className="mt-8 p-6 bg-slate-950 border border-slate-800 rounded-lg">
                  <h3 className="text-xl font-bold text-white mb-4">Run Results</h3>
                  <div className={`mb-4 font-bold ${
                    runResults.status === 'ACCEPTED' ? 'text-green-400' :
                    runResults.status === 'WRONG_ANSWER' ? 'text-orange-400' : 'text-red-400'
                  }`}>
                    Status: {runResults.status.replace(/_/g, ' ')}
                  </div>
                  
                  {runResults.errorMessage && (
                    <div className="bg-red-950/50 border border-red-900 text-red-300 p-4 rounded font-mono text-sm mb-4 whitespace-pre-wrap overflow-x-auto">
                      {runResults.errorMessage}
                    </div>
                  )}

                  {runResults.results && runResults.results.map((r, i) => (
                    <div key={i} className={`mb-4 p-4 rounded border ${r.passed ? 'border-green-900/50 bg-green-950/20' : 'border-red-900/50 bg-red-950/20'}`}>
                      <div className="font-bold mb-2 text-gray-300">Test Case {i + 1} - {r.passed ? 'Passed' : 'Failed'}</div>
                      <div className="grid grid-cols-1 gap-2 text-sm font-mono">
                        <div><span className="text-gray-500">Input:</span><br/><span className="text-gray-300 whitespace-pre-wrap">{r.input}</span></div>
                        <div><span className="text-gray-500">Expected:</span><br/><span className="text-gray-300 whitespace-pre-wrap">{r.expectedOutput}</span></div>
                        <div><span className="text-gray-500">Actual:</span><br/><span className={r.passed ? 'text-green-400' : 'text-red-400'}>{r.actualOutput}</span></div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="text-gray-500 text-xs mt-4">
                    Execution Time: {runResults.executionTime}ms | Tests Passed: {runResults.testCasesPassed}/{runResults.totalTestCases}
                  </div>
                </div>
              )}
            </>
          ) : activeTab === 'submissions' ? (
            // Submissions Tab
            <div>
              {/* Live Submission Status */}
              {liveSubmission && (
                <div className="mb-8 p-6 bg-slate-900 border border-slate-700 rounded-lg shadow-lg">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    {liveSubmission.status === 'QUEUED' && <span className="text-blue-400">🟡 Queued</span>}
                    {liveSubmission.status === 'RUNNING' && <span className="text-blue-400 animate-pulse">🔵 Running</span>}
                    {liveSubmission.status === 'ACCEPTED' && <span className="text-green-400">🟢 Accepted</span>}
                    {['WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR', 'SYSTEM_ERROR'].includes(liveSubmission.status) && <span className="text-red-400">🔴 {liveSubmission.status.replace(/_/g, ' ')}</span>}
                  </h3>
                  
                  {liveSubmission.status === 'RUNNING' && liveSubmission.totalTestCases > 0 && (
                    <div className="text-gray-300 font-mono text-sm">
                      Testing {liveSubmission.testCasesPassed || 0} / {liveSubmission.totalTestCases}
                    </div>
                  )}
                  
                  {['ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR', 'SYSTEM_ERROR'].includes(liveSubmission.status) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 border-t border-slate-700 pt-4">
                      {liveSubmission.testCasesPassed !== undefined && (
                        <div>
                          <div className="text-gray-500 text-xs uppercase font-bold">Tests Passed</div>
                          <div className="text-gray-300 font-mono">{liveSubmission.testCasesPassed} / {liveSubmission.totalTestCases}</div>
                        </div>
                      )}
                      {liveSubmission.executionTime !== undefined && (
                        <div>
                          <div className="text-gray-500 text-xs uppercase font-bold">Execution Time</div>
                          <div className="text-gray-300 font-mono">{liveSubmission.executionTime}ms</div>
                        </div>
                      )}
                      {liveSubmission.errorMessage && (
                        <div className="col-span-2 md:col-span-4 mt-2">
                          <div className="text-red-400 text-xs uppercase font-bold mb-1">Error Details</div>
                          <div className="text-red-300 font-mono text-xs bg-red-950/30 border border-red-900/50 p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">{liveSubmission.errorMessage}</div>
                        </div>
                      )}
                    </div>
                  )}
                  {liveSubmission.status !== 'QUEUED' && liveSubmission.status !== 'PROCESSING' && liveSubmission.status !== 'ACCEPTED' && (
                    <div className="mt-4 flex justify-center">
                      <button 
                        onClick={() => {
                          setDebugData({
                            status: liveSubmission.status,
                            errorMessage: liveSubmission.errorMessage || '',
                            output: liveSubmission.results?.find(r => !r.passed)?.actualOutput || ''
                          });
                          setShowAIDebug(true);
                        }}
                        className="bg-red-900/50 hover:bg-red-800 text-red-200 px-4 py-2 rounded font-semibold border border-red-700 transition"
                      >
                        Bug found? Try AI Debug
                      </button>
                    </div>
                  )}
                </div>
              )}

              <h2 className="text-2xl font-bold text-white mb-6">Recent Submissions</h2>
              {!user ? (
                <div className="text-center py-10 text-gray-400 bg-slate-950 rounded border border-slate-800">
                  Please log in to view your submissions.
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-10 text-gray-400 bg-slate-950 rounded border border-slate-800">
                  You haven&apos;t submitted anything for this problem yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.map(sub => (
                    <div key={sub._id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`font-bold ${
                            sub.status === 'ACCEPTED' ? 'text-green-400' : 
                            sub.status === 'QUEUED' || sub.status === 'RUNNING' ? 'text-blue-400' : 
                            'text-red-400'
                          }`}>
                            {sub.status.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-gray-500 bg-slate-900 px-2 py-1 rounded capitalize">
                            {sub.language}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(sub.submittedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm font-mono">
                        {sub.testCasesPassed !== null && (
                          <div className="text-gray-400">
                            Tests: <span className="text-white">{sub.testCasesPassed}/{sub.totalTestCases}</span>
                          </div>
                        )}
                        {sub.executionTime !== null && (
                          <div className="text-gray-400">
                            Time: <span className="text-white">{sub.executionTime}ms</span>
                          </div>
                        )}
                        {sub.memoryUsed !== null && (
                          <div className="text-gray-400">
                            Mem: <span className="text-white">{sub.memoryUsed}MB</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'discussion' ? (
            <DiscussionTab problemId={problem._id} />
          ) : null}
        </div>
        </Panel>

        <Separator className="w-2 bg-slate-950 hover:bg-indigo-500/50 transition-colors cursor-col-resize flex flex-col justify-center items-center group">
          <div className="w-0.5 h-8 bg-slate-700 rounded-full group-hover:bg-indigo-400 transition-colors"></div>
        </Separator>

        {/* Right side: Editor & Actions */}
        <Panel 
          defaultSize={showAIChat ? 42 : 62} 
          minSize={35}
          className="flex flex-col h-full bg-slate-900 min-w-0 overflow-hidden"
        >
        
        {/* Editor Toolbar */}
        <div className="flex items-center justify-end sm:justify-between bg-slate-950 p-3 border-b border-slate-800 gap-2 flex-nowrap overflow-x-auto">
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <label className="text-gray-400 text-sm font-semibold">Language:</label>
            <select 
              value={language}
              onChange={handleLanguageChange}
              className="bg-slate-800 text-white text-sm border border-slate-700 rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500 capitalize"
            >
              {problem.supportedLanguages.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setShowAIHint(true)}
              className="inline-flex items-center justify-center p-1.5 sm:px-3 sm:py-1.5 rounded text-sm font-semibold bg-orange-900/40 text-orange-400 hover:bg-orange-800/60 border border-orange-800/50 transition"
              title="Hint"
            >
              <span className="hidden sm:inline">Hint</span>
              <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            <button
              onClick={() => setShowAIChat(true)}
              className={`${showAIChat ? 'hidden' : 'inline-flex'} items-center justify-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded text-sm font-semibold bg-indigo-900/40 text-indigo-400 hover:bg-indigo-800/60 border border-indigo-800/50 transition mr-2`}
              title="AI Chat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="hidden sm:inline">AI</span>
            </button>

            <button 
              onClick={handleRun}
              disabled={isRunning || isSubmitting}
              className="px-4 py-1.5 rounded text-sm font-bold bg-slate-800 text-gray-300 hover:bg-slate-700 transition disabled:opacity-50 shrink-0 whitespace-nowrap"
            >
              {isRunning ? 'Running...' : 'Run Code'}
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-1.5 rounded text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition disabled:opacity-50 shrink-0 whitespace-nowrap"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>

        <div className="flex-1 min-w-0 overflow-hidden">
          <CodeEditor 
            language={language}
            code={code}
            onChange={setCode}
          />
        </div>
        </Panel>

        {showAIChat && (
          <>
            <Separator className="w-2 bg-slate-950 hover:bg-indigo-500/50 transition-colors cursor-col-resize flex flex-col justify-center items-center group hidden md:flex">
              <div className="w-0.5 h-8 bg-slate-700 rounded-full group-hover:bg-indigo-400 transition-colors"></div>
            </Separator>
            
            <Panel 
              defaultSize={28} 
              minSize={25}
              className="hidden md:flex flex-col h-full bg-slate-900 min-w-0 overflow-hidden"
            >
              <AIChat 
                problemId={problem._id} 
                language={language} 
                sourceCode={code} 
                onClose={() => setShowAIChat(false)} 
              />
            </Panel>
            
            {/* Mobile Fallback Overlay for AI Chat */}
            <div className="md:hidden fixed inset-0 z-50 flex justify-end bg-black/60 pointer-events-auto" onClick={() => setShowAIChat(false)}>
              <div className="w-full sm:w-[400px] h-full" onClick={e => e.stopPropagation()}>
                <AIChat 
                  problemId={problem._id} 
                  language={language} 
                  sourceCode={code} 
                  onClose={() => setShowAIChat(false)} 
                />
              </div>
            </div>
          </>
        )}
      </Group>

      {/* AI Modals */}
      {showAIHint && (
        <AIHint 
          problemId={problem._id} 
          language={language} 
          sourceCode={code} 
          onClose={() => setShowAIHint(false)} 
        />
      )}
      {showAIDebug && debugData && (
        <AIDebug 
          problemId={problem._id} 
          language={language} 
          sourceCode={code} 
          status={debugData.status}
          errorMessage={debugData.errorMessage}
          output={debugData.output}
          onClose={() => setShowAIDebug(false)} 
        />
      )}
    </div>
  );
}
