import { useEffect, useMemo, useState } from "react";
import {
  type EffectiveTable,
  type MergedTableGroup,
  type Reservation,
  type ReservationOwnerType,
  type TargetMode,
  type TablePatch,
  type TableShape,
} from "../types";

export interface ReservationFormData {
  guestName: string;
  phone: string;
  guestCount: number;
  time: string;
  ownerId: string;
  ownerType: ReservationOwnerType;
  notes: string;
  status: Reservation["status"];
}

interface ReservationSidebarProps {
  reservations: Reservation[];
  tables: EffectiveTable[];
  mergedGroupMap: Record<string, MergedTableGroup>;
  mergedGroupsById: Record<string, MergedTableGroup>;
  activeAreaId: string | null;
  areaNameById: Record<string, string>;
  activeDateISO: string;
  highlightedReservationId: string | null;
  searchQuery: string;
  warningByReservation: Record<string, string>;
  onSearchChange: (query: string) => void;
  onSelectReservation: (reservation: Reservation) => void;
  onDeleteReservation: (reservationId: string) => void;
  onSetStatus: (reservationId: string, status: Reservation["status"]) => void;
  onReassignOrphan: (reservationId: string, newOwnerId: string) => void;
  onSignOut: () => void;
  /** Dışarıdan override edilecek className (varsayılan: w-80 flex-shrink-0 ...) */
  className?: string;
  /** Düzenleme modunda masa/grup seçiliyken gösterilecek editör */
  tableEditor?: {
    table: EffectiveTable | null;
    group: MergedTableGroup | null;
    targetMode: TargetMode;
    onUpdateTable: (patch: TablePatch) => void;
    onDeleteTable: () => void;
    onMerge: () => void;
    onSplit: () => void;
    onClose: () => void;
    onRenameGroup?: (name: string) => void;
  } | null;
  /** Tüm salonlar listesi (salon dropdown için) */
  areas: Array<{ id: string; name: string }>;
  /** Aktif salonu değiştir */
  onSetActiveArea: (areaId: string) => void;
  /** Masa seçilince canvas popup'ı aç */
  onTriggerTableSelect: (ownerId: string, ownerType: "table" | "group") => void;
}

const statusConfig: Record<
  Reservation["status"],
  { label: string; bg: string; text: string }
> = {
  reserved: { label: "Rezerve", bg: "bg-indigo-100", text: "text-indigo-700" },
  arrived:  { label: "Geldi",   bg: "bg-green-100",  text: "text-green-700"  },
  cancelled:{ label: "İptal",   bg: "bg-red-100",    text: "text-red-600"    },
  no_show:  { label: "Gelmedi", bg: "bg-gray-100",   text: "text-gray-500"   },
};

function formatDateHeader(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth()    === today.getMonth()    &&
    date.getDate()     === today.getDate()
  ) return "Bugün";
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

