import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { TableNode } from "./TableNode";
import { getMergedGroupFrame } from "../utils/layout";
import { GRID, clamp, fixtureSize, resolveSpawnPosition, snap, tableSize } from "../utils/canvas";
import {
  type EffectiveFixture,
  type EffectiveTable,
  type FixtureKind,
  type MergedTableGroup,
  type SelectedObject,
  type TableShape,
  type TableVisualState
} from "../types";

// ─── Per-kind fixture visual content ───────────────────────────────────────
function FixtureContent({ kind, label }: { kind: FixtureKind; label?: string }) {
  switch (kind) {
    case "door":
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" style={{ width: "100%", height: "80%" }}>
          {/* vertical wall line at hinge */}
          <line x1="5" y1="5" x2="5" y2="27" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />
          {/* door panel */}
          <line x1="5" y1="5" x2="25" y2="5" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
          {/* quarter-circle swing arc: hinge at (5,5), radius 20 */}
          <path d="M25 5 A20 20 0 0 1 5 25" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "tree":
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <circle cx="12" cy="10" r="7" fill="#34d399" />
          <rect x="10.5" y="17" width="3" height="4" rx="1" fill="#78350f" />
        </svg>
      );
    case "pool":
      return <span style={{ fontSize: 9, letterSpacing: ".04em" }}>{label ?? "HAVUZ"}</span>;
    case "restroom":
      return (
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          {/* person icon */}
          <circle cx="7" cy="4" r="2" fill="currentColor" />
          <path d="M4 8h6v5H8v4H6v-4H4z" fill="currentColor" />
          <circle cx="14" cy="4" r="2" fill="currentColor" />
          <path d="M11.5 8h5l-1.5 4h-1v4h-2v-4h-1z" fill="currentColor" />
        </svg>
      );
    case "cashier":
      return (
        <svg viewBox="0 0 24 20" width="20" height="16" aria-hidden="true">
          <rect x="2" y="2" width="20" height="14" rx="2" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" />
          <rect x="6" y="6" width="4" height="3" rx="1" fill="currentColor" opacity=".6" />
          <rect x="14" y="6" width="4" height="6" rx="1" fill="currentColor" opacity=".6" />
          <rect x="6" y="11" width="7" height="2" rx="1" fill="currentColor" opacity=".4" />
        </svg>
      );
    case "stairs":
      return (
        <svg viewBox="0 0 32 28" width="28" height="22" aria-hidden="true" style={{ width: "100%", height: "70%" }}>
          <path d="M2 26 L2 18 L10 18 L10 12 L18 12 L18 6 L26 6 L26 2 L30 2 L30 26 Z"
            fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="1.5" />
          <line x1="2" y1="18" x2="10" y2="18" stroke="currentColor" strokeWidth="1.5" />
          <line x1="10" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="1.5" />
          <line x1="18" y1="6" x2="26" y2="6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "pillar":
      return (
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <circle cx="10" cy="10" r="8" fill="currentColor" opacity=".3" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "wall":
      return null; // wall is just a colored bar, no label needed
    case "bar_counter":
      return <span style={{ fontSize: 9, letterSpacing: ".04em" }}>{label ?? "BAR"}</span>;
    default:
      return <span>{label ?? kind}</span>;
  }
}

interface FloorCanvasProps {
  tables: EffectiveTable[];
  fixtures: EffectiveFixture[];
  mergedGroups: MergedTableGroup[];
  selectedObject: SelectedObject | null;
  highlightedTableId: string | null;
  warningByTable: Record<string, string>;
  warningByGroup: Record<string, string>;
  tableBadgeById: Record<string, string>;
  groupBadgeById: Record<string, string>;
  visualStates: Record<string, TableVisualState>;
  groupVisualStates: Record<string, TableVisualState>;
  mergeMode: { active: boolean; baseTableId: string | null; tableIds: string[] };
  layoutUnlocked: boolean;
  onSelectTable: (tableId: string) => void;
  onSelectMergedGroup: (groupId: string) => void;
  onSelectFixture: (fixtureId: string) => void;
  onClearSelection: () => void;
  onAddTable: (shape: TableShape, x: number, y: number) => void;
  onAddFixture: (fixtureKind: FixtureKind, x: number, y: number) => void;
  onUpdateTable: (
    tableId: string,
    patch: Partial<Pick<EffectiveTable, "x" | "y" | "width" | "height" | "rotation">>
  ) => void;
  onUpdateFixture: (
    fixtureId: string,
    patch: Partial<Pick<EffectiveFixture, "x" | "y" | "width" | "height" | "rotation">>
  ) => void;
  onUpdateMergedGroupLayout: (
    groupId: string,
    patch: Partial<Pick<MergedTableGroup, "x" | "y" | "width" | "height">>
  ) => void;
  onDeleteFixture: (fixtureId: string) => void;
  onInteractionStart: () => void;
  onMultiSelectChange?: (ids: string[]) => void;
  onCanvasViewportChange?: (viewport: { width: number; height: number }) => void;
  onCanvasViewChange?: (view: {
    width: number;
    height: number;
    zoom: number;
    scrollLeft: number;
    scrollTop: number;
    stageWidth: number;
    stageHeight: number;
  }) => void;
  children?: ReactNode;
}

type DragState =
  | {
      type: "move" | "resize";
      objectKind: "table";
      objectId: string;
      startX: number;
      startY: number;
      originX: number;
      originY: number;
      originWidth: number;
      originHeight: number;
      shape: TableShape;
    }
  | {
      type: "move" | "resize";
      objectKind: "group";
      objectId: string;
      startX: number;
      startY: number;
      originX: number;
      originY: number;
      originWidth: number;
      originHeight: number;
      memberTableIds: string[];
    }
  | {
      type: "move" | "resize";
      objectKind: "fixture";
      objectId: string;
      startX: number;
      startY: number;
      originX: number;
      originY: number;
      originWidth: number;
      originHeight: number;
      resizeHandle?: "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
    }
  | {
      type: "multi-move";
      startX: number;
      startY: number;
      origins: Record<string, { x: number; y: number; width: number; height: number }>;
    };

type GuideState = { x: number | null; y: number | null };

interface DropPreview {
  kind: "table" | "fixture";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragItem {
  kind: "table" | "fixture";
  shape?: TableShape;
  fixtureKind?: FixtureKind;
}

interface Frame {
  id: string;
  kind: "table" | "fixture" | "group";
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAGNET_THRESHOLD = 10;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.2;

export function FloorCanvas({
  tables,
  fixtures,
  mergedGroups,
  selectedObject,
  highlightedTableId,
  warningByTable,
  warningByGroup,
  tableBadgeById,
  groupBadgeById,
  visualStates,
  groupVisualStates,
  mergeMode,
  layoutUnlocked,
  onSelectTable,
  onSelectMergedGroup,
  onSelectFixture,
  onClearSelection,
  onAddTable,
  onAddFixture,
  onUpdateTable,
  onUpdateFixture,
  onUpdateMergedGroupLayout,
  onDeleteFixture,
  onInteractionStart,
  onMultiSelectChange,
  onCanvasViewportChange,
  onCanvasViewChange,
  children
}: FloorCanvasProps) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [guides, setGuides] = useState<GuideState>({ x: null, y: null });
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  const [scrollState, setScrollState] = useState({ left: 0, top: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pointerClientRef = useRef<{ x: number; y: number } | null>(null);
  const edgeScrollFrameRef = useRef<number | null>(null);

  // Multi-select state
  const [multiSelectedIds, setMultiSelectedIds] = useState<Set<string>>(new Set());
  const [selectionBoxActive, setSelectionBoxActive] = useState(false);
  const [selectionBoxVisual, setSelectionBoxVisual] = useState<{
    startX: number; startY: number; currentX: number; currentY: number;
  } | null>(null);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const tablesRef = useRef(tables);
  tablesRef.current = tables;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const tableMap = useMemo(
    () =>
      tables.reduce<Record<string, EffectiveTable>>((acc, table) => {
        acc[table.id] = table;
        return acc;
      }, {}),
    [tables]
  );

  const fixtureMap = useMemo(
    () =>
      fixtures.reduce<Record<string, EffectiveFixture>>((acc, fixture) => {
        acc[fixture.id] = fixture;
        return acc;
      }, {}),
    [fixtures]
  );

  const mergedByTable = useMemo(
    () =>
      mergedGroups.reduce<Record<string, MergedTableGroup>>((acc, group) => {
        group.tableIds.forEach((tableId) => {
          acc[tableId] = group;
        });
        return acc;
      }, {}),
    [mergedGroups]
  );

  const renderedGroups = useMemo(
    () =>
      mergedGroups
        .map((group) => {
          const frame = getMergedGroupFrame(group, tableMap);
          if (!frame) return null;
          return { group, frame };
        })
        .filter(Boolean) as Array<{
        group: MergedTableGroup;
        frame: { x: number; y: number; width: number; height: number; capacity: number; memberCount: number };
      }>,
    [mergedGroups, tableMap]
  );

  const groupFrameById = useMemo(
    () =>
      renderedGroups.reduce<Record<string, { x: number; y: number; width: number; height: number }>>(
        (acc, entry) => {
          acc[entry.group.id] = {
            x: entry.frame.x,
            y: entry.frame.y,
            width: entry.frame.width,
            height: entry.frame.height
          };
          return acc;
        },
        {}
      ),
    [renderedGroups]
  );

  const highlightedGroupId = highlightedTableId ? mergedByTable[highlightedTableId]?.id ?? null : null;

  const stageSize = useMemo(() => {
    const maxTableX = tables.reduce((max, table) => Math.max(max, table.x + table.width), 0);
    const maxFixtureX = fixtures.reduce((max, fixture) => Math.max(max, fixture.x + fixture.width), 0);
    const maxGroupX = renderedGroups.reduce((max, group) => Math.max(max, group.frame.x + group.frame.width), 0);
    const maxTableY = tables.reduce((max, table) => Math.max(max, table.y + table.height), 0);
    const maxFixtureY = fixtures.reduce((max, fixture) => Math.max(max, fixture.y + fixture.height), 0);
    const maxGroupY = renderedGroups.reduce((max, group) => Math.max(max, group.frame.y + group.frame.height), 0);

    return {
      width: Math.max(viewportSize.width, snapExtent(Math.max(maxTableX, maxFixtureX, maxGroupX) + 220)),
      height: Math.max(viewportSize.height, snapExtent(Math.max(maxTableY, maxFixtureY, maxGroupY) + 220))
    };
  }, [fixtures, renderedGroups, tables, viewportSize.height, viewportSize.width]);

  const occupiedFrames = useMemo<Frame[]>(
    () => [
      ...tables.map((table) => ({
        id: table.id,
        kind: "table" as const,
        x: table.x,
        y: table.y,
        width: table.width,
        height: table.height
      })),
      ...fixtures.map((fixture) => ({
        id: fixture.id,
        kind: "fixture" as const,
        x: fixture.x,
        y: fixture.y,
        width: fixture.width,
        height: fixture.height
      }))
    ],
    [tables, fixtures]
  );

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const publishSize = () => {
      const bounds = node.getBoundingClientRect();
      setViewportSize({ width: Math.round(bounds.width), height: Math.round(bounds.height) });
    };

    publishSize();
    const observer = new ResizeObserver(publishSize);
    observer.observe(node);
    window.addEventListener("resize", publishSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", publishSize);
    };
  }, []);

  useEffect(() => {
    onCanvasViewportChange?.({ width: viewportSize.width, height: viewportSize.height });
  }, [onCanvasViewportChange, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    onCanvasViewChange?.({
      width: viewportSize.width,
      height: viewportSize.height,
      zoom,
      scrollLeft: scrollState.left,
      scrollTop: scrollState.top,
      stageWidth: stageSize.width,
      stageHeight: stageSize.height
    });
  }, [onCanvasViewChange, scrollState.left, scrollState.top, stageSize.height, stageSize.width, viewportSize.height, viewportSize.width, zoom]);

  // Rubber-band multi-select effect
  useEffect(() => {
    if (!selectionBoxActive) return;
    const start = selectionStartRef.current;
    if (!start) return;

    const onMove = (e: PointerEvent) => {
      const node = viewportRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const z = zoomRef.current;
      const curX = (e.clientX - rect.left + node.scrollLeft) / z;
      const curY = (e.clientY - rect.top + node.scrollTop) / z;
      setSelectionBoxVisual({ startX: start.x, startY: start.y, currentX: curX, currentY: curY });
      const box = {
        x: Math.min(start.x, curX), y: Math.min(start.y, curY),
        width: Math.abs(curX - start.x), height: Math.abs(curY - start.y)
      };
      if (box.width > 4 || box.height > 4) {
        const ids = new Set(
          tablesRef.current
            .filter((t) => t.x < box.x + box.width && t.x + t.width > box.x && t.y < box.y + box.height && t.y + t.height > box.y)
            .map((t) => t.id)
        );
        setMultiSelectedIds(ids);
        onMultiSelectChange?.(Array.from(ids));
      }
    };
    const onUp = () => {
      setSelectionBoxActive(false);
      setSelectionBoxVisual(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionBoxActive, onMultiSelectChange]);

  const toCanvasPoint = (clientX: number, clientY: number) => {
    const node = viewportRef.current;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return {
      x: (clientX - rect.left + node.scrollLeft) / zoom,
      y: (clientY - rect.top + node.scrollTop) / zoom
    };
  };

  useEffect(() => {
    if (!dragState || !layoutUnlocked) return;

    // Edge-scroll loop: auto-scroll viewport when pointer is near edges during drag
    const EDGE = 50;
    const SPEED = 10;
    function edgeScrollLoop() {
      const node = viewportRef.current;
      const pos = pointerClientRef.current;
      if (!node || !pos) { edgeScrollFrameRef.current = null; return; }
      const rect = node.getBoundingClientRect();
      let dx = 0, dy = 0;
      if (pos.x < rect.left + EDGE)   dx = -SPEED * (1 - (pos.x - rect.left) / EDGE);
      if (pos.x > rect.right - EDGE)  dx =  SPEED * (1 - (rect.right - pos.x) / EDGE);
      if (pos.y < rect.top + EDGE)    dy = -SPEED * (1 - (pos.y - rect.top) / EDGE);
      if (pos.y > rect.bottom - EDGE) dy =  SPEED * (1 - (rect.bottom - pos.y) / EDGE);
      if (dx !== 0) node.scrollLeft = clamp(node.scrollLeft + dx, 0, node.scrollWidth - node.clientWidth);
      if (dy !== 0) node.scrollTop  = clamp(node.scrollTop  + dy, 0, node.scrollHeight - node.clientHeight);
      edgeScrollFrameRef.current = requestAnimationFrame(edgeScrollLoop);
    }
    edgeScrollFrameRef.current = requestAnimationFrame(edgeScrollLoop);

    const onPointerMove = (event: PointerEvent) => {
      pointerClientRef.current = { x: event.clientX, y: event.clientY };
      const pointer = toCanvasPoint(event.clientX, event.clientY);
      if (!pointer) return;

      // Multi-move: drag all selected tables together
      if (dragState.type === "multi-move") {
        const dx = pointer.x - dragState.startX;
        const dy = pointer.y - dragState.startY;
        for (const [tableId, origin] of Object.entries(dragState.origins)) {
          onUpdateTable(tableId, {
            x: clamp(snap(origin.x + dx), 0, stageSize.width - origin.width),
            y: clamp(snap(origin.y + dy), 0, stageSize.height - origin.height)
          });
        }
        setGuides({ x: null, y: null });
        return;
      }

      const dx = pointer.x - dragState.startX;
      const dy = pointer.y - dragState.startY;
      const maxX = Math.max(0, stageSize.width - dragState.originWidth);
      const maxY = Math.max(0, stageSize.height - dragState.originHeight);

      if (dragState.objectKind === "fixture") {
        if (dragState.type === "move") {
          const guideTargets = buildGuideTargetsForMove(dragState, occupiedFrames, renderedGroups);
          const next = resolveMagneticMove(
            dragState.originX + dx,
            dragState.originY + dy,
            { width: dragState.originWidth, height: dragState.originHeight },
            { maxX, maxY },
            guideTargets
          );
          onUpdateFixture(dragState.objectId, { x: next.x, y: next.y });
          setGuides(next.guides);
          return;
        }

        const handle = dragState.resizeHandle ?? "se";
        const minWidth = dragState.originWidth <= 24 ? 24 : 36;
        const minHeight = dragState.originHeight <= 12 ? 12 : 10;
        let rawWidth = dragState.originWidth;
        let rawHeight = dragState.originHeight;
        if (handle === "e" || handle === "se" || handle === "ne") rawWidth += dx;
        if (handle === "w" || handle === "sw" || handle === "nw") rawWidth -= dx;
        if (handle === "s" || handle === "se" || handle === "sw") rawHeight += dy;
        if (handle === "n" || handle === "ne" || handle === "nw") rawHeight -= dy;
        const width = clamp(snap(rawWidth), minWidth, stageSize.width);
        const height = clamp(snap(rawHeight), minHeight, stageSize.height);
        const fixturePatch: Partial<Pick<EffectiveFixture, "x" | "y" | "width" | "height" | "rotation">> = { width, height };
        if (handle === "w" || handle === "sw" || handle === "nw") {
          fixturePatch.x = clamp(dragState.originX + dragState.originWidth - width, 0, stageSize.width - width);
        }
        if (handle === "n" || handle === "ne" || handle === "nw") {
          fixturePatch.y = clamp(dragState.originY + dragState.originHeight - height, 0, stageSize.height - height);
        }
        onUpdateFixture(dragState.objectId, fixturePatch);
        setGuides({ x: null, y: null });
        return;
      }

      if (dragState.objectKind === "table") {
        if (dragState.type === "move") {
          const guideTargets = buildGuideTargetsForMove(dragState, occupiedFrames, renderedGroups);
          const next = resolveMagneticMove(
            dragState.originX + dx,
            dragState.originY + dy,
            { width: dragState.originWidth, height: dragState.originHeight },
            { maxX, maxY },
            guideTargets
          );
          onUpdateTable(dragState.objectId, { x: next.x, y: next.y });
          setGuides(next.guides);
          return;
        }

        const min = dragState.shape === "bar" ? 40 : 56;
        const maxW = Math.max(min, stageSize.width - dragState.originX);
        const maxH = Math.max(min, stageSize.height - dragState.originY);
        if (dragState.shape === "round") {
          const size = clamp(snap(dragState.originWidth + Math.max(dx, dy)), min, Math.min(maxW, maxH));
          onUpdateTable(dragState.objectId, { width: size, height: size });
          setGuides({ x: null, y: null });
          return;
        }
        const width = clamp(snap(dragState.originWidth + dx), min, maxW);
        const height = clamp(snap(dragState.originHeight + dy), min, maxH);
        onUpdateTable(dragState.objectId, { width, height });
        setGuides({ x: null, y: null });
        return;
      }

      if (dragState.type === "move") {
        const guideTargets = buildGuideTargetsForMove(dragState, occupiedFrames, renderedGroups);
        const next = resolveMagneticMove(
          dragState.originX + dx,
          dragState.originY + dy,
          { width: dragState.originWidth, height: dragState.originHeight },
          { maxX, maxY },
          guideTargets
        );
        onUpdateMergedGroupLayout(dragState.objectId, { x: next.x, y: next.y });
        setGuides(next.guides);
        return;
      }

      const min = 84;
      const width = clamp(snap(dragState.originWidth + dx), min, stageSize.width - dragState.originX);
      const height = clamp(snap(dragState.originHeight + dy), min, stageSize.height - dragState.originY);
      onUpdateMergedGroupLayout(dragState.objectId, { width, height });
      setGuides({ x: null, y: null });
    };

    const onPointerUp = () => {
      if (edgeScrollFrameRef.current !== null) { cancelAnimationFrame(edgeScrollFrameRef.current); edgeScrollFrameRef.current = null; }
      pointerClientRef.current = null;
      setDragState(null);
      setGuides({ x: null, y: null });
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      if (edgeScrollFrameRef.current !== null) { cancelAnimationFrame(edgeScrollFrameRef.current); edgeScrollFrameRef.current = null; }
      pointerClientRef.current = null;
    };
  }, [dragState, layoutUnlocked, occupiedFrames, onUpdateFixture, onUpdateMergedGroupLayout, onUpdateTable, renderedGroups, stageSize.height, stageSize.width, zoom, snap, clamp]);

  const setZoomWithFocus = (nextZoom: number, clientX?: number, clientY?: number) => {
    const node = viewportRef.current;
    if (!node) {
      setZoom(nextZoom);
      return;
    }

    const prevZoom = zoom;
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    if (Math.abs(clampedZoom - prevZoom) < 0.001) return;

    const rect = node.getBoundingClientRect();
    const focusX = typeof clientX === "number" ? clientX - rect.left : node.clientWidth / 2;
    const focusY = typeof clientY === "number" ? clientY - rect.top : node.clientHeight / 2;
    const worldX = (focusX + node.scrollLeft) / prevZoom;
    const worldY = (focusY + node.scrollTop) / prevZoom;

    setZoom(clampedZoom);
    requestAnimationFrame(() => {
      const scrollLeft = worldX * clampedZoom - focusX;
      const scrollTop = worldY * clampedZoom - focusY;
      const maxScrollLeft = Math.max(0, stageSize.width * clampedZoom - node.clientWidth);
      const maxScrollTop = Math.max(0, stageSize.height * clampedZoom - node.clientHeight);
      node.scrollLeft = clamp(scrollLeft, 0, maxScrollLeft);
      node.scrollTop = clamp(scrollTop, 0, maxScrollTop);
      setScrollState({ left: node.scrollLeft, top: node.scrollTop });
    });
  };

  return (
    <section className={`canvas-shell${dropActive ? " is-drop-active" : ""}${layoutUnlocked ? " is-editing" : ""}`} onClick={onClearSelection}>
      <div
        className="canvas-shell__viewport"
        ref={viewportRef}
        onScroll={(event) => {
          const node = event.currentTarget;
          setScrollState({ left: node.scrollLeft, top: node.scrollTop });
        }}
        onWheel={(event) => {
          if (!event.ctrlKey) return;
          event.preventDefault();
          const direction = event.deltaY > 0 ? -0.1 : 0.1;
          setZoomWithFocus(zoom + direction, event.clientX, event.clientY);
        }}
        onDragOver={(event) => {
          if (!layoutUnlocked) return;
          event.preventDefault();
          const item = readDragItem(event.dataTransfer);
          if (!item) return;
          const point = toCanvasPoint(event.clientX, event.clientY);
          if (!point) return;
          setDropActive(true);
          setDropPreview(resolveDropPreview(item, point.x, point.y, stageSize, occupiedFrames));
        }}
        onDragLeave={(event) => {
          if (!layoutUnlocked) return;
          const related = event.relatedTarget as Node | null;
          if (related && event.currentTarget.contains(related)) return;
          setDropActive(false);
          setDropPreview(null);
        }}
        onDrop={(event) => {
          if (!layoutUnlocked) return;
          event.preventDefault();
          const item = readDragItem(event.dataTransfer);
          if (!item) return;
          const point = toCanvasPoint(event.clientX, event.clientY);
          if (!point) return;
          const preview = dropPreview ?? resolveDropPreview(item, point.x, point.y, stageSize, occupiedFrames);

          if (item.kind === "table" && item.shape) {
            onAddTable(item.shape, preview.x, preview.y);
          } else if (item.kind === "fixture" && item.fixtureKind) {
            onAddFixture(item.fixtureKind, preview.x, preview.y);
          }
          setDropActive(false);
          setDropPreview(null);
        }}
      >
        <div
          className="canvas-shell__zoom-space"
          style={{ width: Math.round(stageSize.width * zoom), height: Math.round(stageSize.height * zoom) }}
        >
          <div
            className="canvas-shell__stage"
            style={{ width: stageSize.width, height: stageSize.height, transform: `scale(${zoom})` }}
            onPointerDown={(event) => {
              // Start rubber-band selection only on direct background click
              if (event.target !== event.currentTarget) return;
              if (event.button !== 0) return;
              const pointer = toCanvasPoint(event.clientX, event.clientY);
              if (!pointer) return;
              onClearSelection();
              setMultiSelectedIds(new Set());
              onMultiSelectChange?.([]);
              selectionStartRef.current = { x: pointer.x, y: pointer.y };
              setSelectionBoxActive(true);
              event.stopPropagation();
            }}
          >
            <div className="canvas-shell__grid" />

            {dropActive ? <div className="canvas-shell__drop-zone" /> : null}
            {dropPreview ? (
              <div
                className={`canvas-drop-preview canvas-drop-preview--${dropPreview.kind}`}
                style={{
                  left: dropPreview.x,
                  top: dropPreview.y,
                  width: dropPreview.width,
                  height: dropPreview.height
                }}
              >
                <span>{dropPreview.label}</span>
              </div>
            ) : null}

            {guides.x !== null ? <div className="canvas-guide canvas-guide--x" style={{ left: guides.x }} /> : null}
            {guides.y !== null ? <div className="canvas-guide canvas-guide--y" style={{ top: guides.y }} /> : null}

            {selectionBoxVisual ? (
              <div
                className="selection-rect"
                style={{
                  left: Math.min(selectionBoxVisual.startX, selectionBoxVisual.currentX),
                  top: Math.min(selectionBoxVisual.startY, selectionBoxVisual.currentY),
                  width: Math.abs(selectionBoxVisual.currentX - selectionBoxVisual.startX),
                  height: Math.abs(selectionBoxVisual.currentY - selectionBoxVisual.startY)
                }}
              />
            ) : null}

            {mergeMode.active ? (
              <div className="merge-banner">
                <strong>Birleştirme modu aktif</strong>
                <span>Yakın masaları seçip menüden birleştir.</span>
              </div>
            ) : null}
            {fixtures.map((fixture) => {
              const isSelected = selectedObject?.kind === "fixture" && selectedObject.id === fixture.id;
              return (
                <div
                  key={fixture.id}
                  className={`fixture-token fixture-token--${fixture.kind} ${isSelected ? "is-selected" : ""}`}
                  style={{
                    left: fixture.x,
                    top: fixture.y,
                    width: fixture.width,
                    height: fixture.height,
                    transform: `rotate(${fixture.rotation}deg)`
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectFixture(fixture.id);
                  }}
                  onPointerDown={
                    layoutUnlocked
                      ? (event) => {
                          if (event.button !== 0) return;
                          const pointer = toCanvasPoint(event.clientX, event.clientY);
                          if (!pointer) return;
                          onInteractionStart();
                          const current = fixtureMap[fixture.id];
                          if (!current) return;
                          setDragState({
                            type: "move",
                            objectKind: "fixture",
                            objectId: fixture.id,
                            startX: pointer.x,
                            startY: pointer.y,
                            originX: current.x,
                            originY: current.y,
                            originWidth: current.width,
                            originHeight: current.height
                          });
                        }
                      : undefined
                  }
                  title={fixture.label ?? fixture.kind}
                >
                  <FixtureContent kind={fixture.kind} label={fixture.label} />
                  {layoutUnlocked && isSelected ? (
                    <>
                      {/* Delete button — top-left outside */}
                      <button
                        className="fixture-token__delete"
                        title="Sil"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteFixture(fixture.id);
                        }}
                      >
                        ×
                      </button>
                      {/* Rotate button — top-center outside, counter-rotated so always upright */}
                      <button
                        className="fixture-token__rotate-btn"
                        title="90° döndür"
                        onClick={(event) => {
                          event.stopPropagation();
                          onUpdateFixture(fixture.id, { rotation: (fixture.rotation + 90) % 360 });
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{ transform: `translateX(-50%) rotate(${-fixture.rotation}deg)` }}
                      >
                        ↻
                      </button>
                      {/* 8 resize handles */}
                      {(["nw", "n", "ne", "w", "e", "sw", "s", "se"] as const).map((handle) => (
                        <button
                          key={handle}
                          className={`fixture-token__resize fixture-token__resize--${handle}`}
                          title="Boyutlandır"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            const pointer = toCanvasPoint(event.clientX, event.clientY);
                            if (!pointer) return;
                            onInteractionStart();
                            setDragState({
                              type: "resize",
                              objectKind: "fixture",
                              objectId: fixture.id,
                              resizeHandle: handle,
                              startX: pointer.x,
                              startY: pointer.y,
                              originX: fixture.x,
                              originY: fixture.y,
                              originWidth: fixture.width,
                              originHeight: fixture.height
                            });
                          }}
                        />
                      ))}
                    </>
                  ) : null}
                </div>
              );
            })}

            {renderedGroups.map(({ group, frame }) => (
              <div
                key={group.id}
                className={[
                  "merged-token",
                  `merged-token--${groupVisualStates[group.id] ?? "empty"}`,
                  group.groupType === "banquet" ? "is-banquet" : "",
                  selectedObject?.kind === "group" && selectedObject.id === group.id ? "is-selected" : "",
                  highlightedGroupId === group.id ? "is-highlighted" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height }}
                onClick={(event) => {
                  event.stopPropagation();
                  if (mergeMode.active) return;
                  onSelectMergedGroup(group.id);
                }}
                onPointerDown={
                  layoutUnlocked
                    ? (event) => {
                        if (event.button !== 0) return;
                        const pointer = toCanvasPoint(event.clientX, event.clientY);
                        if (!pointer) return;
                        onInteractionStart();
                        setDragState({
                          type: "move",
                          objectKind: "group",
                          objectId: group.id,
                          startX: pointer.x,
                          startY: pointer.y,
                          originX: frame.x,
                          originY: frame.y,
                          originWidth: frame.width,
                          originHeight: frame.height,
                          memberTableIds: group.tableIds
                        });
                      }
                    : undefined
                }
                title={`${group.name} | ${groupBadgeById[group.id] ?? `0/${frame.capacity}`}`}
              >
                <header className="merged-token__header">
                  <strong>{group.name}</strong>
                  <span>{groupBadgeById[group.id] ?? `0/${frame.capacity}`}</span>
                </header>
                <small>{frame.memberCount} masa</small>
                {warningByGroup[group.id] ? <div className="merged-token__warn">! {warningByGroup[group.id]}</div> : null}
                {layoutUnlocked ? (
                  <button
                    className="table-token__resize merged-token__resize"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      const pointer = toCanvasPoint(event.clientX, event.clientY);
                      if (!pointer) return;
                      onInteractionStart();
                      setDragState({
                        type: "resize",
                        objectKind: "group",
                        objectId: group.id,
                        startX: pointer.x,
                        startY: pointer.y,
                        originX: frame.x,
                        originY: frame.y,
                        originWidth: frame.width,
                        originHeight: frame.height,
                        memberTableIds: group.tableIds
                      });
                    }}
                  />
                ) : null}
              </div>
            ))}

            {tables.map((table) => {
              const parentGroup = mergedByTable[table.id];
              const parentFrame = parentGroup ? groupFrameById[parentGroup.id] : null;
              const tableInGroup = Boolean(parentGroup && parentFrame);
              const isTableSelected = selectedObject?.kind === "table" && selectedObject.id === table.id;
              const isGroupSelected =
                tableInGroup && selectedObject?.kind === "group" && selectedObject.id === parentGroup?.id;
              return (
                <TableNode
                  key={table.id}
                  table={table}
                  visualState={visualStates[table.id] ?? "empty"}
                  selected={Boolean(isTableSelected || isGroupSelected)}
                  highlighted={Boolean(
                    highlightedTableId === table.id ||
                      (tableInGroup && highlightedGroupId && highlightedGroupId === parentGroup?.id)
                  )}
                  multiSelected={multiSelectedIds.has(table.id)}
                  mergeSelectable={mergeMode.active && !tableInGroup}
                  mergeSelected={!tableInGroup && mergeMode.tableIds.includes(table.id)}
                  mergeBase={!tableInGroup && mergeMode.baseTableId === table.id}
                  isAddedByOverride={table.isAddedByOverride}
                  warningText={warningByTable[table.id]}
                  occupancyLabel={tableBadgeById[table.id] ?? `0/${table.capacity}`}
                  showResizeHandle={layoutUnlocked && !tableInGroup}
                  showRotateButton={!tableInGroup && (selectedObject?.kind === "table" && selectedObject.id === table.id)}
                  onRotate={() => onUpdateTable(table.id, { rotation: ((table.rotation ?? 0) + 90) % 360 })}
                  onSelect={() => {
                    // Clear multi-select on individual click
                    if (multiSelectedIds.size > 0) {
                      setMultiSelectedIds(new Set());
                      onMultiSelectChange?.([]);
                    }
                    if (tableInGroup && parentGroup) {
                      if (mergeMode.active) return;
                      onSelectMergedGroup(parentGroup.id);
                      return;
                    }
                    onSelectTable(table.id);
                  }}
                  onMovePointerDown={
                    layoutUnlocked
                      ? (event) => {
                          if (event.button !== 0) return;
                          const pointer = toCanvasPoint(event.clientX, event.clientY);
                          if (!pointer) return;
                          // Multi-move: if this table is in multi-selection
                          if (multiSelectedIds.has(table.id) && multiSelectedIds.size > 1 && !tableInGroup) {
                            onInteractionStart();
                            const origins: Record<string, { x: number; y: number; width: number; height: number }> = {};
                            for (const id of multiSelectedIds) {
                              const t = tableMap[id];
                              if (t) origins[id] = { x: t.x, y: t.y, width: t.width, height: t.height };
                            }
                            setDragState({ type: "multi-move", startX: pointer.x, startY: pointer.y, origins });
                            return;
                          }
                          if (tableInGroup && parentGroup && parentFrame) {
                            if (mergeMode.active) return;
                            onInteractionStart();
                            setDragState({
                              type: "move",
                              objectKind: "group",
                              objectId: parentGroup.id,
                              startX: pointer.x,
                              startY: pointer.y,
                              originX: parentFrame.x,
                              originY: parentFrame.y,
                              originWidth: parentFrame.width,
                              originHeight: parentFrame.height,
                              memberTableIds: parentGroup.tableIds
                            });
                            return;
                          }
                          const current = tableMap[table.id];
                          if (!current) return;
                          onInteractionStart();
                          setDragState({
                            type: "move",
                            objectKind: "table",
                            objectId: table.id,
                            startX: pointer.x,
                            startY: pointer.y,
                            originX: current.x,
                            originY: current.y,
                            originWidth: current.width,
                            originHeight: current.height,
                            shape: current.shape
                          });
                        }
                      : undefined
                  }
                  onResizePointerDown={
                    layoutUnlocked
                      ? (event) => {
                          if (event.button !== 0) return;
                          const pointer = toCanvasPoint(event.clientX, event.clientY);
                          if (!pointer) return;
                          if (tableInGroup && parentGroup && parentFrame) {
                            if (mergeMode.active) return;
                            onInteractionStart();
                            setDragState({
                              type: "resize",
                              objectKind: "group",
                              objectId: parentGroup.id,
                              startX: pointer.x,
                              startY: pointer.y,
                              originX: parentFrame.x,
                              originY: parentFrame.y,
                              originWidth: parentFrame.width,
                              originHeight: parentFrame.height,
                              memberTableIds: parentGroup.tableIds
                            });
                            return;
                          }
                          const current = tableMap[table.id];
                          if (!current) return;
                          onInteractionStart();
                          setDragState({
                            type: "resize",
                            objectKind: "table",
                            objectId: table.id,
                            startX: pointer.x,
                            startY: pointer.y,
                            originX: current.x,
                            originY: current.y,
                            originWidth: current.width,
                            originHeight: current.height,
                            shape: current.shape
                          });
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="canvas-zoom-controls" onClick={(event) => event.stopPropagation()}>
        <button className="btn btn--tiny btn--soft" onClick={() => setZoomWithFocus(zoom - 0.1)}>
          -
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button className="btn btn--tiny btn--soft" onClick={() => setZoomWithFocus(zoom + 0.1)}>
          +
        </button>
        <button className="btn btn--tiny btn--soft" onClick={() => setZoomWithFocus(1)}>
          Sıfırla
        </button>
        <button
          className="btn btn--tiny btn--soft"
          onClick={() => {
            if (!viewportRef.current) return;
            const fitZoom = clamp(
              Math.min(
                viewportRef.current.clientWidth / Math.max(1, stageSize.width),
                viewportRef.current.clientHeight / Math.max(1, stageSize.height)
              ),
              MIN_ZOOM,
              1
            );
            setZoomWithFocus(fitZoom);
          }}
        >
          Sığdır
        </button>
      </div>

      {children}
    </section>
  );
}

function readDragItem(dataTransfer: DataTransfer): DragItem | null {
  const shape = dataTransfer.getData("application/x-table-shape") as TableShape;
  if (shape) return { kind: "table", shape };
  const fixtureKind = dataTransfer.getData("application/x-fixture-kind") as FixtureKind;
  if (fixtureKind) return { kind: "fixture", fixtureKind };

  if (Array.from(dataTransfer.types).includes("application/x-table-shape")) {
    return { kind: "table", shape: "square" };
  }
  if (Array.from(dataTransfer.types).includes("application/x-fixture-kind")) {
    return { kind: "fixture", fixtureKind: "door" };
  }
  return null;
}

function resolveDropPreview(
  item: DragItem,
  modelX: number,
  modelY: number,
  bounds: { width: number; height: number },
  occupied: Frame[]
): DropPreview {
  const size = item.kind === "table" ? tableSize(item.shape ?? "square") : fixtureSize(item.fixtureKind ?? "door");
  const start = {
    x: modelX - size.width / 2,
    y: modelY - size.height / 2
  };
  const position = resolveSpawnPosition(start.x, start.y, size.width, size.height, bounds, occupied);

  return {
    kind: item.kind,
    label: item.kind === "table" ? "Masa" : item.fixtureKind === "window" ? "Pencere" : "Kapı",
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height
  };
}

type SingleObjectDragState = Exclude<DragState, { type: "multi-move" }>;

function buildGuideTargetsForMove(
  dragState: SingleObjectDragState,
  occupied: Frame[],
  renderedGroups: Array<{ group: MergedTableGroup; frame: { x: number; y: number; width: number; height: number } }>
): Frame[] {
  if (dragState.objectKind === "table") {
    return [
      ...occupied.filter((entry) => !(entry.kind === "table" && entry.id === dragState.objectId)),
      ...renderedGroups
        .filter((entry) => !entry.group.tableIds.includes(dragState.objectId))
        .map((entry) => ({ id: entry.group.id, kind: "group" as const, ...entry.frame }))
    ];
  }

  if (dragState.objectKind === "fixture") {
    return occupied.filter((entry) => !(entry.kind === "fixture" && entry.id === dragState.objectId));
  }

  return [
    ...occupied.filter((entry) => !(entry.kind === "table" && dragState.memberTableIds.includes(entry.id))),
    ...renderedGroups
      .filter((entry) => entry.group.id !== dragState.objectId)
      .map((entry) => ({ id: entry.group.id, kind: "group" as const, ...entry.frame }))
  ];
}

function resolveMagneticMove(
  desiredX: number,
  desiredY: number,
  size: { width: number; height: number },
  bounds: { maxX: number; maxY: number },
  targets: Frame[]
): { x: number; y: number; guides: GuideState } {
  let x = clamp(snap(desiredX), -GRID, bounds.maxX);
  let y = clamp(snap(desiredY), -GRID, bounds.maxY);
  let guideX: number | null = null;
  let guideY: number | null = null;

  let hasBestX = false;
  let hasBestY = false;
  let bestXDistance = Number.POSITIVE_INFINITY;
  let bestYDistance = Number.POSITIVE_INFINITY;
  let bestXPosition = x;
  let bestYPosition = y;
  let bestXGuide = x + size.width / 2;
  let bestYGuide = y + size.height / 2;

  targets.forEach((target) => {
    const xCandidates = [
      { position: target.x, guide: target.x },
      { position: target.x + target.width / 2 - size.width / 2, guide: target.x + target.width / 2 },
      { position: target.x + target.width - size.width, guide: target.x + target.width }
    ];
    xCandidates.forEach((candidate) => {
      const distance = Math.abs(candidate.position - x);
      if (distance > MAGNET_THRESHOLD) return;
      if (distance < bestXDistance) {
        hasBestX = true;
        bestXDistance = distance;
        bestXPosition = candidate.position;
        bestXGuide = candidate.guide;
      }
    });

    const yCandidates = [
      { position: target.y, guide: target.y },
      { position: target.y + target.height / 2 - size.height / 2, guide: target.y + target.height / 2 },
      { position: target.y + target.height - size.height, guide: target.y + target.height }
    ];
    yCandidates.forEach((candidate) => {
      const distance = Math.abs(candidate.position - y);
      if (distance > MAGNET_THRESHOLD) return;
      if (distance < bestYDistance) {
        hasBestY = true;
        bestYDistance = distance;
        bestYPosition = candidate.position;
        bestYGuide = candidate.guide;
      }
    });
  });

  if (hasBestX) {
    x = clamp(Math.round(bestXPosition), -GRID, bounds.maxX);
    guideX = Math.round(bestXGuide);
  }
  if (hasBestY) {
    y = clamp(Math.round(bestYPosition), -GRID, bounds.maxY);
    guideY = Math.round(bestYGuide);
  }

  return { x, y, guides: { x: guideX, y: guideY } };
}

function snapExtent(value: number): number {
  return Math.ceil(value / GRID) * GRID;
}

