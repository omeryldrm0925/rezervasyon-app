# Rezerve MVP

Internal restaurant operations tool for reservation handling and floor planning.

## Run

```bash
npm install
npm run dev
```

If PowerShell blocks scripts, use:

```bash
npm.cmd install
npm.cmd run dev
```

## MVP Features

- Direct entry into a single operational screen (no login)
- Date strip with jump picker and Today shortcut
- Area/floor management (create, rename, switch)
- Table-first reservations with compact contextual table card
- Floor-first workspace with floating palette and day reservation mini card
- Default layout + day override support in one screen
- Drag/drop placement, drag move, resize, grid snap
- Manual merge/split tables for a selected date
- Capacity mismatch warnings without blocking save

## Main Structure

```text
src/
  components/
  data/mockData.ts
  state/useRestaurantStore.ts
  utils/
  App.tsx
  styles.css
```
