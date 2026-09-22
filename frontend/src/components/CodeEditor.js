'use client';

import Editor from '@monaco-editor/react';

export default function CodeEditor({ language, code, onChange }) {
  // Monaco uses 'javascript' and 'python' as identifiers
  const monacoLanguage = language.toLowerCase();

  return (
    <div className="w-full max-w-full min-w-0 h-full rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
      <Editor
        height="100%"
        language={monacoLanguage}
        theme="vs-dark"
        value={code}
        onChange={(value) => onChange(value || '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
          fontFamily: "'Fira Code', 'JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
          lineNumbersMinChars: 3,
        }}
        loading={<div className="text-gray-400 p-4">Loading editor...</div>}
      />
    </div>
  );
}
