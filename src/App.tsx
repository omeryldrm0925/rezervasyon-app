import { useEffect, useMemo, useRef, useState } from "react";
import { DayReservationsCard } from "./components/DayReservationsCard";
import { FloorCanvas } from "./components/FloorCanvas";
import { FloatingPalette } from "./components/FloatingPalette";
import { GroupEditorCard } from "./components/GroupEditorCard";
import { ObjectEditorCard } from "./components/ObjectEditorCard";
import { ReservationCard, type ReservationDraft } from "./components/ReservationCard";
import { TableActionMenu } from "./components/TableActionMenu";
import { TopBar } from "./components/TopBar";
import { useRestaurantStore } from "./state/useRestaurantStore";
import {
  buildEffectiveFixtures,
  buildEffectiveTables,
  buildReservationByTable,
  buildTableMap,
  getAreaById,
  getMergedGroupFrame,
  getMergedGroupMap,
  getMergedGroupsById,
  getOverride,
  getReservationsForAreaDate,
  getReservationsForDate,
  getTableVisualState
} from "./utils/layout";
import { clamp, fixtureSize, resolveSpawnPosition, tableSize } from "./utils/canvas";
import { toISODate } from "./utils/date";
import {
  type Reservation,
  type ReservationOwnerType,
  type SelectedObject,
  type TableShape,
  type TableVisualState
} from "./types";

const DEFAULT_CANVAS_VIEWPORT = { width: 1200, height: 680 };
const ACTION_MENU_SIZE = { width: 250, height: 96 };
const OBJECT_EDITOR_SIZE = { width: 302, height: 248 };
const RESERVATION_CARD_SIZE = { width: 294, height: 394 };

interface CanvasViewState {
  width: number;
  height: number;
  zoom: number;
  scrollLeft: number;
  scrollTop: number;
  stageWidth: number;
  stageHeight: number;
}

