'use client';

import ProblemForm from '../../../../components/ProblemForm';

export default function CreateProblemPage() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Create New Problem</h1>
      <ProblemForm isEdit={false} />
    </div>
  );
}
