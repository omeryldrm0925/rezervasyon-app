import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { buildEffectiveTables, buildTableMap, getAreaById, getMergedGroupFrame, getOverride } from "../utils/layout";
import { toISODate } from "../utils/date";
import {
  deleteOverrideFromDb,
  deleteReservationFromDb,
  loadAllFromSupabase,
  syncAreas,
  syncOverrides,
  syncReservations
} from "../lib/api";
import {
  type Area,
  type Fixture,
  type FixtureKind,
  type FixturePatch,
  type LayoutOverride,
  type MergeModeState,
  type MergedTableGroup,
  type OverridesByDate,
  type Reservation,
  type StoreState,
  type Table,
  type TablePatch,
  type TableShape,
  type TargetMode
} from "../types";

type Action =
  | { type: "SET_DATE"; dateISO: string }
  | { type: "SET_AREA"; areaId: string }
  | { type: "SET_TARGET_MODE"; targetMode: TargetMode }
  | { type: "SET_LAYOUT_UNLOCKED"; unlocked: boolean }
  | { type: "SET_RESERVATION_SEARCH_QUERY"; query: string }
  | { type: "SELECT_TABLE_OBJECT"; tableId: string | null }
  | { type: "SELECT_GROUP_OBJECT"; groupId: string | null }
  | { type: "SELECT_FIXTURE_OBJECT"; fixtureId: string | null }
  | { type: "CLEAR_SELECTION" }
  | { type: "START_RESERVATION_INTENT" }
  | { type: "CANCEL_RESERVATION_INTENT" }
  | { type: "ADD_AREA"; name: string }
  | { type: "RENAME_AREA"; areaId: string; name: string }
  | { type: "ADD_TABLE"; areaId: string; targetMode: TargetMode; shape: TableShape; x: number; y: number }
  | { type: "UPDATE_TABLE"; areaId: string; tableId: string; targetMode: TargetMode; patch: TablePatch }
  | { type: "DELETE_TABLE"; areaId: string; tableId: string; targetMode: TargetMode }
  | { type: "ADD_FIXTURE"; areaId: string; targetMode: TargetMode; fixtureKind: FixtureKind; x: number; y: number }
  | { type: "UPDATE_FIXTURE"; areaId: string; fixtureId: string; targetMode: TargetMode; patch: FixturePatch }
  | { type: "DELETE_FIXTURE"; areaId: string; fixtureId: string; targetMode: TargetMode }
  | { type: "UPSERT_RESERVATION"; reservation: Omit<Reservation, "id"> & { id?: string } }
  | { type: "DELETE_RESERVATION"; reservationId: string }
  | { type: "SET_RESERVATION_STATUS"; reservationId: string; status: Reservation["status"] }
  | { type: "HIGHLIGHT_RESERVATION"; reservationId: string | null; tableId: string | null }
  | { type: "START_MERGE_MODE"; tableId: string }
  | { type: "TOGGLE_MERGE_TABLE"; tableId: string }
  | { type: "CANCEL_MERGE_MODE" }
  | { type: "APPLY_MERGE_MODE"; areaId: string }
  | {
      type: "UPDATE_MERGED_GROUP_LAYOUT";
      areaId: string;
      groupId: string;
      patch: Partial<Pick<MergedTableGroup, "x" | "y" | "width" | "height">>;
    }
  | { type: "SPLIT_MERGED_GROUP"; areaId: string; groupId: string }
  | { type: "RESET_DAILY_OVERRIDE"; dateISO: string; areaId: string }
  | { type: "RENAME_MERGED_GROUP"; areaId: string; groupId: string; name: string }
  | { type: "START_EDITING_OBJECT" }
  | { type: "RESTORE_SNAPSHOT"; snapshot: { areas: Area[]; reservations: Reservation[]; overrides: OverridesByDate } }
  | {
      type: "CLONE_TABLES";
      areaId: string;
      targetMode: TargetMode;
      tables: Array<{ shape: TableShape; x: number; y: number; width: number; height: number; label: string; capacity: number }>;
    };


