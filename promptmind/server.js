require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public', { extensions: ['html'] }));

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
Assign individual scores (0 to 100) and specific feedback text for each of the 5 criteria.

Also, perform a word-by-word/phrase lexical analysis of the original prompt. Identify:
- strong words (type: "strong"): words/phrases that are precise, actionable, clear, or set solid boundaries/directives. Explain why, and don't provide suggested replacements.
- weak words (type: "weak"): words/phrases that are vague, generic, passive, or lack context. Explain why, and provide 2-4 premium, active, professional suggested replacements.
- neutral words (type: "neutral"): words that are prepositions, articles, or simple helper words. No reason or suggestions needed.

Next, map the prompt's DNA (its structural components). Evaluate whether the following 5 blocks are present:
1. "role": Directives defining who the AI is acting as (e.g. "Act as a senior software architect...").
2. "task": The primary objective or query (e.g. "Create a list of ideas...").
3. "constraints": Explicit boundaries, limitations, rules, or guidelines.
4. "context": Relevant background information or domain specifications.
5. "format": Exact output layout requirements (e.g. JSON format, tables, markdown list).
For each component, return a JSON object with:
- "present": boolean (true/false)
- "text": string containing the extracted text from the original prompt representing this block, or null if missing
- "feedback": string detailing its quality if present, or explaining exactly how injecting this block will dramatically improve the prompt if missing.

Next, compile simulated benchmark scores (0 to 100) and brief suitability evaluations for major models:
1. "gemini_flash"
2. "gemini_pro"
3. "gpt_4o"
4. "claude_sonnet"

Rewrite the prompt into two progressive stages:
1. Improved Prompt: A slightly better structured version of the original.
2. Expert Prompt: A flawless, highly detailed version using expert prompting techniques (role-play, specific constraints, clear formatting, and multi-shot templates if appropriate).

Finally, act as a chatbot answering the EXPERT PROMPT.

Respond STRICTLY in the following JSON format without any markdown wrappers, code blocks, or additional text:
{
  "score": 85,
  "analysis": {
    "clarity": {
      "score": 80,
      "feedback": "Feedback on clarity..."
    },
    "specificity": {
      "score": 75,
      "feedback": "Feedback on specificity..."
    },
    "structure": {
      "score": 90,
      "feedback": "Feedback on structure..."
    },
    "context": {
      "score": 60,
      "feedback": "Feedback on context..."
    },
    "instruction_strength": {
      "score": 85,
      "feedback": "Feedback on instruction strength..."
    }
  },
  "heatmap": [
    {"word": "Make", "type": "weak", "reason": "Lacks specific action. Use more descriptive verbs.", "suggested": ["Construct", "Formulate", "Design"]},
    {"word": "a", "type": "neutral"},
    {"word": "comprehensive", "type": "strong", "reason": "Sets high standard for thoroughness."}
  ],
  "dna": {
    "role": { "present": true, "text": "Act as an expert...", "feedback": "Solid persona setup." },
    "task": { "present": true, "text": "Make a list...", "feedback": "Clear task description." },
    "constraints": { "present": false, "text": null, "feedback": "Missing constraints. Adding specific constraints (e.g. word count, format exceptions) will raise Specificity score by +15." },
    "context": { "present": false, "text": null, "feedback": "No domain context. Outlining LEGACY systems or business domain will raise Context score by +20." },
    "format": { "present": true, "text": "markdown format...", "feedback": "Good output format instruction." }
  },
  "benchmark": {
    "gemini_flash": { "score": 85, "suitability": "Highly suitable. Rapid execution of straightforward tasks." },
    "gemini_pro": { "score": 95, "suitability": "Exceptional. Perfect for parsing complex structural blocks." },
    "gpt_4o": { "score": 90, "suitability": "Very strong. Adheres well to strict list formats." },
    "claude_sonnet": { "score": 92, "suitability": "Excellent. Highly creative analytical detail." }
  },
  "evolution": {
    "improved": "The improved prompt text...",
    "expert": "The expert prompt text..."
  },
  "chatbot_response": "The actual response to the user's intended request..."
}
`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let responseText = null;
    let success = false;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting neural analysis with model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
          }
        });
        responseText = response.text;
        success = true;
        break; 
      } catch (err) {
        console.warn(`Model ${modelName} failed:`, err.message || err);
        lastError = err;
      }
    }

    if (!success) {
      console.warn("API quota exhausted or server error. Falling back to local cognitive simulator!");
      const result = localAnalyzePrompt(prompt);
      return res.json(result);
    }

    try {
      const result = cleanAndParseJson(responseText);
      res.json(result);
    } catch (parseError) {
      console.warn("Real Gemini response received but JSON parse failed. Falling back to local simulator. Error:", parseError.message);
      const result = localAnalyzePrompt(prompt);
      res.json(result);
    }

  } catch (error) {
    console.error("Error communicating with Gemini API, entering local cognitive fallback:", error);
    try {
      const result = localAnalyzePrompt(req.body.prompt);
      res.json(result);
    } catch (fallbackError) {
      res.status(500).json({ error: "Failed to process prompt. Please try again." });
    }
  }
});

// New API Endpoint for Interactive DNA Block Auto-Injection
app.post('/inject-block', async (req, res) => {
  try {
    const { prompt, blockType, blockFeedback } = req.body;

    if (!prompt || !blockType) {
      return res.status(400).json({ error: "Prompt and block type are required" });
    }

    const systemInstruction = `
