# 🧠 CodeMind AI — AI-Powered Code Auditor & Security Review Console

CodeMind AI is an agentic code auditing, vulnerability detection, and repository visualization platform. It introduces a **persistent engineering memory layer** into the code review process, ensuring that historical fixes and custom team standards dynamically guide future security and architectural recommendations.

🌐 **Live Application:** [https://code-mind-ai-gold.vercel.app/](https://code-mind-ai-gold.vercel.app/)

---

## 🌟 Overview & 4 Core Feature Consoles

CodeMind AI provides a unified interface across 4 primary engineering consoles:

1. **💻 Workspace Console (Dashboard)** — System-wide analytics, project health trends, critical vulnerability counts, activity logs, and instant project ingestion.
2. **📁 Project Workspace** — Full IDE view complete with file trees, risk badges, code inspector, inline AI issue resolution, interactive dependency graph visualizer, and AI chat assistant.
3. **🧠 Memory Center (Hindsight)** — A persistent knowledge base of past resolved security vulnerabilities and architectural bugs. Ensures validated historical fixes automatically guide future code reviews.
4. **📐 Team Architecture Standards** — Enforce, toggle, delete, or generate team-wide coding rules and architectural constraints.

---

## 🚀 Key Features

| Feature | Description |
| :--- | :--- |
| **🔍 Multi-Source Ingestion** | Upload local folders, drag-and-drop `.zip` files, single files, or import public GitHub repositories. |
| **🛡️ Automated Security Auditing** | Detects SQL Injections, Hardcoded Secret Tokens, Insecure Hashing, Command Injections, and Singleton violations. |
| **⚡ One-Click AI Refactoring** | Auto-generates production-ready code patches powered by **Llama 3.3 70B** with fallback to intelligent local patch logic. |
| **🧠 Engineering Memory Layer** | Resolving an issue automatically saves the fix, context, and outcome as a persistent "memory" for future audits. |
| **🕸️ Interactive Dependency Graph** | Visualizes file import/export networks with real-time risk heatmaps and downstream impact propagation. |
| **📐 Dynamic Team Standards** | Enforce or mute specific architectural constraints and generate AI rules tailored to your project stack. |
| **📊 Export Audit Reports** | Generate downloadable PDF Security & Architecture Audit Reports with health scores and detailed issue breakdowns. |
| **📱 Mobile & Local Network Access** | Built-in host sharing allows instant testing across phones, tablets, and network devices. |

---

## 🛠️ Tech Stack

- **Core / Frontend**: React 19, TypeScript, Vite
- **Styling**: Modern Vanilla CSS (dark-theme glassmorphism, 3-column CSS Grid header, custom scrollbars)
- **Authentication**: Clerk Authentication (`@clerk/clerk-react`)
- **Database & Storage**: Supabase PostgreSQL DB with Row-Level Security (RLS) + automatic LocalStorage offline fallback
- **AI Models**: Groq Cloud API (`llama-3.3-70b-versatile`)
- **Icons & Utilities**: Lucide React, JSZip (client-side unzipping)

---

## ⚙️ Quick Start & Installation Guide

Follow these simple steps to set up and run CodeMind AI on your machine:

### 1️⃣ Prerequisites
Make sure you have the following installed:
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (v9+ or `yarn` / `pnpm`)

### 2️⃣ Clone the Repository
```bash
git clone https://github.com/sudarshan-118/CodeMind-AI.git
cd CodeMind-AI
```

### 3️⃣ Install Dependencies
```bash
npm install
```

### 4️⃣ Configure Environment Secrets
Create a `.env` file in the root directory:
```env
# Clerk Authentication key
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key

# Supabase Credentials (Optional - auto-falls back to LocalStorage if empty)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Groq AI Keys (Llama 3.3 70B Versatile integration)
VITE_GROQ_API_KEY=gsk_your_groq_api_key
VITE_GROQ_API_KEY_FALLBACK=gsk_your_backup_groq_api_key
```

> 💡 **Note:** If Supabase environment variables are omitted, CodeMind AI automatically runs in **Offline LocalStorage Emulation Mode**, allowing full feature testing out of the box without setup!

### 5️⃣ Database Setup (Optional for Supabase Live DB)
If you are connecting your own Supabase project:
1. Go to your Supabase Dashboard and open the **SQL Editor**.
2. Copy and execute the contents of [schema.sql](file:///d:/APPS%20DEV/CodeMind-AI-main/schema.sql).
3. This creates all necessary tables (`projects`, `reviews`, `vulnerabilities`, `memories`, `team_standards`, `activities`, `dependency_graphs`) and GIN indexes.

### 6️⃣ Run the Development Server
```bash
npm run dev
```

Your terminal will display both Local and Network URLs:
```text
  VITE v8.0.12  ready in 320 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```
Open `http://localhost:5173/` in your browser!

---

## 💡 Practical Running Tips & Tricks

### 📱 Testing on Mobile or Other Network Devices
To test CodeMind AI on another device (such as a smartphone or tablet) connected to the **same Wi-Fi network**:
1. Keep `npm run dev` running on your main machine.
2. Open the browser on your mobile phone or tablet.
3. Enter the **Network URL** shown in your terminal (e.g. `http://192.168.31.55:5173/`).

### 📦 Production Build & Testing
To compile TypeScript and test the production build locally:
```bash
# Build the production bundle
npm run build

# Preview the built app locally
npm run preview
```

### 🧹 Linting & Diagnostics
To run ESLint code verification:
```bash
npm run lint
```

---

## 📁 Repository Structure

```text
CodeMind-AI/
├── src/
│   ├── components/         # UI View Components
│   │   ├── Dashboard.tsx           # Console Dashboard & Ingestion
│   │   ├── ProjectWorkspace.tsx    # Multi-pane IDE & Inspector
│   │   ├── MemoryCenter.tsx        # Hindsight Memory Database
│   │   ├── TeamStandards.tsx       # Architectural Rule Engine
│   │   ├── DependencyGraphView.tsx # Interactive Node/Edge Graph
│   │   ├── ReportGenerator.tsx     # PDF Audit Report Export
│   │   └── LandingPage.tsx         # Hero Landing Page
│   ├── services/
│   │   └── db.ts           # Hybrid Supabase + LocalStorage DB service
│   ├── App.tsx             # Main layout, header, state router
│   ├── index.css           # Design tokens, CSS Grid header, glassmorphism theme
│   ├── mockData.ts         # Sample projects & default team standards
│   └── types.ts            # TypeScript interface definitions
├── schema.sql              # Supabase PostgreSQL database schema script
├── index.html              # Core HTML entrypoint
├── package.json            # Package dependencies & scripts
└── vite.config.ts          # Vite build config & Groq API proxies
```

---

## 👨‍💻 Author

**Sudarshan**
- GitHub: [@sudarshan-118](https://github.com/sudarshan-118)

---

## 📜 License

This project is licensed under the **MIT License**.
