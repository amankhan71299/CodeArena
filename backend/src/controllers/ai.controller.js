import Problem from '../models/Problem.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import { explainCode, generateHint, debugCode, reviewCode, generateEditorial, recommendProblems, chat as chatService } from '../services/ai.service.js';

const validateSourceCode = (sourceCode) => {
  if (!sourceCode) return 'Source code is required.';
  if (sourceCode.length > 50000) return 'Source code exceeds maximum allowed size (50KB).';
  return null;
};

export const explain = async (req, res) => {
  try {
    const { problemId, language, sourceCode } = req.body;
    
    if (!problemId || !language) return res.status(400).json({ error: 'Missing required fields' });
    const codeError = validateSourceCode(sourceCode);
    if (codeError) return res.status(400).json({ error: codeError });

    const problem = await Problem.findById(problemId);
    if (!problem || problem.archived) return res.status(400).json({ error: 'Invalid or archived problem' });

    const result = await explainCode(problem.title, problem.description, language, sourceCode);
    res.json(result);
  } catch (error) {
    console.error('[AI Controller] Explain Error:', error);
    res.status(503).json({ error: error.message || 'AI assistant is temporarily unavailable. Please try again.' });
  }
};

export const hint = async (req, res) => {
  try {
    const { problemId, language, sourceCode, hintLevel } = req.body;

    if (!problemId || !language || !hintLevel) return res.status(400).json({ error: 'Missing required fields' });
    if (![1, 2, 3].includes(hintLevel)) return res.status(400).json({ error: 'Invalid hint level (must be 1, 2, or 3)' });
    const codeError = validateSourceCode(sourceCode);
    if (codeError) return res.status(400).json({ error: codeError });

    const problem = await Problem.findById(problemId);
    if (!problem || problem.archived) return res.status(400).json({ error: 'Invalid or archived problem' });

    const result = await generateHint(problem.title, problem.description, language, sourceCode, hintLevel);
    res.json({ hint: result });
  } catch (error) {
    console.error('[AI Controller] Hint Error:', error);
    res.status(503).json({ error: error.message || 'AI assistant is temporarily unavailable. Please try again.' });
  }
};

export const debug = async (req, res) => {
  try {
    const { problemId, language, sourceCode, submissionStatus, errorMessage, output } = req.body;

    if (!problemId || !language || !submissionStatus) return res.status(400).json({ error: 'Missing required fields' });
    const codeError = validateSourceCode(sourceCode);
    if (codeError) return res.status(400).json({ error: codeError });

    const problem = await Problem.findById(problemId);
    if (!problem || problem.archived) return res.status(400).json({ error: 'Invalid or archived problem' });

    // Ensure we don't send anything extremely long in error/output to Gemini
    const safeError = errorMessage ? errorMessage.substring(0, 1000) : '';
    const safeOutput = output ? output.substring(0, 1000) : '';

    const result = await debugCode(problem.title, language, sourceCode, submissionStatus, safeError, safeOutput);
    res.json(result);
  } catch (error) {
    console.error('[AI Controller] Debug Error:', error);
    res.status(503).json({ error: error.message || 'AI assistant is temporarily unavailable. Please try again.' });
  }
};

export const review = async (req, res) => {
  try {
    const { problemId, language, sourceCode } = req.body;

    if (!problemId || !language) return res.status(400).json({ error: 'Missing required fields' });
    const codeError = validateSourceCode(sourceCode);
    if (codeError) return res.status(400).json({ error: codeError });

    const problem = await Problem.findById(problemId);
    if (!problem || problem.archived) return res.status(400).json({ error: 'Invalid or archived problem' });

    const result = await reviewCode(problem.title, language, sourceCode);
    res.json(result);
  } catch (error) {
    console.error('[AI Controller] Review Error:', error);
    res.status(503).json({ error: error.message || 'AI assistant is temporarily unavailable. Please try again.' });
  }
};

export const adminGenerateEditorial = async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await Problem.findById(id);
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    const result = await generateEditorial(problem.title, problem.description, problem.constraints, problem.topics);
    res.json(result);
  } catch (error) {
    console.error('[AI Controller] Admin Editorial Error:', error);
    res.status(503).json({ error: error.message || 'AI assistant is temporarily unavailable. Please try again.' });
  }
};

