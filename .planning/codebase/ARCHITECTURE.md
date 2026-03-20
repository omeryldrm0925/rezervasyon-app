# Architecture

**Analysis Date:** 2026-03-20

## Pattern Overview

**Overall:** Single-Page Application (SPA) with centralized reducer-based state management

**Key Characteristics:**
- All application state lives in one `useReducer` store (`useRestaurantStore`) — no Zustand, no Redux, no Context API
- State is the source of truth; Supabase is a persistence layer synced reactively via debounced `useEffect`
- `App.tsx` acts as the single orchestrator component: it hosts `RestaurantApp`, connects all child components, and owns all event handlers
- Two layout modes: `default` (persistent floor plan) and `day` (per-date override) — both computed from the same state shape
- Computed/derived data is never stored in state; functions in `utils/layout.ts` derive view-ready data on demand

## Layers

**Routing / Auth Shell:**
- Purpose: Route guarding, auth session management, page-level navigation
- Location: `src/App.tsx` (top-level routes), `src/hooks/useAuth.ts`
- Contains: `BrowserRouter`, `AuthRoute`, `ProtectedRoute`, `RestaurantApp`
- Depends on: `useAuth`, `react-router-dom`, `features/auth/*`, `features/landing/*`
- Used by: Browser entry

**Feature Pages:**
- Purpose: Self-contained page-level views for unauthenticated flows
- Location: `src/features/auth/` (LoginPage, RegisterPage), `src/features/landing/` (LandingPage)
- Contains: Form logic, Supabase auth calls, marketing content
- Depends on: `lib/supabase.ts`, `lib/api.ts`
- Used by: `App.tsx` routes

**State Layer:**
- Purpose: All restaurant data state — areas, reservations, overrides, UI mode flags
- Location: `src/state/useRestaurantStore.ts`
- Contains: `Action` union type, `reducer` function, `useRestaurantStore` hook, `actions` object, undo history (last 50 snapshots via `historyRef`)
- Depends on: `lib/api.ts`, `utils/layout.ts`, `utils/date.ts`, `types.ts`
- Used by: `App.tsx` (sole consumer)

**API / Persistence Layer:**
- Purpose: Supabase read/write operations, restaurant CRUD, auth helpers
- Location: `src/lib/api.ts`, `src/lib/supabase.ts`
- Contains: `loadAllFromSupabase`, `syncAreas`, `syncReservations`, `syncOverrides`, `deleteAreaFromDb`, `deleteOverrideFromDb`, `deleteReservationFromDb`, `getRestaurantForUser`, `createRestaurant`
- Depends on: `lib/supabase.ts`, `types.ts`
- Used by: `state/useRestaurantStore.ts`, `hooks/useAuth.ts`

**UI Components:**
- Purpose: Stateless-to-lightly-stateful presentational components
- Location: `src/components/`
- Contains: `FloorCanvas`, `TableNode`, `TopBar`, `AreaTabs`, `SidePanel`, `ReservationSidebar`, `ReservationCard`, `ObjectEditorCard`, `GroupEditorCard`, `TableActionMenu`, `FloatingPalette`, `DateStrip`, `DayReservationsCard`, `AreaMenu`
- Depends on: `types.ts`, `utils/canvas.ts`, `utils/layout.ts`
- Used by: `App.tsx`

**Utility Layer:**
- Purpose: Pure functions for derived layout computation, canvas geometry, date formatting
- Location: `src/utils/layout.ts`, `src/utils/canvas.ts`, `src/utils/date.ts`
- Contains: `buildEffectiveTables`, `buildEffectiveFixtures`, `getTableVisualState`, `buildReservationByTable`, `getMergedGroupFrame`, `snap`, `clamp`, `resolveSpawnPosition`, `toISODate`, `addDays`, `formatDateLong`
- Depends on: `types.ts` only
- Used by: `state/`, `components/`, `App.tsx`

**Type Definitions:**
- Purpose: Shared TypeScript types and interfaces for all layers
- Location: `src/types.ts`
- Contains: All domain types — `Table`, `Fixture`, `Area`, `LayoutOverride`, `Reservation`, `MergedTableGroup`, `StoreState`, `Action`-adjacent state types
- Depends on: Nothing
- Used by: All layers

## Data Flow

**Initial Load:**

1. User authenticates via `useAuth` → `setRestaurantId(id)` sets module-level variable in `api.ts`
2. `useRestaurantStore` mounts → `loadAllFromSupabase()` called once
3. Duplicate area cleanup runs in-memory
4. `RESTORE_SNAPSHOT` action dispatched → state replaced wholesale
5. `isInitializing` flag clears → UI renders

