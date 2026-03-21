import { useMemo, type CSSProperties, type PointerEvent } from "react";
import { type EffectiveTable, type TableVisualState } from "../types";

// ─── Chair geometry ────────────────────────────────────────────────────────────
const CHAIR_R   = 4;  // sandalye yarıçapı (px)
const CHAIR_GAP = 4;  // masa kenarı ile sandalye merkezi arası boşluk
const CHAIR_OFF = CHAIR_R + CHAIR_GAP; // = 8 px

interface ChairPos { cx: number; cy: number; }

/**
 * Masanın şekli ve boyutuna göre sandalye merkezlerini döner.
 * Koordinatlar table-token sol-üst köşesine göredir (negatif = masanın dışı).
 */
function getChairPositions(
  shape: EffectiveTable["shape"],
  w: number,
  h: number,
  capacity: number
): ChairPos[] {
  const cap = Math.max(1, Math.min(capacity, 8));

  if (shape === "round") {
    const rx = w / 2 + CHAIR_OFF;
    const ry = h / 2 + CHAIR_OFF;
    return Array.from({ length: cap }, (_, i) => {
      const angle = (Math.PI * 2 * i) / cap - Math.PI / 2;
      return { cx: w / 2 + rx * Math.cos(angle), cy: h / 2 + ry * Math.sin(angle) };
    });
  }

  if (shape === "booth") {
    const count = Math.min(cap, 5);
    const spacing = w / (count + 1);
    return Array.from({ length: count }, (_, i) => ({
      cx: spacing * (i + 1),
      cy: h + CHAIR_OFF
    }));
  }

  if (shape === "bar") {
    const count = Math.min(cap, 6);
    const spacing = w / (count + 1);
    return Array.from({ length: count }, (_, i) => ({
      cx: spacing * (i + 1),
      cy: -CHAIR_OFF
    }));
  }

  // Rectangle / Square
  const topCount = Math.ceil(cap / 2);
  const botCount = cap - topCount;
  const positions: ChairPos[] = [];
  const topSpacing = w / (topCount + 1);
  for (let i = 0; i < topCount; i++) positions.push({ cx: topSpacing * (i + 1), cy: -CHAIR_OFF });
  const botSpacing = w / (botCount + 1);
  for (let i = 0; i < botCount; i++) positions.push({ cx: botSpacing * (i + 1), cy: h + CHAIR_OFF });
  return positions;
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface TableNodeProps {
  table: EffectiveTable;
  visualState: TableVisualState;
  selected: boolean;
  highlighted: boolean;
  multiSelected?: boolean;
  mergeSelectable: boolean;
  mergeSelected: boolean;
  mergeBase: boolean;
  isAddedByOverride?: boolean;
  warningText?: string;
  /** "guestCount/capacity" string e.g. "2/4" */
  occupancyLabel: string;
  showResizeHandle: boolean;
  showRotateButton: boolean;
  onSelect: () => void;
  onRotate: () => void;
  onMovePointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onResizePointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
}

export function TableNode({
  table,
  visualState,
  selected,
  highlighted,
  multiSelected,
  mergeSelectable,
  mergeSelected,
  mergeBase,
  isAddedByOverride,
  warningText,
  occupancyLabel,
  showResizeHandle,
  showRotateButton,
  onSelect,
  onRotate,
  onMovePointerDown,
  onResizePointerDown
}: TableNodeProps) {
  // Parse "2/4" → guestCount = 2, labelCapacity = 4
  // labelCapacity may differ from table.capacity when the table belongs to a merged group
  // (the label then reflects the group's total capacity, not this single table's capacity)
  const parts = occupancyLabel.split("/");
  const guestCount = parseInt(parts[0] ?? "0", 10) || 0;
  const labelCapacity = parseInt(parts[1] ?? "0", 10) || table.capacity;
  const rotation = table.rotation ?? 0;

  // Chair positions — memoized on shape/size/capacity
  const chairs = useMemo(
    () => getChairPositions(table.shape, table.width, table.height, table.capacity),
    [table.shape, table.width, table.height, table.capacity]
  );

  // Badge variant — compare against labelCapacity (group total when in a merged group)
  const badgeClass = (() => {
    if (guestCount <= 0) return "table-cap-badge";
    if (guestCount > labelCapacity) return "table-cap-badge table-cap-badge--over";   // aşım → kırmızı
    if (guestCount === labelCapacity) return "table-cap-badge table-cap-badge--full";  // tam dolu → yeşil
    return "table-cap-badge table-cap-badge--partial";                                  // kısmen dolu → yeşil
  })();

  const style: CSSProperties = {
    left: table.x,
    top: table.y,
    width: table.width,
    height: table.height,
    transform: `rotate(${rotation}deg)`,
    transition: "transform 200ms ease"
  };

  const className = [
    "table-token",
    `table-token--${table.shape}`,
    `table-token--${visualState}`,
    selected        ? "is-selected"        : "",
    highlighted     ? "is-highlighted"     : "",
    multiSelected   ? "is-multi-selected"  : "",
    mergeSelectable ? "is-merge-selectable": "",
    (mergeSelected || mergeBase) ? "is-merge-selected" : ""
  ].filter(Boolean).join(" ");

  return (
    <div
      className={className}
      style={style}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerDown={onMovePointerDown}
      title={`${table.label} | ${occupancyLabel}${warningText ? ` | ${warningText}` : ""}`}
    >
      {/* Sandalyeler — masanın dışına overflow:visible ile taşar */}
      {chairs.map((pos, i) => {
        const occupied = i < guestCount;
        return (
          <div
            key={i}
            className={`table-chair${occupied ? "" : " table-chair--empty"}`}
            style={{ left: pos.cx - CHAIR_R, top: pos.cy - CHAIR_R }}
            aria-hidden="true"
          />
        );
      })}

      {/* Blocked çapraz çizgi overlay */}
      {visualState === "blocked" && (
        <div className="table-blocked-overlay" aria-hidden="true" />
      )}

      {/* Masa etiketi */}
      <span className="table-label">{table.label}</span>

      {/* Kapasite badge (sağ alt köşe) */}
      <span className={`${badgeClass}${warningText ? " is-warning" : ""}`}>
        {occupancyLabel}
      </span>

      {/* Uyarı ikonu */}
      {warningText ? (
        <span className="table-token__alert" title={warningText} aria-label={warningText}>!</span>
      ) : null}

      {/* Override badge */}
      {isAddedByOverride ? (
        <span className="table-token__override-badge" title="Bu masa bu güne özel eklendi">+</span>
      ) : null}

      {/* Döndürme butonu — düzenleme modunda, seçili masada */}
      {showRotateButton && (
        <button
          className="table-token__rotate"
          title="90° döndür"
          onClick={(e) => { e.stopPropagation(); onRotate(); }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ transform: `translateX(-50%) rotate(${-rotation}deg)` }}
        >
          ↻
        </button>
      )}

      {/* Resize tutacağı */}
      {showResizeHandle ? (
        <button
          className="table-token__resize"
          onPointerDown={(e) => { e.stopPropagation(); onResizePointerDown?.(e); }}
        />
      ) : null}
    </div>
  );
}