function App() {
  const { state, actions } = useRestaurantStore();
  const [paletteExpanded, setPaletteExpanded] = useState(false);
  const [canvasView, setCanvasView] = useState<CanvasViewState>({
    width: DEFAULT_CANVAS_VIEWPORT.width,
    height: DEFAULT_CANVAS_VIEWPORT.height,
    zoom: 1,
    scrollLeft: 0,
    scrollTop: 0,
    stageWidth: DEFAULT_CANVAS_VIEWPORT.width,
    stageHeight: DEFAULT_CANVAS_VIEWPORT.height
  });

  const activeArea = getAreaById(state.areas, state.activeAreaId);

  if (!activeArea) {
    return (
      <div className="empty-app">
        <h1>Rezerve</h1>
        <p>Başlamak için bir alan oluştur.</p>
        <button className="btn btn--accent" onClick={() => actions.addArea("Salon")}>
          Alan Ekle
        </button>
      </div>
    );
  }

  const dayOverride = getOverride(state.overrides, state.activeDateISO, activeArea.id);
  const visibleOverride = state.targetMode === "day" ? dayOverride : null;
  const mergedGroups = visibleOverride?.mergedGroups ?? [];
  const tables = buildEffectiveTables(activeArea, visibleOverride);
  const fixtures = buildEffectiveFixtures(activeArea, visibleOverride);
  const tableMap = buildTableMap(tables);
  const mergedGroupMap = getMergedGroupMap(visibleOverride);
  const mergedGroupsById = getMergedGroupsById(visibleOverride);
  const fixtureById = fixtures.reduce<Record<string, (typeof fixtures)[number]>>((acc, fixture) => {
    acc[fixture.id] = fixture;
    return acc;
  }, {});

  const groupFrameById = mergedGroups.reduce<Record<string, { capacity: number }>>((acc, group) => {
    const frame = getMergedGroupFrame(group, tableMap);
    if (frame) {
      acc[group.id] = { capacity: frame.capacity };
    }
    return acc;
  }, {});

  const reservations = getReservationsForAreaDate(state.reservations, state.activeDateISO, activeArea.id);
  const reservationsAllAreas = getReservationsForDate(state.reservations, state.activeDateISO);
  const reservationsByTable = buildReservationByTable(reservations);
  const reservationByOwner = buildReservationByOwner(reservations);

  const warningByReservation = reservationsAllAreas.reduce<Record<string, string>>((acc, reservation) => {
    const area = getAreaById(state.areas, reservation.areaId);
    if (!area) return acc;
    const areaOverride = getOverride(state.overrides, state.activeDateISO, reservation.areaId);
    const areaTables = buildEffectiveTables(area, areaOverride);
    const areaTableMap = buildTableMap(areaTables);
    const mergedById = getMergedGroupsById(areaOverride);
    const capacity = getReservationCapacity(reservation, areaTableMap, mergedById);
    if (reservation.guestCount > capacity) {
      acc[reservation.id] = `${reservation.guestCount}/${capacity}`;
    }
    return acc;
  }, {});

  const warningByTable = reservations.reduce<Record<string, string>>((acc, reservation) => {
    const warning = warningByReservation[reservation.id];
    if (!warning) return acc;
    reservation.tableIds.forEach((tableId) => {
      acc[tableId] = warning;
    });
    return acc;
  }, {});

  const warningByGroup = reservations.reduce<Record<string, string>>((acc, reservation) => {
    if (reservation.ownerType !== "group") return acc;
    const warning = warningByReservation[reservation.id];
    if (!warning) return acc;
    acc[reservation.ownerId] = warning;
    return acc;
  }, {});

  const occupancy = buildOccupancyMaps(reservations, tables, mergedGroupsById, groupFrameById);

  const visualStates = tables.reduce<Record<string, TableVisualState>>((acc, table) => {
    const parentGroup = mergedGroupMap[table.id];
    const reservation = parentGroup
      ? reservationByOwner[`group:${parentGroup.id}`] ?? reservationsByTable[table.id]
      : reservationByOwner[`table:${table.id}`] ?? reservationsByTable[table.id];
    acc[table.id] = getTableVisualState({
      blocked: table.blocked,
      reservation,
      hasWarning: Boolean(warningByTable[table.id] || (parentGroup ? warningByGroup[parentGroup.id] : ""))
    });
    return acc;
  }, {});

  const groupVisualStates = mergedGroups.reduce<Record<string, TableVisualState>>((acc, group) => {
    const reservation = reservationByOwner[`group:${group.id}`];
    acc[group.id] = getTableVisualState({
      blocked: false,
      reservation,
      hasWarning: Boolean(warningByGroup[group.id])
    });
    return acc;
  }, {});

  const selectedObject = state.selectedObject;
  const selectedTable =
    selectedObject && selectedObject.kind === "table"
      ? tables.find((table) => table.id === selectedObject.id) ?? null
      : null;
  const selectedGroup =
    selectedObject && selectedObject.kind === "group" ? mergedGroupsById[selectedObject.id] ?? null : null;
  const selectedFixture =
    selectedObject && selectedObject.kind === "fixture" ? fixtureById[selectedObject.id] ?? null : null;
  const selectedGroupFrame = selectedGroup ? getMergedGroupFrame(selectedGroup, tableMap) : null;

  const selectedReservation =
    selectedObject?.kind === "table"
      ? reservationByOwner[`table:${selectedObject.id}`] ?? reservationsByTable[selectedObject.id] ?? null
      : selectedObject?.kind === "group"
        ? reservationByOwner[`group:${selectedObject.id}`] ?? null
        : null;

  const selectedTableHasReservation = Boolean(
    selectedTable &&
      reservations.some(
        (reservation) =>
          reservation.tableIds.includes(selectedTable.id) &&
          reservation.status !== "cancelled" &&
          reservation.status !== "no_show"
      )
  );

  const areaNameById = useMemo(
    () =>
      state.areas.reduce<Record<string, string>>((acc, area) => {
        acc[area.id] = area.name;
        return acc;
      }, {}),
    [state.areas]
  );

  const selectionAnchorModel = selectedTable
    ? { x: selectedTable.x, y: selectedTable.y, width: selectedTable.width, height: selectedTable.height }
    : selectedGroupFrame
      ? {
          x: selectedGroupFrame.x,
          y: selectedGroupFrame.y,
          width: selectedGroupFrame.width,
          height: selectedGroupFrame.height
        }
      : selectedFixture
        ? {
            x: selectedFixture.x,
            y: selectedFixture.y,
            width: selectedFixture.width,
            height: selectedFixture.height
          }
        : null;

  const selectionAnchor = selectionAnchorModel
    ? {
        x: selectionAnchorModel.x * canvasView.zoom - canvasView.scrollLeft,
        y: selectionAnchorModel.y * canvasView.zoom - canvasView.scrollTop,
        width: selectionAnchorModel.width * canvasView.zoom,
        height: selectionAnchorModel.height * canvasView.zoom
      }
    : null;

  const showObjectActions = Boolean(
    state.selectedObject && (state.selectedObject.kind === "table" || state.selectedObject.kind === "group")
  );
  const showTableEditor = Boolean(
    selectedObject &&
      state.interactionMode === "editingObject" &&
      selectedObject.kind === "table" &&
      !state.mergeMode.active
  ) || Boolean(
    selectedObject &&
      state.targetMode === "default" &&
      selectedObject.kind === "table" &&
      !state.mergeMode.active
  );
  const showGroupEditor = Boolean(
    selectedObject &&
      state.interactionMode === "editingObject" &&
      selectedObject.kind === "group" &&
      !state.mergeMode.active
  ) || Boolean(
    selectedObject &&
      state.targetMode === "default" &&
      selectedObject.kind === "group" &&
      !state.mergeMode.active
  );
  const showReservationCard = Boolean(
    state.selectedObject &&
      state.selectedObject.kind !== "fixture" &&
      state.targetMode === "day" &&
      !state.mergeMode.active &&
      !showTableEditor &&
      !showGroupEditor
  );
  const showObjectEditor = showTableEditor || showGroupEditor;

  const floatingLayout = selectionAnchor
    ? resolveContextLayout(selectionAnchor, { width: canvasView.width, height: canvasView.height }, {
        showObjectActions,
        showObjectEditor,
        showReservationCard
      })
    : {
        actionPosition: { left: 16, top: 16 },
        editorPosition: { left: 16, top: 120 },
        reservationPosition: { left: 16, top: 16 }
      };

  const dateHasOverride = Boolean(state.overrides[state.activeDateISO]?.[activeArea.id]);

  useEffect(() => {
    const query = state.reservationSearchQuery.trim().toLocaleLowerCase("tr-TR");
    if (!query) return;
    const match = reservationsAllAreas.find((reservation) =>
      [reservation.guestName, reservation.phone, reservation.time, areaNameById[reservation.areaId] ?? reservation.areaId]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(query)
    );
    if (!match) {
      if (state.highlightedReservationId || state.highlightedTableId) {
        actions.highlightReservation(null, null);
      }
      return;
    }
    if (state.highlightedReservationId === match.id && state.activeAreaId === match.areaId) return;
    focusReservation(match, state.activeAreaId, actions);
  }, [
    actions,
    areaNameById,
    reservationsAllAreas,
    state.activeAreaId,
    state.highlightedReservationId,
    state.highlightedTableId,
    state.reservationSearchQuery
  ]);

  const handleSelectTable = (tableId: string) => {
    if (state.mergeMode.active) {
      actions.toggleMergeTable(tableId);
      return;
    }
    actions.selectTable(tableId);
  };

  const handleSelectReservation = (reservation: Reservation) => {
    focusReservation(reservation, state.activeAreaId, actions);
  };

  const handleSaveReservation = (values: ReservationDraft, reservationId?: string) => {
    if (!state.selectedObject || state.targetMode !== "day") return;
    const target = resolveReservationTarget(state.selectedObject, tables, mergedGroupMap, mergedGroupsById);
    if (!target) return;

    // Conflict check: warn if target tables already have an active reservation (not the one being edited)
    const conflicting = reservations.find(
      (r) =>
        r.id !== reservationId &&
        r.status !== "cancelled" &&
        r.status !== "no_show" &&
        r.tableIds.some((tid) => target.tableIds.includes(tid))
    );
    if (conflicting) {
      const proceed = window.confirm(
        `Bu masa(lar)da zaten aktif rezervasyon var (${conflicting.guestName}, ${conflicting.time}). Yine de kaydetmek istiyor musun?`
      );
      if (!proceed) return;
    }

    actions.upsertReservation({
      id: reservationId,
      dateISO: state.activeDateISO,
      areaId: activeArea.id,
      ownerType: target.ownerType,
      ownerId: target.ownerId,
      tableIds: target.tableIds,
      guestName: values.guestName,
      phone: values.phone,
      guestCount: values.guestCount,
      time: values.time,
      notes: values.notes,
      status: values.status
    });
    actions.cancelReservationIntent();
    actions.highlightReservation(reservationId ?? null, target.tableIds[0] ?? null);
  };

  const handleQuickAddTable = (shape: TableShape) => {
    const size = tableSize(shape);
    const desired = {
      x: (canvasView.scrollLeft + (paletteExpanded ? 240 : 64)) / Math.max(0.01, canvasView.zoom),
      y: (canvasView.scrollTop + 96) / Math.max(0.01, canvasView.zoom)
    };
    const occupied = [
      ...tables.map((t) => ({ x: t.x, y: t.y, width: t.width, height: t.height })),
      ...fixtures.map((f) => ({ x: f.x, y: f.y, width: f.width, height: f.height }))
    ];
    const spot = resolveSpawnPosition(desired.x, desired.y, size.width, size.height, {
      width: canvasView.stageWidth,
      height: canvasView.stageHeight
    }, occupied);
    actions.addTable(activeArea.id, state.targetMode, shape, spot.x, spot.y);
  };

  const handleQuickAddFixture = (fixtureKind: "door" | "window") => {
    const size = fixtureSize(fixtureKind);
    const desired = {
      x: (canvasView.scrollLeft + (paletteExpanded ? 260 : 86)) / Math.max(0.01, canvasView.zoom),
      y: (canvasView.scrollTop + 116) / Math.max(0.01, canvasView.zoom)
    };
    const occupied = [
      ...tables.map((t) => ({ x: t.x, y: t.y, width: t.width, height: t.height })),
      ...fixtures.map((f) => ({ x: f.x, y: f.y, width: f.width, height: f.height }))
    ];
    const spot = resolveSpawnPosition(desired.x, desired.y, size.width, size.height, {
      width: canvasView.stageWidth,
      height: canvasView.stageHeight
    }, occupied);
    actions.addFixture(activeArea.id, state.targetMode, fixtureKind, spot.x, spot.y);
  };

  const reservationLabel = selectedTable ? selectedTable.label : selectedGroup ? selectedGroup.name : "Seçim";
  const reservationCapacity = selectedTable ? selectedTable.capacity : selectedGroupFrame ? selectedGroupFrame.capacity : 2;
  const reservationWarning = selectedTable
    ? warningByTable[selectedTable.id]
      ? `${warningByTable[selectedTable.id]} kapasite uyarısı`
      : undefined
    : selectedGroup
      ? warningByGroup[selectedGroup.id]
        ? `${warningByGroup[selectedGroup.id]} kapasite uyarısı`
        : undefined
      : undefined;

  const mergeLabel = state.mergeMode.active
    ? state.mergeMode.tableIds.length > 1
      ? `Birleştir (${state.mergeMode.tableIds.length})`
      : "Birleştirmeyi İptal Et"
    : "Birleştir";

  const mergeDisabled = state.selectedObject?.kind !== "table" || state.targetMode === "default";
  const splitDisabled = state.selectedObject?.kind !== "group" || state.targetMode === "default";
  const reserveDisabled =
    !state.selectedObject || state.mergeMode.active || state.targetMode === "default" || state.selectedObject.kind === "fixture";
  const mergeHelperText =
    state.targetMode === "default"
      ? "Varsayılan planda rezervasyon ve birleştirme kapalı."
      : state.mergeMode.active
        ? state.mergeMode.tableIds.length > 1
          ? "Birleştir'e basınca grup oluşur."
          : "En az bir masa daha seç."
        : selectedGroup
          ? `${selectedGroup.tableIds.length} masa grup halinde hareket eder.`
          : undefined;

  return (
    <div className="app-shell">
      <TopBar
        selectedDateISO={state.activeDateISO}
        onDateChange={actions.setDate}
        onToday={() => actions.setDate(toISODate(new Date()))}
        hasOverride={(dateISO) => Boolean(state.overrides[dateISO]?.[activeArea.id])}
        dateHasOverride={dateHasOverride}
        onResetDay={() => actions.resetDailyOverride(state.activeDateISO, activeArea.id)}
        areas={state.areas}
        activeAreaId={activeArea.id}
        onSelectArea={actions.setArea}
        onAddArea={actions.addArea}
        onRenameArea={actions.renameArea}
        targetMode={state.targetMode}
        onTargetModeChange={actions.setTargetMode}
        layoutUnlocked={state.layoutUnlocked}
        onLayoutUnlockedChange={actions.setLayoutUnlocked}
      />

      <main className="workspace">
        <FloorCanvas
          tables={tables}
          fixtures={fixtures}
          mergedGroups={mergedGroups}
          selectedObject={state.selectedObject}
          highlightedTableId={state.highlightedTableId}
          warningByTable={warningByTable}
          warningByGroup={warningByGroup}
          tableBadgeById={occupancy.tableById}
          groupBadgeById={occupancy.groupById}
          visualStates={visualStates}
          groupVisualStates={groupVisualStates}
          mergeMode={state.mergeMode}
          layoutUnlocked={state.layoutUnlocked}
          onSelectTable={handleSelectTable}
          onSelectMergedGroup={actions.selectMergedGroup}
          onSelectFixture={actions.selectFixture}
          onInteractionStart={actions.cancelReservationIntent}
          onCanvasViewportChange={(viewport) => {
            setCanvasView((prev) => ({ ...prev, width: viewport.width, height: viewport.height }));
          }}
          onCanvasViewChange={setCanvasView}
          onClearSelection={() => {
            if (state.mergeMode.active) return;
            actions.clearSelection();
          }}
          onAddTable={(shape, x, y) => actions.addTable(activeArea.id, state.targetMode, shape, x, y)}
          onAddFixture={(fixtureKind, x, y) => actions.addFixture(activeArea.id, state.targetMode, fixtureKind, x, y)}
          onUpdateTable={(tableId, patch) => actions.updateTable(activeArea.id, tableId, state.targetMode, patch)}
          onUpdateFixture={(fixtureId, patch) => actions.updateFixture(activeArea.id, fixtureId, state.targetMode, patch)}
          onUpdateMergedGroupLayout={(groupId, patch) => actions.updateMergedGroupLayout(activeArea.id, groupId, patch)}
          onDeleteFixture={(fixtureId) => {
            if (!window.confirm("Bu nesneyi silmek istiyor musun?")) return;
            actions.deleteFixture(activeArea.id, fixtureId, state.targetMode);
          }}
        >
          <FloatingPalette
            enabled={state.layoutUnlocked}
            expanded={paletteExpanded}
            onToggleExpanded={() => setPaletteExpanded((prev) => !prev)}
            onQuickAddTable={handleQuickAddTable}
            onQuickAddFixture={handleQuickAddFixture}
          />

          <DayReservationsCard
            reservations={reservationsAllAreas}
            activeAreaId={state.activeAreaId}
            areaNameById={areaNameById}
            highlightedReservationId={state.highlightedReservationId}
            searchQuery={state.reservationSearchQuery}
            warningByReservation={warningByReservation}
            onSearchChange={actions.setReservationSearchQuery}
            onSelectReservation={handleSelectReservation}
            onCheckInReservation={(reservationId) => actions.setReservationStatus(reservationId, "arrived")}
          />

          {showObjectActions ? (
            <TableActionMenu
              position={floatingLayout.actionPosition}
              mergeLabel={mergeLabel}
              mergeDisabled={mergeDisabled}
              splitDisabled={splitDisabled}
              reserveDisabled={reserveDisabled}
              helperText={mergeHelperText}
              onMerge={() => {
                if (state.targetMode === "default") return;
                if (state.selectedObject?.kind !== "table") return;
                if (state.mergeMode.active) {
                  if (state.mergeMode.tableIds.length > 1) {
                    actions.applyMergeMode(activeArea.id);
                  } else {
                    actions.cancelMergeMode();
                  }
                  return;
                }
                actions.startMergeMode(state.selectedObject.id);
              }}
              onSplit={() => {
                if (state.targetMode === "default") return;
                if (state.selectedObject?.kind !== "group") return;
                const groupReservation = reservationByOwner[`group:${state.selectedObject.id}`];
                if (groupReservation) {
                  const proceed = window.confirm(
                    "Bu birleşik masada aktif rezervasyon var. Rezervasyon ilk masaya taşınacak. Devam etmek istiyor musun?"
                  );
                  if (!proceed) return;
                }
                actions.splitMergedGroup(activeArea.id, state.selectedObject.id);
              }}
              onReserve={() => {
                if (state.targetMode === "default") return;
                if (!state.selectedObject || state.mergeMode.active) return;
                actions.startReservationIntent();
              }}
            />
          ) : null}

          {showTableEditor && selectedTable ? (
            <ObjectEditorCard
              table={selectedTable}
              targetMode={state.targetMode}
              position={floatingLayout.editorPosition}
              onUpdateTable={(patch) => actions.updateTable(activeArea.id, selectedTable.id, state.targetMode, patch)}
              onDeleteTable={() => {
                const message = selectedTableHasReservation
                  ? "Bu masada rezervasyon var. Silmek istediğine emin misin?"
                  : "Bu masa silinsin mi?";
                if (!window.confirm(message)) return;
                actions.deleteTable(activeArea.id, selectedTable.id, state.targetMode);
              }}
            />
          ) : null}

          {showGroupEditor && selectedGroup ? (
            <GroupEditorCard
              group={selectedGroup}
              targetMode={state.targetMode}
              position={floatingLayout.editorPosition}
              onRenameGroup={(name) => actions.renameMergedGroup(activeArea.id, selectedGroup.id, name)}
            />
          ) : null}

          {showReservationCard ? (
            <ReservationCard
              objectLabel={reservationLabel}
              defaultCapacity={reservationCapacity}
              reservation={selectedReservation}
              warningText={reservationWarning}
              position={floatingLayout.reservationPosition}
              onClose={actions.cancelReservationIntent}
              onSaveReservation={handleSaveReservation}
              onDeleteReservation={(reservationId) => {
                actions.deleteReservation(reservationId);
                actions.cancelReservationIntent();
              }}
            />
          ) : null}
        </FloorCanvas>
      </main>
    </div>
  );
}

