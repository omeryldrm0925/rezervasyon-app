import {
  type Area,
  type EffectiveFixture,
  type EffectiveTable,
  type Fixture,
  type FixturePatch,
  type LayoutOverride,
  type MergedTableGroup,
  type OverridesByDate,
  type Reservation,
  type ReservationCapacityInfo,
  type Table,
  type TablePatch,
  type TableVisualState
} from "../types";

export function getAreaById(areas: Area[], areaId: string | null): Area | null {
  if (!areaId) return null;
  return areas.find((area) => area.id === areaId) ?? null;
}

export function getOverride(
  overrides: OverridesByDate,
  dateISO: string,
  areaId: string | null
): LayoutOverride | null {
  if (!areaId) return null;
  return overrides[dateISO]?.[areaId] ?? null;
}

export function buildEffectiveTables(area: Area | null, override: LayoutOverride | null): EffectiveTable[] {
  if (!area) return [];

  const removed = new Set(override?.removedTableIds ?? []);
  const baseTables = area.defaultTables
    .filter((table) => !removed.has(table.id))
    .map((table) => applyTablePatch(table, override?.tablePatches[table.id], false));
  const added = (override?.addedTables ?? []).map((table) =>
    applyTablePatch(table, override?.tablePatches[table.id], true)
  );

  return [...baseTables, ...added];
}

export function buildEffectiveFixtures(
  area: Area | null,
  override: LayoutOverride | null
): EffectiveFixture[] {
  if (!area) return [];

  const removed = new Set(override?.removedFixtureIds ?? []);
  const baseFixtures = area.defaultFixtures
    .filter((fixture) => !removed.has(fixture.id))
    .map((fixture) => applyFixturePatch(fixture, override?.fixturePatches[fixture.id], false));
  const added = (override?.addedFixtures ?? []).map((fixture) =>
    applyFixturePatch(fixture, override?.fixturePatches[fixture.id], true)
  );

  return [...baseFixtures, ...added];
}

export function getMergedGroupMap(override: LayoutOverride | null): Record<string, MergedTableGroup> {
  const map: Record<string, MergedTableGroup> = {};
  for (const group of override?.mergedGroups ?? []) {
    for (const tableId of group.tableIds) {
      map[tableId] = group;
    }
  }
  return map;
}

export function getMergedGroupsById(
  override: LayoutOverride | null
): Record<string, MergedTableGroup> {
  return (override?.mergedGroups ?? []).reduce<Record<string, MergedTableGroup>>((acc, group) => {
    acc[group.id] = group;
    return acc;
  }, {});
}

export function getMergedGroupFrame(
  group: MergedTableGroup,
  tableMap: Record<string, Table>
): { x: number; y: number; width: number; height: number; capacity: number; memberCount: number } | null {
  const groupTables = group.tableIds.map((tableId) => tableMap[tableId]).filter(Boolean) as Table[];
  if (groupTables.length < 2) return null;

  const minX = Math.min(...groupTables.map((table) => table.x));
  const minY = Math.min(...groupTables.map((table) => table.y));
  const maxX = Math.max(...groupTables.map((table) => table.x + table.width));
  const maxY = Math.max(...groupTables.map((table) => table.y + table.height));
  const x = typeof group.x === "number" ? group.x : minX - 10;
  const y = typeof group.y === "number" ? group.y : minY - 10;
  const width = typeof group.width === "number" ? group.width : maxX - minX + 20;
  const height = typeof group.height === "number" ? group.height : maxY - minY + 20;
  const capacity = group.capacity ?? groupTables.reduce((sum, table) => sum + table.capacity, 0);
  return { x, y, width, height, capacity, memberCount: groupTables.length };
}

export function getReservationsForAreaDate(
  reservations: Reservation[],
  dateISO: string,
  areaId: string | null
): Reservation[] {
  if (!areaId) return [];
  return reservations
    .filter((entry) => entry.dateISO === dateISO && entry.areaId === areaId)
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function getReservationsForDate(reservations: Reservation[], dateISO: string): Reservation[] {
  return reservations.filter((entry) => entry.dateISO === dateISO).sort((a, b) => a.time.localeCompare(b.time));
}

export function buildTableMap(tables: Table[]): Record<string, Table> {
  return tables.reduce<Record<string, Table>>((acc, table) => {
    acc[table.id] = table;
    return acc;
  }, {});
}

export function getReservationCapacityInfo(
  reservation: Reservation,
  tableMap: Record<string, Table>
): ReservationCapacityInfo {
  const capacity = reservation.tableIds.reduce((sum, tableId) => sum + (tableMap[tableId]?.capacity ?? 0), 0);
  const guestCount = reservation.guestCount;
  return { capacity, guestCount, hasMismatch: guestCount > capacity };
}

export function buildReservationByTable(reservations: Reservation[]): Record<string, Reservation> {
  return reservations.reduce<Record<string, Reservation>>((acc, reservation) => {
    reservation.tableIds.forEach((tableId) => {
      acc[tableId] = reservation;
    });
    return acc;
  }, {});
}

export function getTableVisualState(input: {
  blocked: boolean;
  reservation?: Reservation;
  hasWarning: boolean;
}): TableVisualState {
  if (input.hasWarning) return "warning";
  if (input.blocked) return "blocked";
  if (!input.reservation) return "empty";
  if (input.reservation.status === "arrived") return "arrived";
  if (input.reservation.status === "cancelled" || input.reservation.status === "no_show") {
    return "empty";
  }
  return "reserved";
}

function applyTablePatch(table: Table, patch: TablePatch | undefined, isAddedByOverride: boolean): EffectiveTable {
  return {
    ...table,
    ...(patch ?? {}),
    blocked: patch?.blocked ?? false,
    isAddedByOverride
  };
}

function applyFixturePatch(
  fixture: Fixture,
  patch: FixturePatch | undefined,
  isAddedByOverride: boolean
): EffectiveFixture {
  return {
    ...fixture,
    ...(patch ?? {}),
    isAddedByOverride
  };
}
