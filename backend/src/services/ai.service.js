import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini client only if the provider is set to gemini and we have an API key.
// By default we do not fail on startup if the API key is missing.
let aiClient = null;

const initAIClient = () => {
  if (process.env.AI_PROVIDER === 'gemini' && process.env.AI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });
  }
};

initAIClient();
const MODEL_NAME = process.env.AI_MODEL || 'gemini-1.5-flash';

/**
 * Common wrapper to call the AI provider. 
 * Provides mock responses if AI is not configured.
 */
const generateText = async (prompt) => {
  // If no AI client is configured, use the mock provider
  if (!aiClient) {
    console.log('[AI Service] Using Mock Provider');
    return getMockResponse(prompt);
  }

  try {
    console.log(`[AI] Request received`);
    console.log(`[AI] Provider: Gemini`);
    console.log(`[AI] Model: ${MODEL_NAME}`);
    const response = await aiClient.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error(`[AI] Request failed: ${error.message || error}`);
    console.error(`[AI] HTTP status: ${error.status || 'unknown'}`);
    
    const isQuotaError = error.status === 429 && error.message && (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED'));

    if (isQuotaError) {
      console.warn(`[AI] Gemini quota exhausted - not retrying`);
      const quotaErr = new Error('AI usage limit reached. Please try again later or check your Gemini API quota.');
      quotaErr.isQuotaExceeded = true;
      quotaErr.status = 429;
      throw quotaErr;
    }

    if (process.env.NODE_ENV !== 'production') {
      throw new Error(`AI API Error: ${error.message || 'Unknown error'}`);
    } else {
      throw new Error('AI assistant is temporarily unavailable. Please try again.');
    }
  }
};

const getMockResponse = (prompt) => {
  if (prompt.includes('explain their code')) {
    return `{"explanation": "Mock explanation", "approach": "Mock approach", "timeComplexity": "O(1)", "spaceComplexity": "O(1)", "importantLogic": "Mock logic"}`;
  }
  if (prompt.includes('hint for')) {
    if (prompt.includes('Hint Level: 1')) {
      return 'Mock Hint 1: Consider the constraints.';
    }
    if (prompt.includes('Hint Level: 2')) {
      return 'Mock Hint 2: Try using a hash map.';
    }
    return 'Mock Hint 3: Store frequencies in the map.';
  }
  if (prompt.includes('debugging assistant')) {
    return `{"whyFailed": "Mock failure reason", "likelyBug": "Mock bug", "edgeCase": "Mock edge case", "suggestedDirection": "Mock direction"}`;
  }
  if (prompt.includes('reviewing a PR')) {
    return `{"correctness": "Mock correctness", "codeQuality": "Mock quality", "readability": "Mock readability", "complexity": "Mock complexity", "edgeCases": "Mock edge cases", "optimizations": "Mock optimizations"}`;
  }
  if (prompt.includes('comprehensive editorial')) {
    return `{"explanation": "Mock editorial explanation", "approach": "Mock approach", "algorithm": "Mock algorithm", "complexity": "Time O(1) Space O(1)", "codeExplanation": "Mock code explanation"}`;
  }
  if (prompt.includes('recommendation engine')) {
    // Just mock whatever problem exists
    return `["mock-problem-1"]`;
  }
  return 'Mock AI Response';
};

/**
 * Explains a user's submitted code.
 */
export const explainCode = async (problemTitle, problemDescription, language, sourceCode) => {
  const prompt = `You are an expert programming tutor helping a student understand their own code. 
They have written a solution for the problem "${problemTitle}".

Problem Description:
${problemDescription}

Student's Code (${language}):
${sourceCode}

Analyze their code and provide a JSON response explaining it. 
Do NOT provide alternative full solutions. Only explain their code.
Return ONLY valid JSON with this exact structure (no markdown formatting, just raw JSON):
{
  "explanation": "High level explanation of what their code does.",
  "approach": "The general algorithmic approach they used.",
  "timeComplexity": "Big-O time complexity of their code.",
  "spaceComplexity": "Big-O space complexity of their code.",
  "importantLogic": "One or two sentences highlighting the most important part of their logic."
}`;
  
  const result = await generateText(prompt);
  try {
    return JSON.parse(result.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (e) {
    throw new Error('AI returned invalid format.');
  }
};

/**
 * Provides a progressive hint.
 */
export const generateHint = async (problemTitle, problemDescription, language, sourceCode, hintLevel) => {
  let instruction = '';
  if (hintLevel === 1) {
    instruction = "Provide a high-level conceptual hint. Do NOT mention specific code changes.";
  } else if (hintLevel === 2) {
    instruction = "Provide a stronger hint focusing on the approach or logic structure they should use. Keep it theoretical.";
  } else {
    instruction = "Provide a detailed guidance hint indicating exactly what part of their logic needs fixing, but DO NOT provide the actual fixed code.";
  }

  const prompt = `You are a programming tutor. A student needs a hint for "${problemTitle}".
Hint Level: ${hintLevel} (1=Conceptual, 2=Approach, 3=Detailed).

Problem Description:
${problemDescription}

Student's Code (${language}):
${sourceCode}

CRITICAL: NEVER provide the complete solution or actual code snippets of the solution.
${instruction}

Provide your hint in plain text.`;

  return await generateText(prompt);
};

/**
 * Debugs a failed submission.
 */
export const debugCode = async (problemTitle, language, sourceCode, status, errorMessage, output) => {
  const prompt = `You are a debugging assistant. The user's submission for "${problemTitle}" failed with status: ${status}.

Student's Code (${language}):
${sourceCode}

Error Message/Output:
${errorMessage || output || 'None'}

Analyze the failure. Do NOT provide the full corrected code.
Return ONLY valid JSON with this exact structure (no markdown, raw JSON):
{
  "whyFailed": "Brief explanation of why the code failed (e.g. out of bounds, syntax error).",
  "likelyBug": "The specific line or logic causing the issue.",
  "edgeCase": "An edge case they might have missed.",
  "suggestedDirection": "A hint on how they can fix it."
}`;

  const result = await generateText(prompt);
  try {
    return JSON.parse(result.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (e) {
    throw new Error('AI returned invalid format.');
  }
};

/**
 * Reviews code quality.
 */
export const reviewCode = async (problemTitle, language, sourceCode) => {
  const prompt = `You are a senior software engineer reviewing a PR. Review this solution for "${problemTitle}".

Code (${language}):
${sourceCode}

Return ONLY valid JSON with this exact structure (no markdown, raw JSON):
{
  "correctness": "Are there obvious logical flaws?",
  "codeQuality": "General feedback on code structure and variable naming.",
  "readability": "Is the code easy to read?",
  "complexity": "Are they using the most optimal time/space complexity?",
  "edgeCases": "Any edge cases they should be careful about?",
  "optimizations": "A specific suggestion to optimize their code without giving the full code."
}`;

  const result = await generateText(prompt);
  try {
    return JSON.parse(result.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (e) {
    throw new Error('AI returned invalid format.');
  }
};

/**
 * Generates an editorial for admins.
 */
export const generateEditorial = async (problemTitle, problemDescription, constraints, topics) => {
  const prompt = `You are an expert competitive programmer. Write a comprehensive editorial for the problem "${problemTitle}".

Description:
${problemDescription}

Constraints: ${constraints?.join(', ') || 'None'}
Topics: ${topics?.join(', ') || 'None'}

Return ONLY valid JSON with this exact structure (no markdown, raw JSON):
{
  "explanation": "Detailed explanation of the problem.",
  "approach": "Step-by-step intuitive approach to solve it.",
  "algorithm": "Detailed algorithm.",
  "complexity": "Time and Space complexity analysis.",
  "codeExplanation": "General explanation of how the code structure should look."
}`;

  const result = await generateText(prompt);
  try {
    return JSON.parse(result.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (e) {
    throw new Error('AI returned invalid format.');
  }
};

/**
 * Recommends problems based on user activity.
 */
export const recommendProblems = async (availableProblems, solvedSlugs) => {
  // Simplify available problems to avoid large payloads
  const problemData = availableProblems.map(p => ({
    title: p.title,
    slug: p.slug,
    difficulty: p.difficulty,
    topics: p.topics
  }));

  const prompt = `You are a problem recommendation engine. 
The user has already solved these problems: ${solvedSlugs.join(', ') || 'None'}.

Available Problems:
${JSON.stringify(problemData)}

Select 3-5 problems that would be good next steps for the user based on difficulty progression and topics. 
Return ONLY a JSON array of strings containing the 'slug's of the recommended problems (no markdown, raw JSON).
Example: ["two-sum", "binary-search"]`;

  const result = await generateText(prompt);
  try {
    return JSON.parse(result.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (e) {
    throw new Error('AI returned invalid format.');
  }
};

/**
 * Handles conversational chat with context.
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const chat = async (systemInstruction, contents, abortSignal) => {
  if (!aiClient) {
    return "Mock AI Response: AI is not configured. This is a mock response.";
  }

  const MAX_RETRIES = 3;
  const BACKOFF_MS = [1000, 2000, 4000];
  const serviceStart = Date.now();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const attemptStart = Date.now();
    console.log(`[AI] Gemini attempt ${attempt + 1} started`);
    try {
      const requestConfig = {
        systemInstruction: systemInstruction,
      };
      
      // If an AbortSignal is provided (to enforce maximum request timeout from controller)
      // add it to httpOptions so the SDK can abort the underlying fetch
      if (abortSignal) {
        requestConfig.httpOptions = { timeout: 25000 };
      }

      const response = await aiClient.models.generateContent({
        model: MODEL_NAME,
        config: requestConfig,
        contents: contents,
      });
      const duration = Date.now() - attemptStart;
      console.log(`[AI] Gemini attempt ${attempt + 1} completed in ${duration} ms`);
      const totalDuration = Date.now() - serviceStart;
      console.log(`[AI] Gemini final response received in ${totalDuration} ms`);
      return response.text;
    } catch (error) {
      const duration = Date.now() - attemptStart;
      
      if (error.name === 'AbortError' || error.message?.includes('abort') || abortSignal?.aborted) {
        console.warn(`[AI] Gemini attempt ${attempt + 1} aborted due to timeout in ${duration} ms`);
        throw new Error('AI service temporarily unavailable (timeout)');
      }

      const isQuotaError = error.status === 429 && error.message && (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED'));

      if (isQuotaError) {
        console.warn(`[AI] Gemini quota exhausted - not retrying`);
        const quotaErr = new Error('AI usage limit reached. Please try again later or check your Gemini API quota.');
        quotaErr.isQuotaExceeded = true;
        quotaErr.status = 429;
        throw quotaErr;
      }

      const isRetryable = error.status === 503 || error.status === 504 || (error.message && error.message.includes('503'));
      
      console.log(`[AI] Gemini attempt ${attempt + 1} returned status/error: ${error.status || 'UNKNOWN'} - ${error.message || error}`);
      console.error(`[AI] Gemini API Request failed (Attempt ${attempt + 1}/${MAX_RETRIES + 1}) in ${duration} ms:`, error.message || error);
      
      if (isRetryable && attempt < MAX_RETRIES && (!abortSignal || !abortSignal.aborted)) {
        console.log(`[AI] Gemini retry scheduled in ${BACKOFF_MS[attempt]} ms`);
        await sleep(BACKOFF_MS[attempt]);
        continue;
      }
      
      if (isRetryable) {
        throw new Error('AI is temporarily busy. Please try again in a few seconds.');
      }
      
      // Do NOT throw raw objects or let the unhandled error bubble up ungracefully
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(`AI API Error: ${error.message || 'Unknown API error'}`);
      } else {
        throw new Error('AI assistant is temporarily unavailable. Please try again.');
      }
    }
  }
};