function buildReservationByOwner(reservations: Reservation[]): Record<string, Reservation> {
  return reservations.reduce<Record<string, Reservation>>((acc, reservation) => {
    acc[`${reservation.ownerType}:${reservation.ownerId}`] = reservation;
    return acc;
  }, {});
}

function resolveReservationTarget(
  selectedObject: SelectedObject,
  tables: ReturnType<typeof buildEffectiveTables>,
  mergedGroupMap: ReturnType<typeof getMergedGroupMap>,
  mergedGroupsById: ReturnType<typeof getMergedGroupsById>
): { ownerType: ReservationOwnerType; ownerId: string; tableIds: string[] } | null {
  if (selectedObject.kind === "fixture") return null;
  if (selectedObject.kind === "group") {
    const group = mergedGroupsById[selectedObject.id];
    if (!group) return null;
    return { ownerType: "group", ownerId: group.id, tableIds: group.tableIds };
  }

  const table = tables.find((entry) => entry.id === selectedObject.id);
  if (!table) return null;
  const group = mergedGroupMap[table.id];
  if (group) {
    return { ownerType: "group", ownerId: group.id, tableIds: group.tableIds };
  }
  return { ownerType: "table", ownerId: table.id, tableIds: [table.id] };
}

function buildOccupancyMaps(
  reservations: Reservation[],
  tables: ReturnType<typeof buildEffectiveTables>,
  mergedGroupsById: Record<string, { tableIds: string[]; capacity?: number }>,
  groupFrameById: Record<string, { capacity: number }>
): { tableById: Record<string, string>; groupById: Record<string, string> } {
  const tableById = tables.reduce<Record<string, string>>((acc, table) => {
    acc[table.id] = `0/${table.capacity}`;
    return acc;
  }, {});

  const groupById = Object.keys(mergedGroupsById).reduce<Record<string, string>>((acc, groupId) => {
    const groupCapacity = mergedGroupsById[groupId].capacity ?? groupFrameById[groupId]?.capacity ?? 0;
    acc[groupId] = `0/${groupCapacity}`;
    return acc;
  }, {});

  reservations.forEach((reservation) => {
    if (reservation.status === "cancelled" || reservation.status === "no_show") return;

    if (reservation.ownerType === "group") {
      const groupCapacity = mergedGroupsById[reservation.ownerId]?.capacity ?? groupFrameById[reservation.ownerId]?.capacity ?? 0;
      const label = `${reservation.guestCount}/${groupCapacity}`;
      groupById[reservation.ownerId] = label;
      reservation.tableIds.forEach((tableId) => {
        tableById[tableId] = label;
      });
      return;
    }

    const tableId = reservation.ownerId;
    const capacity = tables.find((table) => table.id === tableId)?.capacity ?? reservation.tableIds.reduce((sum, entry) => sum + (tables.find((table) => table.id === entry)?.capacity ?? 0), 0);
    const label = `${reservation.guestCount}/${Math.max(1, capacity)}`;
    tableById[tableId] = label;
    reservation.tableIds.forEach((entry) => {
      if (!tableById[entry]) return;
      tableById[entry] = label;
    });
  });

  return { tableById, groupById };
}