let sequence = 0;
function uid(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

function emptyMergeMode(): MergeModeState {
  return { active: false, baseTableId: null, tableIds: [] };
}

function buildDefaultTable(shape: TableShape, x: number, y: number): Table {
  if (shape === "round") return { id: uid("table"), label: "Yeni", shape, x, y, width: 90, height: 90, capacity: 4 };
  if (shape === "rectangle") return { id: uid("table"), label: "Yeni", shape, x, y, width: 136, height: 82, capacity: 6 };
  if (shape === "bar") return { id: uid("table"), label: "Bar", shape, x, y, width: 52, height: 52, capacity: 1 };
  return {
    id: uid("table"),
    label: shape === "booth" ? "Loca" : "Yeni",
    shape,
    x,
    y,
    width: shape === "booth" ? 172 : 84,
    height: shape === "booth" ? 92 : 84,
    capacity: shape === "booth" ? 6 : 4
  };
}

function buildDefaultFixture(kind: FixtureKind, x: number, y: number): Fixture {
  if (kind === "door") {
    return { id: uid("fixture"), kind, x, y, width: 56, height: 16, rotation: 0, label: "Kapı" };
  }
  return { id: uid("fixture"), kind, x, y, width: 98, height: 14, rotation: 0, label: "Pencere" };
}

function buildEmptyOverride(dateISO: string, areaId: string): LayoutOverride {
  return {
    dateISO,
    areaId,
    tablePatches: {},
    addedTables: [],
    removedTableIds: [],
    mergedGroups: [],
    fixturePatches: {},
    addedFixtures: [],
    removedFixtureIds: []
  };
}

function cloneOverride(override: LayoutOverride): LayoutOverride {
  return {
    ...override,
    tablePatches: { ...override.tablePatches },
    addedTables: [...override.addedTables],
    removedTableIds: [...override.removedTableIds],
    mergedGroups: override.mergedGroups.map((group) => ({ ...group, tableIds: [...group.tableIds] })),
    fixturePatches: { ...override.fixturePatches },
    addedFixtures: [...override.addedFixtures],
    removedFixtureIds: [...override.removedFixtureIds]
  };
}

function createInitialState(): StoreState {
  return {
    areas: [],
    reservations: [],
    overrides: {},
    activeAreaId: null,
    activeDateISO: toISODate(new Date()),
    selectedObject: null,
    interactionMode: "idle",
    highlightedReservationId: null,
    highlightedTableId: null,
    reservationSearchQuery: "",
    targetMode: "day",
    layoutUnlocked: false,
    mergeMode: emptyMergeMode()
  };
}

function getOrCloneOverride(
  state: StoreState,
  dateISO: string,
  areaId: string
): { override: LayoutOverride; overrides: StoreState["overrides"] } {
  const dateBucket = { ...(state.overrides[dateISO] ?? {}) };
  const current = dateBucket[areaId];
  const override = current ? cloneOverride(current) : buildEmptyOverride(dateISO, areaId);
  dateBucket[areaId] = override;
  return { override, overrides: { ...state.overrides, [dateISO]: dateBucket } };
}

function applyPatchToTable(override: LayoutOverride, tableId: string, patch: TablePatch) {
  const addedIndex = override.addedTables.findIndex((table) => table.id === tableId);
  if (addedIndex >= 0) {
    override.addedTables = override.addedTables.map((table, index) =>
      index === addedIndex ? { ...table, ...patch } : table
    );
    return;
  }
  override.tablePatches = {
    ...override.tablePatches,
    [tableId]: { ...(override.tablePatches[tableId] ?? {}), ...patch }
  };
}

function applyPatchToFixture(override: LayoutOverride, fixtureId: string, patch: FixturePatch) {
  const addedIndex = override.addedFixtures.findIndex((fixture) => fixture.id === fixtureId);
  if (addedIndex >= 0) {
    override.addedFixtures = override.addedFixtures.map((fixture, index) =>
      index === addedIndex ? { ...fixture, ...patch } : fixture
    );
    return;
  }
  override.fixturePatches = {
    ...override.fixturePatches,
    [fixtureId]: { ...(override.fixturePatches[fixtureId] ?? {}), ...patch }
  };
}

function removeTableFromGroups(override: LayoutOverride, tableId: string): LayoutOverride["mergedGroups"] {
  return override.mergedGroups
    .map((group) => ({ ...group, tableIds: group.tableIds.filter((id) => id !== tableId) }))
    .filter((group) => group.tableIds.length > 1);
}

function scrubReservationsForTable(
  reservations: Reservation[],
  tableId: string,
  predicate: (reservation: Reservation) => boolean
): Reservation[] {
  const next: Reservation[] = [];
  reservations.forEach((reservation) => {
    if (!predicate(reservation)) {
      next.push(reservation);
      return;
    }
    const tableIds = reservation.tableIds.filter((entry) => entry !== tableId);
    if (tableIds.length === 0) return;
    if (reservation.ownerType === "table" && reservation.ownerId === tableId) {
      next.push({ ...reservation, ownerType: "table", ownerId: tableIds[0], tableIds });
      return;
    }
    next.push({ ...reservation, tableIds });
  });
  return next;
}

function resolveInteractionMode(
  selectedObject: StoreState["selectedObject"],
  mergeMode: MergeModeState
): StoreState["interactionMode"] {
  if (mergeMode.active) return "merging";
  return selectedObject ? "idle" : "idle";
}

function getAreaTables(state: StoreState, areaId: string, overrideForDate?: LayoutOverride | null): Table[] {
  const area = getAreaById(state.areas, areaId);
  if (!area) return [];
  const fallback = getOverride(state.overrides, state.activeDateISO, areaId);
  return buildEffectiveTables(area, overrideForDate ?? fallback);
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "SET_DATE":
      return {
        ...state,
        activeDateISO: action.dateISO,
        selectedObject: null,
        interactionMode: "idle",
        highlightedReservationId: null,
        highlightedTableId: null,
        mergeMode: emptyMergeMode()
      };
    case "SET_AREA":
      return {
        ...state,
        activeAreaId: action.areaId,
        selectedObject: null,
        interactionMode: "idle",
        mergeMode: emptyMergeMode()
      };
    case "SET_TARGET_MODE":
      return {
        ...state,
        targetMode: action.targetMode,
        selectedObject: null,
        interactionMode: "idle",
        mergeMode: emptyMergeMode()
      };
    case "SET_LAYOUT_UNLOCKED":
      return { ...state, layoutUnlocked: action.unlocked };
    case "SET_RESERVATION_SEARCH_QUERY":
      return { ...state, reservationSearchQuery: action.query };
    case "SELECT_TABLE_OBJECT": {
      const selectedObject = action.tableId ? ({ kind: "table", id: action.tableId } as const) : null;
      return { ...state, selectedObject, interactionMode: resolveInteractionMode(selectedObject, state.mergeMode) };
    }
    case "SELECT_GROUP_OBJECT": {
      const selectedObject = action.groupId ? ({ kind: "group", id: action.groupId } as const) : null;
      const mergeMode = action.groupId ? emptyMergeMode() : state.mergeMode;
      return { ...state, selectedObject, mergeMode, interactionMode: resolveInteractionMode(selectedObject, mergeMode) };
    }
    case "SELECT_FIXTURE_OBJECT": {
      const selectedObject = action.fixtureId ? ({ kind: "fixture", id: action.fixtureId } as const) : null;
      return { ...state, selectedObject, interactionMode: resolveInteractionMode(selectedObject, state.mergeMode) };
    }
    case "CLEAR_SELECTION":
      return { ...state, selectedObject: null, interactionMode: state.mergeMode.active ? "merging" : "idle" };
    case "START_RESERVATION_INTENT":
      if (!state.selectedObject || state.selectedObject.kind === "fixture") return state;
      return { ...state, interactionMode: "creatingReservation" };
    case "CANCEL_RESERVATION_INTENT":
      return { ...state, interactionMode: resolveInteractionMode(state.selectedObject, state.mergeMode) };
    case "ADD_AREA": {
      const cleaned = action.name.trim();
      if (!cleaned) return state;
      const nextArea: Area = { id: uid("area"), name: cleaned, defaultTables: [], defaultFixtures: [] };
      return {
        ...state,
        areas: [...state.areas, nextArea],
        activeAreaId: nextArea.id,
        selectedObject: null,
        interactionMode: "idle"
      };
    }
    case "RENAME_AREA": {
      const cleaned = action.name.trim();
      if (!cleaned) return state;
      return { ...state, areas: state.areas.map((area) => (area.id === action.areaId ? { ...area, name: cleaned } : area)) };
    }
    case "ADD_TABLE": {
      const table = buildDefaultTable(action.shape, action.x, action.y);
      const selectedObject = { kind: "table", id: table.id } as const;
      if (action.targetMode === "default") {
        return {
          ...state,
          areas: state.areas.map((area) =>
            area.id === action.areaId ? { ...area, defaultTables: [...area.defaultTables, table] } : area
          ),
          selectedObject,
          interactionMode: "editingObject"
        };
      }
      const { override, overrides } = getOrCloneOverride(state, state.activeDateISO, action.areaId);
      override.addedTables = [...override.addedTables, table];
      return { ...state, overrides, selectedObject, interactionMode: "editingObject" };
    }
    case "UPDATE_TABLE": {
      if (action.targetMode === "default") {
        return {
          ...state,
          areas: state.areas.map((area) => {
            if (area.id !== action.areaId) return area;
            return {
              ...area,
              defaultTables: area.defaultTables.map((table) =>
                table.id === action.tableId ? { ...table, ...action.patch } : table
              )
            };
          })
        };
      }
      const { override, overrides } = getOrCloneOverride(state, state.activeDateISO, action.areaId);
      applyPatchToTable(override, action.tableId, action.patch);
      return { ...state, overrides };
    }
    case "DELETE_TABLE": {
      let areas = state.areas;
      let overrides = state.overrides;

      if (action.targetMode === "default") {
        areas = state.areas.map((area) =>
          area.id === action.areaId
            ? { ...area, defaultTables: area.defaultTables.filter((table) => table.id !== action.tableId) }
            : area
        );
        overrides = Object.entries(state.overrides).reduce<StoreState["overrides"]>((dateAcc, [dateISO, bucket]) => {
          const nextBucket = { ...bucket };
          const scoped = bucket[action.areaId];
          if (scoped) {
            const cloned = cloneOverride(scoped);
            delete cloned.tablePatches[action.tableId];
            cloned.removedTableIds = cloned.removedTableIds.filter((id) => id !== action.tableId);
            cloned.addedTables = cloned.addedTables.filter((table) => table.id !== action.tableId);
            cloned.mergedGroups = removeTableFromGroups(cloned, action.tableId);
            nextBucket[action.areaId] = cloned;
          }
          dateAcc[dateISO] = nextBucket;
          return dateAcc;
        }, {});
      } else {
        const scoped = getOrCloneOverride(state, state.activeDateISO, action.areaId);
        const override = scoped.override;
        const nextOverrides = scoped.overrides;
        delete override.tablePatches[action.tableId];
        override.removedTableIds = Array.from(new Set([...override.removedTableIds, action.tableId]));
        override.addedTables = override.addedTables.filter((table) => table.id !== action.tableId);
        override.mergedGroups = removeTableFromGroups(override, action.tableId);
        overrides = nextOverrides;
      }

      const reservations = scrubReservationsForTable(
        state.reservations,
        action.tableId,
        (reservation) =>
          reservation.areaId === action.areaId &&
          (action.targetMode === "default" || reservation.dateISO === state.activeDateISO)
      );

      const selectedObject =
        state.selectedObject?.kind === "table" && state.selectedObject.id === action.tableId
          ? null
          : state.selectedObject;
      const nextMergeIds = state.mergeMode.tableIds.filter((id) => id !== action.tableId);
      const mergeMode =
        state.mergeMode.baseTableId === action.tableId || nextMergeIds.length < 2
          ? emptyMergeMode()
          : { ...state.mergeMode, tableIds: nextMergeIds };

      return {
        ...state,
        areas,
        overrides,
        reservations,
        selectedObject,
        mergeMode,
        interactionMode: resolveInteractionMode(selectedObject, mergeMode)
      };
    }
    case "ADD_FIXTURE": {
      const fixture = buildDefaultFixture(action.fixtureKind, action.x, action.y);
      const selectedObject = { kind: "fixture", id: fixture.id } as const;
      if (action.targetMode === "default") {
        return {
          ...state,
          areas: state.areas.map((area) =>
            area.id === action.areaId ? { ...area, defaultFixtures: [...area.defaultFixtures, fixture] } : area
          ),
          selectedObject,
          interactionMode: "editingObject"
        };
      }
      const { override, overrides } = getOrCloneOverride(state, state.activeDateISO, action.areaId);
      override.addedFixtures = [...override.addedFixtures, fixture];
      return { ...state, overrides, selectedObject, interactionMode: "editingObject" };
    }
    case "UPDATE_FIXTURE": {
      if (action.targetMode === "default") {
        return {
          ...state,
          areas: state.areas.map((area) => {
            if (area.id !== action.areaId) return area;
            return {
              ...area,
              defaultFixtures: area.defaultFixtures.map((fixture) =>
                fixture.id === action.fixtureId ? { ...fixture, ...action.patch } : fixture
              )
            };
          })
        };
      }
      const { override, overrides } = getOrCloneOverride(state, state.activeDateISO, action.areaId);
      applyPatchToFixture(override, action.fixtureId, action.patch);
      return { ...state, overrides };
    }
    case "DELETE_FIXTURE": {
      if (action.targetMode === "default") {
        return {
          ...state,
          areas: state.areas.map((area) =>
            area.id === action.areaId
              ? { ...area, defaultFixtures: area.defaultFixtures.filter((fixture) => fixture.id !== action.fixtureId) }
              : area
          ),
          selectedObject:
            state.selectedObject?.kind === "fixture" && state.selectedObject.id === action.fixtureId
              ? null
              : state.selectedObject
        };
      }
      const { override, overrides } = getOrCloneOverride(state, state.activeDateISO, action.areaId);
      delete override.fixturePatches[action.fixtureId];
      override.removedFixtureIds = Array.from(new Set([...override.removedFixtureIds, action.fixtureId]));
      override.addedFixtures = override.addedFixtures.filter((fixture) => fixture.id !== action.fixtureId);
      return {
        ...state,
        overrides,
        selectedObject:
          state.selectedObject?.kind === "fixture" && state.selectedObject.id === action.fixtureId
            ? null
            : state.selectedObject
      };
    }
    case "UPSERT_RESERVATION": {
      const payload = action.reservation;
      if (payload.id) {
        return {
          ...state,
          reservations: state.reservations.map((reservation) =>
            reservation.id === payload.id ? { ...reservation, ...payload, id: payload.id } : reservation
          )
        };
      }
      return { ...state, reservations: [...state.reservations, { ...payload, id: uid("res") }] };
    }
    case "DELETE_RESERVATION":
      return { ...state, reservations: state.reservations.filter((reservation) => reservation.id !== action.reservationId) };
    case "SET_RESERVATION_STATUS":
      return {
        ...state,
        reservations: state.reservations.map((reservation) =>
          reservation.id === action.reservationId ? { ...reservation, status: action.status } : reservation
        )
      };
    case "HIGHLIGHT_RESERVATION":
      return { ...state, highlightedReservationId: action.reservationId, highlightedTableId: action.tableId };
    case "START_MERGE_MODE":
      if (state.targetMode === "default") return state;
      return {
        ...state,
        selectedObject: { kind: "table", id: action.tableId },
        interactionMode: "merging",
        mergeMode: { active: true, baseTableId: action.tableId, tableIds: [action.tableId] }
      };
    case "TOGGLE_MERGE_TABLE": {
      if (!state.mergeMode.active || !state.mergeMode.baseTableId) return state;
      if (action.tableId === state.mergeMode.baseTableId) return state;
      const exists = state.mergeMode.tableIds.includes(action.tableId);
      const tableIds = exists
        ? state.mergeMode.tableIds.filter((id) => id !== action.tableId)
        : [...state.mergeMode.tableIds, action.tableId];
      return { ...state, mergeMode: { ...state.mergeMode, tableIds } };
    }
    case "CANCEL_MERGE_MODE": {
      const mergeMode = emptyMergeMode();
      return { ...state, mergeMode, interactionMode: resolveInteractionMode(state.selectedObject, mergeMode) };
    }
    case "APPLY_MERGE_MODE": {
      if (!state.mergeMode.active || state.mergeMode.tableIds.length < 2) {
        const mergeMode = emptyMergeMode();
        return { ...state, mergeMode, interactionMode: resolveInteractionMode(state.selectedObject, mergeMode) };
      }

      const { override, overrides } = getOrCloneOverride(state, state.activeDateISO, action.areaId);
      const tableMap = buildTableMap(getAreaTables(state, action.areaId, override));
      const mergedSet = new Set(state.mergeMode.tableIds);
      const selectedTables = state.mergeMode.tableIds.map((tableId) => tableMap[tableId]).filter(Boolean);
      if (selectedTables.length < 2) {
        return { ...state, mergeMode: emptyMergeMode(), interactionMode: "idle" };
      }

      const minX = Math.min(...selectedTables.map((table) => table.x));
      const minY = Math.min(...selectedTables.map((table) => table.y));
      const maxX = Math.max(...selectedTables.map((table) => table.x + table.width));
      const maxY = Math.max(...selectedTables.map((table) => table.y + table.height));
      const capacity = selectedTables.reduce((sum, table) => sum + table.capacity, 0);

      const groups = override.mergedGroups
        .map((group) => ({ ...group, tableIds: group.tableIds.filter((id) => !mergedSet.has(id)) }))
        .filter((group) => group.tableIds.length > 1);

      const groupId = uid("merge");
      override.mergedGroups = [
        ...groups,
        {
          id: groupId,
          name: `Grup ${groups.length + 1}`,
          tableIds: [...state.mergeMode.tableIds],
          x: minX - 10,
          y: minY - 10,
          width: maxX - minX + 20,
          height: maxY - minY + 20,
          capacity,
          notes: "",
          groupType: "cluster"
        }
      ];

      const reservations = state.reservations.map((reservation): Reservation => {
        if (reservation.dateISO !== state.activeDateISO || reservation.areaId !== action.areaId) {
          return reservation;
        }
        const ownsMergedTable = reservation.ownerType === "table" && mergedSet.has(reservation.ownerId);
        const overlapsMergedTables = reservation.tableIds.some((tableId) => mergedSet.has(tableId));
        if (!ownsMergedTable && !overlapsMergedTables) {
          return reservation;
        }
        const promoted: Reservation = {
          ...reservation,
          ownerType: "group",
          ownerId: groupId,
          tableIds: [...state.mergeMode.tableIds]
        };
        return promoted;
      });

      const mergeMode = emptyMergeMode();
      const selectedObject = { kind: "group", id: groupId } as const;
      return {
        ...state,
        overrides,
        reservations,
        selectedObject,
        mergeMode,
        interactionMode: "editingObject"
      };
    }
    case "UPDATE_MERGED_GROUP_LAYOUT": {
      const { override, overrides } = getOrCloneOverride(state, state.activeDateISO, action.areaId);
      const group = override.mergedGroups.find((entry) => entry.id === action.groupId);
      if (!group) return state;
      const tableMap = buildTableMap(getAreaTables(state, action.areaId, override));
      const frame = getMergedGroupFrame(group, tableMap);
      if (!frame) return state;

      const nextX = action.patch.x ?? frame.x;
      const nextY = action.patch.y ?? frame.y;
      const nextWidth = Math.max(84, action.patch.width ?? frame.width);
      const nextHeight = Math.max(84, action.patch.height ?? frame.height);
      const scaleX = frame.width > 0 ? nextWidth / frame.width : 1;
      const scaleY = frame.height > 0 ? nextHeight / frame.height : 1;

      group.tableIds.forEach((tableId) => {
        const table = tableMap[tableId];
        if (!table) return;
        const relX = table.x - frame.x;
        const relY = table.y - frame.y;
        applyPatchToTable(override, tableId, {
          x: Math.round(nextX + relX * scaleX),
          y: Math.round(nextY + relY * scaleY),
          width: Math.max(36, Math.round(table.width * scaleX)),
          height: Math.max(36, Math.round(table.height * scaleY))
        });
      });

      override.mergedGroups = override.mergedGroups.map((entry) =>
        entry.id === action.groupId
          ? { ...entry, x: nextX, y: nextY, width: nextWidth, height: nextHeight }
          : entry
      );
      return { ...state, overrides };
    }
    case "SPLIT_MERGED_GROUP": {
      const { override, overrides } = getOrCloneOverride(state, state.activeDateISO, action.areaId);
      const group = override.mergedGroups.find((entry) => entry.id === action.groupId);
      override.mergedGroups = override.mergedGroups.filter((entry) => entry.id !== action.groupId);
      const fallbackTableId = group?.tableIds[0] ?? null;
      const reservations = fallbackTableId
        ? state.reservations.map((reservation): Reservation => {
            if (
              reservation.dateISO !== state.activeDateISO ||
              reservation.areaId !== action.areaId ||
              reservation.ownerType !== "group" ||
              reservation.ownerId !== action.groupId
            ) {
              return reservation;
            }
            const promoted: Reservation = {
              ...reservation,
              ownerType: "table",
              ownerId: fallbackTableId,
              tableIds: [fallbackTableId]
            };
            return promoted;
          })
        : state.reservations;
      const selectedObject =
        state.selectedObject?.kind === "group" && state.selectedObject.id === action.groupId
          ? null
          : state.selectedObject;
      return {
        ...state,
        overrides,
        reservations,
        selectedObject,
        interactionMode: resolveInteractionMode(selectedObject, state.mergeMode)
      };
    }
    case "RENAME_MERGED_GROUP": {
      const { override, overrides } = getOrCloneOverride(state, state.activeDateISO, action.areaId);
      override.mergedGroups = override.mergedGroups.map((g) =>
        g.id === action.groupId ? { ...g, name: action.name } : g
      );
      return { ...state, overrides };
    }
    case "CLONE_TABLES": {
      const newTables = action.tables.map((template) => ({
        id: uid("table"),
        label: template.label,
        shape: template.shape,
        x: template.x,
        y: template.y,
        width: template.width,
        height: template.height,
        capacity: template.capacity
      }));
      if (action.targetMode === "default") {
        return {
          ...state,
          areas: state.areas.map((area) =>
            area.id !== action.areaId ? area : { ...area, defaultTables: [...area.defaultTables, ...newTables] }
          )
        };
      }
      const { override, overrides } = getOrCloneOverride(state, state.activeDateISO, action.areaId);
      override.addedTables = [...override.addedTables, ...newTables];
      return { ...state, overrides };
    }
    case "START_EDITING_OBJECT":
      return { ...state, interactionMode: "editingObject" };
    case "RESTORE_SNAPSHOT":
      return {
        ...state,
        areas: action.snapshot.areas,
        reservations: action.snapshot.reservations,
        overrides: action.snapshot.overrides
      };
    case "RESET_DAILY_OVERRIDE": {
      const dateBucket = state.overrides[action.dateISO];
      if (!dateBucket || !dateBucket[action.areaId]) return state;
      const nextDateBucket = { ...dateBucket };
      delete nextDateBucket[action.areaId];
      const overrides = { ...state.overrides };
      if (Object.keys(nextDateBucket).length === 0) {
        delete overrides[action.dateISO];
      } else {
        overrides[action.dateISO] = nextDateBucket;
      }
      return {
        ...state,
        overrides,
        selectedObject: null,
        interactionMode: "idle",
        mergeMode: emptyMergeMode()
      };
    }
    default:
      return state;
  }
}

