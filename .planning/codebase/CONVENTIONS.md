# Coding Conventions

**Analysis Date:** 2026-03-20

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx` — `FloorCanvas.tsx`, `TableNode.tsx`, `ReservationSidebar.tsx`
- Hooks: camelCase prefixed with `use` — `useAuth.ts`, `useRestaurantStore.ts`
- Utilities: camelCase `.ts` — `canvas.ts`, `layout.ts`, `date.ts`
- Feature pages: PascalCase `.tsx` inside feature subfolder — `features/auth/LoginPage.tsx`
- API/lib modules: camelCase `.ts` — `api.ts`, `supabase.ts`
- Type definitions: single flat file — `types.ts`

**Functions:**
- React components: PascalCase — `function FloorCanvas(...)`, `function TableNode(...)`
- Hooks: camelCase `use` prefix — `function useAuth()`, `function useRestaurantStore()`
- Utility/helper functions: camelCase — `buildEffectiveTables`, `resolveSpawnPosition`, `toISODate`
- Private/internal helpers (same file): camelCase — `buildDefaultTable`, `cloneOverride`, `getOrCloneOverride`
- Event handlers: camelCase `handle` prefix — `handleSubmit`, `handleUser`

**Variables:**
- State: camelCase — `restaurantId`, `activeDateISO`, `layoutUnlocked`
- Constants: SCREAMING_SNAKE_CASE for module-level — `GRID`, `DEFAULT_CANVAS_VIEWPORT`, `FIXTURE_DEFAULTS`
- Local constants: camelCase — `configured`, `keepIds`

**Types/Interfaces:**
- Interfaces: PascalCase `interface` keyword — `Table`, `Reservation`, `StoreState`
- Union/enum types: PascalCase `type` keyword — `TableShape`, `ReservationStatus`, `InteractionMode`
- Props interfaces: component name + `Props` suffix — `FloorCanvasProps`, `TopBarProps`, `TableNodeProps`
- Patch/partial types: base name + `Patch` suffix — `TablePatch`, `FixturePatch`
- Discriminated unions: `kind` or `type` as discriminant — `SelectedObject` uses `kind`, Redux-style `Action` uses `type`

**Redux-style Action Types:**
- SCREAMING_SNAKE_CASE strings — `"SET_DATE"`, `"ADD_TABLE"`, `"UPSERT_RESERVATION"`

## Code Style

**Formatting:**
- No Prettier or ESLint config file detected — formatting is manual/implicit
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)
- Additional strictness: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- Target: ES2020, ESNext modules
- Trailing commas in multiline objects and arrays (observed throughout)

**Linting:**
- No `.eslintrc` present — relies on TypeScript compiler for type checking
- Two `eslint-disable` inline comments exist in the codebase: `src/state/useRestaurantStore.ts:918` and `src/components/FloorCanvas.tsx:416` (both for `react-hooks/exhaustive-deps`)

## Import Organization

**Order (observed pattern):**
1. React and React hooks — `import { useState, useEffect, useMemo } from "react"`
2. External libraries — `react-router-dom`, `@supabase/supabase-js`
3. Internal components — `import { FloorCanvas } from "./components/FloorCanvas"`
4. Internal utilities/hooks — `import { useRestaurantStore } from "./state/useRestaurantStore"`
5. Types — `import { type Area, type Table } from "../types"` (using `type` keyword for type-only imports)

**Type-only imports:**
- Always use `import type { ... }` or `import { type Foo }` for type imports — strictly followed
- Example: `import { type EffectiveTable, type TableVisualState } from "../types"`

**Path Aliases:**
- None — all imports use relative paths (`./`, `../`)

## Error Handling

**Patterns:**
- API functions that can fail: throw the Supabase error directly — `if (error) throw error`
- API functions that return data: return `null` on error (for queries) — `if (error) return null`
- Delete operations: cascade manually in sequence, then throw on final error
- UI components: wrap async operations in try/catch, store error in local state
- Error messages shown to users are translated to Turkish via local `translateError()` functions (observed in `RegisterPage.tsx`)
- Async operations inside hooks/effects: use `cancelled` flag pattern to prevent stale updates after unmount
- Supabase connection not configured: guard with `if (!configured || !currentRestaurantId) return` — silently return empty/void

**Error state pattern in forms:**
```typescript
const [error, setError] = useState<string | null>(null);
const [loading, setLoading] = useState(false);
// ...
setError(null);
setLoading(true);
try {
  await someAsyncOp();
} catch (err) {
  const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? "";
  setError(msg ? translateError(msg) : "Varsayılan hata mesajı.");
} finally {
  setLoading(false);
}
```

## Logging

**Framework:** `console.log` / `console.error` directly

**Patterns:**
- Load events prefixed with `[Rezerve]` — `console.log("[Rezerve] Supabase'den yüklendi →", ...)`
- Errors use `console.error(err)` — no structured logging
- Logging is sparse — only critical load/error events

## Comments

**When to Comment:**
- Explain non-obvious business logic — override isolation, snapshot rationale
- Note backwards compatibility concerns — `// Eski override kayıtlarında undefined olabilir (backwards compat)`
- Explain Supabase/library-specific behavior — auth event ordering, race conditions
- Section dividers using `// ─── Section Title ─────` pattern for long files
- Turkish comments throughout — matches Turkish UI convention

**JSDoc/TSDoc:**
- Used selectively for exported API functions: `/** Kullanıcının restoranını çeker. */`
- Single-line JSDoc for brief descriptions
- Inline `/** ... */` property comments in types — e.g., `/** degrees: 0 | 90 | 180 | 270 */`

## Function Design

**Size:** Reducer function in `useRestaurantStore.ts` is very large (handles all action types); utility functions are small and focused

**Parameters:** Props passed as destructured object to components; plain params for utilities

**Return Values:**
- Utility functions return typed values or null — `Area | null`, `LayoutOverride | null`
- API functions return `Promise<void>` for writes, typed data for reads
- Components return `ReactNode` (implicit)

## Module Design

**Exports:**
- Named exports only — no default exports except `App` in `src/App.tsx` and `src/main.tsx` bootstrap
- Components: `export function ComponentName(...)` — not arrow function
- Hooks: `export function useHookName()` — not arrow function
- Utilities: `export function utilName(...)` — named functions
- Constants: `export const NAME = ...`

**Barrel Files:**
- None — each module is imported directly by path

**ID Generation:**
- Application-generated IDs using a counter + timestamp — `uid("table")` produces e.g. `"table-mmxllfxe-4"`
- Not UUID format — custom format: `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}`
- Counter is module-level (`let sequence = 0`) in `useRestaurantStore.ts`

## CSS / Styling Patterns

**Approach:** Hybrid — Tailwind CSS utilities for page/layout components; custom CSS classes for canvas/editor components

**Custom CSS:**
- Design tokens in `:root` CSS variables — `--accent`, `--border`, `--text`, `--s-empty`, etc.
- BEM-like class naming — `.top-bar`, `.top-bar__primary`, `.top-bar__controls`, `.table-card__head`
- All custom classes defined in `src/styles.css`

**Tailwind:**
- Used in auth pages and landing page — `className="min-h-screen bg-gray-950 flex items-center justify-center"`
- Not used for canvas/floor components (custom CSS preferred)

---

*Convention analysis: 2026-03-20*
