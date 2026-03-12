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

  return (
    <div className="day-card">
      <div className="day-card__head">
        <strong>Rezervasyonlar</strong>
        <span>{filtered.length}</span>
      </div>

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
    </div>
  );
}
