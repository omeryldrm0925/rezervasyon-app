# Codebase Structure

**Analysis Date:** 2026-03-20

## Directory Layout

```
rezerve/
├── src/
│   ├── main.tsx                   # React DOM entry point
│   ├── App.tsx                    # Router, auth guards, RestaurantApp orchestrator
│   ├── types.ts                   # All shared TypeScript types/interfaces
│   ├── styles.css                 # Global CSS (Tailwind base + custom animations)
│   ├── vite-env.d.ts              # Vite env type declarations
│   ├── components/                # Shared UI components used by App.tsx
│   │   ├── FloorCanvas.tsx        # Canvas grid: tables, fixtures, drag-drop
│   │   ├── TableNode.tsx          # Individual table rendering + interaction
│   │   ├── TopBar.tsx             # Date strip, mode toggle, layout lock
│   │   ├── AreaTabs.tsx           # Area (salon) tab selector
│   │   ├── SidePanel.tsx          # Collapsible left panel with palette/tools
│   │   ├── ReservationSidebar.tsx # Right sidebar: reservation list + search
│   │   ├── ReservationCard.tsx    # Create/edit reservation form (floating)
│   │   ├── ObjectEditorCard.tsx   # Edit table/fixture properties (floating)
│   │   ├── GroupEditorCard.tsx    # Edit merged table group (floating)
│   │   ├── TableActionMenu.tsx    # Context menu on table click
│   │   ├── FloatingPalette.tsx    # Floating add-object palette
│   │   ├── DateStrip.tsx          # Horizontal scrollable date selector
│   │   ├── DayReservationsCard.tsx # Per-day reservation summary card
│   │   └── AreaMenu.tsx           # Area rename/delete menu
│   ├── features/                  # Self-contained page features
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx      # Login form page
│   │   │   └── RegisterPage.tsx   # Register + restaurant name form
│   │   └── landing/
│   │       └── LandingPage.tsx    # Marketing landing page (/)
│   ├── state/
│   │   └── useRestaurantStore.ts  # useReducer store: all restaurant state + actions
│   ├── hooks/
│   │   └── useAuth.ts             # Supabase auth state hook
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client instance
│   │   └── api.ts                 # All Supabase read/write operations
│   ├── utils/
│   │   ├── layout.ts              # Derived layout computations (pure functions)
│   │   ├── canvas.ts              # Canvas geometry: snap, clamp, collision, sizes
│   │   └── date.ts                # ISO date helpers and Turkish locale formatters
│   └── data/
│       └── mockData.ts            # Legacy mock data (unused — kept for reference)
├── docs/
│   ├── CURRENT-TASK.md            # Active tasks, known bugs, todos
│   ├── DB.md                      # Database schema and data flow docs
│   └── UI.md                      # Component structure and styling rules
├── .planning/
│   └── codebase/                  # GSD codebase analysis documents
├── index.html                     # Vite HTML entry
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── CLAUDE.md                      # Project instructions for Claude sessions
```

## Directory Purposes

**`src/components/`:**
- Purpose: All UI building blocks consumed by `App.tsx`
- Contains: Presentational and lightly-stateful React components; each focused on a single UI region
- Key files: `FloorCanvas.tsx` (largest, handles drag/drop/zoom), `ReservationSidebar.tsx`, `TopBar.tsx`

**`src/features/`:**
- Purpose: Full page-level feature modules for unauthenticated routes
- Contains: `auth/` — login and register pages; `landing/` — marketing page
- Key files: `src/features/landing/LandingPage.tsx`, `src/features/auth/LoginPage.tsx`, `src/features/auth/RegisterPage.tsx`

**`src/state/`:**
- Purpose: Single source of truth for all restaurant data
- Contains: One file — `useRestaurantStore.ts` — with reducer, action types, initial state, Supabase sync effects, and undo history
- Key files: `src/state/useRestaurantStore.ts`

**`src/hooks/`:**
- Purpose: Custom React hooks for cross-cutting concerns
- Contains: `useAuth.ts` — wraps Supabase auth session with React state
- Key files: `src/hooks/useAuth.ts`

**`src/lib/`:**
- Purpose: External service clients and data access
- Contains: Supabase client creation and all database operations
- Key files: `src/lib/api.ts`, `src/lib/supabase.ts`