export function ReservationSidebar({
  reservations,
  tables,
  mergedGroupMap,
  mergedGroupsById,
  activeAreaId,
  areaNameById,
  activeDateISO,
  highlightedReservationId,
  searchQuery,
  warningByReservation,
  onSearchChange,
  onSelectReservation,
  onDeleteReservation,
  onSetStatus,
  onReassignOrphan,
  onSignOut,
  className,
  tableEditor,
  areas,
  onSetActiveArea,
  onTriggerTableSelect,
}: ReservationSidebarProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailReservation, setDetailReservation] = useState<Reservation | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorAreaId, setSelectorAreaId] = useState<string>(activeAreaId ?? "");
  const [orphanReassignId, setOrphanReassignId] = useState<string | null>(null);
  const [orphanNewTableId, setOrphanNewTableId] = useState<string>("");

  // ── Table editor draft state ─────────────────────────────────────────────
  const [tableEditorDraft, setTableEditorDraft] = useState<{
    label: string; capacity: number; shape: TableShape;
    rotation: number; width: number; height: number; blocked: boolean;
  } | null>(null);
  const [groupNameDraft, setGroupNameDraft] = useState<string | null>(null);

  // Salon değişince selectorAreaId'yi güncelle
  useEffect(() => {
    setSelectorAreaId(activeAreaId ?? "");
  }, [activeAreaId]);

  // Init/reset draft when selected table changes
  useEffect(() => {
    const t = tableEditor?.table;
    if (!t) { setTableEditorDraft(null); return; }
    setTableEditorDraft({
      label: t.label, capacity: t.capacity, shape: t.shape,
      rotation: t.rotation ?? 0, width: t.width, height: t.height,
      blocked: t.blocked ?? false,
    });
  }, [tableEditor?.table?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Init/reset group name draft when selected group changes
  useEffect(() => {
    const g = tableEditor?.group;
    if (!g) { setGroupNameDraft(null); return; }
    setGroupNameDraft(g.name);
  }, [tableEditor?.group?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Edit modu açılınca mini-selector'ı kapat
  useEffect(() => {
    if (!tableEditor) return;
    setSelectorOpen(false);
  }, [Boolean(tableEditor)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Unique selectable targets: individual tables + merged groups (deduplicated)
  const reservationTargets = useMemo(() => {
    const targets: Array<{ id: string; label: string; isGroup: boolean }> = [];
    const groupsAdded = new Set<string>();
    for (const table of tables) {
      if (table.blocked) continue;
      const group = mergedGroupMap[table.id];
      if (group) {
        if (!groupsAdded.has(group.id)) {
          groupsAdded.add(group.id);
          targets.push({ id: group.id, label: `${group.name} (grup)`, isGroup: true });
        }
      } else {
        targets.push({ id: table.id, label: `${table.label} · ${table.capacity} kişi`, isGroup: false });
      }
    }
    return targets;
  }, [tables, mergedGroupMap]);

  // Filtered + time-sorted list
  const query = searchQuery.trim().toLocaleLowerCase("tr-TR");
  const filtered = useMemo(() => {
    const list = query
      ? reservations.filter((r) => {
          const haystack = [r.guestName, r.phone, r.time, areaNameById[r.areaId] ?? r.areaId]
            .join(" ")
            .toLocaleLowerCase("tr-TR");
          return haystack.includes(query);
        })
      : reservations;
    return [...list].sort((a, b) => a.time.localeCompare(b.time));
  }, [reservations, query, areaNameById]);

  const activeCount = reservations.filter(
    (r) => r.status !== "cancelled" && r.status !== "no_show"
  ).length;

  function isFutureDate(dateISO: string): boolean {
    const today = new Date();
    const [y, m, d] = dateISO.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return date > today;
  }

  function confirmStatusChange(
    reservation: Reservation,
    newStatus: Reservation["status"]
  ): boolean {
    if (newStatus === "arrived" && isFutureDate(reservation.dateISO)) {
      return window.confirm(
        "Bu rezervasyon gelecek bir tarihe ait. Durumu 'Geldi' olarak işaretlemek istediğinize emin misiniz?"
      );
    }
    if (newStatus === "cancelled") {
      return window.confirm(
        "Bu rezervasyonu iptal etmek istediğinize emin misiniz?\nİptal edilen rezervasyon listede kalır ama masa boşa düşer."
      );
    }
    return true;
  }

  function getOwnerLabel(reservation: Reservation): string {
    if (reservation.areaId !== activeAreaId) {
      return areaNameById[reservation.areaId] ?? reservation.areaId;
    }
    if (reservation.ownerType === "group") {
      return mergedGroupsById[reservation.ownerId]?.name ?? "Birleşik Masa";
    }
    return tables.find((t) => t.id === reservation.ownerId)?.label ?? reservation.ownerId;
  }

  function handleEditReservation(reservation: Reservation) {
    const isOrphan = reservation.ownerType === "table" && !tables.some((t) => t.id === reservation.ownerId);
    if (isOrphan) {
      setOrphanReassignId(reservation.id);
      setOrphanNewTableId("");
      return;
    }
    if (reservation.areaId !== activeAreaId) {
      onSetActiveArea(reservation.areaId);
    }
    onTriggerTableSelect(reservation.ownerId, reservation.ownerType);
    setDetailReservation(null);
    setExpandedId(null);
    setSelectorOpen(false);
  }

  return (
    <aside className={className ?? "w-80 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden"}>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-0.5">
          <h2 className="text-sm font-semibold text-gray-900">Rezervasyonlar</h2>
          <span className="inline-flex items-center justify-center bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full h-5 min-w-[20px] px-1.5">
            {activeCount}
          </span>
        </div>
        <p className="text-xs text-gray-400">{formatDateHeader(activeDateISO)}</p>
      </div>

      {/* ── Table Editor Panel (edit mode) ──────────────── */}
      {tableEditor && (
        <div className="mx-4 mt-3 bg-gray-50 rounded-xl border border-gray-200 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {tableEditor.group ? "Birleşik Masa" : "Masa Düzenle"}
            </span>
            <button
              onClick={tableEditor.onClose}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-600"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
              </svg>
            </button>
          </div>

          {tableEditor.table && tableEditorDraft ? (() => {
            const isDuplicateLabel = tables.some(
              (t) => t.id !== tableEditor.table!.id && t.label === tableEditorDraft.label.trim()
            );
            return (
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Masa Adı</label>
                <input
                  className={`w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 ${isDuplicateLabel ? "border-red-400 focus:ring-red-400" : "border-gray-300 focus:ring-indigo-500"}`}
                  value={tableEditorDraft.label}
                  onChange={(e) => setTableEditorDraft((d) => d && { ...d, label: e.target.value })}
                  maxLength={24}
                />
                {isDuplicateLabel && (
                  <p className="text-xs text-red-500 mt-1">Bu isimde bir masa zaten var</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kapasite</label>
                  <input
                    type="number" min={1} max={30}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={tableEditorDraft.capacity}
                    onChange={(e) => {
                      const n = Math.max(1, Math.min(30, Math.round(Number(e.target.value) || tableEditorDraft.capacity)));
                      setTableEditorDraft((d) => d && { ...d, capacity: n });
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Şekil</label>
                  <select
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={tableEditorDraft.shape}
                    onChange={(e) => {
                      const s = e.target.value as TableShape;
                      if (s === "round") {
                        const size = Math.max(56, Math.min(tableEditorDraft.width, tableEditorDraft.height));
                        setTableEditorDraft((d) => d && { ...d, shape: s, width: size, height: size });
                      } else {
                        setTableEditorDraft((d) => d && { ...d, shape: s });
                      }
                    }}
                  >
                    <option value="square">Kare</option>
                    <option value="rectangle">Dikdörtgen</option>
                    <option value="round">Yuvarlak</option>
                    <option value="booth">Loca</option>
                    <option value="bar">Bar</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Boyutlar (px)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number" min={40} max={300} step={4}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={tableEditorDraft.width}
                    onChange={(e) => {
                      const v = Math.max(40, Math.min(300, Math.round(Number(e.target.value) || tableEditorDraft.width)));
                      setTableEditorDraft((d) => {
                        if (!d) return d;
                        return d.shape === "round" ? { ...d, width: v, height: v } : { ...d, width: v };
                      });
                    }}
                    placeholder="Genişlik"
                  />
                  <input
                    type="number" min={40} max={300} step={4}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={tableEditorDraft.height}
                    onChange={(e) => {
                      const v = Math.max(40, Math.min(300, Math.round(Number(e.target.value) || tableEditorDraft.height)));
                      setTableEditorDraft((d) => {
                        if (!d) return d;
                        return d.shape === "round" ? { ...d, width: v, height: v } : { ...d, height: v };
                      });
                    }}
                    placeholder="Yükseklik"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rotasyon</label>
              <div className="flex gap-1">
                {([0, 90, 180, 270] as const).map((deg) => (
                  <button
                    key={deg} type="button"
                    onClick={() => setTableEditorDraft((d) => d && { ...d, rotation: deg })}
                    className={`flex-1 py-1 text-xs font-semibold rounded-lg border transition-colors ${tableEditorDraft.rotation === deg ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="table-blocked"
                  checked={tableEditorDraft.blocked}
                  onChange={(e) => setTableEditorDraft((d) => d && { ...d, blocked: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="table-blocked" className="text-xs font-medium text-gray-600">Masayı bloke et</label>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!tableEditorDraft) return;
                  tableEditor.onUpdateTable({
                    label: tableEditorDraft.label, capacity: tableEditorDraft.capacity,
                    shape: tableEditorDraft.shape, rotation: tableEditorDraft.rotation,
                    width: tableEditorDraft.width, height: tableEditorDraft.height,
                    blocked: tableEditorDraft.blocked,
                  });
                  tableEditor.onClose();
                }}
                disabled={isDuplicateLabel}
                className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
              >
                Kaydet
              </button>
              {tableEditor.targetMode !== "default" && (
                <button
                  type="button"
                  onClick={tableEditor.onMerge}
                  className="w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
                >
                  Masaları Birleştir
                </button>
              )}
              <button
                type="button"
                onClick={tableEditor.onDeleteTable}
                className="w-full py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold transition-colors"
              >
                Masayı Sil
              </button>
            </div>
            );
          })() : tableEditor.group ? (
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Grup Adı</label>
                <input
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={groupNameDraft ?? tableEditor.group.name}
                  onChange={(e) => setGroupNameDraft(e.target.value)}
                  maxLength={32}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Masalar</p>
                <ul className="space-y-0.5">
                  {tableEditor.group.tableIds.map((tid) => {
                    const t = tables.find((tbl) => tbl.id === tid);
                    return t ? (
                      <li key={tid} className="text-xs text-gray-600 px-2 py-1 rounded-md bg-gray-100">
                        {t.label} · {t.capacity} kişi
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
              {tableEditor.onRenameGroup && (
                <button
                  type="button"
                  onClick={() => {
                    if (groupNameDraft !== null) tableEditor.onRenameGroup!(groupNameDraft);
                    tableEditor.onClose();
                  }}
                  className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
                >
                  Kaydet
                </button>
              )}
              <button
                type="button"
                onClick={tableEditor.onSplit}
                className="w-full py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-semibold transition-colors"
              >
                Masaları Ayır
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* ── Reservation Detail Panel ────────────────────── */}
      {detailReservation && !tableEditor && (
        <div className="mx-4 mt-3 bg-gray-50 rounded-xl border border-gray-200 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rezervasyon</span>
            <button
              onClick={() => setDetailReservation(null)}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-600"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
              </svg>
            </button>
          </div>
          <div className="space-y-1.5 mb-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-gray-900 truncate">{detailReservation.guestName}</span>
              <span className="text-sm font-bold tabular-nums text-gray-500 flex-shrink-0">{detailReservation.time.slice(0, 5)}</span>
            </div>
            <div className="text-xs text-gray-500">{detailReservation.phone}</div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>{detailReservation.guestCount} kişi</span>
              <span className="text-gray-300">·</span>
              <span className="truncate">{getOwnerLabel(detailReservation)}</span>
            </div>
            {(() => {
              const sc = statusConfig[detailReservation.status];
              return (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sc.bg} ${sc.text}`}>
                  {sc.label}
                </span>
              );
            })()}
            {detailReservation.notes && (
              <p className="text-xs text-gray-400 italic leading-relaxed">"{detailReservation.notes}"</p>
            )}
          </div>
          {/* Orphan reassign form */}
          {orphanReassignId === detailReservation.id && (
            <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600 font-medium mb-2">Atanmış masa silinmiş. Yeni masa seç:</p>
              <select
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                value={orphanNewTableId}
                onChange={(e) => setOrphanNewTableId(e.target.value)}
              >
                <option value="">— Masa seç —</option>
                {tables.filter((t) => !t.blocked).map((t) => (
                  <option key={t.id} value={t.id}>{t.label} ({t.capacity} kişi)</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!orphanNewTableId}
                  onClick={() => {
                    if (!orphanNewTableId) return;
                    onReassignOrphan(detailReservation.id, orphanNewTableId);
                    setOrphanReassignId(null);
                    setOrphanNewTableId("");
                    setDetailReservation(null);
                  }}
                  className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                >
                  Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => { setOrphanReassignId(null); setOrphanNewTableId(""); }}
                  className="flex-1 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleEditReservation(detailReservation)}
              className="flex-1 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
            >
              Düzenle
            </button>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(`${detailReservation.guestName} rezervasyonu silinsin mi?`)) return;
                onDeleteReservation(detailReservation.id);
                setDetailReservation(null);
              }}
              className="flex-1 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors"
            >
              Sil
            </button>
          </div>
        </div>
      )}

      {/* ── Yeni Rezervasyon Butonu ──────────────────────── */}
      {!selectorOpen && !tableEditor && !detailReservation && (
        <div className="px-4 pt-3 flex-shrink-0">
          <button
            onClick={() => setSelectorOpen(true)}
            disabled={areas.length === 0}
            className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Rezervasyon
          </button>
        </div>
      )}

      {/* ── Mini Salon + Masa Seçici ─────────────────────── */}
      {selectorOpen && !tableEditor && (
        <div className="mx-4 mt-3 bg-gray-50 rounded-xl border border-gray-200 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Yeni Rezervasyon</span>
            <button
              onClick={() => setSelectorOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-600"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
              </svg>
            </button>
          </div>
          <div className="space-y-2.5">
            {areas.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Salon</label>
                <select
                  value={selectorAreaId}
                  onChange={(e) => {
                    setSelectorAreaId(e.target.value);
                    onSetActiveArea(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Masa</label>
              {reservationTargets.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-1">Bu salonda uygun masa yok</p>
              ) : (
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const target = reservationTargets.find((t) => t.id === val);
                    if (target) {
                      onTriggerTableSelect(val, target.isGroup ? "group" : "table");
                      setSelectorOpen(false);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Masa seçin...</option>
                  {reservationTargets.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectorOpen(false)}
              className="w-full py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* ── Search ──────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="İsim veya telefon ara..."
            className="w-full pl-8 pr-8 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Reservation List ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <div className="text-3xl mb-2 opacity-20">📅</div>
            <p className="text-sm font-medium text-gray-400">
              {searchQuery ? "Sonuç bulunamadı" : "Henüz rezervasyon yok"}
            </p>
            {!searchQuery && (
              <p className="text-xs text-gray-300 mt-1">Yukarıdan yeni rezervasyon ekle</p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((reservation) => {
              const isExpanded   = expandedId === reservation.id;
              const isHighlighted = highlightedReservationId === reservation.id;
              const sc = statusConfig[reservation.status];
              const warning = warningByReservation[reservation.id];
              const ownerLabel = getOwnerLabel(reservation);
              const isOtherArea = Boolean(activeAreaId && reservation.areaId !== activeAreaId);
              const isOrphan = reservation.ownerType === "table" && !tables.some((t) => t.id === reservation.ownerId);

              return (
                <div
                  key={reservation.id}
                  className={`rounded-xl border transition-colors ${
                    isHighlighted
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-gray-100 bg-white hover:bg-gray-50"
                  }`}
                >
                  {/* Main row */}
                  <button
                    className="w-full text-left px-3 py-2.5 flex items-start gap-2"
                    onClick={() => {
                      const isDetail = detailReservation?.id === reservation.id;
                      setDetailReservation(isDetail ? null : reservation);
                      setExpandedId(isDetail ? null : reservation.id);
                      setSelectorOpen(false);
                      onSelectReservation(reservation);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        <span className="text-sm font-normal text-gray-500 tabular-nums flex-shrink-0">
                          {reservation.time.slice(0, 5)}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 truncate">{reservation.guestName}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs text-gray-400">{reservation.guestCount} kişi</span>
                        <span className="text-gray-200 text-xs">·</span>
                        <span className="text-xs text-gray-400 truncate max-w-[110px]">
                          {ownerLabel}
                          {isOtherArea && <span className="text-indigo-400 ml-0.5">↗</span>}
                        </span>
                        {warning && (
                          <>
                            <span className="text-gray-200 text-xs">·</span>
                            <span className="text-xs text-amber-500 font-medium">⚠ {warning}</span>
                          </>
                        )}
                        {isOrphan && (
                          <>
                            <span className="text-gray-200 text-xs">·</span>
                            <span className="text-xs text-red-500 font-medium">⚠ Atanmış masa silinmiş</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sc.bg} ${sc.text}`}>
                        {sc.label}
                      </span>
                      <svg
                        className={`w-3 h-3 text-gray-300 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-3 pb-2.5 border-t border-gray-100">
                      {reservation.notes && (
                        <p className="text-xs text-gray-500 italic pt-2 pb-1.5 leading-relaxed">
                          "{reservation.notes}"
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 pt-2 flex-wrap">
                        <select
                          value={reservation.status}
                          onChange={(e) => {
                            const newStatus = e.target.value as Reservation["status"];
                            if (!confirmStatusChange(reservation, newStatus)) return;
                            onSetStatus(reservation.id, newStatus);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        >
                          <option value="reserved">Rezerve</option>
                          <option value="arrived">Geldi</option>
                          <option value="cancelled">İptal</option>
                          <option value="no_show">Gelmedi</option>
                        </select>
                        <button
                          onClick={() => handleEditReservation(reservation)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => {
                            if (!window.confirm(`${reservation.guestName} rezervasyonu silinsin mi?`)) return;
                            onDeleteReservation(reservation.id);
                            setExpandedId(null);
                          }}
                          className="text-xs px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-colors"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
        <button
          onClick={onSignOut}
          className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1 text-center"
        >
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
