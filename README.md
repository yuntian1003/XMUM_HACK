# AgriGuard


> AI-powered crop disease detection and agricultural intelligence for farmers and government agencies in ASEAN.


AgriGuard is a full-stack web application built for SDC Hackathon 2026. It combines on-device computer vision, cloud AI diagnosis, agricultural data services, and role-specific dashboards to make crop health information more accessible and actionable.


---


## Team Information


| Field | Details |
|---|---|
| **Team Name** | We got no idea |
| **Team Domain** | Domain 2 |
| **SDG Track** | SDG 2 - Zero Hunger |
| **Team Leader** | Tang Yun Tian |
| **University** | Universiti Sains Malaysia (USM) |
| **Number of Members** | 5 |


## Links


| Resource | Link |
|---|---|
| **GitHub Repository** | [yuntian1003/XMUM_HACK](https://github.com/yuntian1003/XMUM_HACK) |
| **Live Demo** | https://xmum-hack.vercel.app/ |
| **Slide Deck** | https://canva.link/1lmacg413c5nsui |
| **Demo Video** | https://www.youtube.com/watch?v=uaWq6kP3gx8 |


---


## Overview


### Problem


Crop diseases can spread quickly while farmers may lack immediate access to reliable diagnosis, treatment guidance, market information, and historical records. Government and agricultural stakeholders also need aggregated signals to understand disease risk and food-price conditions across regions.


### Solution


AgriGuard provides a farmer-facing crop scanning workflow and government-facing agricultural intelligence dashboards in one application. A scan can use TensorFlow.js and MobileNet directly in the browser for an offline-first result, while cloud services provide plant species identification, AI-assisted disease analysis, treatment recommendations, and contextual agricultural information when available.


The application is designed with graceful fallbacks: the user interface and basic on-device scanning can continue to work when optional external services or the database are unavailable.


### Key Features


- **Crop Disease Scanner** - Scan a crop leaf with a phone camera and receive a disease assessment.
- **Offline-First Edge AI** - TensorFlow.js and MobileNet run in the browser, allowing basic scans without an internet connection.
- **AI Diagnosis** - Google Genkit with Gemini provides AI-assisted plant disease analysis.
- **Plant Species Identification** - Pl@ntNet identifies plant species through its plant-health API.
- **Treatment Recommendations** - Disease results are connected to crop treatment guidance.
- **Farmer Hub** - Farmers can view scan history, results, and personalised recommendations.
- **Government Dashboard** - Aggregated disease analytics, risk indices, food prices, foreign-exchange rates, fuel costs, and agricultural news.
- **AI Assistant Chat** - A dashboard copilot answers questions about available agricultural data.
- **Vertex AI Search** - Retrieval-augmented context can be provided through Google Vertex AI Search.
- **Farm Desk Demo** - A synthetic paddy-farm workflow demonstrates photo screening, manager treatment review, stock and fertiliser tracking, owner purchase-order approval, WhatsApp order drafts, and an activity log.


> The Farm Desk demo is available at `/farm-desk`. It uses synthetic data and simulated roles and local activity records. It does not place orders or provide authoritative treatment instructions.


---


## Tech Stack


| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 7 |
| **UI** | Tailwind CSS 4, Radix UI / shadcn/ui, Framer Motion |
| **Client data** | tRPC, TanStack React Query, wouter |
| **Edge AI** | TensorFlow.js, MobileNet |
| **Backend** | Node.js, Express, tRPC |
| **Database** | Supabase PostgreSQL with Drizzle ORM and SQL migrations |
| **AI diagnosis** | Google Genkit, Gemini, optional Groq model support |
| **Plant identification** | Pl@ntNet API |
| **Agricultural retrieval** | Google Vertex AI Search |
| **Image storage** | AWS S3 |
| **Testing** | Vitest |
| **Deployment** | Vercel for the deployed web application; Docker-supported production server |


---


## Project Structure


This repository is a full-stack monorepo. The top-level `src/` directory follows the submission template for the Python application, while the React frontend and Node backend remain separated so that their existing build and deployment configuration is preserved.


```text
XMUM_HACK/
├── frontend/                        # React + Vite web application
│   ├── src/
│   │   ├── pages/                   # Home, scan, result, dashboard, and other routes
│   │   ├── components/              # Reusable UI and shadcn/ui components
│   │   ├── contexts/                # Theme and authentication contexts
│   │   ├── hooks/                   # Reusable React hooks
│   │   ├── lib/                     # tRPC client and frontend utilities
│   │   ├── _core/                   # Core frontend infrastructure
│   │   ├── const.ts                 # Shared frontend constants
│   │   ├── index.css                # Global styles
│   │   ├── App.tsx                  # Root component and client routing
│   │   └── main.tsx                 # Frontend entry point
│   ├── public/                      # Static frontend assets
│   ├── index.html                   # HTML entry point
│   └── vite.config.ts               # Vite aliases, proxy, and production output
│
├── backend/                         # Express + tRPC backend
│   ├── _core/                       # Server, auth, env, LLM, tRPC, and Vite integration
│   │   ├── index.ts                 # Server entry point
│   │   ├── env.ts                   # Environment variable definitions
│   │   ├── envPreload.ts            # Dotenv loader (runs before ESM imports)
│   │   ├── trpc.ts                  # tRPC router and procedure definitions
│   │   ├── sdk.ts                   # Backend SDK utilities
│   │   ├── llm.ts                   # LLM integration helpers
│   │   ├── localAuthStore.ts        # Local authentication store
│   │   ├── voiceTranscription.ts    # Voice transcription integration
│   │   ├── imageGeneration.ts       # Image generation integration
│   │   ├── map.ts                   # Map data utilities
│   │   ├── notification.ts          # Notification helpers
│   │   ├── systemRouter.ts          # System-level tRPC routes
│   │   └── vite.ts                  # Vite dev middleware integration
│   ├── drizzle/                     # Drizzle ORM schema and SQL migrations
│   │   ├── schema.ts                # Table definitions
│   │   ├── relations.ts             # Drizzle relation definitions
│   │   ├── migrations/              # Applied migration snapshots
│   │   ├── meta/                    # Drizzle migration metadata
│   │   └── *.sql                    # SQL migration files
│   ├── genkit/                      # Google Genkit AI flows
│   ├── integrations/
│   │   └── foodmonitor/             # Food Monitor data service client
│   ├── shared/                      # Types and constants shared across backend
│   ├── routers.ts                   # All tRPC route handlers
│   ├── db.ts                        # Database query functions
│   ├── plantnetService.ts           # Pl@ntNet species identification
│   ├── cropTreatments.ts            # Treatment recommendation logic
│   ├── assistantChat.ts             # Agricultural AI assistant chat handler
│   ├── storage.ts                   # AWS S3 image storage helpers
│   ├── telegram.ts                  # Telegram bot integration
│   ├── vertexAiSearch.ts            # Vertex AI Search retrieval
│   └── drizzle.config.ts            # Drizzle Kit configuration
│
├── tests/                           # Automated test suite
│   ├── auth.logout.test.ts
│   ├── backendSignals.test.ts
│   ├── cropTreatments.test.ts
│   ├── foodmonitor.client.test.ts
│   ├── foodmonitor.router.test.ts
│   ├── leafValidator.test.ts
│   ├── scans.test.ts
│   └── test_utils.py
│
├── submission/                      # Hackathon submission documents (PDFs)
├── scripts/
│   └── utils/                       # Data seeding and utility scripts
├── patches/
│   └── wouter@3.7.1.patch           # Patch override for wouter
├── package.json                     # Root scripts and dependencies
├── frontend/package.json            # Frontend package configuration
├── backend/package.json             # Backend package configuration
├── components.json                  # shadcn/ui component configuration
├── tsconfig.json                    # Shared TypeScript configuration
├── vitest.config.ts                 # Vitest configuration
├── Dockerfile                       # Container build configuration
├── docker-compose.yml               # Docker Compose configuration
├── requirements.txt                 # Python dependencies
├── .env.example                     # Environment variable template (no real secrets)
└── README.md                        # Project and submission documentation
```


### Architecture


```text
User
 ├──► React + Vite frontend
 │       ├──► TensorFlow.js + MobileNet (offline-first scan)
 │       └──► Express + tRPC API
 │               ├──► Supabase PostgreSQL via Drizzle ORM
 │               ├──► Genkit + Gemini / Groq
 │               ├──► Pl@ntNet
 │               ├──► Vertex AI Search
 │               ├──► Food Monitor services
 │               └──► AWS S3
 └──► Vercel deployment

RunPod serverless handler
 └──► Optional GPU/model workload integration
```


The deployed web application uses the existing frontend/backend structure. The `frontend/src/` directory is intentionally not moved into the top-level Python `src/` directory because those directories serve different runtimes and build systems.


---


## How to Run


### Prerequisites


| Tool | Required version | Notes |
|---|---|---|
| **Node.js** | v20 or later | [Download Node.js](https://nodejs.org/) |
| **npm** | v10 or later | Bundled with Node.js |
| **pnpm** | v10 or later | Recommended; can be run through `npx pnpm` |
| **Supabase** | PostgreSQL project | Required for persistent accounts, scans, and analytics |


### 1. Clone the repository


```bash
git clone https://github.com/yuntian1003/XMUM_HACK.git
cd XMUM_HACK
```


### 2. Install dependencies


The recommended package manager is pnpm:


```bash
npx pnpm install
```


`npm install` is also supported. The install links dependencies for the root, frontend, and backend packages.


### 3. Configure environment variables


Create a local environment file from the included template:


```powershell
# Windows PowerShell
Copy-Item .env.example .env
```


```bash
# macOS, Linux, or Git Bash
cp .env.example .env
```


Add only the credentials and service settings required for the features being tested. Never commit `.env` or API keys.


Common settings include:


```env
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
JWT_SECRET=replace-with-a-local-secret
GEMINI_API_KEY=your-key
PLANTNET_API_KEY=your-key
GROQ_API_KEY=your-key
VITE_API_BASE_URL=
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
```


Additional optional settings support Vertex AI Search, Food Monitor, Telegram notifications, S3 storage, OAuth, and RunPod integration. See the backend environment configuration and `.env.example` for the complete list.


### 4. Configure Supabase PostgreSQL


The application uses Supabase PostgreSQL as its persistent database. Set `DATABASE_URL` to the Supabase connection-pooler URL, then apply the Drizzle schema and migrations:


```bash
npm run db:push
```


The database stores local-auth accounts in the `local_auth_users` table, as well as application users, scans, dashboards, and other agricultural data. The application can still load its UI and use fallback behavior without a database connection, but new account registration requires a working database.


### 5. Authentication and seeded demo accounts


Authentication uses PBKDF2 password hashes and salts stored in the persistent `local_auth_users` PostgreSQL table. Passwords are never stored in plain text. After login or signup, the server issues an HTTP-only session cookie.


The backend also contains a small set of pre-seeded demonstration accounts for offline development or presentation fallback when the database is unavailable. These accounts are not a replacement for persistent production storage. Never add real passwords or API keys to the repository.


### 6. Run the application


#### Full-stack development


```bash
npm run dev
```


Open [http://localhost:3000](http://localhost:3000).


#### Separate frontend and backend


Terminal 1:


```bash
npm run dev:backend
```


Terminal 2:


```bash
npm run dev:frontend
```


Open [http://localhost:5173](http://localhost:5173). The Vite development server proxies `/api` requests to the backend.


#### Production build


```bash
npm run build
npm run start
```


The production server is available at [http://localhost:3000](http://localhost:3000).


#### Genkit developer UI


To inspect and debug Gemini / Genkit plant-diagnosis prompts:


```bash
npm run dev:genkit
```


---


## Deployment


### Vercel


The live web application is deployed on Vercel. Production configuration must continue to use the repository's existing frontend/backend build arrangement. Validate changes in a Vercel Preview Deployment before merging them into production.


Do not move `frontend/src/` into the top-level `src/` directory: the top-level directory is reserved for the Python application from the submission template, while Vite is configured to build from `frontend/`.


Configure production secrets through Vercel Environment Variables. Do not commit credentials or copy production secrets into `.env`.


### Docker


The repository also includes a production Dockerfile:


```bash
docker build -t agriguard .
docker run -p 8080:8080 `
  -e DATABASE_URL="postgresql://..." `
  -e JWT_SECRET="..." `
  -e NODE_ENV=production `
  agriguard
```


The container listens on port `8080`.


---


## Available Scripts


| Command | Description |
|---|---|
| `npm run dev` | Start the backend development server (alias for `dev:backend`) |
| `npm run dev:backend` | Start the backend with hot reload |
| `npm run dev:frontend` | Start the Vite frontend on port 5173 |
| `npm run dev:genkit` | Launch the Genkit developer UI |
| `npm run build` | Build the frontend and backend production bundles |
| `npm run start` | Start the production Node server |
| `npm run check` | Type-check the TypeScript codebase |
| `npm run test` | Run Vitest tests |
| `npm run db:push` | Generate and apply Drizzle database migrations |
| `npm run format` | Format the codebase with Prettier |


---


## Testing


Run the automated TypeScript test suite:


```bash
npm run test
```


Run the TypeScript type check:


```bash
npm run check
```


The repository includes tests for authentication, crop treatments, plant validation, scans, Food Monitor integrations, and backend routers.


---


## Troubleshooting


### `tsc` or `tsx` is not recognized


Reinstall dependencies so the local binaries are restored:


```bash
npx pnpm install
```


### Port 3000 or 5173 is already in use


On Windows PowerShell, find the process using either port:


```powershell
Get-NetTCPConnection -LocalPort 3000,5173 -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,OwningProcess,State
```


Stop a specific process by PID when appropriate:


```powershell
Stop-Process -Id <PID> -Force
```


### Database connection warnings


Warnings such as `[Database] Cannot upsert user: database not available` indicate that Supabase PostgreSQL is not reachable. The application can use fallback data and seeded demonstration accounts, but persistent account registration, scan history, and analytics require a valid `DATABASE_URL`. Confirm the Supabase connection-pooler URL, then run `npm run db:push`.


### Authentication account not found


Accounts created in one environment are stored in that environment's PostgreSQL database. They are not stored in Git and are not shared with a different Supabase project. Confirm that local development, Vercel Preview, and Vercel Production use the intended database connection and that the `local_auth_users` migration has been applied.


---


## Challenges and Learnings


- Combining an offline-first browser model with optional cloud diagnosis required explicit fallback behavior so scanning remains useful when services are unavailable.
- Keeping farmer workflows, government analytics, and synthetic Farm Desk operations in one product required clear separation of real data, simulated data, and role-specific experiences.
- Integrating multiple AI and data services required environment-based configuration and safe handling of unavailable providers.
- Maintaining a separate React frontend, Node backend, Python submission-template app, and RunPod handler required preserving clear runtime boundaries rather than flattening every source file into one directory.


## Future Improvements


- Improve model accuracy with a larger, locally validated crop-disease dataset.
- Add multilingual guidance and voice interaction for farmers.
- Expand regional crop, weather, disease-risk, and market data coverage.
- Add stronger evaluation and monitoring for AI-generated diagnosis and treatment suggestions.
- Connect Farm Desk workflows to verified inventory, purchasing, and notification systems.
- Add production observability, role administration, and more comprehensive end-to-end tests.


---


## Team


| Name | Role | GitHub |
|---|---|---|
| Tang Yun Tian | Team Leader | [@yuntian1003](https://github.com/yuntian1003) |
| Lim Pei Xuan | Frontend and demo | [@Limpx888](https://github.com/Limpx888) |
| Cheong Wen Xuan | Backend and workflow | [@imxuannnn](https://github.com/imxuannnn) |
| Angela Lim Min Qing | AI and evaluation | [@Angelalim930](https://github.com/Angelalim930) |
| Doris Yee Wai Lee | Data, deployment and documentation | [@dorishark](https://github.com/dorishark) |


## Submission Checklist


- [x] Team name, domain, and SDG track filled in
- [x] Team and university information completed
- [x] GitHub repository link added
- [x] Vercel live-demo link added
- [x] Slide deck link added
- [x] Demo video link added
- [x] Required preliminary submission completed
- [x] Technology declaration completed
- [x] Proof-of-use documents added to `submission/` if required
- [x] How-to-run steps verified
- [x] No API keys, passwords, or production secrets committed


---


## License


This project is licensed under the [MIT License](LICENSE).


<p align="center">
  Built with care by <strong>Team XMUM SDC</strong>
</p>