**`src/utils/`:**
- Purpose: Pure, side-effect-free helper functions
- Contains: Layout computation, canvas geometry, date formatting — no React dependencies
- Key files: `src/utils/layout.ts` (most critical), `src/utils/canvas.ts`, `src/utils/date.ts`

**`src/data/`:**
- Purpose: Legacy mock data
- Contains: `mockData.ts` — no longer imported; kept for reference only

**`docs/`:**
- Purpose: Human-readable developer documentation
- Contains: DB schema, UI conventions, current task tracking
- Generated: No
- Committed: Yes

## Key File Locations

**Entry Points:**
- `src/main.tsx`: ReactDOM.createRoot, renders `<App />`
- `src/App.tsx`: Route definitions, auth guards, main dashboard component `RestaurantApp`

**Configuration:**
- `vite.config.ts`: Vite build config
- `tailwind.config.js`: Tailwind CSS config
- `tsconfig.json`: TypeScript compiler options
- `index.html`: HTML shell with `<div id="root">`

**Core Logic:**
- `src/state/useRestaurantStore.ts`: Reducer, all actions, Supabase sync
- `src/lib/api.ts`: All Supabase queries (loadAllFromSupabase, syncAreas, syncReservations, syncOverrides)
- `src/utils/layout.ts`: `buildEffectiveTables`, `buildEffectiveFixtures`, `getTableVisualState`, `buildReservationByTable`
- `src/types.ts`: All domain interfaces

**Auth Flow:**
- `src/hooks/useAuth.ts`: Auth state, signIn, signUp, signOut
- `src/features/auth/LoginPage.tsx`, `src/features/auth/RegisterPage.tsx`

## Naming Conventions

**Files:**
- React components: PascalCase, `.tsx` — e.g., `FloorCanvas.tsx`, `TopBar.tsx`
- Hooks: camelCase with `use` prefix, `.ts` — e.g., `useAuth.ts`, `useRestaurantStore.ts`
- Pure utilities: camelCase noun, `.ts` — e.g., `layout.ts`, `canvas.ts`, `date.ts`
- Library/client: camelCase noun, `.ts` — e.g., `supabase.ts`, `api.ts`

**Directories:**
- Feature folders: camelCase — `auth/`, `landing/`
- Utility folders: camelCase — `components/`, `features/`, `state/`, `hooks/`, `lib/`, `utils/`

**Identifiers:**
- Application-generated IDs: `"{prefix}-{base36timestamp}-{sequence}"` — e.g., `"area-mmxllfxe-4"`, `"table-mq3kzj1-7"`
- Database UUIDs (restaurants only): standard UUID format from Supabase `gen_random_uuid()`

## Where to Add New Code

**New UI component (used across app):**
- Implementation: `src/components/MyComponent.tsx`
- Wire into dashboard: import and render in `src/App.tsx` → `RestaurantApp`

**New page/route:**
- Page component: `src/features/{featureName}/MyPage.tsx`
- Add route in `src/App.tsx` → `App()` function routes block

**New state action:**
- Add action type to `Action` union in `src/state/useRestaurantStore.ts` (lines ~30–76)
- Add `case` to `reducer` function (line ~273)
- Add method to `actions` object in `useRestaurantStore` hook (line ~935)

**New Supabase operation:**
- Add function to `src/lib/api.ts`
- Call from `src/state/useRestaurantStore.ts` or `src/hooks/useAuth.ts`

**New derived layout computation:**
- Add pure function to `src/utils/layout.ts`
- Import and call in `App.tsx` or components

**New domain type:**
- Add interface/type to `src/types.ts`

**New utility (canvas geometry, date, etc.):**
- Add to existing file if closely related: `src/utils/canvas.ts`, `src/utils/date.ts`
- Or create `src/utils/myUtil.ts` for unrelated concerns

## Special Directories

**`dist/`:**
- Purpose: Vite build output
- Generated: Yes (by `vite build`)
- Committed: No (in `.gitignore`)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No

**`.planning/codebase/`:**
- Purpose: GSD analysis documents for Claude sessions
- Generated: By `/gsd:map-codebase` commands
- Committed: Yes

**`docs/`:**
- Purpose: Hand-maintained developer documentation (schema, UI rules, active tasks)
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-03-20*
