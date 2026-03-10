require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// API Endpoint for Prompt Analysis and Chatbot
app.post('/analyze', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // 1. Analyze the prompt and return JSON
    const systemInstruction = `
You are an expert prompt engineer and AI architect. Your task is to analyze the user's prompt and evaluate it on 5 criteria:
- Clarity: Is the prompt easy to understand?
- Specificity: Does it provide detailed and specific instructions?
- Structure: Is it well-organized and logically structured?
- Context: Does it provide necessary background context?
- Instruction Strength: Are the directives robust and actionable?

Assign a master score out of 100 representing the Prompt Intelligence Meter.
Also, highlight weak words (vague or poor context) and strong words (clear and actionable).
Rewrite the prompt into two progressive stages:
1. Improved Prompt: A slightly better structured version of the original.
2. Expert Prompt: A flawless, highly detailed version using expert prompting techniques (role-play, specific constraints, output format).

Finally, act as a chatbot answering the EXPERT PROMPT.

Respond STRICTLY in the following JSON format without any markdown wrappers or additional text:
{
  "score": 85,
  "analysis": {
    "clarity": "Feedback on clarity...",
    "specificity": "Feedback on specificity...",
    "structure": "Feedback on structure...",
    "context": "Feedback on context...",
    "instruction_strength": "Feedback on instruction strength..."
  },
  "heatmap": [
    {"word": "Make", "type": "weak"},
    {"word": "a", "type": "neutral"},
    {"word": "comprehensive", "type": "strong"},
    {"word": "list", "type": "neutral"}
  ],
  "evolution": {
    "improved": "The improved prompt text...",
    "expert": "The expert prompt text..."
  },
  "chatbot_response": "The actual response to the user's intended request..."
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text);

    res.json(result);

  } catch (error) {
    console.error("Error communicating with Gemini API:", error);
    res.status(500).json({ error: "Failed to process prompt. Please ensure your Gemini API key is correct and try again." });
  }
});

app.listen(PORT, () => {
  console.log(`PromptMind server running on http://localhost:${PORT}`);
});
