import { supabase } from "./supabase";
import type { Area, LayoutOverride, OverridesByDate, Reservation } from "../types";

// Auth eklenince kaldırılacak — şimdilik sabit restoran ID
export const TEMP_RESTAURANT_ID = "00000000-0000-0000-0000-000000000001";

// Supabase bağlantısı yapılandırılmış mı?
const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

// ─── Yükle ────────────────────────────────────────────────────────────────────

/** Supabase'den tüm veriyi çeker. Bağlantı yoksa boş döner. */
export async function loadAllFromSupabase(): Promise<{
  areas: Area[];
  reservations: Reservation[];
  overrides: OverridesByDate;
}> {
  if (!configured) return { areas: [], reservations: [], overrides: {} };

  const [areasRes, reservationsRes, overridesRes] = await Promise.all([
    supabase
      .from("areas")
      .select("id, name, plan_data, sort_order")
      .eq("restaurant_id", TEMP_RESTAURANT_ID)
      .order("sort_order"),
    supabase.from("reservations").select("*").eq("restaurant_id", TEMP_RESTAURANT_ID),
    supabase.from("layout_overrides").select("area_id, date_iso, override_data")
  ]);

  if (areasRes.error) throw areasRes.error;
  if (reservationsRes.error) throw reservationsRes.error;
  if (overridesRes.error) throw overridesRes.error;

  const areaIds = new Set((areasRes.data ?? []).map((r) => r.id as string));

  const areas: Area[] = (areasRes.data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    defaultTables: (row.plan_data as { defaultTables?: Area["defaultTables"] })?.defaultTables ?? [],
    defaultFixtures: (row.plan_data as { defaultFixtures?: Area["defaultFixtures"] })?.defaultFixtures ?? []
  }));

  const reservations: Reservation[] = (reservationsRes.data ?? []).map((row) => ({
    id: row.id as string,
    dateISO: row.date_iso as string,
    areaId: row.area_id as string,
    ownerType: row.owner_type as Reservation["ownerType"],
    ownerId: row.owner_id as string,
    tableIds: row.table_ids as string[],
    guestName: row.guest_name as string,
    phone: row.phone as string,
    guestCount: row.guest_count as number,
    time: row.time as string,
    notes: row.notes as string,
    status: row.status as Reservation["status"]
  }));

  const overrides: OverridesByDate = {};
  for (const row of overridesRes.data ?? []) {
    const areaId = row.area_id as string;
    if (!areaIds.has(areaId)) continue; // Sadece bu restorana ait override'lar
    const dateISO = row.date_iso as string;
    if (!overrides[dateISO]) overrides[dateISO] = {};
    overrides[dateISO][areaId] = row.override_data as LayoutOverride;
  }

  return { areas, reservations, overrides };
}

// ─── Kaydet ───────────────────────────────────────────────────────────────────

/** Tüm area'ları Supabase'e yazar (upsert). */
export async function syncAreas(areas: Area[]): Promise<void> {
  if (!configured || areas.length === 0) return;
  console.log("syncAreas çağrıldı, gönderilen veri:", JSON.stringify(areas.map(a => ({ id: a.id, name: a.name }))));
  const rows = areas.map((area, i) => ({
    id: area.id,
    restaurant_id: TEMP_RESTAURANT_ID,
    name: area.name,
    plan_data: { defaultTables: area.defaultTables, defaultFixtures: area.defaultFixtures },
    sort_order: i
  }));
  const { data, error } = await supabase.from("areas").upsert(rows, { onConflict: "id" });
  console.log("syncAreas sonuç:", { data, error });
  if (error) throw error;
}

/** Tüm override'ları Supabase'e yazar (upsert). */
export async function syncOverrides(overrides: OverridesByDate): Promise<void> {
  if (!configured) return;
  const rows = Object.values(overrides).flatMap((bucket) =>
    Object.values(bucket).map((override) => ({
      area_id: override.areaId,
      date_iso: override.dateISO,
      override_data: override
    }))
  );
  if (rows.length === 0) return;
  console.log("syncOverrides çağrıldı, satır sayısı:", rows.length);
  const { data, error } = await supabase.from("layout_overrides").upsert(rows, { onConflict: "area_id,date_iso" });
  console.log("syncOverrides sonuç:", { data, error });
  if (error) throw error;
}

/** Belirli bir override'ı Supabase'den siler. */
export async function deleteOverrideFromDb(areaId: string, dateISO: string): Promise<void> {
  if (!configured) return;
  const { error } = await supabase
    .from("layout_overrides")
    .delete()
    .eq("area_id", areaId)
    .eq("date_iso", dateISO);
  if (error) throw error;
}

/** Tüm rezervasyonları Supabase'e yazar (upsert). */
export async function syncReservations(reservations: Reservation[]): Promise<void> {
  if (!configured || reservations.length === 0) return;
  console.log("syncReservations çağrıldı, rezervasyon sayısı:", reservations.length);
  const rows = reservations.map((r) => ({
    id: r.id,
    restaurant_id: TEMP_RESTAURANT_ID,
    area_id: r.areaId,
    date_iso: r.dateISO,
    owner_type: r.ownerType,
    owner_id: r.ownerId,
    table_ids: r.tableIds,
    guest_name: r.guestName,
    phone: r.phone,
    guest_count: r.guestCount,
    time: r.time,
    notes: r.notes,
    status: r.status
  }));
  const { data, error } = await supabase.from("reservations").upsert(rows, { onConflict: "id" });
  console.log("syncReservations sonuç:", { data, error });
  if (error) throw error;
}

/** Belirli bir rezervasyonu Supabase'den siler. */
export async function deleteReservationFromDb(reservationId: string): Promise<void> {
  if (!configured) return;
  const { error } = await supabase.from("reservations").delete().eq("id", reservationId);
  if (error) throw error;
}
