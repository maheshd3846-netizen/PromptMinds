# PromptMind Implementation Plan

## Goal Description
Build **PromptMind**, a futuristic AI web application that analyzes user prompts and teaches how to improve them. The app will include a dark cyberpunk UI, a 3D AI brain visualization using Three.js, voice prompt input, and integration with the OpenAI API for prompt analysis and responses.

## Proposed Changes

### Configuration and Backend (`C:\Users\Laptop-PC\.gemini\antigravity\scratch\promptmind`)
- **[NEW] `package.json`**: Will define dependencies (`express`, `cors`, `dotenv`, `openai`) and a start script.
- **[NEW] `.env`**: Environment file template to securely store `OPENAI_API_KEY`.
- **[NEW] `server.js`**: An Express server. It will serve static files from `public/` and expose a `POST /analyze` API endpoint. The `/analyze` endpoint will make a structured request to the OpenAI API instructing it to evaluate the user's prompt (clarity, specificity, structure), generate an improved version, and act as a conversational chatbot to answer the prompt.

### Frontend (`public/`)
- **[NEW] `public/index.html`**: The UI layout. It will contain:
  - Container for the Three.js 3D canvas (neural network/brain).
  - A chat/input panel with microphone button for voice input.
  - A dashboard section displaying the Prompt Intelligence Meter (score bar).
  - A heatmap analysis panel (highlighting weak/strong words).
  - A Prompt Evolution section (Original -> Improved -> Expert).
- **[NEW] `public/style.css`**: Cyberpunk aesthetics utilizing extensive CSS variables (dark backdrops, bright neon borders, glowing shadows, animated neural net background overlay).
- **[NEW] `public/script.js`**: Client-side logic including:
  - **Three.js setup**: Rendering and animating a 3D particle system or node-link structure representing an AI brain.
  - **Interactivity**: Implementing `window.SpeechRecognition` (or `webkitSpeechRecognition`) for voice capture. Taking user input and fetching results from `/analyze`.
  - **Visuals**: Animating the response with a typing effect, updating the dynamic score bar, and rendering the styled HTML for the word heatmap.

## Verification Plan

### Automated Tests
*None for this initial prototype phase. We will rely on manual functional testing.*

### Manual Verification
1. **Setup**: Run `npm install` and `node server.js` from the `promptmind` directory.
2. **UI Inspection**: Navigate to `http://localhost:3000` to verify the frontend loads, specifically checking the cyberpunk theme and the Three.js 3D visualization.
3. **API Integration**: Type a sample prompt (e.g., "tell me about dogs") and submit it to ensure the Node backend successfully routes the request to OpenAI and returns validation metrics, the improved prompt, and the bot response.
4. **UI Updates**: Verify the Intelligence Meter animates to the given score, and the heatmap highlights words correctly.
5. **Speech API**: Click the voice input button and verify the browser requests microphone access, capturing dictated text.
