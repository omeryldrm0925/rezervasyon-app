import { useEffect, useRef, useState } from "react";
import { type Area } from "../types";

interface AreaMenuProps {
  areas: Area[];
  selectedAreaId: string | null;
  onSelectArea: (areaId: string) => void;
  onAddArea: (name: string) => void;
  onRenameArea: (areaId: string, name: string) => void;
}

export function AreaMenu({
  areas,
  selectedAreaId,
  onSelectArea,
  onAddArea,
  onRenameArea
}: AreaMenuProps) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newAreaName, setNewAreaName] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDrafts(
      areas.reduce<Record<string, string>>((acc, area) => {
        acc[area.id] = area.name;
        return acc;
      }, {})
    );
  }, [areas]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div className="area-menu" ref={rootRef}>
      <button className="btn btn--soft" onClick={() => setOpen((prev) => !prev)}>
        {areas.find((a) => a.id === selectedAreaId)?.name ?? "Alanlar"}
      </button>
      {open ? (
        <div className="area-menu__panel">
          {areas.map((area) => (
            <div key={area.id} className="area-menu__row">
              <button
                className={`btn btn--tiny btn--soft ${area.id === selectedAreaId ? "is-active" : ""}`}
                onClick={() => {
                  onSelectArea(area.id);
                  setOpen(false);
                }}
              >
                Aç
              </button>
              <input
                className="input input--compact"
                value={drafts[area.id] ?? area.name}
                onChange={(event) => setDrafts((prev) => ({ ...prev, [area.id]: event.target.value }))}
              />
              <button
                className="btn btn--tiny btn--soft"
                onClick={() => onRenameArea(area.id, drafts[area.id] ?? area.name)}
              >
                Yeniden Adlandır
              </button>
            </div>
          ))}

          <div className="area-menu__add-row">
            <input
              className="input input--compact"
              placeholder="Yeni alan adı"
              value={newAreaName}
              onChange={(event) => setNewAreaName(event.target.value)}
            />
            <button
              className="btn btn--tiny btn--accent"
              onClick={() => {
                const cleaned = newAreaName.trim();
                if (!cleaned) return;
                onAddArea(cleaned);
                setNewAreaName("");
                setOpen(false);
              }}
            >
              Alan Ekle
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
