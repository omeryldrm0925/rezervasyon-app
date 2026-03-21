# DB.md — Veritabanı Şeması

> Supabase PostgreSQL. RLS TÜM TABLOLARDA KAPALI.

## Tablolar

### restaurants
- id: UUID (gen_random_uuid)
- owner_id: UUID → auth.users (nullable, FK kaldırılmış)
- name, slug (UNIQUE), phone, address: TEXT
- subscription_plan: TEXT (free|basic|premium)
- subscription_status: TEXT (active)

### areas
- id: TEXT (uygulama üretir, ör: "area-mmxllfxe-4")
- restaurant_id: UUID (FK kaldırılmış)
- name: TEXT (default 'Ana Salon')
- plan_data: JSONB → `{ defaultTables: Table[], defaultFixtures: Fixture[] }`
- sort_order: INTEGER

### layout_overrides
- id: TEXT
- area_id: TEXT → areas.id (FK, ON DELETE CASCADE)
- date_iso: DATE
- override_data: JSONB → `{ tablePatches, addedTables, removedTableIds, mergedGroups, fixturePatches, addedFixtures, removedFixtureIds }`
- UNIQUE(area_id, date_iso)

### reservations
- id: TEXT
- restaurant_id: UUID (FK kaldırılmış)
- area_id: TEXT → areas.id (FK, ON DELETE CASCADE)
- date_iso: DATE
- owner_type: TEXT (table|group)
- owner_id: TEXT
- table_ids: JSONB (string array)
- guest_name, phone: TEXT
- guest_count: INTEGER
- time: TIME
- notes: TEXT
- status: TEXT (reserved|arrived|cancelled|no_show)

### demo_requests
- id: UUID
- name, email, restaurant_name, phone: TEXT
- created_at: TIMESTAMPTZ

## TypeScript Tipleri (src/types/index.ts)

```typescript
Table → id, label, shape (square|rectangle|round|bar|booth), x, y, width, height, capacity
Fixture → id, kind (door|window|bar_counter|tree|pool|restroom|cashier|wall|stairs|pillar), x, y, width, height, rotation
Area → id, name, defaultTables[], defaultFixtures[]
LayoutOverride → dateISO, areaId, tablePatches, addedTables, removedTableIds, mergedGroups, fixturePatches, addedFixtures, removedFixtureIds
MergedTableGroup → id, name, tableIds[], x?, y?, width?, height?, capacity?
Reservation → id, dateISO, areaId, ownerType, ownerId, tableIds[], guestName, phone, guestCount, time, notes, status
```

## Veri Akışı
- state.areas[] → areas tablosu (plan_data = {defaultTables, defaultFixtures})
- state.overrides[dateISO][areaId] → layout_overrides (override_data)
- state.reservations[] → reservations tablosu
- syncAreas: upsert + orphan silme (replace semantiği)
- syncOverrides: upsert (onConflict: area_id,date_iso)
- syncReservations: upsert (onConflict: id)