function focusReservation(
  reservation: Reservation,
  activeAreaId: string | null,
  actions: ReturnType<typeof useRestaurantStore>["actions"]
) {
  actions.highlightReservation(reservation.id, reservation.tableIds[0] ?? null);
  if (activeAreaId !== reservation.areaId) {
    actions.setArea(reservation.areaId);
  }
  if (reservation.ownerType === "group") {
    actions.selectMergedGroup(reservation.ownerId);
  } else {
    actions.selectTable(reservation.ownerId || reservation.tableIds[0] || null);
  }
  actions.cancelReservationIntent();
}

function resolveContextLayout(
  anchor: { x: number; y: number; width: number; height: number },
  viewport: { width: number; height: number },
  flags: { showObjectActions: boolean; showObjectEditor: boolean; showReservationCard: boolean }
): {
  actionPosition: { left: number; top: number };
  editorPosition: { left: number; top: number };
  reservationPosition: { left: number; top: number };
} {
  const occupied: Array<{ left: number; top: number; width: number; height: number }> = [];
  const actionPosition = flags.showObjectActions
    ? placeCard(anchor, ACTION_MENU_SIZE, viewport, ["top", "right", "left", "bottom"], occupied)
    : { left: 16, top: 16 };
  if (flags.showObjectActions) {
    occupied.push({ ...actionPosition, ...ACTION_MENU_SIZE });
  }

  const editorPosition = flags.showObjectEditor
    ? placeCard(anchor, OBJECT_EDITOR_SIZE, viewport, ["right", "left", "bottom", "top"], occupied)
    : { left: 16, top: 120 };
  if (flags.showObjectEditor) {
    occupied.push({ ...editorPosition, ...OBJECT_EDITOR_SIZE });
  }

  const reservationPosition = flags.showReservationCard
    ? placeCard(anchor, RESERVATION_CARD_SIZE, viewport, ["right", "left", "bottom", "top"], occupied)
    : { left: 16, top: 16 };

  return { actionPosition, editorPosition, reservationPosition };
}