export function useRestaurantStore() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  const historyRef = useRef<Array<{ areas: Area[]; reservations: Reservation[]; overrides: OverridesByDate }>>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  const { areas, reservations, overrides } = state;

  // localStorage artık kullanılmıyor — veri Supabase'de

  // Supabase ilk yükleme tamamlanana kadar true
  const [isInitializing, setIsInitializing] = useState(true);

  // Supabase'den yükleme devam ederken sync'i engelle
  const isLoadingFromSupabaseRef = useRef(true);

  // Supabase sync (debounced — sürükleme sırasında çok sık yazmamak için 1 sn bekler)
  const supabaseSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // İlk yükleme sırasında Supabase'e yazma — sonsuz döngü önlemi
    if (isLoadingFromSupabaseRef.current) return;
    if (supabaseSyncTimerRef.current) clearTimeout(supabaseSyncTimerRef.current);
    supabaseSyncTimerRef.current = setTimeout(() => {
      syncAreas(areas).catch(console.error);
      syncReservations(reservations).catch(console.error);
      syncOverrides(overrides).catch(console.error);
    }, 1000);
  }, [areas, reservations, overrides]);

  // Supabase'den ilk yükleme (uygulama açılışında bir kez çalışır)
  useEffect(() => {
    loadAllFromSupabase()
      .then((data) => {
        // Her zaman Supabase verisini kullan
        dispatch({ type: "RESTORE_SNAPSHOT", snapshot: data });
        // Yeni kullanıcı: hiç salon yoksa varsayılan "Ana Salon" oluştur
        if (data.areas.length === 0) {
          dispatch({ type: "ADD_AREA", name: "Ana Salon" });
        }
      })
      .catch(console.error)
      .finally(() => {
        isLoadingFromSupabaseRef.current = false;
        setIsInitializing(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dispatchWithHistory = useCallback((action: Action) => {
    const undoableActions = new Set([
      "ADD_TABLE", "UPDATE_TABLE", "DELETE_TABLE", "ADD_FIXTURE", "UPDATE_FIXTURE",
      "DELETE_FIXTURE", "APPLY_MERGE_MODE", "SPLIT_MERGED_GROUP", "RESET_DAILY_OVERRIDE",
      "UPSERT_RESERVATION", "DELETE_RESERVATION", "CLONE_TABLES"
    ]);
    if (undoableActions.has(action.type)) {
      historyRef.current = [
        ...historyRef.current.slice(-50),
        { areas: stateRef.current.areas, reservations: stateRef.current.reservations, overrides: stateRef.current.overrides }
      ];
    }
    dispatch(action);
  }, [dispatch]);

  const actions = useMemo(
    () => ({
      setDate: (dateISO: string) => dispatchWithHistory({ type: "SET_DATE", dateISO }),
      setArea: (areaId: string) => dispatchWithHistory({ type: "SET_AREA", areaId }),
      setTargetMode: (targetMode: TargetMode) => dispatchWithHistory({ type: "SET_TARGET_MODE", targetMode }),
      setLayoutUnlocked: (unlocked: boolean) => dispatchWithHistory({ type: "SET_LAYOUT_UNLOCKED", unlocked }),
      setReservationSearchQuery: (query: string) => dispatchWithHistory({ type: "SET_RESERVATION_SEARCH_QUERY", query }),
      selectTable: (tableId: string | null) => dispatchWithHistory({ type: "SELECT_TABLE_OBJECT", tableId }),
      selectMergedGroup: (groupId: string | null) => dispatchWithHistory({ type: "SELECT_GROUP_OBJECT", groupId }),
      selectFixture: (fixtureId: string | null) => dispatchWithHistory({ type: "SELECT_FIXTURE_OBJECT", fixtureId }),
      clearSelection: () => dispatchWithHistory({ type: "CLEAR_SELECTION" }),
      startReservationIntent: () => dispatchWithHistory({ type: "START_RESERVATION_INTENT" }),
      cancelReservationIntent: () => dispatchWithHistory({ type: "CANCEL_RESERVATION_INTENT" }),
      startEditingObject: () => dispatchWithHistory({ type: "START_EDITING_OBJECT" }),
      addArea: (name: string) => dispatchWithHistory({ type: "ADD_AREA", name }),
      renameArea: (areaId: string, name: string) => dispatchWithHistory({ type: "RENAME_AREA", areaId, name }),
      addTable: (areaId: string, targetMode: TargetMode, shape: TableShape, x: number, y: number) =>
        dispatchWithHistory({ type: "ADD_TABLE", areaId, targetMode, shape, x, y }),
      updateTable: (areaId: string, tableId: string, targetMode: TargetMode, patch: TablePatch) =>
        dispatchWithHistory({ type: "UPDATE_TABLE", areaId, tableId, targetMode, patch }),
      deleteTable: (areaId: string, tableId: string, targetMode: TargetMode) =>
        dispatchWithHistory({ type: "DELETE_TABLE", areaId, tableId, targetMode }),
      addFixture: (areaId: string, targetMode: TargetMode, fixtureKind: FixtureKind, x: number, y: number) =>
        dispatchWithHistory({ type: "ADD_FIXTURE", areaId, targetMode, fixtureKind, x, y }),
      updateFixture: (areaId: string, fixtureId: string, targetMode: TargetMode, patch: FixturePatch) =>
        dispatchWithHistory({ type: "UPDATE_FIXTURE", areaId, fixtureId, targetMode, patch }),
      deleteFixture: (areaId: string, fixtureId: string, targetMode: TargetMode) =>
        dispatchWithHistory({ type: "DELETE_FIXTURE", areaId, fixtureId, targetMode }),
      upsertReservation: (reservation: Omit<Reservation, "id"> & { id?: string }) =>
        dispatchWithHistory({ type: "UPSERT_RESERVATION", reservation }),
      deleteReservation: (reservationId: string) => {
        dispatchWithHistory({ type: "DELETE_RESERVATION", reservationId });
        deleteReservationFromDb(reservationId).catch(console.error);
      },
      setReservationStatus: (reservationId: string, status: Reservation["status"]) =>
        dispatchWithHistory({ type: "SET_RESERVATION_STATUS", reservationId, status }),
      highlightReservation: (reservationId: string | null, tableId: string | null) =>
        dispatchWithHistory({ type: "HIGHLIGHT_RESERVATION", reservationId, tableId }),
      startMergeMode: (tableId: string) => dispatchWithHistory({ type: "START_MERGE_MODE", tableId }),
      toggleMergeTable: (tableId: string) => dispatchWithHistory({ type: "TOGGLE_MERGE_TABLE", tableId }),
      cancelMergeMode: () => dispatchWithHistory({ type: "CANCEL_MERGE_MODE" }),
      applyMergeMode: (areaId: string) => dispatchWithHistory({ type: "APPLY_MERGE_MODE", areaId }),
      updateMergedGroupLayout: (
        areaId: string,
        groupId: string,
        patch: Partial<Pick<MergedTableGroup, "x" | "y" | "width" | "height">>
      ) => dispatchWithHistory({ type: "UPDATE_MERGED_GROUP_LAYOUT", areaId, groupId, patch }),
      splitMergedGroup: (areaId: string, groupId: string) => dispatchWithHistory({ type: "SPLIT_MERGED_GROUP", areaId, groupId }),
      resetDailyOverride: (dateISO: string, areaId: string) => {
        dispatchWithHistory({ type: "RESET_DAILY_OVERRIDE", dateISO, areaId });
        deleteOverrideFromDb(areaId, dateISO).catch(console.error);
      },
      renameMergedGroup: (areaId: string, groupId: string, name: string) =>
        dispatchWithHistory({ type: "RENAME_MERGED_GROUP", areaId, groupId, name }),
      cloneTables: (
        areaId: string,
        targetMode: TargetMode,
        tables: Array<{ shape: TableShape; x: number; y: number; width: number; height: number; label: string; capacity: number }>
      ) => dispatchWithHistory({ type: "CLONE_TABLES", areaId, targetMode, tables }),
      undo: () => {
        const snapshot = historyRef.current.pop();
        if (snapshot) dispatch({ type: "RESTORE_SNAPSHOT", snapshot });
      }
    }),
    [dispatchWithHistory]
  );

  return { state, actions, isInitializing };
}
