import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AreaTabs } from "./components/AreaTabs";
import { FloorCanvas } from "./components/FloorCanvas";
import { SidePanel, tableItems, fixtureItems, ShapeIcon, FixtureIcon } from "./components/SidePanel";
import { ReservationSidebar, type ReservationFormData } from "./components/ReservationSidebar";
import { TopBar } from "./components/TopBar";
import { useRestaurantStore } from "./state/useRestaurantStore";
import { useAuth } from "./hooks/useAuth";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { LandingPage } from "./features/landing/LandingPage";
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
import { fixtureSize, resolveSpawnPosition, tableSize } from "./utils/canvas";
import { toISODate } from "./utils/date";
import {
  type Fixture,
  type FixtureKind,
  type Reservation,
  type TableShape,
  type TableVisualState
} from "./types";

const DEFAULT_CANVAS_VIEWPORT = { width: 1200, height: 680 };

interface CanvasViewState {
  width: number;
  height: number;
  zoom: number;
  scrollLeft: number;
  scrollTop: number;
  stageWidth: number;
  stageHeight: number;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<AuthRoute page="login" />} />
        <Route path="/register" element={<AuthRoute page="register" />} />
        <Route path="/app" element={<ProtectedRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/** OAuth callback dahil — giriş yapmışsa /app'e, yoksa landing page */
function RootRoute() {
  const { user, restaurantId, loading, loadingMessage } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-400 text-sm">{loadingMessage || "Yükleniyor..."}</div>
      </div>
    );
  }

  if (user && restaurantId) return <Navigate to="/app" replace />;

  return <LandingPage />;
}

/** Giriş yapmış kullanıcıyı /app'e, yapmamışı login/register'a yönlendirir */
function AuthRoute({ page }: { page: "login" | "register" }) {
  const { user, restaurantId, loading, loadingMessage, signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm">{loadingMessage || "Yükleniyor..."}</div>
      </div>
    );
  }

  if (user && restaurantId) return <Navigate to="/app" replace />;

  if (page === "register") {
    return (
      <RegisterPage
        onRegister={async (email, password, restaurantName) => {
          await signUp(email, password, restaurantName);
        }}
        onGoToLogin={() => navigate("/login")}
        onGoogleSignIn={signInWithGoogle}
      />
    );
  }

  return (
    <LoginPage
      onLogin={async (email, password) => {
        await signIn(email, password);
        navigate("/app");
      }}
      onGoToRegister={() => navigate("/register")}
      onGoogleSignIn={signInWithGoogle}
    />
  );
}

/** Giriş yapmamış kullanıcıyı /login'e yönlendirir */
function ProtectedRoute() {
  const { user, restaurantId, restaurantName, loading, loadingMessage, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm">{loadingMessage || "Yükleniyor..."}</div>
      </div>
    );
  }

  if (!user || !restaurantId) return <Navigate to="/login" replace />;

  return <RestaurantApp key={restaurantId} userEmail={user?.email ?? ""} restaurantName={restaurantName ?? ""} onSignOut={async () => { await signOut(); }} />;
}

