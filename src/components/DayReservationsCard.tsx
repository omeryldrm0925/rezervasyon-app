import { useEffect, useRef, useState } from "react";
import { type Reservation } from "../types";

interface DayReservationsCardProps {
  reservations: Reservation[];
  activeAreaId: string | null;
  areaNameById: Record<string, string>;
  highlightedReservationId: string | null;
  searchQuery: string;
  warningByReservation: Record<string, string>;
  onSearchChange: (query: string) => void;
  onSelectReservation: (reservation: Reservation) => void;
  onCheckInReservation: (reservationId: string) => void;
}

const statusLabel: Record<Reservation["status"], string> = {
  reserved: "Rezerve",
  arrived: "Geldi",
  cancelled: "İptal",
  no_show: "Gelmedi"
};

export function DayReservationsCard({
  reservations,
  activeAreaId,
  areaNameById,
  highlightedReservationId,
  searchQuery,
  warningByReservation,
  onSearchChange,
  onSelectReservation,
  onCheckInReservation
}: DayReservationsCardProps) {
  const [collapsed, setCollapsed] = useState(false);
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
    const ox = rect.left - parentRect.left;
    const oy = rect.top - parentRect.top;
    setPos({ x: ox, y: oy });
    dragRef.current = { ox, oy, mx: e.clientX, my: e.clientY };
    e.preventDefault();
  };

  const query = searchQuery.trim().toLocaleLowerCase("tr-TR");
  const filtered = query
    ? reservations.filter((reservation) => {
        const haystack = [
          reservation.guestName,
          reservation.phone,
          reservation.time,
          areaNameById[reservation.areaId] ?? reservation.areaId
        ]
          .join(" ")
          .toLocaleLowerCase("tr-TR");
        return haystack.includes(query);
      })
    : reservations;

  const posStyle = pos ? { left: pos.x, top: pos.y, right: "auto" } : {};

  return (
    <div
      ref={nodeRef}
      className={`day-card ${collapsed ? "day-card--collapsed" : ""}`}
      style={posStyle}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className="day-card__head day-card__drag-handle"
        onMouseDown={handleDragStart}
        onClick={(e) => {
          // Only toggle collapse on direct click (not after drag)
          if (dragRef.current) return;
          e.stopPropagation();
        }}
      >
        <button
          className="day-card__collapse-btn"
          onClick={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }}
          title={collapsed ? "Genişlet" : "Daralt"}
        >
          <span className={`day-card__arrow ${collapsed ? "day-card__arrow--up" : "day-card__arrow--down"}`} />
        </button>
        <strong>Rezervasyonlar</strong>
        <span>{filtered.length}</span>
      </div>

      {!collapsed ? (
        <>
          <input
            className="input input--compact day-card__search"
            value={searchQuery}
            placeholder="İsim veya telefon ile ara"
            onChange={(event) => onSearchChange(event.target.value)}
          />

          <div className="day-card__list">
            {filtered.length === 0 ? <p>Bu filtreye uyan rezervasyon yok.</p> : null}
            {filtered.map((reservation) => {
              const isOtherArea = Boolean(activeAreaId && reservation.areaId !== activeAreaId);
              return (
                <div
                  key={reservation.id}
                  className={`day-row day-row--${reservation.status} ${highlightedReservationId === reservation.id ? "is-active" : ""}`}
                >
                  <button className="day-row__body" onClick={() => onSelectReservation(reservation)}>
                    <div>
                      <strong>{reservation.time}</strong>
                      <span>{reservation.guestName}</span>
                      <em>{reservation.guestCount} kişi</em>
                    </div>
                    <div className="day-row__meta">
                      <small>{statusLabel[reservation.status]}</small>
                      {isOtherArea ? <small className="day-row__area">{areaNameById[reservation.areaId]}</small> : null}
                      {warningByReservation[reservation.id] ? (
                        <small className="is-warning" title="Kapasite uyarısı">
                          ! {warningByReservation[reservation.id]}
                        </small>
                      ) : null}
                    </div>
                  </button>

                  {reservation.status !== "arrived" ? (
                    <button
                      className="btn btn--tiny btn--soft day-row__checkin"
                      onClick={() => onCheckInReservation(reservation.id)}
                    >
                      Geldi
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
