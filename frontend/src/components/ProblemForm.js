'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export const AVAILABLE_TOPICS = [
  'ARRAY', 'BINARY_SEARCH', 'STRING', 'LINKED_LIST', 'RECURSION', 
  'BIT_MANIPULATION', 'STACK_QUEUE', 'SLIDING_WINDOW_TWO_POINTER', 
  'GREEDY', 'BINARY_TREE', 'BINARY_SEARCH_TREE', 'GRAPH', 
  'DYNAMIC_PROGRAMMING', 'HEAPS', 'TRIES'
];

export default function ProblemForm({ initialData = null, isEdit = false }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [useFunctionSignature, setUseFunctionSignature] = useState(!!initialData?.functionSignature);

  const [formData, setFormData] = useState(initialData || {
    title: '',
    description: '',
    difficulty: 'Easy',
    topics: [''],
    constraints: [''],
    examples: [{ input: '', output: '', explanation: '' }],
    testCases: [{ input: '', expectedOutput: '', hidden: true }],
    timeLimit: 1000,
    memoryLimit: 256,
    supportedLanguages: ['javascript', 'python', 'cpp', 'java'],
    functionSignature: {
      functionName: '',
      returnType: '',
      parameters: []
    },
    archived: false
  });

  const handleArrayChange = (field, index, value) => {
    const newArr = [...formData[field]];
    newArr[index] = value;
    setFormData({ ...formData, [field]: newArr });
  };

  const addArrayItem = (field, emptyVal) => {
    setFormData({ ...formData, [field]: [...formData[field], emptyVal] });
  };

  const removeArrayItem = (field, index) => {
    const newArr = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newArr });
  };

  const handleObjectArrayChange = (field, index, key, value) => {
    const newArr = [...formData[field]];
    newArr[index][key] = value;
    setFormData({ ...formData, [field]: newArr });
  };

  const handleFunctionSignatureParamChange = (index, key, value) => {
    const currentParams = formData.functionSignature?.parameters || [];
    const newParams = [...currentParams];
    newParams[index] = { ...newParams[index], [key]: value };
    setFormData({
      ...formData,
      functionSignature: { 
        ...(formData.functionSignature || { functionName: '', returnType: '' }), 
        parameters: newParams 
      }
    });
  };

  const addFunctionSignatureParam = () => {
    const currentParams = formData.functionSignature?.parameters || [];
    setFormData({
      ...formData,
      functionSignature: {
        ...(formData.functionSignature || { functionName: '', returnType: '' }),
        parameters: [...currentParams, { name: '', type: '' }]
      }
    });
  };

  const removeFunctionSignatureParam = (index) => {
    const currentParams = formData.functionSignature?.parameters || [];
    const newParams = currentParams.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      functionSignature: { 
        ...(formData.functionSignature || { functionName: '', returnType: '' }), 
        parameters: newParams 
      }
    });
  };

  const toggleTopic = (topic) => {
    const currentTopics = formData.topics || [];
    if (currentTopics.includes(topic)) {
      setFormData({ ...formData, topics: currentTopics.filter(t => t !== topic) });
    } else {
      setFormData({ ...formData, topics: [...currentTopics, topic] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEdit ? `/api/admin/problems/${initialData._id}` : '/api/admin/problems';
      const method = isEdit ? 'PUT' : 'POST';

      // Clean empty strings from arrays before submit
      const cleanedData = {
        ...formData,
        topics: formData.topics.filter(t => t.trim() !== ''),
        constraints: formData.constraints.filter(c => c.trim() !== '')
      };

      if (!useFunctionSignature) {
        cleanedData.functionSignature = null;
      } else {
        if (!cleanedData.functionSignature) {
          cleanedData.functionSignature = { functionName: '', returnType: '', parameters: [] };
        }
        const params = cleanedData.functionSignature.parameters || [];
        // Filter out empty params
        cleanedData.functionSignature.parameters = params.filter(p => p.name.trim() !== '' && p.type.trim() !== '');
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save problem');
      }

      router.push('/admin/problems');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-slate-900 p-8 rounded-lg border border-slate-800">
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-300 mb-2 font-semibold">Title</label>
          <input 
            type="text" 
            required
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-gray-300 mb-2 font-semibold">Difficulty</label>
          <select 
            value={formData.difficulty}
            onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
            className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:border-emerald-500"
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-gray-300 mb-2 font-semibold">Description</label>
        <textarea 
          required
          rows="5"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded focus:outline-none focus:border-emerald-500 custom-scrollbar"
        />
      </div>

      {/* Limits & Languages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-slate-950 rounded border border-slate-800">
        <div>
          <label className="block text-gray-300 mb-2 text-sm font-semibold">Time Limit (ms)</label>
          <input 
            type="number" 
            required
            min="100"
            max="10000"
            value={formData.timeLimit}
            onChange={(e) => setFormData({...formData, timeLimit: Number(e.target.value)})}
            className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-1 rounded"
          />
        </div>
        <div>
          <label className="block text-gray-300 mb-2 text-sm font-semibold">Memory Limit (MB)</label>
          <input 
            type="number" 
            required
            min="16"
            max="1024"
            value={formData.memoryLimit}
            onChange={(e) => setFormData({...formData, memoryLimit: Number(e.target.value)})}
            className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-1 rounded"
          />
        </div>
        <div>
           <label className="block text-gray-300 mb-2 text-sm font-semibold">Supported Languages (comma separated)</label>
           <input 
            type="text" 
            required
            value={formData.supportedLanguages.join(', ')}
            onChange={(e) => setFormData({...formData, supportedLanguages: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}
            className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-1 rounded"
          />
        </div>
      </div>

      {/* Function Signature (LeetCode Style execution) */}
      <div className="border-t border-slate-800 pt-6">
        <label className="flex items-center text-gray-300 font-semibold cursor-pointer mb-4">
          <input 
            type="checkbox" 
            checked={useFunctionSignature}
            onChange={(e) => setUseFunctionSignature(e.target.checked)}
            className="mr-2 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
          />
          Use Function-Based Execution (e.g. Java 'class Solution')
        </label>

        {useFunctionSignature && (
          <div className="bg-slate-950 p-4 rounded border border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Function Name (e.g. twoSum)</label>
                <input 
                  type="text"
                  required={useFunctionSignature}
                  value={formData.functionSignature?.functionName || ''}
                  onChange={(e) => setFormData({...formData, functionSignature: {...(formData.functionSignature || { returnType: '', parameters: [] }), functionName: e.target.value}})}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-1 rounded"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Return Type (e.g. int[])</label>
                <input 
                  type="text"
                  required={useFunctionSignature}
                  value={formData.functionSignature?.returnType || ''}
                  onChange={(e) => setFormData({...formData, functionSignature: {...(formData.functionSignature || { functionName: '', parameters: [] }), returnType: e.target.value}})}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-1 rounded"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-gray-400 text-sm">Parameters</label>
                <button type="button" onClick={addFunctionSignatureParam} className="text-emerald-400 text-xs hover:underline">+ Add Param</button>
              </div>
              {(formData.functionSignature?.parameters || []).map((param, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <input 
                    type="text" 
                    placeholder="Name (e.g. nums)"
                    value={param.name}
                    onChange={(e) => handleFunctionSignatureParamChange(i, 'name', e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 text-white px-3 py-1 rounded text-sm"
                  />
                  <input 
                    type="text" 
                    placeholder="Type (e.g. int[])"
                    value={param.type}
                    onChange={(e) => handleFunctionSignatureParamChange(i, 'type', e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 text-white px-3 py-1 rounded text-sm"
                  />
                  <button type="button" onClick={() => removeFunctionSignatureParam(i)} className="text-red-400 px-2">&times;</button>
                </div>
              ))}
              {(!formData.functionSignature?.parameters || formData.functionSignature.parameters.length === 0) && (
                <p className="text-xs text-gray-500 italic">No parameters defined.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Topics & Constraints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-gray-300 font-semibold">Topics (Categories)</label>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-2 bg-slate-950 rounded border border-slate-800">
            {AVAILABLE_TOPICS.map(topic => (
              <label key={topic} className="flex items-center text-sm text-gray-300 cursor-pointer hover:text-white transition">
                <input 
                  type="checkbox" 
                  checked={(formData.topics || []).includes(topic)}
                  onChange={() => toggleTopic(topic)}
                  className="mr-2 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                {topic.replace(/_/g, ' ')}
              </label>
            ))}
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-gray-300 font-semibold">Constraints</label>
            <button type="button" onClick={() => addArrayItem('constraints', '')} className="text-emerald-400 text-sm hover:underline">+ Add</button>
          </div>
          {formData.constraints.map((constraint, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input 
                type="text" 
                value={constraint}
                onChange={(e) => handleArrayChange('constraints', i, e.target.value)}
                className="flex-grow bg-slate-800 border border-slate-700 text-white px-3 py-1 rounded font-mono text-sm"
              />
              <button type="button" onClick={() => removeArrayItem('constraints', i)} className="text-red-400 px-2">&times;</button>
            </div>
          ))}
        </div>
      </div>

      {/* Examples */}
      <div className="border-t border-slate-800 pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Public Examples</h3>
          <button type="button" onClick={() => addArrayItem('examples', { input: '', output: '', explanation: '' })} className="bg-slate-800 hover:bg-slate-700 text-sm px-3 py-1 rounded text-white">+ Add Example</button>
        </div>
        {formData.examples.map((ex, i) => (
          <div key={i} className="bg-slate-950 p-4 rounded border border-slate-800 mb-4 relative">
            <button type="button" onClick={() => removeArrayItem('examples', i)} className="absolute top-2 right-2 text-red-500 hover:text-red-400 font-bold">&times; Remove</button>
            <div className="grid grid-cols-2 gap-4 mb-3 mt-4">
              <div>
                <label className="block text-gray-400 text-xs mb-1">Input</label>
                <textarea rows="2" value={ex.input} onChange={(e) => handleObjectArrayChange('examples', i, 'input', e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1 rounded font-mono text-sm" />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">Output</label>
                <textarea rows="2" value={ex.output} onChange={(e) => handleObjectArrayChange('examples', i, 'output', e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1 rounded font-mono text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">Explanation (Optional)</label>
              <textarea rows="1" value={ex.explanation} onChange={(e) => handleObjectArrayChange('examples', i, 'explanation', e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1 rounded text-sm" />
            </div>
          </div>
        ))}
      </div>

      {/* Test Cases */}
      <div className="border-t border-slate-800 pt-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Test Cases</h3>
            <p className="text-sm text-gray-400">These run the code. Hidden ones are NOT sent to students.</p>
          </div>
          <button type="button" onClick={() => addArrayItem('testCases', { input: '', expectedOutput: '', hidden: true })} className="bg-slate-800 hover:bg-slate-700 text-sm px-3 py-1 rounded text-white">+ Add Test Case</button>
        </div>
        
        {formData.testCases.map((tc, i) => (
          <div key={i} className={`p-4 rounded border mb-4 relative ${tc.hidden ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-emerald-900'}`}>
            <button type="button" onClick={() => removeArrayItem('testCases', i)} className="absolute top-2 right-2 text-red-500 hover:text-red-400 font-bold">&times; Remove</button>
            <div className="flex items-center gap-4 mb-4 mt-2">
              <label className="flex items-center text-gray-300 text-sm cursor-pointer">
                <input type="checkbox" checked={tc.hidden} onChange={(e) => handleObjectArrayChange('testCases', i, 'hidden', e.target.checked)} className="mr-2" />
                Hidden Test Case
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-xs mb-1">Input</label>
                <textarea required rows="2" value={tc.input} onChange={(e) => handleObjectArrayChange('testCases', i, 'input', e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1 rounded font-mono text-sm" />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">Expected Output</label>
                <textarea required rows="2" value={tc.expectedOutput} onChange={(e) => handleObjectArrayChange('testCases', i, 'expectedOutput', e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white px-2 py-1 rounded font-mono text-sm" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-6 border-t border-slate-800">
        <button 
          type="button"
          onClick={() => router.push('/admin/problems')}
          className="mr-4 px-6 py-2 text-gray-300 hover:text-white"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-8 rounded transition disabled:opacity-50"
        >
          {loading ? 'Saving...' : (isEdit ? 'Update Problem' : 'Create Problem')}
        </button>
      </div>
    </form>
  );
}