function RestaurantApp({ onSignOut, userEmail, restaurantName }: { onSignOut: () => void; userEmail: string; restaurantName: string }) {
  const { state, actions, isInitializing } = useRestaurantStore();
  const [mobileTab, setMobileTab] = useState<"plan" | "reservations" | "settings">("plan");
  const [fabOpen, setFabOpen] = useState(false);
  const [mobileEditingAreaId, setMobileEditingAreaId] = useState<string | null>(null);
  const [mobileEditAreaName, setMobileEditAreaName] = useState("");
  const [multiSelectedTableIds, setMultiSelectedTableIds] = useState<string[]>([]);
  const [clipboardTables, setClipboardTables] = useState<Array<{
    shape: TableShape; x: number; y: number; width: number; height: number; label: string; capacity: number;
  }>>([]);
  const [clipboardFixture, setClipboardFixture] = useState<Omit<Fixture, "id"> | null>(null);
  const [pasteOffset, setPasteOffset] = useState(20);
  const [pendingTableDelete, setPendingTableDelete] = useState<{
    tableId: string; areaId: string; reservationId: string | null;
  } | null>(null);
  const [popupFormDraft, setPopupFormDraft] = useState<ReservationFormData | null>(null);
  const [popupReservationId, setPopupReservationId] = useState<string | undefined>(undefined);
  const multiSelectedRef = useRef<string[]>([]);
  multiSelectedRef.current = multiSelectedTableIds;
  const clipboardRef = useRef(clipboardTables);
  clipboardRef.current = clipboardTables;
  const clipboardFixtureRef = useRef(clipboardFixture);
  clipboardFixtureRef.current = clipboardFixture;
  const pasteOffsetRef = useRef(pasteOffset);
  pasteOffsetRef.current = pasteOffset;
  const stateRef = useRef(state);
  stateRef.current = state;
  const tablesSnapshotRef = useRef<ReturnType<typeof buildEffectiveTables>>([]);
  const fixturesSnapshotRef = useRef<ReturnType<typeof buildEffectiveFixtures>>([]);
  const handleCanvasViewportChange = useCallback(
    (viewport: { width: number; height: number }) => {
      setCanvasView((prev) => ({ ...prev, width: viewport.width, height: viewport.height }));
    },
    []
  );
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

  // Bu değişkenler hook'ların bağımlılıklarında kullanılıyor — early return'den önce hesaplanmalı
  const reservationsAllAreas = getReservationsForDate(state.reservations, state.activeDateISO);
  const areaNameById = useMemo(
    () =>
      state.areas.reduce<Record<string, string>>((acc, area) => {
        acc[area.id] = area.name;
        return acc;
      }, {}),
    [state.areas]
  );

  // Search effect — hook olduğu için early return'den önce
  useEffect(() => {
    if (!activeArea) return;
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
    activeArea,
    areaNameById,
    reservationsAllAreas,
    state.activeAreaId,
    state.highlightedReservationId,
    state.highlightedTableId,
    state.reservationSearchQuery
  ]);

  // Keyboard shortcuts — hook olduğu için early return'den önce
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement;
      if (isInput) return;

      const ctrl = e.ctrlKey || e.metaKey;

      // ── Escape: seçimi temizle / merge modunu iptal et ──────────────────
      if (e.key === "Escape") {
        e.preventDefault();
        if (stateRef.current.mergeMode.active) {
          actions.cancelMergeMode();
        } else {
          actions.clearSelection();
        }
        return;
      }

      // ── Delete / Backspace: seçili masayı sil ───────────────────────────
      if (e.key === "Delete" || e.key === "Backspace") {
        const selected = stateRef.current.selectedObject;
        if (!selected || selected.kind !== "table") return;
        const areaId = stateRef.current.activeAreaId;
        if (!areaId) return;
        const tableId = selected.id;
        const s = stateRef.current;
        const reservation = s.reservations.find(
          (r) =>
            r.tableIds.includes(tableId) &&
            r.status !== "cancelled" &&
            r.status !== "no_show" &&
            (s.targetMode === "default" || r.dateISO === s.activeDateISO)
        );
        if (reservation) {
          e.preventDefault();
          setPendingTableDelete({ tableId, areaId, reservationId: reservation.id });
          return;
        }
        if (!window.confirm("Bu masa silinsin mi?")) return;
        e.preventDefault();
        actions.deleteTable(areaId, tableId, s.targetMode);
        return;
      }

      if (!ctrl) return;

      // ── Ctrl+Z: undo ─────────────────────────────────────────────────────
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        actions.undo();
        return;
      }

      // Kopyalanacak ID'leri belirle: çoklu seçim varsa onu kullan, yoksa tekil seçimi
      function getSelectedTableIds(): string[] {
        const multi = multiSelectedRef.current;
        if (multi.length > 0) return multi;
        const sel = stateRef.current.selectedObject;
        if (sel?.kind === "table") return [sel.id];
        return [];
      }

      // ── Ctrl+C: kopyala ──────────────────────────────────────────────────
      if (e.key === "c") {
        e.preventDefault();
        // Fixture kopyalama
        const sel = stateRef.current.selectedObject;
        if (sel?.kind === "fixture") {
          const f = fixturesSnapshotRef.current.find((fx) => fx.id === sel.id);
          if (f) {
            const { id: _id, ...source } = f;
            setClipboardFixture(source);
            setClipboardTables([]);
            setPasteOffset(20);
          }
          return;
        }
        // Masa kopyalama
        const ids = getSelectedTableIds();
        if (ids.length === 0) return;
        const copied = ids
          .map((id) => tablesSnapshotRef.current.find((t) => t.id === id))
          .filter(Boolean)
          .map((t) => ({
            shape: t!.shape,
            x: t!.x,
            y: t!.y,
            width: t!.width,
            height: t!.height,
            label: t!.label,
            capacity: t!.capacity
          }));
        if (copied.length > 0) {
          setClipboardTables(copied);
          setClipboardFixture(null);
          setPasteOffset(20);
        }
        return;
      }

      // ── Ctrl+X: kes (kopyala + sil) ──────────────────────────────────────
      if (e.key === "x") {
        e.preventDefault();
        const ids = getSelectedTableIds();
        if (ids.length === 0) return;
        const areaId = stateRef.current.activeAreaId;
        if (!areaId) return;
        const cut = ids
          .map((id) => tablesSnapshotRef.current.find((t) => t.id === id))
          .filter(Boolean)
          .map((t) => ({
            shape: t!.shape,
            x: t!.x,
            y: t!.y,
            width: t!.width,
            height: t!.height,
            label: t!.label,
            capacity: t!.capacity
          }));
        if (cut.length > 0) {
          setClipboardTables(cut);
          setPasteOffset(20);
          // Kesilenleri sil (rezervasyon kontrolü yapmadan — kes işlemi kasıtlı)
          ids.forEach((id) => actions.deleteTable(areaId, id, stateRef.current.targetMode));
        }
        return;
      }

      // ── Ctrl+V: yapıştır ─────────────────────────────────────────────────
      if (e.key === "v") {
        e.preventDefault();
        const offset = pasteOffsetRef.current;
        const areaId = stateRef.current.activeAreaId;
        if (!areaId) return;
        // Fixture yapıştırma
        const cbFixture = clipboardFixtureRef.current;
        if (cbFixture) {
          actions.cloneFixture(areaId, stateRef.current.targetMode, cbFixture, cbFixture.x + offset, cbFixture.y + offset);
          setPasteOffset((prev) => prev + 20);
          return;
        }
        // Masa yapıştırma
        const cb = clipboardRef.current;
        if (cb.length === 0) return;
        actions.cloneTables(
          areaId,
          stateRef.current.targetMode,
          cb.map((item) => ({ ...item, x: item.x + offset, y: item.y + offset }))
        );
        setPasteOffset((prev) => prev + 20);
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions]);

  // Masaya tıklayınca canvas popup'ı aç / kapat
  useEffect(() => {
    const sel = state.selectedObject;
    const shouldShow =
      !state.layoutUnlocked &&
      sel != null &&
      (sel.kind === "table" || sel.kind === "group") &&
      !state.mergeMode.active;
    if (!shouldShow) { setPopupFormDraft(null); setPopupReservationId(undefined); return; }

    // Mevcut aktif rezervasyonu yükle (varsa)
    const s = stateRef.current;
    const ownerType = sel.kind === "group" ? "group" : "table";
    const existingRes = s.reservations.find(
      (r) =>
        r.dateISO === s.activeDateISO &&
        r.ownerId === sel.id &&
        r.ownerType === ownerType &&
        r.status !== "cancelled" &&
        r.status !== "no_show"
    );

    if (existingRes) {
      setPopupReservationId(existingRes.id);
      setPopupFormDraft({
        guestName: existingRes.guestName,
        phone: existingRes.phone,
        guestCount: existingRes.guestCount,
        time: existingRes.time,
        ownerId: existingRes.ownerId,
        ownerType: existingRes.ownerType,
        notes: existingRes.notes,
        status: existingRes.status,
      });
    } else {
      setPopupReservationId(undefined);
      setPopupFormDraft({
        guestName: "", phone: "", guestCount: 2, time: "19:00",
        ownerId: sel.id,
        ownerType,
        notes: "", status: "reserved",
      });
    }
  }, [state.selectedObject?.id, state.layoutUnlocked, state.mergeMode.active]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Early return'ler (tüm hook'lardan sonra) ──────────────────────────────

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Plan yükleniyor...</div>
      </div>
    );
  }

  if (!activeArea) {
    return (
      <div className="empty-app">
        <h1>Rezerve</h1>
        <p>Başlamak için bir alan oluştur.</p>
        <button className="btn btn--accent" onClick={() => actions.addArea("Salon")}>
          Alan Ekle
        </button>
        <button
          onClick={onSignOut}
          style={{ position: "fixed", bottom: 16, right: 16, zIndex: 9999 }}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-gray-700 transition-colors"
        >
          Çıkış Yap
        </button>
      </div>
    );
  }

  const dayOverride = getOverride(state.overrides, state.activeDateISO, activeArea.id);
  const visibleOverride = state.targetMode === "day" ? dayOverride : null;
  const mergedGroups = visibleOverride?.mergedGroups ?? [];
  const tables = buildEffectiveTables(activeArea, visibleOverride);
  tablesSnapshotRef.current = tables;
  const fixtures = buildEffectiveFixtures(activeArea, visibleOverride);
  fixturesSnapshotRef.current = fixtures;
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
  const reservationsByTable = buildReservationByTable(reservations);
  const reservationByOwner = buildReservationByOwner(reservations);

  const warningByReservation = reservationsAllAreas.reduce<Record<string, string>>((acc, reservation) => {
    const area = getAreaById(state.areas, reservation.areaId);
    if (!area) return acc;
    const areaOverride = getOverride(state.overrides, state.activeDateISO, reservation.areaId);
    const areaTables = buildEffectiveTables(area, areaOverride);
    const areaTableMap = buildTableMap(areaTables);
    const mergedById = getMergedGroupsById(areaOverride);
    if (reservation.ownerType === "table" && !areaTableMap[reservation.ownerId]) {
      acc[reservation.id] = "Atanmış masa silinmiş";
      return acc;
    }
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
  const selectedTableHasReservation = Boolean(
    selectedTable &&
      reservations.some(
        (reservation) =>
          reservation.tableIds.includes(selectedTable.id) &&
          reservation.status !== "cancelled" &&
          reservation.status !== "no_show"
      )
  );

  // ── Sidebar panel derivations ──────────────────────────────────────────────
  const hasTableSelection = Boolean(
    selectedObject &&
    (selectedObject.kind === "table" || selectedObject.kind === "group") &&
    !state.mergeMode.active
  );

  const sidebarTableEditor = (state.layoutUnlocked && hasTableSelection) ? {
    table: selectedTable,
    group: selectedGroup,
    targetMode: state.targetMode,
    onUpdateTable: (patch: import("./types").TablePatch) =>
      selectedTable && actions.updateTable(activeArea.id, selectedTable.id, state.targetMode, patch),
    onDeleteTable: () => {
      if (!selectedTable) return;
      if (selectedTableHasReservation) {
        const reservation = state.reservations.find(
          (r) => r.tableIds.includes(selectedTable.id) && r.status !== "cancelled" && r.status !== "no_show" &&
            (state.targetMode === "default" || r.dateISO === state.activeDateISO)
        );
        setPendingTableDelete({ tableId: selectedTable.id, areaId: activeArea.id, reservationId: reservation?.id ?? null });
        return;
      }
      if (!window.confirm("Bu masa silinsin mi?")) return;
      actions.deleteTable(activeArea.id, selectedTable.id, state.targetMode);
      actions.clearSelection();
    },
    onMerge: () => {
      if (!selectedTable || state.targetMode === "default") return;
      actions.clearSelection();
      actions.startMergeMode(selectedTable.id);
    },
    onSplit: () => {
      if (!selectedGroup) return;
      const groupReservation = reservationByOwner[`group:${selectedGroup.id}`];
      if (groupReservation) {
        if (!window.confirm("Bu birleşik masada aktif rezervasyon var. Rezervasyon ilk masaya taşınacak. Devam etmek istiyor musun?")) return;
      }
      actions.splitMergedGroup(activeArea.id, selectedGroup.id);
      actions.clearSelection();
    },
    onClose: () => actions.clearSelection(),
    onRenameGroup: (name: string) =>
      selectedGroup && actions.renameMergedGroup(activeArea.id, selectedGroup.id, name),
  } : null;


  // Canvas popup: masa/grup seçiliyken canvas üzerinde form göster
  const POPUP_W = 320;
  const POPUP_H = 480; // tahmini yükseklik (konumlandırma için)
  const POPUP_GAP = 8;
  const popupPosition = (() => {
    if (!popupFormDraft || state.layoutUnlocked) return null;
    const sel = state.selectedObject;
    if (!sel) return null;
    const z = canvasView.zoom;
    const sl = canvasView.scrollLeft;
    const st = canvasView.scrollTop;
    const vw = canvasView.width;
    const vh = canvasView.height;

    // Öncelik: altında → üstünde → sağında → solunda → en iyi sığan yerde
    function resolvePos(
      anchorCenterX: number,
      objLeft: number, objRight: number,
      objTop: number, objBottom: number,
    ) {
      const fitBelow = objBottom + POPUP_GAP + POPUP_H <= vh;
      const fitAbove = objTop - POPUP_GAP - POPUP_H >= 0;
      const fitRight = objRight + POPUP_GAP + POPUP_W <= vw;
      const fitLeft  = objLeft  - POPUP_GAP - POPUP_W >= 0;

      const clampedHLeft = Math.max(POPUP_GAP, Math.min(anchorCenterX - POPUP_W / 2, vw - POPUP_W - POPUP_GAP));
      const clampedVTop  = Math.max(POPUP_GAP, Math.min(objTop, vh - POPUP_H - POPUP_GAP));

      if (fitBelow) return { left: clampedHLeft, top: objBottom + POPUP_GAP };
      if (fitAbove) return { left: clampedHLeft, top: objTop - POPUP_H - POPUP_GAP };
      if (fitRight) return { left: objRight + POPUP_GAP, top: clampedVTop };
      if (fitLeft)  return { left: objLeft - POPUP_W - POPUP_GAP, top: clampedVTop };
      // Hiçbiri tam sığmıyor — alta sabitle, yatay ortala
      return { left: clampedHLeft, top: Math.max(POPUP_GAP, vh - POPUP_H - POPUP_GAP) };
    }

    if (sel.kind === "table") {
      const t = tables.find((tbl) => tbl.id === sel.id);
      if (!t) return null;
      const sx = t.x * z - sl, sy = t.y * z - st;
      return resolvePos(sx + (t.width * z) / 2, sx, sx + t.width * z, sy, sy + t.height * z);
    }
    if (sel.kind === "group") {
      const grp = mergedGroupsById[sel.id];
      if (!grp) return null;
      const frame = getMergedGroupFrame(grp, tableMap);
      if (!frame) return null;
      const sx = frame.x * z - sl, sy = frame.y * z - st;
      return resolvePos(sx + (frame.width * z) / 2, sx, sx + frame.width * z, sy, sy + frame.height * z);
    }
    return null;
  })();

  const popupReservationTargets = (() => {
    const targets: Array<{ id: string; label: string; isGroup: boolean }> = [];
    const groupsAdded = new Set<string>();
    for (const table of tables) {
      if (table.blocked) continue;
      const group = mergedGroupMap[table.id];
      if (group) {
        if (!groupsAdded.has(group.id)) {
          groupsAdded.add(group.id);
          targets.push({ id: group.id, label: `${group.name} (grup)`, isGroup: true });
        }
      } else {
        targets.push({ id: table.id, label: `${table.label} · ${table.capacity} kişi`, isGroup: false });
      }
    }
    return targets;
  })();

  const dateHasOverride = Boolean(state.overrides[state.activeDateISO]?.[activeArea.id]);
  const overrideCountForArea = Object.values(state.overrides).filter(
    (bucket) => bucket[activeArea.id]
  ).length;

  const handleSelectTable = (tableId: string) => {
    if (state.mergeMode.active) {
      actions.toggleMergeTable(tableId);
      return;
    }
    actions.selectTable(tableId);
  };

  const handleSelectReservation = (reservation: Reservation) => {
    // Sadece highlight — selectTable/Group çağırmıyoruz, form açılmasın
    actions.clearSelection();
    actions.highlightReservation(reservation.id, reservation.tableIds[0] ?? null);
    if (state.activeAreaId !== reservation.areaId) {
      actions.setArea(reservation.areaId);
    }
  };

  const handleQuickAddTable = (shape: TableShape) => {
    const size = tableSize(shape);
    const desired = {
      x: (canvasView.scrollLeft + 80) / Math.max(0.01, canvasView.zoom),
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

  const handleQuickAddFixture = (fixtureKind: FixtureKind) => {
    const size = fixtureSize(fixtureKind);
    const desired = {
      x: (canvasView.scrollLeft + 80) / Math.max(0.01, canvasView.zoom),
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


  // ── Sidebar save handler ───────────────────────────────────────────────────
  const handleSidebarSave = (data: ReservationFormData, reservationId?: string) => {
    if (!activeArea) return;
    const tableIds =
      data.ownerType === "group"
        ? mergedGroupsById[data.ownerId]?.tableIds ?? []
        : [data.ownerId];

    const conflicting = reservations.find(
      (r) =>
        r.id !== reservationId &&
        r.status !== "cancelled" &&
        r.status !== "no_show" &&
        r.tableIds.some((tid) => tableIds.includes(tid))
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
      ownerType: data.ownerType,
      ownerId: data.ownerId,
      tableIds,
      guestName: data.guestName,
      phone: data.phone,
      guestCount: data.guestCount,
      time: data.time,
      notes: data.notes,
      status: data.status,
    });
    // Clear selection after saving so clicking the same table again re-opens the form
    if (!reservationId) actions.clearSelection();
  };

  const handleOrphanReassign = (reservationId: string, newOwnerId: string) => {
    const reservation = state.reservations.find((r) => r.id === reservationId);
    if (!reservation) return;
    actions.upsertReservation({ ...reservation, ownerId: newOwnerId, ownerType: "table", tableIds: [newOwnerId] });
  };

  // ── Summary bar stats ──────────────────────────────────────────────────────
  const activeForDay = reservationsAllAreas.filter(
    (r) => r.status !== "cancelled" && r.status !== "no_show"
  );
  const summaryGuestCount = activeForDay.reduce((sum, r) => sum + r.guestCount, 0);
  const summaryDateLabel = (() => {
    const [y, m, d] = state.activeDateISO.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    if (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    )
      return "Bugün";
    return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
  })();

  return (
    <div className="app-shell" style={{ background: '#0d0d0d' }}>
      {/* TopBar: masaüstünde her zaman, mobilde sadece Plan sekmesinde */}
      <div className={`flex-shrink-0 max-w-full overflow-hidden${mobileTab !== "plan" ? " hidden md:block" : ""}`}>
        <TopBar
          selectedDateISO={state.activeDateISO}
          onDateChange={actions.setDate}
          onToday={() => actions.setDate(toISODate(new Date()))}
          hasOverride={(dateISO) => Boolean(state.overrides[dateISO]?.[activeArea.id])}
          dateHasOverride={dateHasOverride}
          onResetDay={() => actions.resetDailyOverride(state.activeDateISO, activeArea.id)}
          targetMode={state.targetMode}
          onTargetModeChange={actions.setTargetMode}
          layoutUnlocked={state.layoutUnlocked}
          onLayoutUnlockedChange={actions.setLayoutUnlocked}
          overrideCountForArea={overrideCountForArea}
        />
      </div>

      {/* Restoran adı + AreaTabs: masaüstünde her zaman, mobilde sadece Plan sekmesinde */}
      <div className={`flex-shrink-0 max-w-full overflow-hidden${mobileTab !== "plan" ? " hidden md:block" : ""}`}>
        {restaurantName && (
          <div className="px-4 pt-2 pb-0 bg-transparent">
            <span className="text-xs font-semibold tracking-wide" style={{ color: '#d6ff3f' }}>{restaurantName.toLocaleUpperCase('tr-TR')}</span>
          </div>
        )}
        <AreaTabs
          areas={state.areas}
          activeAreaId={activeArea.id}
          onSelectArea={actions.setArea}
          onAddArea={actions.addArea}
          onRenameArea={actions.renameArea}
          onDeleteArea={actions.deleteArea}
        />
      </div>

      {/* ── İçerik satırı: sol panel + canvas + sidebar ── */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", width: "100%", maxWidth: "100vw" }} className="flex">

        {/* Sol Panel: sadece masaüstünde */}
        <div className="hidden md:contents">
          <SidePanel
            enabled={state.layoutUnlocked}
            onQuickAddTable={handleQuickAddTable}
            onQuickAddFixture={handleQuickAddFixture}
            selectedFixture={selectedFixture}
            onUpdateFixture={(fixtureId, patch) => actions.updateFixture(activeArea.id, fixtureId, state.targetMode, patch)}
            onDeleteFixture={(fixtureId) => {
              actions.deleteFixture(activeArea.id, fixtureId, state.targetMode);
              actions.clearSelection();
            }}
          />
        </div>

        {/* Canvas kolonu: masaüstünde her zaman, mobilde sadece Plan sekmesinde */}
        <div
          style={{ flexDirection: "column", minWidth: 0, minHeight: 0, paddingBottom: 12 }}
          className={`flex-1 min-w-0 overflow-hidden ${mobileTab !== "plan" ? "hidden md:flex" : "flex"}`}
        >

          {/* Summary bar */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-transparent">
            <span className="rounded-full px-3 py-1 text-sm font-medium" style={{ background: 'rgba(245,245,240,.15)', color: '#f5f5f0' }}>{summaryDateLabel}</span>
            <span className="rounded-full px-3 py-1 text-sm font-medium" style={{ background: 'rgba(214,255,63,.15)', color: '#d6ff3f' }}>{activeForDay.length} rezervasyon</span>
            {summaryGuestCount > 0 && (
              <span className="rounded-full px-3 py-1 text-sm font-medium" style={{ background: 'rgba(245,245,240,.1)', color: '#f5f5f0' }}>{summaryGuestCount} misafir</span>
            )}
          </div>

          {/* Mode info bar */}
          {state.targetMode === "default" ? (
            <div className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5 text-xs" style={{ background: 'rgba(255,200,0,.12)', color: '#fbbf24' }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="flex-1">Şablon düzenliyorsunuz — bu değişiklikler tüm günleri etkiler.</span>
              <button
                className="flex-shrink-0 px-2.5 py-1 rounded-md font-medium transition-colors text-xs"
                style={{ background: 'rgba(255,200,0,.18)', color: '#fbbf24' }}
                onClick={() => actions.setTargetMode("day")}
              >
                Günlük Plana Dön
              </button>
            </div>
          ) : dateHasOverride ? (
            <div className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5 text-xs" style={{ background: 'rgba(214,255,63,.1)', color: '#d6ff3f' }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="flex-1">{summaryDateLabel} için özel düzenleme aktif.</span>
              <button
                className="flex-shrink-0 px-2.5 py-1 rounded-md font-medium transition-colors text-xs"
                style={{ background: 'rgba(214,255,63,.18)', color: '#d6ff3f' }}
                onClick={() => {
                  if (!window.confirm("Bu güne özel düzenlemeyi sıfırlamak istediğine emin misin? Gün, varsayılan plana dönecek.")) return;
                  actions.resetDailyOverride(state.activeDateISO, activeArea.id);
                }}
              >
                Özel Düzenlemeyi Sıfırla
              </button>
            </div>
          ) : null}

          {/* Canvas */}
          <main className="workspace" data-mode={state.targetMode} style={{ flex: 1, minHeight: 0 }}>
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
              onCanvasViewportChange={handleCanvasViewportChange}
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
              onConfirmMerge={() => actions.applyMergeMode(activeArea.id)}
              onCancelMerge={actions.cancelMergeMode}
              onMultiSelectChange={(ids) => setMultiSelectedTableIds(ids)}
            >
              {/* Empty canvas onboarding */}
              {tables.length === 0 && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 5,
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{ pointerEvents: "auto" }}
                    className="onboarding-card"
                  >
                    <div className="onboarding-card__icon">
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                        <rect x="6" y="10" width="28" height="20" rx="4" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5" />
                        <circle cx="20" cy="4"  r="3" fill="#a5b4fc" />
                        <circle cx="20" cy="36" r="3" fill="#a5b4fc" />
                        <circle cx="3"  cy="20" r="3" fill="#a5b4fc" />
                        <circle cx="37" cy="20" r="3" fill="#a5b4fc" />
                      </svg>
                    </div>
                    <h2 className="onboarding-card__title">Restoranınızı tasarlamaya başlayın</h2>
                    <p className="onboarding-card__sub">
                      Soldaki panelden masa ve dekorasyon elemanlarını seçerek salonunuzu oluşturun.
                    </p>
                    {!state.layoutUnlocked && (
                      <button
                        className="onboarding-card__btn"
                        onClick={() => {
                          actions.setTargetMode("default");
                          actions.setLayoutUnlocked(true);
                        }}
                      >
                        Düzenlemeye Başla
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Canvas popup: masaya tıklayınca masanın altında açılır */}
              {popupFormDraft && popupPosition && (
                <TablePopup
                  draft={popupFormDraft}
                  reservationId={popupReservationId}
                  targets={popupReservationTargets}
                  position={popupPosition}
                  onChangeDraft={(patch) => setPopupFormDraft((d) => d ? { ...d, ...patch } : null)}
                  onSubmit={(draft, resId) => { handleSidebarSave(draft, resId); actions.clearSelection(); }}
                  onClose={() => actions.clearSelection()}
                />
              )}

            </FloorCanvas>
          </main>

        </div>

        {/* Masaüstü sidebar: sadece masaüstünde görünür */}
        <div className="hidden md:flex" style={{ padding: '0 12px 12px 0', flexShrink: 0 }}>
        <div style={{ background: '#f5f5f0', borderRadius: 24, boxShadow: '0 24px 56px rgba(0,0,0,.55), 0 8px 18px rgba(0,0,0,.30)', overflow: 'hidden', display: 'flex', flexDirection: 'column', width: 320, minWidth: 320 }}>
          <ReservationSidebar
            className="flex-1 flex flex-col overflow-hidden"
            reservations={reservationsAllAreas}
            tables={tables}
            mergedGroupMap={mergedGroupMap}
            mergedGroupsById={mergedGroupsById}
            activeAreaId={state.activeAreaId}
            areaNameById={areaNameById}
            activeDateISO={state.activeDateISO}
            highlightedReservationId={state.highlightedReservationId}
            searchQuery={state.reservationSearchQuery}
            warningByReservation={warningByReservation}
            onSearchChange={actions.setReservationSearchQuery}
            onSelectReservation={handleSelectReservation}
            onDeleteReservation={(reservationId) => { actions.deleteReservation(reservationId); actions.clearSelection(); }}
            onSetStatus={(reservationId, status) => actions.setReservationStatus(reservationId, status)}
            onReassignOrphan={handleOrphanReassign}
            onSignOut={onSignOut}
            tableEditor={sidebarTableEditor}
            areas={state.areas}
            onSetActiveArea={actions.setArea}
            onTriggerTableSelect={(ownerId, ownerType) => {
              if (ownerType === "group") actions.selectMergedGroup(ownerId);
              else actions.selectTable(ownerId);
            }}
          />
        </div>
        </div>

        {/* Mobil: Rezervasyonlar sekmesi */}
        {mobileTab === "reservations" && (
          <div className="flex-1 flex flex-col overflow-hidden md:hidden" style={{ background: '#f5f5f0' }}>
          <ReservationSidebar
            className="flex-1 flex flex-col overflow-hidden"
            reservations={reservationsAllAreas}
            tables={tables}
            mergedGroupMap={mergedGroupMap}
            mergedGroupsById={mergedGroupsById}
            activeAreaId={state.activeAreaId}
            areaNameById={areaNameById}
            activeDateISO={state.activeDateISO}
            highlightedReservationId={state.highlightedReservationId}
            searchQuery={state.reservationSearchQuery}
            warningByReservation={warningByReservation}
            onSearchChange={actions.setReservationSearchQuery}
            onSelectReservation={handleSelectReservation}
            onDeleteReservation={(reservationId) => { actions.deleteReservation(reservationId); actions.clearSelection(); }}
            onSetStatus={(reservationId, status) => actions.setReservationStatus(reservationId, status)}
            onReassignOrphan={handleOrphanReassign}
            onSignOut={onSignOut}
            tableEditor={sidebarTableEditor}
            areas={state.areas}
            onSetActiveArea={actions.setArea}
            onTriggerTableSelect={(ownerId, ownerType) => {
              if (ownerType === "group") actions.selectMergedGroup(ownerId);
              else actions.selectTable(ownerId);
              setMobileTab("plan");
            }}
          />
          </div>
        )}

        {/* Mobil: Ayarlar sekmesi */}
        {mobileTab === "settings" && (
          <div className="flex-1 overflow-y-auto bg-gray-50 md:hidden pb-14">
            <div className="p-4 space-y-4">

              {/* Salon Yönetimi */}
              <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-sm text-gray-900">Salonlar</h2>
                  <button
                    onClick={() => actions.addArea("Yeni Salon")}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    + Ekle
                  </button>
                </div>
                {state.areas.map((area) =>
                  mobileEditingAreaId === area.id ? (
                    <div key={area.id} className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 last:border-0">
                      <input
                        className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        value={mobileEditAreaName}
                        onChange={(e) => setMobileEditAreaName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { actions.renameArea(area.id, mobileEditAreaName.trim() || area.name); setMobileEditingAreaId(null); }
                          if (e.key === "Escape") setMobileEditingAreaId(null);
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => { actions.renameArea(area.id, mobileEditAreaName.trim() || area.name); setMobileEditingAreaId(null); }}
                        className="text-xs font-semibold text-indigo-600 px-2 py-1"
                      >
                        Kaydet
                      </button>
                      <button onClick={() => setMobileEditingAreaId(null)} className="text-xs text-gray-400 px-1 py-1">İptal</button>
                    </div>
                  ) : (
                    <div key={area.id} className="flex items-center px-4 py-3 border-b border-gray-100 last:border-0">
                      <span className="flex-1 text-sm text-gray-800">{area.name}</span>
                      <button
                        onClick={() => { setMobileEditingAreaId(area.id); setMobileEditAreaName(area.name); }}
                        className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1"
                      >
                        Adlandır
                      </button>
                      <button
                        onClick={() => {
                          if (!window.confirm(`"${area.name}" silinsin mi?`)) return;
                          actions.deleteArea(area.id);
                        }}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1"
                      >
                        Sil
                      </button>
                    </div>
                  )
                )}
              </section>

              {/* Düzenleme Modu */}
              <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="font-semibold text-sm text-gray-900">Düzenleme</h2>
                </div>
                <div className="px-4 py-3 flex flex-col gap-2">
                  {state.layoutUnlocked ? (
                    <button
                      onClick={() => { actions.setLayoutUnlocked(false); if (state.targetMode === "default") { actions.setTargetMode("day"); } }}
                      className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
                    >
                      Düzenlemeyi Bitir
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => { actions.setTargetMode("day"); actions.setLayoutUnlocked(true); setMobileTab("plan"); }}
                        className="w-full py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
                      >
                        Bugün için düzenle
                      </button>
                      <button
                        onClick={() => {
                          if (!window.confirm("Genel düzeni değiştirmek tüm günleri etkiler.\nDevam etmek istiyor musunuz?")) return;
                          actions.setTargetMode("default");
                          actions.setLayoutUnlocked(true);
                          setMobileTab("plan");
                        }}
                        className="w-full py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
                      >
                        Genel düzeni düzenle
                      </button>
                    </>
                  )}
                </div>
              </section>

              {/* Hesap */}
              <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="font-semibold text-sm text-gray-900">Hesap</h2>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-gray-500">{userEmail}</p>
                </div>
                <div className="px-4 pb-4">
                  <button
                    onClick={onSignOut}
                    className="w-full py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
                  >
                    Çıkış Yap
                  </button>
                </div>
              </section>

            </div>
          </div>
        )}

      </div>

      {/* FAB: mobil Plan sekmesinde, düzenleme modundayken */}
      {mobileTab === "plan" && state.layoutUnlocked && (
        <button
          className="md:hidden fixed z-30 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg flex items-center justify-center transition-colors"
          style={{ bottom: 72, right: 16 }}
          onClick={() => setFabOpen(true)}
          aria-label="Eleman ekle"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="4" x2="12" y2="20" />
            <line x1="4" y1="12" x2="20" y2="12" />
          </svg>
        </button>
      )}

      {/* FAB bottom sheet */}
      {fabOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setFabOpen(false)}
        >
          <div
            className="absolute left-0 right-0 bottom-14 bg-white rounded-t-2xl shadow-xl overflow-y-auto"
            style={{ maxHeight: "70vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Masalar</p>
              <div className="grid grid-cols-5 gap-2 mb-5">
                {tableItems.map((item) => (
                  <button
                    key={item.shape}
                    onClick={() => { handleQuickAddTable(item.shape); setFabOpen(false); }}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl border border-gray-100 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                  >
                    <ShapeIcon shape={item.shape} />
                    <span className="text-xs text-gray-600 leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Dekorasyon</p>
              <div className="grid grid-cols-5 gap-2">
                {fixtureItems.map((item) => (
                  <button
                    key={item.kind}
                    onClick={() => { handleQuickAddFixture(item.kind); setFabOpen(false); }}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl border border-gray-100 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                  >
                    <FixtureIcon kind={item.kind} />
                    <span className="text-xs text-gray-600 leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobil alt tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white border-t border-gray-200 flex items-center justify-around">
        <button
          onClick={() => setMobileTab("plan")}
          className={`flex flex-col items-center gap-0.5 px-5 py-1 ${mobileTab === "plan" ? "text-indigo-600" : "text-gray-400"}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span className="text-[10px] font-medium leading-none">Plan</span>
        </button>
        <button
          onClick={() => setMobileTab("reservations")}
          className={`flex flex-col items-center gap-0.5 px-5 py-1 ${mobileTab === "reservations" ? "text-indigo-600" : "text-gray-400"}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="14" y2="17" />
          </svg>
          <span className="text-[10px] font-medium leading-none">Rezervasyonlar</span>
        </button>
        <button
          onClick={() => setMobileTab("settings")}
          className={`flex flex-col items-center gap-0.5 px-5 py-1 ${mobileTab === "settings" ? "text-indigo-600" : "text-gray-400"}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          <span className="text-[10px] font-medium leading-none">Ayarlar</span>
        </button>
      </nav>

      {/* ── Masa silme onay modalı ───────────────────────────────────────── */}
      {pendingTableDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 max-w-[calc(100vw-2rem)]">
            <h3 className="text-base font-bold text-gray-900 mb-1">Masayı Sil</h3>
            <p className="text-sm text-gray-500 mb-5">
              Bu masada aktif bir rezervasyon var. Ne yapmak istersiniz?
            </p>
            <div className="flex flex-col gap-2">
              <button
                className="py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
                onClick={() => {
                  actions.deleteTable(pendingTableDelete.areaId, pendingTableDelete.tableId, state.targetMode, true);
                  setPendingTableDelete(null);
                }}
              >
                Sadece Masayı Sil
              </button>
              <button
                className="py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
                onClick={() => {
                  if (pendingTableDelete.reservationId) {
                    actions.deleteReservation(pendingTableDelete.reservationId);
                  }
                  actions.deleteTable(pendingTableDelete.areaId, pendingTableDelete.tableId, state.targetMode);
                  setPendingTableDelete(null);
                }}
              >
                Masa ve Rezervasyonu Sil
              </button>
              <button
                className="py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                onClick={() => setPendingTableDelete(null)}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildReservationByOwner(reservations: Reservation[]): Record<string, Reservation> {
  return reservations.reduce<Record<string, Reservation>>((acc, reservation) => {
    acc[`${reservation.ownerType}:${reservation.ownerId}`] = reservation;
    return acc;
  }, {});
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

// ── Canvas popup bileşeni ──────────────────────────────────────────────────
function TablePopup({
  draft,
  reservationId,
  targets,
  position,
  onChangeDraft,
  onSubmit,
  onClose,
}: {
  draft: ReservationFormData;
  reservationId?: string;
  targets: Array<{ id: string; label: string; isGroup: boolean }>;
  position: { left: number; top: number };
  onChangeDraft: (patch: Partial<ReservationFormData>) => void;
  onSubmit: (draft: ReservationFormData, reservationId?: string) => void;
  onClose: () => void;
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(draft, reservationId);
  }

  const isEdit = Boolean(reservationId);

  const inputCls = "w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";
  const labelCls = "block text-xs text-gray-500 mb-1";

  return (
    <div
      style={{
        position: "absolute",
        left: position.left,
        top: position.top,
        zIndex: 50,
        pointerEvents: "auto",
        width: 320,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
    >
      {/* Başlık */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {isEdit ? "Düzenle" : "Yeni Rezervasyon"}
        </span>
        <button type="button" onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
        >
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
          </svg>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-3 space-y-2.5">
        <div>
          <label className={labelCls}>Misafir Adı</label>
          <input type="text" required
            value={draft.guestName}
            onChange={(e) => onChangeDraft({ guestName: e.target.value })}
            placeholder="Ad Soyad"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Telefon</label>
          <input type="tel" required
            value={draft.phone}
            onChange={(e) => onChangeDraft({ phone: e.target.value })}
            placeholder="05xx xxx xx xx"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Kişi</label>
            <input type="number" required min={1} max={50}
              value={draft.guestCount}
              onChange={(e) => onChangeDraft({ guestCount: Math.max(1, Number(e.target.value)) })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Saat</label>
            <input type="time" required
              value={draft.time}
              onChange={(e) => onChangeDraft({ time: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        {targets.length > 1 && (
          <div>
            <label className={labelCls}>Masa</label>
            <select value={draft.ownerId}
              onChange={(e) => {
                const t = targets.find((x) => x.id === e.target.value);
                if (t) onChangeDraft({ ownerId: t.id, ownerType: t.isGroup ? "group" : "table" });
              }}
              className={inputCls}
            >
              {targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className={labelCls}>Durum</label>
          <select value={draft.status}
            onChange={(e) => onChangeDraft({ status: e.target.value as import("./types").Reservation["status"] })}
            className={inputCls}
          >
            <option value="reserved">Rezerve</option>
            <option value="arrived">Geldi</option>
            <option value="no_show">Gelmedi</option>
            <option value="cancelled">İptal</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Not</label>
          <textarea value={draft.notes}
            onChange={(e) => onChangeDraft({ notes: e.target.value })}
            placeholder="İsteğe bağlı..." rows={2}
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="flex gap-2 pt-0.5">
          <button type="submit"
            className="flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: '#d6ff3f', color: '#0d0d0d' }}
          >{isEdit ? "Güncelle" : "Kaydet"}</button>
          <button type="button" onClick={onClose}
            className="flex-1 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium transition-colors"
          >İptal</button>
        </div>
      </form>
    </div>
  );
}