You are an expert prompt engineer and AI architect. The user has a prompt and wants to improve it by injecting a missing prompt block: "${blockType}".
The active prompt is:
"${prompt}"

The analysis feedback for this missing block is:
"${blockFeedback}"

Generate ONLY the high-quality, professional, and descriptive prompt block text that should be injected.
For example:
- If blockType is "role": generate a comprehensive roleplay instruction (e.g. "Act as a Senior Database Architect with 15 years of experience in distributed systems...")
- If blockType is "constraints": generate a robust bullet-point list of critical constraints and rules.
- If blockType is "format": generate detailed structure, output expectations, or schemas (e.g. JSON format with specific keys).
- If blockType is "context": generate relevant background context and situational settings tailored to the prompt's intent.

Rules:
1. Provide ONLY the text of the block to be appended/inserted. Do not include markdown code block wrappers (like \`\`\`), introductions, or conversational filler. Output the raw text of the segment only.
2. Make it highly professional and directly tailored to the user's active prompt.
`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let blockText = "";
    let success = false;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting block injection with model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: systemInstruction,
          }
        });
        blockText = response.text.trim();
        success = true;
        break;
      } catch (err) {
        console.warn(`Model ${modelName} failed for block injection:`, err.message || err);
        lastError = err;
      }
    }

    if (!success) {
      console.warn("API quota exhausted or server error for block injection. Falling back to local block simulator!");
      const blockTextFallback = localInjectBlock(prompt, blockType);
      return res.json({ blockText: blockTextFallback });
    }

    res.json({ blockText });

  } catch (error) {
    console.error("Error generating injection block, entering local fallback:", error);
    try {
      const blockTextFallback = localInjectBlock(req.body.prompt, req.body.blockType);
      res.json({ blockText: blockTextFallback });
    } catch (fallbackError) {
      res.status(500).json({ error: "Failed to generate prompt block. Please try again." });
    }
  }
});

/* =======================================
   ROBUST JSON CLEANER & HEALER
   ======================================= */

function cleanAndParseJson(str) {
  if (!str) throw new Error("Empty response text");
  
  let clean = str.trim();
  
  // 1. Strip markdown fences if present
  if (clean.includes("```")) {
    const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      clean = match[1].trim();
    } else {
      clean = clean.replace(/```json/gi, "").replace(/```/g, "").trim();
    }
  }
  
  // 2. Locate first '{' and last '}' to strip any surrounding conversational chatter
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }
  
  // 3. Balance braces/brackets if minor truncation occurred
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;
  
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;
    }
  }
  
  if (inString) {
    clean += '"';
  }
  while (openBrackets > 0) {
    clean += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    clean += '}';
    openBraces--;
  }

  // 4. Handle raw control characters in string literals
  let sanitized = "";
  let inValString = false;
  let prevChar = "";
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === '"' && prevChar !== '\\') {
      inValString = !inValString;
    }
    if (inValString) {
      if (char === '\n') {
        sanitized += '\\n';
      } else if (char === '\r') {
        sanitized += '\\r';
      } else if (char === '\t') {
        sanitized += '\\t';
      } else {
        sanitized += char;
      }
    } else {
      sanitized += char;
    }
    prevChar = char;
  }
  
  return JSON.parse(sanitized);
}

/* =======================================
   LOCAL COGNITIVE SIMULATION FALLBACKS
   ======================================= */

