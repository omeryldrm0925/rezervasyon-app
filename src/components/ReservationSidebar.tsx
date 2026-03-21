import { useMemo, useState } from "react";
import {
  type EffectiveTable,
  type MergedTableGroup,
  type Reservation,
  type ReservationOwnerType,
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
  onSaveReservation: (data: ReservationFormData, reservationId?: string) => void;
  onDeleteReservation: (reservationId: string) => void;
  onSetStatus: (reservationId: string, status: Reservation["status"]) => void;
  onSignOut: () => void;
  /** Dışarıdan override edilecek className (varsayılan: w-80 flex-shrink-0 ...) */
  className?: string;
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
  onSaveReservation,
  onDeleteReservation,
  onSetStatus,
  onSignOut,
  className,
}: ReservationSidebarProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formState, setFormState] = useState<{
    mode: "new" | "edit";
    reservationId?: string;
    dateISO?: string;
    draft: ReservationFormData;
  } | null>(null);

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

  function blankDraft(): ReservationFormData {
    const first = reservationTargets[0];
    return {
      guestName: "",
      phone: "",
      guestCount: 2,
      time: "19:00",
      ownerId: first?.id ?? "",
      ownerType: first?.isGroup ? "group" : "table",
      notes: "",
      status: "reserved",
    };
  }

  function openNewForm() {
    setFormState({ mode: "new", draft: blankDraft() });
    setExpandedId(null);
  }

  function openEditForm(reservation: Reservation) {
    setFormState({
      mode: "edit",
      reservationId: reservation.id,
      dateISO: reservation.dateISO,
      draft: {
        guestName: reservation.guestName,
        phone: reservation.phone,
        guestCount: reservation.guestCount,
        time: reservation.time,
        ownerId: reservation.ownerId,
        ownerType: reservation.ownerType,
        notes: reservation.notes,
        status: reservation.status,
      },
    });
    setExpandedId(null);
  }

  function updateDraft(patch: Partial<ReservationFormData>) {
    setFormState((prev) =>
      prev ? { ...prev, draft: { ...prev.draft, ...patch } } : prev
    );
  }

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

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formState) return;
    onSaveReservation(formState.draft, formState.reservationId);
    setFormState(null);
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

      {/* ── New Reservation Button ──────────────────────── */}
      {!formState && (
        <div className="px-4 pt-3 flex-shrink-0">
          <button
            onClick={openNewForm}
            disabled={reservationTargets.length === 0}
            className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Rezervasyon
          </button>
        </div>
      )}

      {/* ── Inline Form ─────────────────────────────────── */}
      {formState && (
        <div className="mx-4 mt-3 bg-gray-50 rounded-xl border border-gray-200 p-4 flex-shrink-0">
          <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
            {formState.mode === "new" ? "Yeni Rezervasyon" : "Rezervasyonu Düzenle"}
          </h3>
          <form onSubmit={handleFormSubmit} className="space-y-2.5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Misafir Adı</label>
              <input
                type="text"
                required
                value={formState.draft.guestName}
                onChange={(e) => updateDraft({ guestName: e.target.value })}
                placeholder="Ad Soyad"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
              <input
                type="tel"
                required
                value={formState.draft.phone}
                onChange={(e) => updateDraft({ phone: e.target.value })}
                placeholder="05xx xxx xx xx"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kişi</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={50}
                  value={formState.draft.guestCount}
                  onChange={(e) =>
                    updateDraft({ guestCount: Math.max(1, Number(e.target.value)) })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Saat</label>
                <input
                  type="time"
                  required
                  value={formState.draft.time}
                  onChange={(e) => updateDraft({ time: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Masa</label>
              {reservationTargets.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-1">Önce masa ekleyin</p>
              ) : (
                <select
                  value={formState.draft.ownerId}
                  onChange={(e) => {
                    const target = reservationTargets.find((t) => t.id === e.target.value);
                    if (target) updateDraft({ ownerId: target.id, ownerType: target.isGroup ? "group" : "table" });
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {reservationTargets.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              )}
            </div>

            {formState.mode === "edit" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Durum</label>
                <select
                  value={formState.draft.status}
                  onChange={(e) => {
                    const newStatus = e.target.value as Reservation["status"];
                    const dateISO = formState.dateISO ?? activeDateISO;
                    if (newStatus === "arrived" && isFutureDate(dateISO)) {
                      if (!window.confirm("Bu rezervasyon gelecek bir tarihe ait. Durumu 'Geldi' olarak işaretlemek istediğinize emin misiniz?")) return;
                    }
                    if (newStatus === "cancelled") {
                      if (!window.confirm("Bu rezervasyonu iptal etmek istediğinize emin misiniz?\nİptal edilen rezervasyon listede kalır ama masa boşa düşer.")) return;
                    }
                    updateDraft({ status: newStatus });
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="reserved">Rezerve</option>
                  <option value="arrived">Geldi</option>
                  <option value="cancelled">İptal</option>
                  <option value="no_show">Gelmedi</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notlar</label>
              <textarea
                value={formState.draft.notes}
                onChange={(e) => updateDraft({ notes: e.target.value })}
                placeholder="İsteğe bağlı not..."
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-2 pt-0.5">
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
              >
                {formState.mode === "new" ? "Kaydet" : "Güncelle"}
              </button>
              <button
                type="button"
                onClick={() => setFormState(null)}
                className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
              >
                İptal
              </button>
            </div>
          </form>
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
                      setExpandedId(isExpanded ? null : reservation.id);
                      onSelectReservation(reservation);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        <span className="text-sm font-bold text-gray-900 tabular-nums flex-shrink-0">
                          {reservation.time.slice(0, 5)}
                        </span>
                        <span className="text-sm font-semibold text-gray-800 truncate">{reservation.guestName}</span>
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
                          onClick={() => openEditForm(reservation)}
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
