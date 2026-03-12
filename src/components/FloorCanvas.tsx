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
    patch: Partial<Pick<EffectiveTable, "x" | "y" | "width" | "height">>
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
      resizeAxis?: "x" | "y" | "xy";
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
  const [viewportSize, setViewportSize] = useState({ width: 1200, height: 680 });
  const [scrollState, setScrollState] = useState({ left: 0, top: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);

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
      width: Math.max(1200, viewportSize.width, snapExtent(Math.max(maxTableX, maxFixtureX, maxGroupX) + 220)),
      height: Math.max(680, viewportSize.height, snapExtent(Math.max(maxTableY, maxFixtureY, maxGroupY) + 220))
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

    const onPointerMove = (event: PointerEvent) => {
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

        const minWidth = dragState.originWidth <= 24 ? 24 : 36;
        const minHeight = dragState.originHeight <= 12 ? 12 : 10;
        const rawWidth = dragState.resizeAxis === "y" ? dragState.originWidth : dragState.originWidth + dx;
        const rawHeight = dragState.resizeAxis === "x" ? dragState.originHeight : dragState.originHeight + dy;
        const width = clamp(snap(rawWidth), minWidth, stageSize.width - dragState.originX);
        const height = clamp(snap(rawHeight), minHeight, stageSize.height - dragState.originY);
        onUpdateFixture(dragState.objectId, { width, height });
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
      setDragState(null);
      setGuides({ x: null, y: null });
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
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
    <section className={`canvas-shell ${dropActive ? "is-drop-active" : ""}`} onClick={onClearSelection}>
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
                  title={fixture.label ?? (fixture.kind === "door" ? "Kapı" : "Pencere")}
                >
                  <span>{fixture.kind === "door" ? "Kapı" : "Pencere"}</span>
                  {layoutUnlocked && isSelected ? (
                    <>
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
                      <button
                        className="fixture-token__rotate"
                        onClick={(event) => {
                          event.stopPropagation();
                          onUpdateFixture(fixture.id, { rotation: (fixture.rotation + 90) % 360 });
                        }}
                      >
                        Döndür
                      </button>
                      <button
                        className="fixture-token__resize fixture-token__resize--x"
                        title="Yatay büyüt"
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          const pointer = toCanvasPoint(event.clientX, event.clientY);
                          if (!pointer) return;
                          onInteractionStart();
                          setDragState({
                            type: "resize",
                            objectKind: "fixture",
                            objectId: fixture.id,
                            resizeAxis: "x",
                            startX: pointer.x,
                            startY: pointer.y,
                            originX: fixture.x,
                            originY: fixture.y,
                            originWidth: fixture.width,
                            originHeight: fixture.height
                          });
                        }}
                      />
                      <button
                        className="fixture-token__resize fixture-token__resize--y"
                        title="Dikey büyüt"
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          const pointer = toCanvasPoint(event.clientX, event.clientY);
                          if (!pointer) return;
                          onInteractionStart();
                          setDragState({
                            type: "resize",
                            objectKind: "fixture",
                            objectId: fixture.id,
                            resizeAxis: "y",
                            startX: pointer.x,
                            startY: pointer.y,
                            originX: fixture.x,
                            originY: fixture.y,
                            originWidth: fixture.width,
                            originHeight: fixture.height
                          });
                        }}
                      />
                      <button
                        className="fixture-token__resize fixture-token__resize--xy"
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
                            resizeAxis: "xy",
                            startX: pointer.x,
                            startY: pointer.y,
                            originX: fixture.x,
                            originY: fixture.y,
                            originWidth: fixture.width,
                            originHeight: fixture.height
                          });
                        }}
                      />
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
                  warningText={warningByTable[table.id]}
                  occupancyLabel={tableBadgeById[table.id] ?? `0/${table.capacity}`}
                  showResizeHandle={layoutUnlocked && !tableInGroup}
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
  let x = clamp(snap(desiredX), 0, bounds.maxX);
  let y = clamp(snap(desiredY), 0, bounds.maxY);
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
    x = clamp(Math.round(bestXPosition), 0, bounds.maxX);
    guideX = Math.round(bestXGuide);
  }
  if (hasBestY) {
    y = clamp(Math.round(bestYPosition), 0, bounds.maxY);
    guideY = Math.round(bestYGuide);
  }

  return { x, y, guides: { x: guideX, y: guideY } };
}

function snapExtent(value: number): number {
  return Math.ceil(value / GRID) * GRID;
}

