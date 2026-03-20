# Technology Stack

**Analysis Date:** 2026-03-20

## Languages

**Primary:**
- TypeScript 5.6 - All application code in `src/`

**Secondary:**
- HTML - Single entry point `index.html`
- CSS - Global styles `src/styles.css` (Tailwind utility classes + custom CSS)

## Runtime

**Environment:**
- Browser (client-side SPA, no server-side rendering)
- Node.js - Development tooling only

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 18.3.1 - UI rendering, `src/main.tsx` entry point
- react-router-dom 7.13.1 - Client-side routing

**Build/Dev:**
- Vite 5.4.8 - Dev server and bundler, config at `vite.config.ts`
- `@vitejs/plugin-react` 4.3.2 - React JSX transform plugin

**Styling:**
- Tailwind CSS 3.4.19 - Utility-first CSS framework, config at `tailwind.config.js`
- PostCSS 8.5.8 with autoprefixer - CSS processing, config at `postcss.config.js`

**Testing:**
- Not detected — no test framework configured

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.99.1 - All database and authentication operations; client initialized in `src/lib/supabase.ts`
- `react` 18.3.1 - UI rendering
- `react-router-dom` 7.13.1 - Routing (BrowserRouter wrapping in `src/App.tsx`)

**Infrastructure:**
- `typescript` 5.6.2 - Type checking (devDependency, not bundled)
- `@types/react` 18.3.12 - React type definitions
- `@types/react-dom` 18.3.1 - ReactDOM type definitions

## Configuration

**TypeScript:**
- Config: `tsconfig.json`
- Target: ES2020
- Strict mode: enabled (`strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`)
- JSX: `react-jsx` transform
- Module resolution: `Bundler`

**Environment Variables:**
- `.env.local` file present — contains Supabase credentials (never read)
- Required variables accessed via `import.meta.env`:
  - `VITE_SUPABASE_URL` — Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key
- Connectivity check in `src/lib/api.ts`: `const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)`

**Build:**
- Build command: `tsc -b && vite build`
- Dev command: `vite`
- Preview command: `vite preview`
- Output: `dist/` directory

**Tailwind:**
- Content scan: `./index.html`, `./src/**/*.{js,ts,jsx,tsx}`
- No custom theme extensions

## State Management

**Pattern:** `useReducer` + custom hook (not Zustand or Redux)
- Store: `src/state/useRestaurantStore.ts`
- Local state persistence: `localStorage` key `"rezerve-v1"` (cleared on sign-out)
- Pattern: All state actions dispatched through typed `Action` union type

## Routing

**Routes defined in** `src/App.tsx`:
- `/` — Landing page (`src/features/landing/LandingPage.tsx`)
- `/login` — Login page (`src/features/auth/LoginPage.tsx`)
- `/register` — Register page (`src/features/auth/RegisterPage.tsx`)
- `/app` — Main dashboard (protected, full restaurant management UI)

## Platform Requirements

**Development:**
- Node.js with npm
- `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set

**Production:**
- Vercel (deploy triggered by GitHub push)
- Environment variables must be configured in Vercel project settings

---

*Stack analysis: 2026-03-20*
