import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../Desktop/AMAN KHAN/CodeArena/backend/.env') });

const aiClient = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });
const MODEL_NAME = process.env.AI_MODEL || 'gemini-2.5-flash';

console.log('Using API Key starts with:', process.env.AI_API_KEY ? process.env.AI_API_KEY.substring(0, 5) : 'MISSING');
console.log('Using Model:', MODEL_NAME);

async function run() {
  try {
    const response = await aiClient.models.generateContent({
      model: MODEL_NAME,
      contents: "Reply with exactly: CodeArena AI test successful",
    });
    console.log('Response:', response.text);
  } catch (err) {
    console.error('Error generated:', err);
  }
}
run();
