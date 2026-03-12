import { type CSSProperties, type PointerEvent } from "react";
import { type EffectiveTable, type TableVisualState } from "../types";

interface TableNodeProps {
  table: EffectiveTable;
  visualState: TableVisualState;
  selected: boolean;
  highlighted: boolean;
  mergeSelectable: boolean;
  mergeSelected: boolean;
  mergeBase: boolean;
  warningText?: string;
  occupancyLabel: string;
  showResizeHandle: boolean;
  onSelect: () => void;
  onMovePointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onResizePointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
}

export function TableNode({
  table,
  visualState,
  selected,
  highlighted,
  mergeSelectable,
  mergeSelected,
  mergeBase,
  warningText,
  occupancyLabel,
  showResizeHandle,
  onSelect,
  onMovePointerDown,
  onResizePointerDown
}: TableNodeProps) {
  const style: CSSProperties = {
    left: table.x,
    top: table.y,
    width: table.width,
    height: table.height
  };

  const minSide = Math.min(table.width, table.height);
  const isCompact = minSide < 76 || table.width < 96;
  const isTiny = minSide < 62 || table.width < 76;
  const chairCount = resolveChairCount(table.capacity, isTiny);
  const chairs = buildChairMarkers(chairCount, table.shape, isTiny ? 30 : 36);

  return (
    <div
      className={[
        "table-token",
        `table-token--${table.shape}`,
        `table-token--${visualState}`,
        isCompact ? "is-compact" : "",
        isTiny ? "is-tiny" : "",
        selected ? "is-selected" : "",
        highlighted ? "is-highlighted" : "",
        mergeSelectable ? "is-merge-selectable" : "",
        mergeSelected ? "is-merge-selected" : "",
        mergeBase ? "is-merge-base" : ""
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerDown={onMovePointerDown}
      title={`${table.label} | ${occupancyLabel}${warningText ? ` | ${warningText}` : ""}`}
    >
      <div className="table-token__title">
        <strong>{table.label}</strong>
      </div>

      <div className="table-token__seats" aria-hidden="true">
        {chairs.map((marker, index) => (
          <span
            key={index}
            className="table-token__chair"
            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
          />
        ))}
      </div>

      <div className={`table-token__capacity ${warningText ? "is-warning" : ""} ${isTiny ? "is-outside" : ""}`}>
        <strong>{occupancyLabel}</strong>
      </div>

      {warningText ? (
        <span className="table-token__alert" title={warningText} aria-label={warningText}>
          !
        </span>
      ) : null}

      {showResizeHandle ? (
        <button
          className="table-token__resize"
          onPointerDown={(event) => {
            event.stopPropagation();
            onResizePointerDown?.(event);
          }}
        />
      ) : null}
    </div>
  );
}

function resolveChairCount(capacity: number, isTiny: boolean): number {
  const base = capacity <= 2 ? 2 : capacity <= 4 ? 4 : capacity <= 6 ? 6 : 8;
  if (!isTiny) return base;
  return Math.max(2, Math.min(4, base));
}

function buildChairMarkers(count: number, shape: EffectiveTable["shape"], radius: number): Array<{ x: number; y: number }> {
  if (shape === "bar") {
    return Array.from({ length: Math.min(count, 4) }, (_, index) => ({
      x: 26 + index * 16,
      y: index % 2 === 0 ? 20 : 80
    }));
  }

  const chairCount = Math.max(2, Math.min(count, 8));
  if (shape === "round") {
    return Array.from({ length: chairCount }, (_, index) => {
      const angle = (Math.PI * 2 * index) / chairCount - Math.PI / 2;
      return { x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius };
    });
  }

  return Array.from({ length: chairCount }, (_, index) => {
    const side = index % 4;
    const lane = Math.floor(index / 4);
    const offset = 28 + lane * 18;
    if (side === 0) return { x: 50 - offset / 2, y: 8 };
    if (side === 1) return { x: 92, y: 50 - offset / 2 };
    if (side === 2) return { x: 50 + offset / 2, y: 92 };
    return { x: 8, y: 50 + offset / 2 };
  });
}
