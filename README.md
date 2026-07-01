# 🧠 CodeMind AI — AI-Powered Code Auditor & Security Reviewer

CodeMind AI is an agentic code auditing, vulnerability detection, and repository visualization console. It introduces a persistent engineering memory layer into the code review process, ensuring that historical fixes and custom team standards dynamically guide future security and architectural recommendations.

🌐 **Live Application:** [https://codemindai0.netlify.app/]([https://codemindai0.netlify.app/](https://code-mind-ai-gold.vercel.app/))

---

## 🚀 Key Features

*   **Repository Ingestion & Analysis**: Scan codebases by uploading local folders, dragging-and-dropping ZIP files, uploading single files, or importing public GitHub repositories.
*   **Vulnerability Detection & AI Repair**: Automatically inspect files for critical hazards (e.g. SQL Injections, Hardcoded Secret Tokens, singleton architectural violations, or raw command evaluations) and automatically patch them using llama-3 model APIs.
*   **Engineering Memory Layer (Hindsight)**: Resolving an issue saves the fix, context, and outcome as a persistent "memory." Future code reviews fetch relevant memories to suggest validated solutions.
*   **Interactive Dependency Graph**: Visualize import/export relationships between files, highlighting risk propagation and downstream impact.
*   **Team Architecture Standards**: Configure, toggle (enforce/mute), delete, and add customized architectural guidelines.
*   **AI Recommendations**: The system proactively suggests standard engineering rules or utilizes AI to generate custom rules based on the stack.
*   **Comprehensive Health Scoring**: Track security, architecture, performance, and maintainability scores, and export detailed PDF Audit Reports.

---

## 🛠️ Tech Stack

*   **Core / Frontend**: React.js, TypeScript, Vite.
*   **Styling**: Vanilla CSS (Premium dark-theme glassmorphism and modern cards).
*   **Database & Auth**: Supabase PostgreSQL DB, Clerk Authentication.
*   **AI Models**: Groq Cloud API (Llama 3.3 70B Versatile).
*   **Deployment**: Netlify.

---

## ⚡ Recent Optimizations

1.  **Unified Workspace Reorganization**: Consolidated loose workspace subfolders into a single clean root directory structure, maintaining a unified git history.
2.  **Standards Management Enhancements**:
    *   **Rule Deletion**: Developers can now delete custom or default standards. Project scores and alerts are dynamically recomputed immediately.
    *   **AI suggested rules**: Introduced AI suggested panels with standard developer best practices and integrated Groq API generation to produce workspace-tailored rule recommendations with one-click additions.
3.  **Local Network Server Access**: Exposed the dev server host, allowing other devices (e.g., phones, tablets) connected to the same Wi-Fi network to test the app using the Network IP URL.

---

## ⚙️ Installation & Local Run Steps

Follow these steps to run CodeMind AI on your machine:

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/sudarshan-118/CodeMind-AI.git
cd CodeMind-AI
```

### 2️⃣ Configure Database Schema
Before running the application with a live database, execute the SQL definitions in the [schema.sql](file:///d:/APPS DEV/CodeMind-AI-main/schema.sql) file inside your Supabase SQL Editor. This will initialize the tables for:
*   `projects`
*   `reviews`
*   `vulnerabilities`
*   `memories`
*   `team_standards`

### 3️⃣ Configure Environment Secrets
Create a `.env` file in the root directory:
```env
# Supabase credentials (for live DB storage)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Clerk authentication publishable key
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# AI model API keys (Groq Llama 3 integrations)
VITE_GROQ_API_KEY=gsk_...
VITE_GROQ_API_KEY_FALLBACK=gsk_...
```
*(Note: If the Supabase keys are not defined, the application will automatically fall back to LocalStorage emulation mode so you can still test all core features).*

### 4️⃣ Install Dependencies
```bash
npm install
```

### 5️⃣ Run the Development Server
Start the Vite dev server:
```bash
npm run dev
```

The output in your terminal will display both Local and Network URLs:
```bash
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.31.55:5173/
```

### 📱 Exposing the App to Other Devices
To test the application on other devices (like a mobile phone or testing laptop) connected to the **same Wi-Fi network**:
1. Open the browser on your other device.
2. Enter the **Network URL** shown in your console (e.g. `http://192.168.31.55:5173/`).

---

## 🏗️ Production Build & Verification

To verify typescript compilation and generate an optimized production bundle:
```bash
npm run build
```

To preview the compiled production build locally:
```bash
npm run preview
```

---

## 👨‍💻 Author
**Sudarshan**
*   GitHub: [https://github.com/sudarshan-118](https://github.com/sudarshan-118)

---

## 📜 License
This project is licensed under the MIT License.