export const recommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Get solved problem IDs. Assuming `problemsSolved` contains object IDs of solved problems.
    // Let's also check if they are stored as strings or ObjectIds.
    let solvedSlugs = [];
    if (user.problemsSolved && user.problemsSolved.length > 0) {
      const solvedProblems = await Problem.find({ _id: { $in: user.problemsSolved } }).select('slug');
      solvedSlugs = solvedProblems.map(p => p.slug);
    }

    // Get a subset of active problems to send to AI (e.g. 50 most recent or random 50)
    const availableProblems = await Problem.find({ archived: false, published: true })
      .select('title slug difficulty topics')
      .limit(50); // Hard limit to not overload Gemini payload

    const recommendedSlugs = await recommendProblems(availableProblems, solvedSlugs);

    // Map slugs back to actual problem data to return to client
    const recommendedProblems = await Problem.find({ slug: { $in: recommendedSlugs }, archived: false })
      .select('title slug difficulty topics');

    res.json(recommendedProblems);
  } catch (error) {
    console.error('[AI Controller] Recommendation Error:', error);
    if (error.isQuotaExceeded || error.status === 429) {
      return res.status(429).json({ error: error.message || 'AI usage limit reached.', code: 'AI_QUOTA_EXCEEDED' });
    }
    res.status(503).json({ error: error.message || 'AI assistant is temporarily unavailable. Please try again.' });
  }
};

export const chatController = async (req, res) => {
  const controllerStart = Date.now();
  let timeoutId;
  try {
    console.log('[AI] Controller started');
    const { problemId, language, sourceCode, messages } = req.body;
    console.log(`[AI] Problem ID: ${problemId}`);
    
    if (!problemId || !language || !messages || !Array.isArray(messages)) {
      console.warn('[AI] Missing required fields in request');
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const problem = await Problem.findById(problemId);
    console.log(`[AI] Problem found: ${!!problem}`);
    
    if (!problem || problem.archived) {
      return res.status(400).json({ success: false, message: 'Invalid or archived problem' });
    }

    console.log(`[AI] Code length: ${sourceCode?.length || 0}`);
    console.log(`[AI] Language: ${language}`);
    console.log(`[AI] Conversation messages: ${messages.length}`);

    let examplesText = '';
    if (problem.examples && problem.examples.length > 0) {
      examplesText = problem.examples.map((ex, i) => `Example ${i+1}:\nInput: ${ex.input}\nOutput: ${ex.output}\nExplanation: ${ex.explanation || 'None'}`).join('\n\n');
    } else if (problem.testCases && problem.testCases.length > 0) {
      const visibleTestCases = problem.testCases.filter(tc => !tc.hidden).slice(0, 3);
      examplesText = visibleTestCases.map((tc, i) => `Test Case ${i+1}:\nInput: ${tc.input}\nExpected Output: ${tc.expectedOutput}`).join('\n\n');
    }

    const systemInstruction = `You are an expert AI programming mentor for the CodeArena platform.
You are chatting with a user who is currently solving a coding problem.
Be helpful, concise, and encourage them to find the solution. 
Do NOT give away the complete code solution unless they explicitly and firmly ask for it. Guide them with hints, explain concepts, analyze complexity, and point out bugs.

=== PROBLEM CONTEXT ===
Title: ${problem.title}
Description: 
${problem.description}

Constraints:
${problem.constraints ? problem.constraints.join('\n') : 'None'}

Examples / Test Cases:
${examplesText || 'None'}

=== USER CONTEXT ===
Current Language: ${language}
Current Source Code:
\`\`\`${language}
${sourceCode || '// Empty editor'}
\`\`\`
`;

    // Map messages to Gemini format: { role: 'user' | 'model', parts: [{ text }] }
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    console.log('[AI] Calling Gemini (Max 25s timeout)...');
    
    const timeoutMs = 25000;
    const abortController = new AbortController();
    
    timeoutId = setTimeout(() => {
      console.warn('[AI] 25s timeout reached, aborting Gemini request');
      abortController.abort(new Error('AI service temporarily unavailable (timeout)'));
    }, timeoutMs);

    // Pass the abort signal to the chatService
    const aiResponseText = await chatService(systemInstruction, formattedMessages, abortController.signal);
    clearTimeout(timeoutId);

    const duration = Date.now() - controllerStart;
    console.log(`[AI] Gemini response received in ${duration} ms`);
    
    if (!req.socket.destroyed) {
      console.log('[AI] Sending response to frontend');
      res.json({ success: true, message: aiResponseText });
    } else {
      console.warn('[AI] Client socket already destroyed, skipping response');
    }
    const controllerTotal = Date.now() - controllerStart;
    console.log(`[AI] Controller total duration: ${controllerTotal} ms`);
  } catch (error) {
    const duration = Date.now() - controllerStart;
    console.error(`[AI] Controller Error caught after ${duration} ms:`, error.message || error);
    
    if (!req.socket.destroyed) {
      if (error.isQuotaExceeded || error.status === 429) {
        console.log('[AI] Returning quota error to frontend');
        res.status(429).json({
          success: false,
          code: "AI_QUOTA_EXCEEDED",
          error: "AI usage limit reached. Please try again later or check your Gemini API quota.",
          retryable: false
        });
      } else {
        res.status(503).json({ 
          success: false, 
          error: error.isTimeout ? "AI service temporarily unavailable" : (error.message || "AI request failed"),
          retryable: true 
        });
      }
    } else {
      console.warn('[AI] Client socket destroyed, cannot send error response');
    }
    console.log(`[AI] Controller total duration: ${duration} ms`);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};
