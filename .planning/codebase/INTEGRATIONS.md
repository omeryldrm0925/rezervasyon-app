# External Integrations

**Analysis Date:** 2026-03-20

## APIs & External Services

**Backend-as-a-Service:**
- Supabase — Database, authentication, and real-time backend
  - SDK/Client: `@supabase/supabase-js` ^2.99.1
  - Client initialization: `src/lib/supabase.ts`
  - Auth: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (env vars)
  - All database operations centralized in `src/lib/api.ts`

## Data Storage

**Databases:**
- Supabase PostgreSQL
  - Connection: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
  - Client: `@supabase/supabase-js` createClient (no ORM layer, raw Supabase query builder)
  - RLS: Disabled on all tables (noted in `docs/DB.md`)

**Tables accessed from application:**
- `restaurants` — Restaurant records, queried in `src/lib/api.ts` (`getRestaurantForUser`, `createRestaurant`)
- `areas` — Floor plan areas with JSONB plan_data, synced via `syncAreas()`
- `layout_overrides` — Date-specific layout overrides, synced via `syncOverrides()`
- `reservations` — Reservation records, synced via `syncReservations()`
- `demo_requests` — Landing page demo request form submissions, inserted directly in `src/features/landing/LandingPage.tsx`

**File Storage:**
- Not used — no Supabase Storage or other file storage integration detected

**Caching:**
- None — no Redis, CDN caching layer, or in-memory cache beyond React state

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (email/password)
  - Implementation: `src/hooks/useAuth.ts`
  - Sign-in: `supabase.auth.signInWithPassword({ email, password })`
  - Sign-up: `supabase.auth.signUp({ email, password })` then auto-creates restaurant record
  - Sign-out: `supabase.auth.signOut()` + `localStorage.removeItem("rezerve-v1")`
  - Session management: `supabase.auth.onAuthStateChange()` listener (no manual `getSession()` call to avoid race conditions)
  - User object type: `User` from `@supabase/supabase-js`

**Authorization:**
- Restaurant-scoped: after login, `setRestaurantId(id)` sets a module-level variable in `src/lib/api.ts`; all queries filter by `currentRestaurantId`
- No RLS — application-level tenant isolation only

**Auth Pages:**
- Login: `src/features/auth/LoginPage.tsx`
- Register: `src/features/auth/RegisterPage.tsx`

## Monitoring & Observability

**Error Tracking:**
- None detected — no Sentry, Datadog, or similar integration

**Logs:**
- Console-based only — errors are thrown or caught silently in `src/hooks/useAuth.ts` and `src/lib/api.ts`

## CI/CD & Deployment

**Hosting:**
- Vercel — automatic deployment on GitHub push to main branch

**CI Pipeline:**
- None detected — no GitHub Actions, CircleCI, or similar config files present

## Environment Configuration

**Required env vars:**
- `VITE_SUPABASE_URL` — Supabase project REST endpoint URL
- `VITE_SUPABASE_ANON_KEY` — Supabase public anon key for client-side access

**Secrets location:**
- Development: `.env.local` (present, gitignored)
- Production: Vercel project environment variable settings

**Graceful degradation:**
- If env vars are missing, `configured` flag in `src/lib/api.ts` is `false` and all sync/load functions return early without throwing

## Webhooks & Callbacks

**Incoming:**
- None — no webhook endpoints (this is a pure SPA with no server)

**Outgoing:**
- None detected

## Third-Party UI/Assets

**No external CDN dependencies** — all assets are local or Tailwind utility classes
**No analytics scripts** — no Google Analytics, Segment, Mixpanel, or similar

---

*Integration audit: 2026-03-20*
