import { useEffect, useRef, useState } from "react";
import { type Area } from "../types";

interface AreaTabsProps {
  areas: Area[];
  activeAreaId: string | null;
  onSelectArea: (areaId: string) => void;
  onAddArea: (name: string) => void;
  onRenameArea: (areaId: string, name: string) => void;
  onDeleteArea: (areaId: string) => void;
}

export function AreaTabs({
  areas,
  activeAreaId,
  onSelectArea,
  onAddArea,
  onRenameArea,
  onDeleteArea
}: AreaTabsProps) {
  const [menuOpenId, setMenuOpenId]   = useState<string | null>(null);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editName, setEditName]       = useState("");
  const [isAdding, setIsAdding]       = useState(false);
  const [newName, setNewName]         = useState("");

  const addInputRef  = useRef<HTMLInputElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef      = useRef<HTMLDivElement | null>(null);

  // Menü dışına tıklayınca kapat
  useEffect(() => {
    if (!menuOpenId) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpenId(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpenId(null); };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpenId]);

  // + input açılınca odaklan
  useEffect(() => {
    if (isAdding) addInputRef.current?.focus();
  }, [isAdding]);

  // Rename input açılınca odaklan
  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  function startRename(area: Area) {
    setMenuOpenId(null);
    setEditingId(area.id);
    setEditName(area.name);
  }

  function commitRename() {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (trimmed) onRenameArea(editingId, trimmed);
    setEditingId(null);
  }

  function commitAdd() {
    const trimmed = newName.trim();
    if (trimmed) onAddArea(trimmed);
    setNewName("");
    setIsAdding(false);
  }

  function handleDelete(areaId: string) {
    setMenuOpenId(null);
    if (!window.confirm("Bu alanı ve tüm rezervasyonlarını silmek istiyor musun?")) return;
    onDeleteArea(areaId);
  }

  return (
    <div className="flex items-end bg-white border-b border-gray-200 px-3 overflow-x-auto flex-shrink-0 min-h-0"
      style={{ scrollbarWidth: "none" }}
    >
      {/* Salon tab'ları */}
      {areas.map((area) => {
        const isActive = area.id === activeAreaId;
        const isEditing = editingId === area.id;
        const isMenuOpen = menuOpenId === area.id;

        return (
          <div
            key={area.id}
            className={`relative flex-shrink-0 group flex items-center gap-1 px-3 py-2.5 cursor-pointer select-none transition-colors duration-150
              ${isActive
                ? "border-b-2 border-indigo-600 text-gray-900 font-semibold"
                : "border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg"
              }`}
          >
            {isEditing ? (
              /* Inline rename input */
              <input
                ref={editInputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commitRename(); }
                  if (e.key === "Escape") setEditingId(null);
                }}
                onBlur={commitRename}
                className="w-28 text-sm px-1.5 py-0.5 rounded border border-indigo-400 outline-none bg-white text-gray-900"
              />
            ) : (
              /* Normal tab */
              <>
                <button
                  className="text-sm leading-none"
                  onClick={() => onSelectArea(area.id)}
                >
                  {area.name}
                </button>

                {/* "..." butonu — hover'da göster */}
                <button
                  className={`flex-shrink-0 rounded p-0.5 transition-opacity duration-100
                    ${isMenuOpen ? "opacity-100 bg-gray-100" : "opacity-0 group-hover:opacity-100 hover:bg-gray-100"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(isMenuOpen ? null : area.id);
                  }}
                  title="Alan seçenekleri"
                >
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </button>
              </>
            )}

            {/* Dropdown menü */}
            {isMenuOpen && (
              <div
                ref={menuRef}
                className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full text-left text-sm px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => startRename(area)}
                >
                  Yeniden Adlandır
                </button>
                <button
                  className={`w-full text-left text-sm px-3 py-2 transition-colors
                    ${areas.length <= 1
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-red-600 hover:bg-red-50"
                    }`}
                  disabled={areas.length <= 1}
                  onClick={() => handleDelete(area.id)}
                  title={areas.length <= 1 ? "Son alan silinemez" : undefined}
                >
                  Sil
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Yeni alan — inline input veya + butonu */}
      {isAdding ? (
        <div className="flex items-center gap-1.5 px-2 py-1.5 flex-shrink-0">
          <input
            ref={addInputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitAdd(); }
              if (e.key === "Escape") { setIsAdding(false); setNewName(""); }
            }}
            onBlur={commitAdd}
            placeholder="Alan adı"
            className="w-32 text-sm px-2 py-1 rounded-lg border border-indigo-400 outline-none bg-white text-gray-900 placeholder-gray-400"
          />
        </div>
      ) : (
        <button
          className="flex-shrink-0 ml-1 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          onClick={() => setIsAdding(true)}
          title="Yeni alan ekle"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </div>
  );
}
