# PromptMind

An AI that teaches humans how to think like AI. A futuristic, cyberpunk-themed web application that analyzes user prompts, provides scores, and suggests improvements.

## Proposed Changes (Mindblowing Feature Update)

I propose adding the following highly interactive "Startup Demo" level features to make the application truly mindblowing:

### 1. 3D Neural Network Overload Animation
When a user submits a prompt, the 3D background animation will go into "overdrive". The nodes will spin faster, change color to a bright glowing pink/red, and lines will flash violently to represent intense AI "thinking" or "processing". It will slow back down to a calm neon blue once the analysis is returned.

### 2. Live Typewriter Audio Feedback
We will add subtle, futuristic mechanical keyboard / typing sound effects that sync perfectly with the AI's typing animation in the chat window, giving it a tangible, physical presence.

### 3. "Prompt Intelligence" Ranking Badges
Instead of just a score, the AI will dynamically assign a cyberpunk-themed ranking title based on the score (e.g., `< 40 = Script Kiddie`, `40-70 = Data Runner`, `70-90 = Neural Hacker`, `90+ = Prompt God`). This badge will glitch into existence next to the score.

### 4. Interactive Nodes Scatter
We will add a mouse interaction to the 3D background where clicking anywhere on the screen "blasts" the 3D nodes away from the cursor, before they magnetically pull back into their brain formation.

### File Modifications Needed
#### [MODIFY] promptmind/ui/dashboard.html
Add audio elements for the SFX. Add a container for the Ranking Badge.
#### [MODIFY] promptmind/ui/theme.css
Add specific CSS glitch animations for the ranking badge, and transitions for the overdrive state.
#### [MODIFY] promptmind/ui/main.js
Implement the Three.js speed/color multiplier logic during the `fetch` wait time. Implement the click-to-blast particle physics. Sync the audio elements with the `typeMessage` interval.

## Verification Plan
### Manual Verification
- Test prompt submission and visually confirm the 3D overdrive effect triggers and stops correctly.
- Ensure audio typing sounds play smoothly without overlapping or causing lag.
- Click the background and verify physics interactions.
