# ClassConnecto Implementation Plan

## Goal Description
Build "ClassConnecto", a modern, visually stunning academic platform for engineering students mixing Notion, GitHub, and Google Classroom functionalities. The tech stack involves HTML, CSS (including Tailwind CSS), JS for frontend and PHP/MySQL for backend. The design requirement heavily emphasizes glassmorphism, modern typography, animations, dark/light mode, and a responsive sidebar layout.

## Proposed Changes

We will construct this site in the target project directory.

### Database (`/database/`)
- `classconnecto.sql`: Initialize schemas for `users`, `subjects`, `notes`, `assignments`, `doubts`, `answers`, `programs`, `references`, `summaries`, `study_planner`.

### PHP Backend (`/api/`)
- `config.php`: MySQL connection.
- `auth.php`: Login/Registration logic. Ensure register number validation (e.g., `25B95A0703`).
- `data.php`: Fetching subjects, notes, lab programs, assignments, forum posts.
- `ai.php`: Mock AI functions for the Doubt Solver ("Explain Like I'm a Beginner") and Notes Summarizer.

### Frontend Structure
- `index.html`: Stunning landing/login page with animated background and glassmorphic form.
- `css/style.css`: Core modern CSS (Dark/Light themes, animations, glassmorphism utilities) combined with Tailwind.
- `js/script.js`: UI logic, sidebar toggling, dark mode toggling, fetching API data.
- `js/ai.js`: Logic for the floating AI assistant panel and global search.

### Views (`/views/`)
We'll build modular UI components (or a single page application using JS) that switch between:
- **Dashboard**: Subject cards grid (OS, DTI Lab, etc.).
- **Theory Subject View**: Notion-like workspace showing Notes, Assignments, Concept Explorer.
- **Lab Subject View**: GitHub-style code viewer for programs (Program Title, Code, Output, Copy Code).
- **Assignments Timeline**: Deadline cards showing countdowns and status colors.
- **Anonymous Doubt Forum**: StackOverflow style QA.
- **Study Planner**: Auto-generated Calendar view.
- **Admin Dashboard**: Analytics charts and moderation features.

## Verification Plan

### Test Environment
- Since this relies on a PHP/MySQL backend, it needs an XAMPP/WAMP environment to fully run. However, I can build and test the PHP logic by structuring the data as mock json where possible or purely building out the UI first, and providing the `.sql` and `.php` files for the user to deploy on XAMPP.
- I will verify the visual aesthetics (Glassmorphism, Tailwind utility usage, dark mode) by locally serving the HTML/JS layers using the browser subagent if available, or providing the files for manual verification.

### Manual Verification
1. User imports `classconnecto.sql` into XAMPP MySQL.
2. User places the project folder in `htdocs` and accesses via `localhost/classconnecto/`.
3. User attempts login with register number `25B95A0703`.
4. User clicks through the dashboard, observing the glassmorphism, sidebar navigation, and AI floating panel.
