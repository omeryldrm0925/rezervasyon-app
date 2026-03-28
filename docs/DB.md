# DB.md — Veritabanı Şeması

> Supabase PostgreSQL. RLS TÜM TABLOLARDA AKTİF.

## Tablolar

### restaurants
- id: UUID (gen_random_uuid)
- owner_id: UUID → auth.users
- name, slug (UNIQUE), phone, address: TEXT
- subscription_plan: TEXT (free|basic|premium)
- subscription_status: TEXT (active)
- working_hours: JSONB (gün bazlı açılış/kapanış saatleri)
- onboarding_completed: BOOLEAN (default false)

### areas
- id: TEXT (uygulama üretir, ör: "area-mmxllfxe-4")
- restaurant_id: UUID
- name: TEXT (default 'Ana Salon')
- plan_data: JSONB → `{ defaultTables: Table[], defaultFixtures: Fixture[] }`
- sort_order: INTEGER

### layout_overrides
- id: TEXT
- area_id: TEXT → areas.id (FK, ON DELETE CASCADE)
- date_iso: DATE
- override_data: JSONB
- UNIQUE(area_id, date_iso)

### reservations
- id: TEXT
- restaurant_id: UUID
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

## RLS Politikaları

### restaurants
```sql
CREATE POLICY "owner_all" ON restaurants FOR ALL USING (owner_id = auth.uid());
```

### areas
```sql
CREATE POLICY "owner_all" ON areas FOR ALL USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);
```

### layout_overrides
```sql
CREATE POLICY "owner_all" ON layout_overrides FOR ALL USING (
  area_id IN (
    SELECT a.id FROM areas a JOIN restaurants r ON r.id = a.restaurant_id
    WHERE r.owner_id = auth.uid()
  )
);
```

### reservations
```sql
CREATE POLICY "owner_all" ON reservations FOR ALL USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);
```

### demo_requests
```sql
CREATE POLICY "anyone_can_insert" ON demo_requests FOR INSERT WITH CHECK (true);
```

## TypeScript Tipleri (src/types/index.ts)

```
Table → id, label, shape (square|rectangle|round|bar|booth), x, y, width, height, capacity
Fixture → id, kind (door|window|bar_counter|tree|pool|restroom|cashier|wall|stairs|pillar), x, y, width, height, rotation
Area → id, name, defaultTables[], defaultFixtures[]
LayoutOverride → dateISO, areaId, tablePatches, addedTables, removedTableIds, mergedGroups, fixturePatches, addedFixtures, removedFixtureIds
MergedTableGroup → id, name, tableIds[], x?, y?, width?, height?, capacity?
Reservation → id, dateISO, areaId, ownerType, ownerId, tableIds[], guestName, phone, guestCount, time, notes, status
```

## Veri Akışı
- localStorage anlık yedek, 1sn debounce ile Supabase sync
- supabaseLoaded flag ile loading kontrolü
- loadAllFromSupabase: REPLACE semantiği (append değil)
- layout_overrides sorgusu `.in("area_id", areaIds)` ile filtreleniyor (security fix)
- syncAreas: upsert + orphan silme
- Salon bazlı masa isimlendirme: A-1, B-1, C-1 (salon index'ine göre harf)
