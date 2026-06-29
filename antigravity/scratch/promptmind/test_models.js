require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function test() {
  try {
    console.log("Using API Key:", process.env.GEMINI_API_KEY ? "FOUND" : "MISSING");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    console.log("Testing models...");
    const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-8b'];
    
    for (const m of models) {
      try {
        console.log(`Testing model: ${m}...`);
        const response = await ai.models.generateContent({
          model: m,
          contents: "Hello, answer in 1 word.",
        });
        console.log(`[SUCCESS] ${m} responded: "${response.text.trim()}"`);
      } catch (e) {
        console.log(`[FAILED] ${m}: ${e.message || e}`);
      }
    }
  } catch (err) {
    console.error("Diagnostic error:", err);
  }
}

test();
