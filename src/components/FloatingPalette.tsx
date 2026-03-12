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
  return (
    <div
      className={`palette-float ${enabled ? "" : "is-disabled"} ${expanded ? "is-open" : "is-collapsed"}`}
      onClick={(event) => event.stopPropagation()}
    >
      <button className="palette-float__toggle btn btn--tiny btn--soft" onClick={onToggleExpanded}>
        {expanded ? "Paneli Kapat" : "Masalar"}
      </button>

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
