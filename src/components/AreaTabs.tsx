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
  const [menuPos, setMenuPos]         = useState<{ left: number; top: number } | null>(null);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editName, setEditName]       = useState("");
  const [isAdding, setIsAdding]       = useState(false);
  const [newName, setNewName]         = useState("");

  const addInputRef        = useRef<HTMLInputElement | null>(null);
  const editInputRef       = useRef<HTMLInputElement | null>(null);
  const menuRef            = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const addCommittedRef    = useRef(false);
  const editCommittedRef   = useRef(false);

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
    if (isAdding) {
      addCommittedRef.current = false;
      addInputRef.current?.focus();
    }
  }, [isAdding]);

  // Rename input açılınca odaklan
  useEffect(() => {
    if (editingId) {
      editCommittedRef.current = false;
      editInputRef.current?.focus();
    }
  }, [editingId]);

  // Aktif sekmeyi görünür alana kaydır
  useEffect(() => {
    if (!activeAreaId || !scrollContainerRef.current) return;
    const el = scrollContainerRef.current.querySelector<HTMLElement>(`[data-area-id="${activeAreaId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [activeAreaId]);

  function openMenu(e: React.MouseEvent<HTMLButtonElement>, areaId: string) {
    e.stopPropagation();
    if (menuOpenId === areaId) { setMenuOpenId(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ left: rect.left, top: rect.bottom + 4 });
    setMenuOpenId(areaId);
  }

  function startRename(area: Area) {
    setMenuOpenId(null);
    setEditingId(area.id);
    setEditName(area.name);
  }

  function commitRename() {
    if (!editingId) return;
    if (editCommittedRef.current) return;
    editCommittedRef.current = true;
    const trimmed = editName.trim();
    if (trimmed) onRenameArea(editingId, trimmed);
    setEditingId(null);
  }

  function commitAdd() {
    if (addCommittedRef.current) return;
    addCommittedRef.current = true;
    const trimmed = newName.trim();
    if (trimmed) onAddArea(trimmed);
    setNewName("");
    setIsAdding(false);
  }

  function handleDelete(areaId: string) {
    setMenuOpenId(null);
    if (!window.confirm("Bu salonu ve tüm rezervasyonlarını silmek istiyor musun?")) return;
    onDeleteArea(areaId);
  }

  // Aktif menünün ait olduğu area
  const menuArea = menuOpenId ? areas.find((a) => a.id === menuOpenId) ?? null : null;

  return (
    <>
      <div
        ref={scrollContainerRef}
        className="flex items-center bg-white border-b border-gray-200 px-3 gap-1 overflow-x-auto flex-shrink-0 min-h-0"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Salon tab'ları */}
        {areas.map((area) => {
          const isActive  = area.id === activeAreaId;
          const isEditing = editingId === area.id;
          const isMenuOpen = menuOpenId === area.id;

          return (
            <div
              key={area.id}
              data-area-id={area.id}
              onClick={() => !isEditing && onSelectArea(area.id)}
              className={`relative my-1.5 flex-shrink-0 group flex items-center gap-1 cursor-pointer select-none rounded-full transition-all duration-200
                ${isActive
                  ? "bg-indigo-600 text-white px-5 py-2 font-semibold shadow-sm"
                  : "bg-transparent text-gray-500 px-5 py-2 hover:bg-gray-100"
                }`}
            >
              {isEditing ? (
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
                <>
                  <span className="text-sm leading-none">{area.name}</span>

                  {/* "⋯" butonu */}
                  <button
                    className={`flex-shrink-0 rounded p-0.5 transition-opacity duration-100
                      ${isMenuOpen ? "opacity-100 bg-gray-100" : "opacity-0 group-hover:opacity-100 hover:bg-gray-100"}`}
                    onClick={(e) => openMenu(e, area.id)}
                    title="Alan seçenekleri"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </button>
                </>
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

      {/* Dropdown menü — overflow-x:auto kapsayıcısının DIŞINDA, position:fixed ile */}
      {menuArea && menuPos && (
        <div
          ref={menuRef}
          style={{ position: "fixed", left: menuPos.left, top: menuPos.top, zIndex: 200 }}
          className="w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left text-sm px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => startRename(menuArea)}
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
            onClick={() => handleDelete(menuArea.id)}
            title={areas.length <= 1 ? "Son salon silinemez" : undefined}
          >
            Sil
          </button>
        </div>
      )}
    </>
  );
}
