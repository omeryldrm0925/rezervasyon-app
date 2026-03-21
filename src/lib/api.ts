import { supabase } from "./supabase";
import type { Area, LayoutOverride, OverridesByDate, Reservation } from "../types";

// Giriş yapıldıktan sonra setRestaurantId() ile set edilir
let currentRestaurantId = "";

export function setRestaurantId(id: string): void {
  currentRestaurantId = id;
}

// Supabase bağlantısı yapılandırılmış mı?
const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

// ─── Restoran ─────────────────────────────────────────────────────────────────

/** Kullanıcının restoranını çeker. */
export async function getRestaurantForUser(userId: string): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("owner_id", userId)
    .single();
  if (error) return null;
  return data as { id: string; name: string };
}

/** Yeni restoran oluşturur, oluşturulan kaydı döner. */
export async function createRestaurant(userId: string, name: string): Promise<{ id: string; name: string }> {
  const slug = name
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const { data, error } = await supabase
    .from("restaurants")
    .insert({ owner_id: userId, name, slug })
    .select("id, name")
    .single();
  if (error) throw error;
  return data as { id: string; name: string };
}

// ─── Yükle ────────────────────────────────────────────────────────────────────

/** Supabase'den tüm veriyi çeker. Bağlantı yoksa boş döner. */
export async function loadAllFromSupabase(): Promise<{
  areas: Area[];
  reservations: Reservation[];
  overrides: OverridesByDate;
}> {
  if (!configured || !currentRestaurantId) return { areas: [], reservations: [], overrides: {} };

  const [areasRes, reservationsRes, overridesRes] = await Promise.all([
    supabase
      .from("areas")
      .select("id, name, plan_data, sort_order")
      .eq("restaurant_id", currentRestaurantId)
      .order("sort_order"),
    supabase.from("reservations").select("*").eq("restaurant_id", currentRestaurantId),
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

/** Tüm area'ları Supabase'e yazar (upsert) ve state'te olmayan orphan satırları siler. */
export async function syncAreas(areas: Area[]): Promise<void> {
  if (!configured || !currentRestaurantId) return;

  if (areas.length > 0) {
    const rows = areas.map((area, i) => ({
      id: area.id,
      restaurant_id: currentRestaurantId,
      name: area.name,
      plan_data: { defaultTables: area.defaultTables, defaultFixtures: area.defaultFixtures },
      sort_order: i
    }));
    const { error } = await supabase.from("areas").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }

  // State'te olmayan (orphan) satırları sil — duplicate bug'ından kalan artıkları temizler
  const keepIds = areas.map((a) => a.id);
  if (keepIds.length > 0) {
    await supabase
      .from("areas")
      .delete()
      .eq("restaurant_id", currentRestaurantId)
      .not("id", "in", `(${keepIds.join(",")})`);
  } else {
    // Hiç alan yoksa hepsini sil
    await supabase.from("areas").delete().eq("restaurant_id", currentRestaurantId);
  }
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
  const { error } = await supabase.from("layout_overrides").upsert(rows, { onConflict: "area_id,date_iso" });
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
  const rows = reservations.map((r) => ({
    id: r.id,
    restaurant_id: currentRestaurantId,
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
  const { error } = await supabase.from("reservations").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

/** Belirli bir rezervasyonu Supabase'den siler. */
export async function deleteReservationFromDb(reservationId: string): Promise<void> {
  if (!configured) return;
  const { error } = await supabase.from("reservations").delete().eq("id", reservationId);
  if (error) throw error;
}

/** Belirli bir alanı (area) ve ona ait override + rezervasyonları Supabase'den siler. */
export async function deleteAreaFromDb(areaId: string): Promise<void> {
  if (!configured) return;
  // override'lar ve rezervasyonlar FK cascade ile silinebilir;
  // eğer cascade yoksa önce onları temizle.
  await supabase.from("layout_overrides").delete().eq("area_id", areaId);
  await supabase.from("reservations").delete().eq("area_id", areaId);
  const { error } = await supabase.from("areas").delete().eq("id", areaId);
  if (error) throw error;
}
