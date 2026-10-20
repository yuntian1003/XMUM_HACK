# 🌾 FarmGPT — Multi-Plant Edge AI Disease Detection

> AI-powered crop disease scanner for ASEAN agriculture. Detect 80+ diseases across 17 crop types — with Edge AI that works completely offline.

---

## 📖 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started (First-Time Setup)](#getting-started-first-time-setup)
- [Running the App](#running-the-app)
- [Troubleshooting](#️-troubleshooting)
- [Available Scripts](#available-scripts)
- [Docker](#docker)
- [License](#license)

---

## Overview

**FarmGPT** is a full-stack web application built for the XMUM Software Development Competition / AI4Sustainability Hackfest. It helps farmers and government agencies detect crop diseases using AI-powered image scanning.

### Key Features

| Feature | Description |
|---|---|
| 🔬 **Crop Disease Scanner** | Scan any crop leaf using your phone camera to diagnose diseases |
| 🧠 **AI Diagnosis** | Google Genkit + Gemini-powered plant disease analysis |
| 🌐 **Offline-First Edge AI** | TensorFlow.js + MobileNet run on-device — no internet needed for basic scans |
| 🪴 **PlantNet Integration** | Species identification powered by the Pl@ntNet API |
| 📊 **Government Dashboard** | Aggregated disease analytics, food price monitoring, risk indices, and news |
| 👩‍🌾 **Farmer Hub** | Personalised portal for farmers with scan history and treatment recommendations |
| 💬 **AI Assistant Chat** | Dashboard copilot that answers questions about live agricultural data |
| 📈 **Food Price Monitoring** | Real-time commodity prices, FX rates, fuel costs, and World Bank data |

---

## Tech Stack

### Frontend

- **React 19** with TypeScript
- **Vite 7** (dev server + build)
- **Tailwind CSS 4** for styling
- **wouter** for client-side routing
- **tRPC + React Query** for type-safe API calls
- **Framer Motion** for animations
- **Recharts** for data visualisation
- **Radix UI** (shadcn/ui) component library
- **TensorFlow.js + MobileNet** for on-device Edge AI

### Backend

- **Node.js + Express** server
- **tRPC** for type-safe API layer
- **Drizzle ORM** with **MySQL** database
- **Google Genkit + Gemini** for AI diagnosis flows
- **Pl@ntNet API** for plant species identification
- **Google Vertex AI Search** for RAG-based context retrieval
- **AWS S3** for image storage

### Tooling

- **pnpm** (recommended) or **npm** as package manager
- **TypeScript 5.9**
- **Vitest** for testing
- **Prettier** for formatting
- **Docker** for containerised deployment
- **esbuild** for backend bundling

---

## Project Structure

```
XMUM_HACK/
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── pages/            # Route pages (Home, Scan, Result, Dashboard, etc.)
│   │   ├── components/       # Reusable UI components (shadcn/ui based)
│   │   ├── contexts/         # React context providers (Theme, Auth)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utility functions and tRPC client
│   │   ├── _core/            # Core frontend infrastructure
│   │   ├── App.tsx           # Root app component with routing
│   │   └── main.tsx          # Entry point
│   ├── public/               # Static assets
│   └── vite.config.ts        # Vite configuration
│
├── backend/                  # Express + tRPC backend
│   ├── _core/                # Server core (Express setup, env, auth, tRPC, Vite SSR)
│   │   ├── index.ts          # Server entry point
│   │   ├── env.ts            # Environment variable definitions
│   │   ├── envPreload.ts     # Dotenv loader (runs before ESM imports)
│   │   ├── trpc.ts           # tRPC router + procedure definitions
│   │   ├── sdk.ts            # Backend SDK utilities
│   │   ├── llm.ts            # LLM integration helpers
│   │   └── ...
│   ├── drizzle/              # Database schema + migrations
│   │   ├── schema.ts         # Drizzle ORM table definitions
│   │   └── *.sql             # SQL migration files
│   ├── genkit/               # Google Genkit AI flows
│   │   └── plantDiagnosis.ts # Plant disease diagnosis AI flow
│   ├── integrations/         # External service integrations
│   │   └── foodmonitor/      # Food monitor data service
│   ├── routers.ts            # All tRPC route handlers
│   ├── db.ts                 # Database query functions
│   ├── plantnetService.ts    # Pl@ntNet species ID service
│   ├── cropTreatments.ts     # Treatment recommendation logic
│   ├── assistantChat.ts      # AI assistant chat handler
│   └── drizzle.config.ts     # Drizzle Kit config
│
├── scripts/                  # Utility scripts (seeding, data export)
├── runpod/                   # RunPod serverless handler (Python)
├── dashboards/               # Dashboard design assets
├── tests/                    # Test files
├── patches/                  # pnpm patch overrides
│
├── package.json              # Root package.json (monorepo)
├── tsconfig.json             # Shared TypeScript config
├── vitest.config.ts          # Vitest test runner config
├── Dockerfile                # Production Docker build
├── .env                      # Environment variables (create this — not in git)
└── .gitignore
```

---

## Prerequisites

Make sure you have the following installed:

| Tool | Required Version | Notes |
|---|---|---|
| **Node.js** | v20 or later | Check with `node -v` ([Download](https://nodejs.org/)) |
| **npm** | v10+ | Bundled with Node.js |
| **pnpm** *(recommended)* | v10+ | Run directly via `npx pnpm` (no global install needed) |
| **MySQL** *(optional for basic run)* | 8.0+ | Needed for saving scans and analytics data |

> [!TIP]
> The project uses `pnpm` workspaces with a custom patch for `wouter`. Using `npx pnpm` ensures all workspace links and native binaries (`@tailwindcss/oxide`, `esbuild`) are set up properly.

---

## Getting Started (First-Time Setup)

### 1. Clone the repository

```bash
git clone https://github.com/yuntian1003/XMUM_HACK.git
cd XMUM_HACK
```

### 2. Install dependencies

Run with `npx pnpm` (recommended):

```bash
npx pnpm install
```

*(Or `npm install`)*

> This installs and links all dependencies for both the root, frontend, and backend packages.

### 3. Set up environment variables

Copy the included `.env.example` to create your `.env` file:

```bash
# On Windows (PowerShell):
Copy-Item .env.example .env

# On Mac / Linux / Git Bash:
cp .env.example .env
```

> [!NOTE]
> The app is built with graceful fallbacks. It will run and load the UI even before you configure external APIs or a database!

### 4. Set up the database (Optional for first run)

If you have a local or cloud MySQL server:
1. Create a database:
   ```sql
   CREATE DATABASE farmgpt;
   ```
2. Put the connection string into `.env`:
   ```env
   DATABASE_URL=mysql://root:your_password@localhost:3306/farmgpt
   ```
3. Push the schema to your database:
   ```bash
   npm run db:push
   ```

---

## Running the App

Choose whichever method fits your workflow best:

### 🌟 Method 1: Single-Command Full-Stack (Easiest)

Runs the Express + tRPC backend and Vite frontend together in one command:

```bash
npm run dev
```

Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### ⚡ Method 2: Dual-Terminal Development (Fastest Frontend HMR)

If you are actively modifying frontend UI components, you can run the backend and Vite dev server independently in two terminals:

**Terminal 1 — Backend (tRPC & Express API):**
```bash
npm run dev:backend
```
*(Runs on port 3000)*

**Terminal 2 — Frontend (Vite Dev Server):**
```bash
npm run dev:frontend
```
*(Runs on port 5173 and automatically proxies `/api` requests to port 3000)*

Open your browser at:
👉 **[http://localhost:5173](http://localhost:5173)**

---

### 📦 Method 3: Production Build & Start

To build optimized production bundles and test the production server:

```bash
# 1. Build frontend and backend
npm run build

# 2. Start the production server
npm run start
```

Access the production server at **http://localhost:3000**.

---

### 🧪 Method 4: Genkit AI Developer UI

To interactively test and debug Gemini / Genkit plant diagnosis prompts:

```bash
npm run dev:genkit
```

---

## 🛠️ Troubleshooting

### 1. `'tsc'` or `'tsx'` is not recognized
This occurs when binary symlinks inside `node_modules/.bin` are missing or were corrupted.  
**Fix:** Run:
```bash
npx pnpm install
```

### 2. Port 3000 or 5173 already in use
The backend has built-in port auto-detection and will automatically attempt to bind to `3001`, `3002`, etc., if port 3000 is occupied.
To check what is using port 3000 or 5173 on Windows:
```powershell
Get-NetTCPConnection -LocalPort 3000, 5173 -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, OwningProcess, State
```
To kill a hanging process by its PID:
```powershell
Stop-Process -Id <PID> -Force
```

### 3. Database connection warnings
If you see `[Database] Cannot upsert user: database not available`, don't worry! The application is designed with offline-first fallbacks and will continue running. To enable persistent history and analytics, configure `DATABASE_URL` in your `.env` and run `npm run db:push`.

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `npm run dev:backend` | Start full-stack development server on port 3000 |
| `npm run dev:backend` | `npm --prefix backend run dev` | Start backend with hot reload (tsx watch) |
| `npm run dev:frontend` | `npm --prefix frontend run dev` | Start frontend Vite dev server on port 5173 |
| `npm run dev:genkit` | `genkit-cli start ...` | Launch the Genkit Developer UI |
| `npm run build` | `build:frontend && build:backend` | Build production bundles for frontend & backend |
| `npm run start` | `cross-env NODE_ENV=production node dist/index.js` | Run production server |
| `npm run check` | `tsc --noEmit` | Type-check TypeScript codebase without emitting files |
| `npm run test` | `vitest run` | Run automated unit and integration tests |
| `npm run db:push` | `drizzle-kit generate && migrate` | Sync schema migrations to MySQL database |
| `npm run format` | `prettier --write .` | Format codebase with Prettier |

---

## Docker

Build and run in a container:

```bash
# Build the image
docker build -t farmgpt .

# Run the container
docker run -p 8080:8080 \
  -e DATABASE_URL="mysql://..." \
  -e JWT_SECRET="..." \
  -e NODE_ENV=production \
  farmgpt
```

The app will be available at **http://localhost:8080**.

---

## License

MIT

---

<p align="center">
  Built with 💚 by <strong>Team XMUM SDC</strong>
</p>