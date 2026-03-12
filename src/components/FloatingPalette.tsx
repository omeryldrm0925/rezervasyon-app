import { useEffect, useRef, useState } from "react";
import { type FixtureKind, type TableShape } from "../types";

const tableItems: Array<{ shape: TableShape; label: string }> = [
  { shape: "square", label: "Kare Masa" },
  { shape: "rectangle", label: "Dikdörtgen" },
  { shape: "round", label: "Yuvarlak" },
  { shape: "booth", label: "Loca" },
  { shape: "bar", label: "Bar" }
];

const fixtureItems: Array<{ kind: FixtureKind; label: string }> = [
  { kind: "door", label: "Kapı" },
  { kind: "window", label: "Pencere" }
];

interface FloatingPaletteProps {
  enabled: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onQuickAddTable: (shape: TableShape) => void;
  onQuickAddFixture: (fixtureKind: FixtureKind) => void;
}

export function FloatingPalette({
  enabled,
  expanded,
  onToggleExpanded,
  onQuickAddTable,
  onQuickAddFixture
}: FloatingPaletteProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ ox: number; oy: number; mx: number; my: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({
        x: dragRef.current.ox + (e.clientX - dragRef.current.mx),
        y: dragRef.current.oy + (e.clientY - dragRef.current.my)
      });
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const node = nodeRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const parent = node.offsetParent as HTMLElement | null;
    const parentRect = parent?.getBoundingClientRect() ?? { left: 0, top: 0 };
    dragRef.current = { ox: rect.left - parentRect.left, oy: rect.top - parentRect.top, mx: e.clientX, my: e.clientY };
    setPos({ x: rect.left - parentRect.left, y: rect.top - parentRect.top });
    e.preventDefault();
  };

  const posStyle = pos ? { left: pos.x, top: pos.y } : {};

  return (
    <div
      ref={nodeRef}
      className={`palette-float ${enabled ? "" : "is-disabled"} ${expanded ? "is-open" : "is-collapsed"}`}
      style={posStyle}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="palette-float__header">
        <span className="palette-float__drag-handle" onMouseDown={handleDragStart} title="Taşı" />
        <button className="palette-float__toggle btn btn--tiny btn--soft" onClick={onToggleExpanded}>
          {expanded ? "Kapat" : "Masalar"}
        </button>
      </div>

      {expanded ? (
        <>
          <p>Masalar</p>
          {tableItems.map((item) => (
            <button
              key={item.shape}
              className="palette-float__item"
              draggable={enabled}
              onDragStart={(event) => {
                if (!enabled) return;
                event.dataTransfer.setData("application/x-table-shape", item.shape);
                event.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => {
                if (!enabled) return;
                onQuickAddTable(item.shape);
              }}
            >
              {item.label}
            </button>
          ))}

          <p>Mekânsal Objeler</p>
          {fixtureItems.map((item) => (
            <button
              key={item.kind}
              className="palette-float__item palette-float__item--fixture"
              draggable={enabled}
              onDragStart={(event) => {
                if (!enabled) return;
                event.dataTransfer.setData("application/x-fixture-kind", item.kind);
                event.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => {
                if (!enabled) return;
                onQuickAddFixture(item.kind);
              }}
            >
              {item.label}
            </button>
          ))}

          <small>{enabled ? "Objeyi sürükleyip krokiye bırak" : "Önce yerleşim araçlarını aç"}</small>
        </>
      ) : null}
    </div>
  );
}
