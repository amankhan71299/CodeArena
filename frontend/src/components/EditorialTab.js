'use client';

export default function EditorialTab({ editorial }) {
  if (!editorial) {
    return (
      <div className="text-center py-20 text-gray-400 bg-slate-950 rounded border border-slate-800">
        <h3 className="text-xl font-bold text-white mb-2">No Editorial Available</h3>
        <p>An editorial has not been published for this problem yet. Check the discussions tab for community approaches!</p>
      </div>
    );
  }

  return (
    <div className="text-gray-300 space-y-8">
      {editorial.explanation && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-4 border-b border-slate-800 pb-2">Explanation</h2>
          <div className="prose prose-invert max-w-none whitespace-pre-wrap">{editorial.explanation}</div>
        </section>
      )}

      {editorial.approach && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-4 border-b border-slate-800 pb-2">Approach</h2>
          <div className="prose prose-invert max-w-none whitespace-pre-wrap">{editorial.approach}</div>
        </section>
      )}

      {editorial.algorithm && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-4 border-b border-slate-800 pb-2">Algorithm</h2>
          <div className="prose prose-invert max-w-none whitespace-pre-wrap">{editorial.algorithm}</div>
        </section>
      )}

      {editorial.complexity && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-4 border-b border-slate-800 pb-2">Complexity</h2>
          <div className="prose prose-invert max-w-none whitespace-pre-wrap">{editorial.complexity}</div>
        </section>
      )}

      {editorial.codeExplanation && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-4 border-b border-slate-800 pb-2">Code Explanation</h2>
          <div className="prose prose-invert max-w-none whitespace-pre-wrap">{editorial.codeExplanation}</div>
        </section>
      )}
    </div>
  );
}