function localAnalyzePrompt(prompt) {
  console.log("Applying Local Cognitive Handshake for prompt:", prompt);
  
  const promptLower = prompt.toLowerCase();
  
  // 1. Dynamic Score Evaluation based on actual text characteristics
  const isShort = prompt.trim().length < 15;
  const hasBullets = /[\-\*\d\.]/.test(prompt);
  
  const clarityScore = isShort ? 45 : (prompt.length > 50 ? 90 : 75);
  const specificityScore = (promptLower.includes('must') || promptLower.includes('never') || promptLower.includes('constraint') || promptLower.includes('specifically') || prompt.length > 100) ? 88 : 40;
  const structureScore = (prompt.includes('\n') || prompt.includes(';') || hasBullets) ? 85 : 35;
  const contextScore = /\b(for|in|context|background|setting|legacy|college|srkr|company|system)\b/.test(promptLower) ? 90 : 30;
  const strengthScore = /\b(analyze|architect|design|implement|refine|audit|construct|orchestrate|compile|engineer)\b/.test(promptLower) ? 85 : 45;
  
  const masterScore = Math.round((clarityScore + specificityScore + structureScore + contextScore + strengthScore) / 5);

  const analysis = {
    clarity: { 
      score: clarityScore, 
      feedback: clarityScore >= 75 ? "Clear input intent parsed successfully." : "The prompt is relatively short or vague. Adding direct objects and clarifying your core question will raise this score." 
    },
    specificity: { 
      score: specificityScore, 
      feedback: specificityScore >= 75 ? "Highly specific parameters and boundaries parsed." : "Missing quantitative targets, version numbers, or exact scope boundaries." 
    },
    structure: { 
      score: structureScore, 
      feedback: structureScore >= 75 ? "Excellent structural layout with line-breaks or delimiters." : "Single raw string compiled. Structuring with Markdown headings or numbered lists would raise structure by +25." 
    },
    context: { 
      score: contextScore, 
      feedback: contextScore >= 75 ? "Target domain environment and background identified." : "No background setting outlined. Specifying the target platform, business domain, or audience increases understanding." 
    },
    instruction_strength: { 
      score: strengthScore, 
      feedback: strengthScore >= 75 ? "Strong imperative action verb detected." : "Vague or passive commands used. Start with active direct verbs like 'Orchestrate', 'Formulate', or 'Audit'." 
    }
  };

  // 2. Programmatic heatmapping of actual words in the prompt
  const words = prompt.split(/(\s+)/);
  const weakWords = ['make', 'do', 'get', 'try', 'stuff', 'thing', 'ideas', 'good', 'nice', 'bad', 'how to', 'create', 'collage', 'write', 'explain', 'tell', 'show', 'easy'];
  const strongWords = ['analyze', 'architect', 'formulate', 'construct', 'audit', 'design', 'evaluate', 'implement', 'bhimavaram', 'srkr', 'secure', 'optimize', 'dynamic', 'relational', 'concurrency', 'deadlock', 'asynchronous', 'cognitive', 'matrix', 'paradigm', 'polymorphism', 'inheritance', 'encapsulation', 'abstraction'];
  
  const heatmap = [];
  words.forEach(word => {
    if (!word.trim()) {
      heatmap.push({ word, type: 'neutral' });
      return;
    }
    const clean = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (weakWords.includes(clean)) {
      let suggested = ["Formulate", "Design", "Construct"];
      let reason = "Vague lexical choice. Diminishes instruction clarity.";
      if (clean === 'create' || clean === 'make') {
        suggested = ["Engineer", "Orchestrate", "Structure"];
      } else if (clean === 'how to' || clean === 'explain') {
        suggested = ["Outline", "Deconstruct", "Formulate"];
      } else if (clean === 'ideas') {
        suggested = ["paradigms", "blueprints", "strategies"];
      } else if (clean === 'collage') {
        suggested = ["College", "Institution", "University"];
        reason = "Potential informal shorthand or spelling. Standardize academic terms.";
      }
      heatmap.push({ word, type: 'weak', reason, suggested });
    } else if (strongWords.includes(clean)) {
      heatmap.push({ 
        word, 
        type: 'strong', 
        reason: "Excellent professional term. Enhances instruction authority." 
      });
    } else {
      heatmap.push({ word, type: 'neutral' });
    }
  });

  // 3. DNA Toggles evaluation
  const rolePresent = /\b(act as|role|avatar|persona|expert|senior|specialist|consultant|developer|architect|engineer|tester)\b/.test(promptLower);
  const taskPresent = /\b(create|generate|write|make|analyze|design|implement|outline|how to|build|explain|tell|audit)\b/.test(promptLower);
  const constraintsPresent = /\b(constraint|rule|must|never|limit|do not|strictly|scope|boundaries|requirements)\b/.test(promptLower);
  const contextPresent = /\b(context|background|setting|domain|srkr|bhimavaram|college|company|system|project|environment)\b/.test(promptLower);
  const formatPresent = /\b(format|layout|json|markdown|table|csv|list|schema|wireframe|diagram)\b/.test(promptLower);

  const dna = {
    role: {
      present: rolePresent,
      text: rolePresent ? "Act as an expert..." : null,
      feedback: rolePresent ? "Verified. Expert role persona aligns model stance." : "Missing role persona. Injecting a specific professional avatar (e.g. Senior Database Architect) will refine scope by +15."
    },
    task: {
      present: taskPresent,
      text: taskPresent ? prompt.substring(0, 80) + "..." : null,
      feedback: taskPresent ? "Verified. Clear task objective detected." : "Missing clear objective directive. State precisely what you want to construct."
    },
    constraints: {
      present: constraintsPresent,
      text: constraintsPresent ? "Constraints verified." : null,
      feedback: constraintsPresent ? "Verified. Rigid operational boundaries defined." : "Missing boundaries. Outline explicit limitations (e.g. file formats, word limits) to raise Specificity by +20."
    },
    context: {
      present: contextPresent,
      text: contextPresent ? "Domain context verified." : null,
      feedback: contextPresent ? "Verified. Rich situational settings parsed." : "Missing context. Providing architectural settings (e.g. SRKR Engineering College registrar database) increases model alignment."
    },
    format: {
      present: formatPresent,
      text: formatPresent ? "Format instructions integrated." : null,
      feedback: formatPresent ? "Verified. Explicit output schema parsed." : "Missing layout rules. Requesting specific structures (e.g. relational Markdown tables) eliminates conversational filler."
    }
  };

  // 4. Topic Categorization & Conversational Chatbot Response
  let chatbot_response = "";
  
  // Topic classifier checks
  const isGreeting = /\b(hello|hi|hey|greetings|who are you|what is your name|who created you|help|info|thanks|thank you)\b/.test(promptLower);
  const isOops = /\b(oops|oop|object oriented|inheritance|polymorphism|encapsulation|abstraction|class|object)\b/.test(promptLower) && !promptLower.includes('srkr');
  const isDeadlock = /\b(deadlock|deadlocks|concurrency|mutex|semaphore)\b/.test(promptLower);
  const isPromptEng = /\b(prompt|engineering|ai|llm|gpt|claude|gemini)\b/.test(promptLower) && !isGreeting && !promptLower.includes('srkr');
  const isSrkr = promptLower.includes('srkr') || promptLower.includes('bhimavaram') || (promptLower.includes('college') && promptLower.includes('website'));
  
  // Language Specific checks
  const isPython = /\b(python|py)\b/.test(promptLower) && !isGreeting;
  const isJavaScript = /\b(javascript|js|node|express)\b/.test(promptLower) && !isGreeting;
  const isSql = /\b(database|sql|postgresql|mysql|mongodb|query)\b/.test(promptLower);
  const isGit = /\b(git|github|version control)\b/.test(promptLower);

  if (isGreeting) {
    chatbot_response = `### 🌐 Greetings, Operator! Welcome to PromptMind Cognitive Portal
    
I am **PromptMind Core-v2**, your local offline Cognitive Interface. I monitor prompt syntax, compile analytical heatmaps, and help you engineer production-ready AI directives.

---

#### 🛠️ Operational Command Suite
Here are the primary channels of my interface that you can leverage:
1. **Interactive Prompt Hub**: Type any standard prompt to receive structured lexical heatmap audits and DNA parsing.
2. **Cognitive DNA Synthesizer (Right Sidebar)**: Click any missing block button (Role, Task, Constraints, Context, Format) to automatically inject optimized segments into your active prompt.
3. **Model Benchmarking Portal (/matrix.html)**: Test and compare performance matrices of major models (Gemini Flash, Gemini Pro, GPT-4o, Claude Sonnet).
4. **Achievements Vault (/achievements.html)**: Track your gamified progress badges, restore old prompts via the "Time Machine," and study expert prompt templates in the cybernetic Lore Books.

*If you hit rate-limits with the Gemini API, I automatically engage our Local Cognitive Fallback to keep your workflows active! Ask me any programming or prompt engineering query, and I will dissect it for you.*`;
  }
  else if (isOops) {
    chatbot_response = `### 🧠 Object-Oriented Programming (OOP) Paradigm Blueprint

**Object-Oriented Programming (OOP)** is a computer programming paradigm that organizes software design around data, or **Objects**, rather than functions and logic. An object represents a specific instance of a class, combining properties (attributes) and behaviors (methods) in a unified structure.

---

#### 🏛️ The 4 Pillars of OOP
1. **Encapsulation**: Bundling state (data) and behavior (methods) inside a single unit (class), and restricting direct access to object internals using visibility modifiers (private, protected, public).
2. **Abstraction**: Hiding complex implementation details and exposing only essential interfaces. This simplifies interaction and reduces coupling.
3. **Inheritance**: The mechanism by which a child class derives attributes and methods from a parent class, promoting code reusability.
4. **Polymorphism**: The ability for different classes to be treated as instances of the same parent class, allowing a single interface to represent multiple distinct behaviors (via Method Overriding or Overloading).

---

#### 💻 Interactive Code Blueprint (JavaScript ES6)
\`\`\`javascript
// 1. Abstraction & Encapsulation
class AcademicUnit {
    #budget = 100000; // Encapsulated private field

    constructor(name) {
        this.name = name; // Public property
    }

    getBudget() { return this.#budget; } // Getter interface
    setBudget(val) { if(val > 0) this.#budget = val; }
}

// 2. Inheritance
class Department extends AcademicUnit {
    constructor(name, head) {
        super(name);
        this.head = head;
    }

    // 3. Polymorphism (Method Overriding)
    describe() {
        return \`Department of \${this.name}, managed by Dr. \${this.head}.\`;
    }
}
\`\`\`

---

#### 📊 Paradigm Comparison Matrix

| Objective / Aspect | Object-Oriented (OOP) | Procedural (POP) | Functional (FP) |
| :--- | :--- | :--- | :--- |
| **Focus** | Data & Objects | Sequential Steps / Subroutines | Immutable Functions & Math |
| **State Management** | Encapsulated inside instances | Global/Local variables | Stateless, side-effect free |
| **Reusability** | Via Inheritance & Classes | Via Functions & Modules | Via Higher-Order Functions |
| **Best Suited For** | Large systems, GUIs, Game Dev | Simple scripts, OS kernels | Data processing, Concurrency |`;
  }
  else if (isDeadlock) {
    chatbot_response = `### 🛑 Concurrency Deadlocks: Systems Architecture Guide

A **Deadlock** is an undesirable condition in concurrent programming where two or more threads (or processes) are blocked indefinitely, each waiting for a resource held by the other. This locks the application state and halts operational progress.

---

#### 📐 The 4 Coffman Conditions
A deadlock can arise if and *only* if all four of these conditions hold simultaneously:
1. **Mutual Exclusion**: At least one resource must be held in a non-shareable mode (only one process can use it at a time).
2. **Hold and Wait**: A process must currently hold at least one resource and be waiting to acquire additional resources held by other processes.
3. **No Preemption**: Resources cannot be forcibly taken from a process; they can only be released voluntarily by the holding process.
4. **Circular Wait**: Process $P_0$ is waiting for resource held by $P_1$, which is waiting for $P_2$, ..., which is waiting for $P_0$, forming a closed loop.

---

#### 🛠️ Deadlock Mitigation Strategies

| Strategy | Methodology | Key Algorithm / Tactic | Pros & Cons |
| :--- | :--- | :--- | :--- |
| **Prevention** | Design the system to ensure at least one Coffman condition is impossible. | Enforce global acquisition ordering on all locks (negates Circular Wait). | Highly secure, but can severely limit runtime performance. |
| **Avoidance** | Dynamically check state safety before allocating resources. | **Banker's Algorithm** (tracks available vs requested resources dynamically). | Maximizes resource usage, but requires knowing resource demands in advance. |
| **Detection & Recovery**| Allow deadlocks to happen, detect them, and resolve immediately. | Resource Allocation Graphs (RAG) + cycle detection algorithms. | Minimal overhead in safety-mode, but recovery can require terminating threads. |

---

#### 💻 Secure Multi-Lock Acquisition Blueprint (JS Async)
\`\`\`javascript
// Preventing Circular Wait by enforcing global lock ordering
async function acquireResourcesSecurely(resourceA, resourceB) {
    // Enforce ordering based on unique resource IDs
    const [first, second] = resourceA.id < resourceB.id ? 
                            [resourceA, resourceB] : [resourceB, resourceA];
                            
    await first.lock();
    try {
        await second.lock();
        // Execute critical section...
    } finally {
        second.unlock();
        first.unlock();
    }
}
\`\`\``;
  }
  else if (isPromptEng) {
    chatbot_response = `### 🧠 Prompt Engineering: The Art of Instructing Generative AI

**Prompt Engineering** is the practice of designing, structuring, and refining textual inputs to guide Generative AI models (like Gemini, GPT, and Claude) to produce highly optimal, accurate, and structured responses. It is the core programming framework of the Generative Era.

---

#### 🔬 Structural DNA Components
An advanced, production-grade prompt is composed of 5 distinct structural layers:
1. **Role (Persona)**: Instructs the AI *who* it represents (e.g., "Act as a Lead Security Auditor...").
2. **Task (Directive)**: States clearly *what* the AI must calculate, build, or analyze.
3. **Constraints (Boundaries)**: Lists strict rules, exclusions, and formatting guidelines.
4. **Context (Background)**: Supplies relevant domain parameters, environment details, or codebase settings.
5. **Format (Layout)**: Defines the exact structure of the output (e.g., Markdown sitemap, database schema table, JSON object).

---

#### 🎛️ Key Prompting Methodologies
* **Zero-Shot Prompting**: Querying the model without providing any examples. Best for simple, standard tasks.
* **Few-Shot Prompting**: Calibrating the model by providing 2-4 examples of ideal input-output pairs. Essential for strict schema matching.
* **Chain of Thought (CoT)**: Instructing the model to "think step-by-step" before delivering its final answer. This forces the model to compute logical sub-steps first, raising mathematical and analytical precision.

---

#### 🛠️ Pro-Tips for Prompt Design
* **Use Imperative Directives**: Start your prompt with strong, active verbs (e.g., *Orchestrate*, *Audit*, *Deconstruct*, *Synthesize*).
* **Define Constraints Exclusions**: Clearly declare what the model must *never* do.
* **Request Tabular Schemas**: For complex data comparisons, request Markdown tables to force neat structural alignment.`;
  }
  else if (isSrkr) {
    chatbot_response = `### 🌐 SRKR Engineering College (Bhimavaram) Web Portal Blueprint

To build a state-of-the-art academic portal for **SRKR Engineering College, Bhimavaram**, you should execute a multi-phase development strategy. Below is a comprehensive architectural guide detailing the recommended technology stack, modular sitemap, and core database schema:

---

#### 1. Recommended Technology Stack
* **Frontend**: React (or Next.js) styled with Tailwind CSS for glassmorphic, responsive user dashboards.
* **Backend**: Node.js with Express.js (REST API server) running a secure middleware architecture.
* **Database**: PostgreSQL (relational DB) for structured student records, grades, and admissions details.
* **Authentication**: JSON Web Tokens (JWT) + bcrypt for password encryption.

---

#### 2. Site Architecture & Feature Sitemap
1. **Public Portal**:
   * *Admissions Hub*: Online applications, fee details, and college prospectus.
   * *About SRKR*: Departments (CSE, ECE, MECH, etc.), faculty directories, and campus news.
2. **Student / Faculty Dashboard (Secure Uplink)**:
   * *Gradebook Module*: View semester credits, GPA calculators, and assignments.
   * *Attendance Tracker*: Real-time lecture log and warnings.
   * *LMS Integration*: Course download files, lecture notes, and assignments submission.
3. **Alumni Network & Careers Portal**: Connect active students with SRKR graduates globally.

---

#### 3. Core Database Schema Matrix (PostgreSQL Schema)

| Table Name | Column Name | Data Type | Key Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Students** | student_id | SERIAL | PRIMARY KEY | Unique ID for each student |
| | first_name | VARCHAR(50) | NOT NULL | Student's given name |
| | department | VARCHAR(10) | NOT NULL | e.g. 'CSE', 'ECE', 'MECH' |
| | admission_year| INT | NOT NULL | e.g. 2026 |
| **Courses** | course_code | VARCHAR(10) | PRIMARY KEY | e.g. 'CS301' (Web Dev) |
| | course_name | VARCHAR(100) | NOT NULL | Course description |
| | credits | INT | NOT NULL | Semester credits value |
| **Enrollments**| enrollment_id | SERIAL | PRIMARY KEY | Unique record ID |
| | student_id | INT | FOREIGN KEY | Links to Students table |
| | course_code | VARCHAR(10) | FOREIGN KEY | Links to Courses table |
| | semester_grade| CHAR(2) | DEFAULT 'I' | e.g. 'A+', 'B', 'I' (Incomplete)|

---

#### 4. Step-by-Step Implementation Roadmap
* **Phase A: Wireframing & Design**: Formulate interface wireframes for the Student Dashboard using Figma.
* **Phase B: Backend API Development**: Implement the REST API server using Express. Setup PostgreSQL connections.
* **Phase C: Frontend Integration**: Build the dynamic student UI. Bind the login/gradebook actions with your backend APIs.
* **Phase D: Deployment**: Package inside Docker container units and deploy on local institutional servers.`;
  }
  else if (isPython) {
    chatbot_response = `### 🐍 Python Technical Architecture & Best Practices

**Python** is an interpreted, high-level, general-purpose programming language. Its design philosophy emphasizes code readability with its notable use of significant whitespace (indentation).

---

#### 🚀 Key Language Paradigm Principles
1. **Dynamic and Strong Typing**: Python binds types at runtime but enforces strict type compliance (e.g., executing \`"2" + 2\` throws a \`TypeError\`).
2. **The Zen of Python (PEP 20)**: Highlights guidelines such as *"Beautiful is better than ugly"*, *"Explicit is better than implicit"*, and *"Simple is better than complex"*.
3. **Memory Management**: Uses automatic Garbage Collection with Reference Counting + Cyclic Garbage Collector.

---

#### 💻 Professional Code Segment (Decorators & Comprehensions)
\`\`\`python
# 1. Performance Profiler Decorator
import time
from functools import wraps

def time_analysis(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        duration = time.perf_counter() - start
        print(f"[METRIC] {func.__name__} completed in {duration:.6f}s")
        return result
    return wrapper

# 2. Optimized List Comprehension with profiling
@time_analysis
def calculate_matrix_squares(size: int):
    return [i * i for i in range(size) if i % 2 == 0]
\`\`\`

---

#### 📊 Performance Trade-off Comparison

| Parameter | Standard Python (CPython) | PyPy (JIT Compiler) | Go / C++ |
| :--- | :--- | :--- | :--- |
| **Execution Model** | Bytecode Interpreted | Just-In-Time compiled | Compiled directly to native machine code |
| **Speed Benchmark** | Baseline ($1\times$) | $2\times$ to $10\times$ faster than CPython | $30\times$ to $100\times$ faster than CPython |
| **Best Suited For** | Prototyping, ML, Data Science | Long-running server processes | System software, High-performance engines |`;
  }
  else if (isJavaScript) {
    chatbot_response = `### 🟨 JavaScript / Node.js Engine Architecture

**JavaScript** is a high-level, single-threaded, event-driven language. Combined with the **Node.js** runtime environment (built on Chrome's V8 engine), it permits highly concurrent, non-blocking network engineering using asynchronous patterns.

---

#### 🚀 Core Architectural Pillars
1. **Single-Threaded Event Loop**: Coordinates synchronous script executions, handles asynchronous microtasks (Promises) and macrotasks (setTimeout, fetch) in sequence without thread blocking.
2. **Asynchronous Non-Blocking I/O**: Node delegates system operations (file reads, network sockets) to Libuv, which executes them in thread pools or kernel interfaces, calling the JS callback when complete.
3. **Prototypal Inheritance**: Objects inherit properties directly from other objects via their prototype chain links.

---

#### 💻 Asynchronous Middleware Integration (Express)
\`\`\`javascript
const express = require('express');
const app = express();

// Custom middleware with response time profiling
app.use((req, res, next) => {
    const start = process.hrtime();
    res.on('finish', () => {
        const diff = process.hrtime(start);
        const timeMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
        console.log(\`[UPLINK] \${req.method} \${req.url} - Completed in \${timeMs}ms\`);
    });
    next();
});
\`\`\`

---

#### 📊 Execution Target Matrix

| JavaScript Concept | Microtask | Macrotask | Synchronous Thread |
| :--- | :--- | :--- | :--- |
| **Examples** | \`Promise.then()\`, \`process.nextTick()\` | \`setTimeout()\`, \`setInterval()\`, I/O | Immediate loops, Object creation |
| **Priority** | High (Drains completely before next tick) | Low (Runs one at a time per loop cycle) | Highest (Blocks event loop entirely) |`;
  }
  else if (isSql) {
    chatbot_response = `### 🗄️ Relational Database & SQL Design Blueprint

A **Relational Database Management System (RDBMS)** manages structured data mapped in tables, utilizing **SQL (Structured Query Language)** for transactional manipulations. Relational design prioritizes data normalization, referential integrity, and ACID execution safety.

---

#### 💎 ACID Properties of Transactions
1. **Atomicity**: The "All or Nothing" rule. If a single operation inside a transaction fails, the entire transaction is rolled back.
2. **Consistency**: Transactions must transition the database from one valid state to another, complying with all constraints.
3. **Isolation**: Concurrent transactions must execute without interfering with one another.
4. **Durability**: Once a transaction is committed, its changes are permanently recorded in the storage medium.

---

#### 💻 Normalization Table Joins (PostgreSQL Schema)
\`\`\`sql
-- Creating normalized 1-to-many relationship
CREATE TABLE Instructors (
    instructor_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(50)
);

CREATE TABLE Seminars (
    seminar_id INT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    instructor_id INT,
    FOREIGN KEY (instructor_id) REFERENCES Instructors(instructor_id) ON DELETE SET NULL
);

-- Retrieve join records
SELECT s.title, i.name AS instructor_name
FROM Seminars s
INNER JOIN Instructors i ON s.instructor_id = i.instructor_id;
\`\`\`

---

#### 📊 RDBMS (SQL) vs NoSQL (Document) Matrix

| Architectural Feature | Relational (SQL - e.g. PostgreSQL) | Document (NoSQL - e.g. MongoDB) |
| :--- | :--- | :--- |
| **Schema** | Rigid, defined columns, normalization | Dynamic, nested JSON-like documents |
| **Scalability** | Vertical (Scale CPU/RAM) | Horizontal (Sharding across servers) |
| **Data Integrity** | Strict Foreign Keys, ACID constraints | Flexible constraints, BASE properties |`;
  }
  else if (isGit) {
    chatbot_response = `### 🌿 Git & Distributed Version Control Architecture

**Git** is a distributed version control system designed to track file revisions across collaborative environments. Rather than storing diffs, Git structures revision histories as snapshots of a directed acyclic graph (DAG) of commits.

---

#### 📐 Core Git Architecture Layers
1. **Working Directory**: The actual sandbox files on your local filesystem.
2. **Staging Area (Index)**: A preparation layer holding files mapped to be committed in the next revision snapshot.
3. **Local Repository**: The \`.git\` catalog containing committed history states.
4. **Remote Repository**: The remote platform (e.g., GitHub, GitLab) coordinating sync.

---

#### 💻 Essential Version Control Commands
*   **Create Branch & Switch**: \`git checkout -b feature/cognitive-ui\`
*   **Merge Revisions**: \`git merge main\`
*   **Rebase Revisions**: \`git rebase main\`
*   **Stage & Commit**:
    \`\`\`bash
    git add public/script.js
    git commit -m "feat: implement bulletproof JSON healing"
    \`\`\`

---

#### 📊 Merge vs Rebase Comparison

| Operation | Methodology | Visual History | Best Used For |
| :--- | :--- | :--- | :--- |
| **Merge** | Combines histories with a single Merge Commit. | Branch branches remain distinct and visible. | Keeping a complete, unedited chronological record of collaborative events. |
| **Rebase** | Relocates your branch commits onto another base commit. | Flattens commits into a single straight line. | Cleaning up local branch commits before publishing to a public repository. |`;
  }
  else {
    // 5. Dynamic Concept Extractor Fallback
    const subjectRaw = prompt.replace(/\b(what is|explain|tell me about|how to|create|make|design|audit|what is a|explain about|give me a)\b/gi, '').replace(/[?.]/g, '').trim();
    const subject = subjectRaw ? (subjectRaw.charAt(0).toUpperCase() + subjectRaw.slice(1)) : "Cognitive Synthesis";
    
    let directiveVerb = "Synthesize";
    if (promptLower.includes('how to')) directiveVerb = "Outline the operational roadmap";
    else if (promptLower.includes('create') || promptLower.includes('make')) directiveVerb = "Architect the generation sequence";
    else if (promptLower.includes('explain')) directiveVerb = "Deconstruct structural elements";
    
    chatbot_response = `### 🧠 Cognitive Solution Architect: ${subject}

To address your query regarding **"${subject}"**, we apply the **PromptMind Cognitive Framework** to deconstruct requirements, analyze parameters, and formulate a highly robust implementation guide.

---

#### 1. Strategic Structural Analysis
*   **Directive Action**: ${directiveVerb} for **"${subject}"**.
*   **System Target**: Deconstruct standard architectural variables and align semantic intent.
*   **Primary Deliverable**: Formulate an authoritative reference blueprint tailored to this concept.

---

#### 2. Key Conceptual Principles
To fully master **"${subject}"**, you must implement three primary operational guidelines:
1.  **Component Encapsulation**: Isolate variables and modularize interfaces. This guarantees high modularity and low system coupling.
2.  **Explicit Boundary Constraints**: Define clear operational parameters, size limitations, and failure boundaries to avoid runaway executions.
3.  **Comprehensive Validation**: Enforce automated testing (unit tests, assertions) and manual auditing checklists to guarantee state correctness under spikes.

---

#### 3. Conceptual Reference Model Matrix
Below is a structured comparative roadmap designed for planning and execution:

| Implementation Phase | Key Objective | Primary Tactic | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **Phase I: Mapping** | Dissect situational variables and background parameters. | Heuristics scanning & context gathering. | Complete domain model blueprint. |
| **Phase II: Coding** | Synthesize core program layers and data storage structures. | Modern clean coding & encapsulation. | Functional modular components. |
| **Phase III: Audit** | Audit performance metrics and catch operational bottlenecks. | Load testing, diagnostics log analysis. | Optimized production-grade release. |

---

#### 💡 Prompt Engineering Guidance
To elevate the response quality of standard AI models for **"${subject}"**, consider upgrading your query with our **Cognitive DNA Synthesizer**:
*   *Inject a Specific Persona*: Add an instruction like *"Act as a Principal System Engineer specializing in ${subject}..."*
*   *State Explicit Constraints*: Enforce boundaries like *"Format in Markdown tables, and do not use legacy helper methods..."*
*   *Detail domain context*: Explain where this runs (e.g. *"This will be deployed as an edge function in a distributed system..."*).`;
  }

  // Improved and Expert versions tailored dynamically to the prompt
  const cleanSubject = prompt.replace(/\b(what is|explain|tell me about|how to|create|make|design|audit|what is a|explain about|give me a)\b/gi, '').replace(/[?.]/g, '').trim() || "Subject";
  const improved = `I want to know more about ${cleanSubject}. Explain the core concepts, outline key components, and give me a detailed summary list of best practices in Markdown.`;
  const expert = `Act as an expert Systems Architect and Technical Lead. Write a comprehensive, production-grade architectural guide and implementation guide on: "${cleanSubject}".

# KEY OBJECTIVE:
Deconstruct the core theory, list modular components, and provide concrete execution examples.

# EXPLICIT CONSTRAINTS:
1. Provide a direct, highly technical response without generic conversational introductory filler.
2. Organize the guidelines using clear Markdown headers, nested lists, and code snippets where applicable.
3. Include a comparative reference matrix mapped inside a Markdown table structure.

# CONTEXT:
This architecture documentation is being created for our senior engineering registry to support scalable, long-term deployments.`;

  const result = {
    score: masterScore,
    analysis,
    heatmap: heatmap.filter(h => h.word !== undefined),
    dna,
    benchmark: {
      gemini_flash: { score: masterScore - 5, suitability: "Fast calculations, ideal for rapid prototyping sessions." },
      gemini_pro: { score: masterScore + 5, suitability: "Outstanding. Excels at parsing complex structural schemas." },
      gpt_4o: { score: masterScore + 2, suitability: "Strong conversational coherence and textual flow." },
      claude_sonnet: { score: masterScore + 4, suitability: "Highly detailed long-form reporting capabilities." }
    },
    evolution: {
      improved,
      expert
    },
    chatbot_response
  };

  return result;
}

