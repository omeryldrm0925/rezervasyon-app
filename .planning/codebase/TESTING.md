# Testing Patterns

**Analysis Date:** 2026-03-20

## Test Framework

**Runner:**
- None installed — no test framework detected in `package.json`
- No `jest.config.*`, `vitest.config.*`, or similar config files present
- No test runner scripts in `package.json` `scripts` block (only `dev`, `build`, `preview`)

**Assertion Library:**
- None

**Run Commands:**
```bash
# No test commands available — not configured
npm run dev      # development server
npm run build    # TypeScript compile + Vite build
npm run preview  # preview production build
```

## Test File Organization

**Location:**
- No test files exist in the codebase — zero `.test.*` or `.spec.*` files found

**Naming:**
- No convention established

**Structure:**
- Not applicable

## Test Structure

**Suite Organization:**
- Not applicable — no tests exist

**Patterns:**
- No setup, teardown, or assertion patterns established

## Mocking

**Framework:** None

**Patterns:**
- Not applicable

**What to Mock:**
- Not established

**What NOT to Mock:**
- Not established

## Fixtures and Factories

**Test Data:**
- `src/data/mockData.ts` exists — exports `mockAreas`, `mockOverrides`, `mockReservations`
- This file appears to be leftover from a pre-Supabase phase (CLAUDE.md notes "mock data kaldırıldı")
- Not used in actual tests — no tests exist

**Location:**
- `src/data/mockData.ts` — contains empty/minimal mock structures

## Coverage

**Requirements:** None enforced

**View Coverage:**
```bash
# Not available — no test runner configured
```

## Test Types

**Unit Tests:**
- Not present

**Integration Tests:**
- Not present

**E2E Tests:**
- Not present

## Manual Testing Reference

`TEST-CASES.md` exists at project root — contains manual test cases for human verification. This is the only testing artifact in the codebase and covers functional scenarios tested by hand.

## Adding Tests — Recommended Setup

If tests are added, the natural fit for this stack (Vite + React + TypeScript) is:

**Recommended framework:** Vitest (native Vite integration, zero config)

**Install:**
```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event jsdom
```

**Recommended config** (`vite.config.ts`):
```typescript
test: {
  environment: "jsdom",
  globals: true,
}
```

**Highest-value test targets** (pure functions, no DOM needed):
- `src/utils/layout.ts` — `buildEffectiveTables`, `buildEffectiveFixtures`, `getTableVisualState`, `buildReservationByTable`
- `src/utils/canvas.ts` — `snap`, `clamp`, `collides`, `resolveSpawnPosition`
- `src/utils/date.ts` — `toISODate`, `addDays`, `parseISODate`, `formatDayLabel`

These functions are pure, side-effect free, and have clear inputs/outputs making them ideal first test targets.

---

*Testing analysis: 2026-03-20*