function placeCard(
  anchor: { x: number; y: number; width: number; height: number },
  card: { width: number; height: number },
  viewport: { width: number; height: number },
  preferredSides: Array<"top" | "right" | "bottom" | "left">,
  avoid: Array<{ left: number; top: number; width: number; height: number }>
): { left: number; top: number } {
  const margin = 12;
  const maxLeft = Math.max(margin, viewport.width - card.width - margin);
  const maxTop = Math.max(margin, viewport.height - card.height - margin);

  const candidates = preferredSides.map((side) => {
    if (side === "right") {
      return {
        left: anchor.x + anchor.width + 12,
        top: anchor.y + anchor.height / 2 - card.height / 2
      };
    }
    if (side === "left") {
      return {
        left: anchor.x - card.width - 12,
        top: anchor.y + anchor.height / 2 - card.height / 2
      };
    }
    if (side === "bottom") {
      return {
        left: anchor.x + anchor.width / 2 - card.width / 2,
        top: anchor.y + anchor.height + 12
      };
    }
    return {
      left: anchor.x + anchor.width / 2 - card.width / 2,
      top: anchor.y - card.height - 12
    };
  });

  let best = { left: margin, top: margin };
  let lowestOverlap = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const clamped = {
      left: Math.round(clamp(candidate.left, margin, maxLeft)),
      top: Math.round(clamp(candidate.top, margin, maxTop))
    };
    const overlap = avoid.reduce((sum, entry) => sum + overlapArea(clamped, card, entry), 0);
    if (overlap === 0) return clamped;
    if (overlap < lowestOverlap) {
      lowestOverlap = overlap;
      best = clamped;
    }
  }

  return best;
}

function overlapArea(
  aPos: { left: number; top: number },
  aSize: { width: number; height: number },
  bRect: { left: number; top: number; width: number; height: number }
): number {
  const left = Math.max(aPos.left, bRect.left);
  const right = Math.min(aPos.left + aSize.width, bRect.left + bRect.width);
  const top = Math.max(aPos.top, bRect.top);
  const bottom = Math.min(aPos.top + aSize.height, bRect.top + bRect.height);
  if (right <= left || bottom <= top) return 0;
  return (right - left) * (bottom - top);
}

function getReservationCapacity(
  reservation: Reservation,
  tableMap: Record<string, { capacity: number }>,
  mergedGroupsById: Record<string, { tableIds: string[]; capacity?: number }>
): number {
  if (reservation.ownerType === "group") {
    const group = mergedGroupsById[reservation.ownerId];
    if (group?.capacity) return group.capacity;
    if (group) {
      const total = group.tableIds.reduce((sum, tableId) => sum + (tableMap[tableId]?.capacity ?? 0), 0);
      return Math.max(1, total);
    }
  }
  const total = reservation.tableIds.reduce((sum, tableId) => sum + (tableMap[tableId]?.capacity ?? 0), 0);
  return Math.max(1, total);
}

export default App;