**User Interaction → Persistence:**

1. User interacts with a component (e.g., drags a table in `FloorCanvas`)
2. Component calls an `actions.*` function (e.g., `actions.updateTable(...)`)
3. `dispatchWithHistory` saves snapshot to `historyRef` (for undo) then calls `dispatch`
4. `reducer` computes new state immutably
5. `useEffect` on `[areas, reservations, overrides]` fires → debounced 1-second timer
6. After 1 second, `syncAreas`, `syncReservations`, `syncOverrides` write to Supabase via upsert

**Layout Override System:**

1. When `targetMode === "day"`, edits create/clone a `LayoutOverride` for `(dateISO, areaId)`
2. Override contains a snapshot of `defaultTables`/`defaultFixtures` at creation time (immutable baseline)
3. `buildEffectiveTables(area, override)` merges: base snapshot + patches + added - removed
4. `buildEffectiveFixtures(area, override)` follows same pattern
5. When `targetMode === "default"`, edits mutate `area.defaultTables`/`area.defaultFixtures` directly

**State Management:**
- Single `useReducer` in `useRestaurantStore`
- `actions` object (memoized via `useMemo`) is the only dispatch surface exposed to `App.tsx`
- Undo: up to 50 state snapshots stored in `historyRef` (in-memory only, not persisted)
- No optimistic updates — reducer runs first, Supabase sync follows asynchronously

## Key Abstractions

**LayoutOverride:**
- Purpose: Represents per-day deviations from a restaurant's default floor plan
- Examples: `src/types.ts` (interface), `src/state/useRestaurantStore.ts` (mutation logic), `src/utils/layout.ts` (`buildEffectiveTables`)
- Pattern: Stores a snapshot of the base plan at creation time plus a diff (patches, added, removed). This ensures default plan changes don't retroactively affect days with overrides.

**EffectiveTable / EffectiveFixture:**
- Purpose: View-ready computed objects for a specific date — the result of applying override to base
- Examples: Returned by `buildEffectiveTables` and `buildEffectiveFixtures` in `src/utils/layout.ts`
- Pattern: Extends `Table`/`Fixture` with `blocked` and `isAddedByOverride` flags

**MergedTableGroup:**
- Purpose: Represents multiple physical tables merged into a single bookable unit
- Examples: `src/types.ts`, override `mergedGroups[]` array
- Pattern: Groups tables by ID reference; layout frame computed dynamically via `getMergedGroupFrame`

**Action Union Type:**
- Purpose: Discriminated union of all state mutations
- Examples: `src/state/useRestaurantStore.ts` (lines 30–76)
- Pattern: Every UI operation maps to exactly one `Action` type; reducer is the only mutation point

## Entry Points

**Browser Entry:**
- Location: `src/main.tsx`
- Triggers: Vite dev server or built HTML load
- Responsibilities: Mount React root into `#root`, wrap in `StrictMode`

**App Router:**
- Location: `src/App.tsx` — `App()` function
- Triggers: React render
- Responsibilities: Define routes (`/`, `/login`, `/register`, `/app`), enforce auth guards, render `RestaurantApp`

**RestaurantApp:**
- Location: `src/App.tsx` — `RestaurantApp()` function (lines 126+)
- Triggers: Successful auth with valid `restaurantId`
- Responsibilities: Call `useRestaurantStore`, compute all derived layout data, wire all event handlers, render full dashboard layout

## Error Handling

**Strategy:** Errors are caught at the async boundary; UI shows loading states but no structured error UI for most failures

**Patterns:**
- API calls use `.catch(console.error)` for fire-and-forget sync operations (e.g., `syncAreas`, `deleteAreaFromDb`)
- `loadAllFromSupabase` failure in store: caught, `isInitializing` clears, app renders with empty state
- `useAuth` auth errors: thrown from `signIn`/`signUp`, caught by calling component (LoginPage/RegisterPage) to display inline error messages
- `api.ts` getRestaurantForUser: returns `null` on error rather than throwing
- No global error boundary present

## Cross-Cutting Concerns

**Logging:** `console.log` and `console.error` used directly; no logging library
**Validation:** Only client-side form validation (password length checks in RegisterPage)
**Authentication:** Supabase Auth via `onAuthStateChange` listener in `useAuth`; `restaurantId` threaded through module-level variable in `api.ts` via `setRestaurantId()`

---

*Architecture analysis: 2026-03-20*
