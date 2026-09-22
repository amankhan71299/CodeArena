'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function AIChat({ problemId, language, sourceCode, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'model', content: "Hi! I'm your CodeArena AI assistant. Ask me anything about this problem, your code, test cases, time complexity, space complexity, debugging, or optimization." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (text = input) => {
    if (!text.trim() || isLoading) return;
    
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId,
          language,
          sourceCode,
          messages: newMessages.slice(1) // exclude the initial hardcoded welcome message from being sent to API
        })
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMessage = `AI request failed (${res.status})`;
        try {
          const errorJson = JSON.parse(text);
          if (res.status === 429 || errorJson.code === "AI_QUOTA_EXCEEDED") {
            errorMessage = "AI usage limit reached. Please try again later or check your Gemini API quota.";
          } else {
            errorMessage = errorJson.error || errorJson.message || errorMessage;
          }
        } catch (e) {
          // If it's an HTML error page from proxy/Next.js, do NOT substring the HTML.
          // Show a clean user-friendly error message.
          if (res.status === 429) {
            errorMessage = "AI usage limit reached. Please try again later or check your Gemini API quota.";
          } else {
            errorMessage = 'AI service temporarily unavailable. Please try again.';
          }
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'model', content: data.message }]);
    } catch (err) {
      setError(err.message || 'AI is temporarily unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "Explain this problem",
    "What is the optimal approach?",
    "What is the time complexity?",
    "Find the bug in my code",
    "Is my solution optimal?",
    "Explain this test case",
    "Can you optimize my solution?"
  ];

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border-l border-slate-800 min-w-[300px] min-h-0 overflow-hidden box-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950 shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            CodeArena AI
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 custom-scrollbar bg-slate-900 flex flex-col gap-4 min-w-0 min-h-0 w-full box-border">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex w-full min-w-0 box-border ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[100%] sm:max-w-[90%] rounded-2xl p-3 min-w-0 break-words box-border ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-slate-800 text-gray-200 border border-slate-700 rounded-bl-none'
              }`}>
                <div 
                  className={`prose prose-invert max-w-full min-w-0 prose-sm box-border ${msg.role === 'user' ? 'prose-p:text-white' : ''}`}
                  style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'normal', width: '100%' }}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap m-0 min-w-0 break-words box-border">{msg.content}</p>
                  ) : (
                    <ReactMarkdown
                      components={{
                        pre({node, children, ...props}) {
                          return (
                            <div className="max-w-full min-w-0 overflow-x-auto my-2 rounded bg-slate-900/50 box-border">
                              <pre className="!m-0 min-w-0 w-fit max-w-none p-4" {...props}>
                                {children}
                              </pre>
                            </div>
                          )
                        },
                        code({node, className, children, ...props}) {
                          const match = /language-(\w+)/.exec(className || '');
                          return match ? (
                            <code className={className} style={{ overflowWrap: 'normal', wordBreak: 'normal' }} {...props}>
                              {children}
                            </code>
                          ) : (
                            <code className="break-words whitespace-pre-wrap bg-slate-800/80 px-1 py-0.5 rounded text-indigo-300" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }} {...props}>
                              {children}
                            </code>
                          )
                        },
                        table({node, children, ...props}) {
                          return (
                            <div className="max-w-full min-w-0 overflow-x-auto my-2 box-border">
                              <table className="min-w-full" {...props}>{children}</table>
                            </div>
                          )
                        },
                        p({node, children, ...props}) {
                          // Render as a div instead of p to permanently avoid hydration errors
                          // if Markdown AST or raw HTML accidentally nests block elements like pre/div
                          return <div className="min-w-0 break-words box-border m-0 mb-4 last:mb-0" {...props}>{children}</div>
                        },
                        h1({node, children, ...props}) { return <h1 className="min-w-0 break-words" {...props}>{children}</h1> },
                        h2({node, children, ...props}) { return <h2 className="min-w-0 break-words" {...props}>{children}</h2> },
                        h3({node, children, ...props}) { return <h3 className="min-w-0 break-words" {...props}>{children}</h3> },
                        ul({node, children, ...props}) { return <ul className="min-w-0 break-words pl-4" {...props}>{children}</ul> },
                        ol({node, children, ...props}) { return <ol className="min-w-0 break-words pl-4" {...props}>{children}</ol> },
                        li({node, children, ...props}) { return <li className="min-w-0 break-words" {...props}>{children}</li> },
                        a({node, children, ...props}) { return <a className="min-w-0 break-words break-all" {...props}>{children}</a> }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {messages.length === 1 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 font-bold uppercase mb-2">Suggested questions</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q, i) => (
                  <button 
                    key={i}
                    onClick={() => handleSend(q)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-gray-300 px-3 py-1.5 rounded-full border border-slate-700 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-700 text-gray-300 rounded-2xl rounded-bl-none p-3 flex gap-1 items-center h-10">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/40 border border-red-800/50 text-red-300 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 shrink-0 min-w-0 w-full box-border">
          <div className="relative w-full min-w-0 box-border">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              className="w-full max-w-full min-w-0 bg-slate-800 text-white border border-slate-700 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:border-indigo-500 resize-none custom-scrollbar box-border"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="text-center mt-2 text-[10px] text-gray-500">
            AI can make mistakes. Verify important information.
          </div>
        </div>
      </div>
  );
}
