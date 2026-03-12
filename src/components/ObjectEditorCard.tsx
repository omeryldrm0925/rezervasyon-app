import { type EffectiveTable, type TableShape, type TablePatch, type TargetMode } from "../types";

interface ObjectEditorCardProps {
  table: EffectiveTable;
  targetMode: TargetMode;
  position: { left: number; top: number };
  onUpdateTable: (patch: TablePatch) => void;
  onDeleteTable?: () => void;
}

const shapeOptions: Array<{ value: TableShape; label: string }> = [
  { value: "square", label: "Kare" },
  { value: "rectangle", label: "Dikdörtgen" },
  { value: "round", label: "Yuvarlak" },
  { value: "booth", label: "Loca" },
  { value: "bar", label: "Bar" }
];

export function ObjectEditorCard({
  table,
  targetMode,
  position,
  onUpdateTable,
  onDeleteTable
}: ObjectEditorCardProps) {
  return (
    <section
      className="table-card object-editor-card"
      style={{ left: position.left, top: position.top }}
      onClick={(event) => event.stopPropagation()}
    >
      <header className="table-card__head">
        <div>
          <h4>Masa Düzenle</h4>
          <span>{targetMode === "default" ? "Varsayılan Plan" : "Günlük Plan"}</span>
        </div>
      </header>

      <form className="table-card__form">
        <label>
          Masa Adı
          <input
            className="input input--compact"
            value={table.label}
            onChange={(event) => onUpdateTable({ label: event.target.value })}
            maxLength={24}
          />
        </label>

        <div className="table-card__form-row">
          <label>
            Kapasite
            <input
              className="input input--compact"
              type="number"
              min={1}
              max={30}
              value={table.capacity}
              onChange={(event) => {
                const nextCapacity = clampInt(event.target.value, table.capacity, 1, 30);
                onUpdateTable({ capacity: nextCapacity });
              }}
            />
          </label>

          <label>
            Şekil
            <select
              className="input input--compact"
              value={table.shape}
              onChange={(event) => {
                const nextShape = event.target.value as TableShape;
                const patch: TablePatch = { shape: nextShape };
                if (nextShape === "round") {
                  const size = Math.max(56, Math.min(table.width, table.height));
                  patch.width = size;
                  patch.height = size;
                }
                onUpdateTable(patch);
              }}
            >
              {shapeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {targetMode !== "default" ? (
          <label className="check-row">
            <input
              type="checkbox"
              checked={table.blocked}
              onChange={(event) => onUpdateTable({ blocked: event.target.checked })}
            />
            Masayı Blokla
          </label>
        ) : null}

        {onDeleteTable ? (
          <div className="table-card__submit">
            <button type="button" className="btn btn--tiny btn--danger" onClick={onDeleteTable}>
              Sil
            </button>
          </div>
        ) : null}
      </form>
    </section>
  );
}

function clampInt(raw: string, fallback: number, min: number, max: number): number {
  const numeric = Number(raw);
  if (Number.isNaN(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}