function localInjectBlock(prompt, blockType) {
  console.log(`Applying Local Block Injector for block: ${blockType}`);
  const promptLower = prompt.toLowerCase();
  
  if (blockType === "role") {
    if (promptLower.includes('srkr') || promptLower.includes('collage')) {
      return "Act as a Senior Web Architect and Academic Portal Designer with 15 years of experience building secure institutional databases and high-traffic college portals.";
    }
    return "Act as a Senior Subject-Matter Expert and AI Architect with deep technical credentials in this specific problem domain.";
  }
  else if (blockType === "constraints") {
    return "CONSTRAINTS:\n1. Use highly secure and modern coding practices (no legacy SQL injection, safe passwords).\n2. Format the response strictly in logical modules with clear bullet points.\n3. Avoid generic placeholder filler; provide concrete examples, metrics, and data structures.";
  }
  else if (blockType === "format") {
    return "FORMAT EXPECTATIONS:\n- Output a structured sitemap list detailing all public and private portal pathways.\n- Render a clear relational database schema diagram represented as a Markdown table matrix.\n- Cease execution and provide clean, modular output templates.";
  }
  else if (blockType === "context") {
    if (promptLower.includes('srkr') || promptLower.includes('collage')) {
      return "CONTEXT: We are engineering the digital interface infrastructure for SRKR Engineering College (Bhimavaram), a prestigious engineering institute. The portal must serve 5,000+ students, 200+ faculty members, and integrate legacy registrar academic records.";
    }
    return "CONTEXT: This project represents a critical industrial blueprint designed for high-scalability production environments with strict operational targets.";
  }
  else if (blockType === "task") {
    if (promptLower.includes('srkr') || promptLower.includes('collage')) {
      return "TASK: Detail a step-by-step roadmap to build, secure, and deploy the SRKR Engineering College academic website, listing all essential tools, API routes, and database tables.";
    }
    return `TASK: Formulate a comprehensive, high-fidelity operational response answering the core directive: "${prompt}".`;
  }
  
  return "ADDITIONAL COGNITIVE OVERLAY SEGMENT.";
}

app.listen(PORT, () => {
  console.log(`PromptMind server running on http://localhost:${PORT}`);
});

