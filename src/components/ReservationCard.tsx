import { useEffect, useState } from "react";
import { type Reservation } from "../types";

interface ReservationDraft {
  guestName: string;
  phone: string;
  guestCount: number;
  time: string;
  notes: string;
  status: Reservation["status"];
}

interface ReservationCardProps {
  objectLabel: string;
  defaultCapacity: number;
  reservation: Reservation | null;
  warningText?: string;
  position: { left: number; top: number };
  onClose: () => void;
  onSaveReservation: (values: ReservationDraft, reservationId?: string) => void;
  onDeleteReservation: (reservationId: string) => void;
}

const blankDraft: ReservationDraft = {
  guestName: "",
  phone: "",
  guestCount: 2,
  time: "19:00",
  notes: "",
  status: "reserved"
};

const statusLabel: Record<Reservation["status"], string> = {
  reserved: "Rezerve",
  arrived: "Geldi",
  cancelled: "İptal",
  no_show: "Gelmedi"
};

export function ReservationCard({
  objectLabel,
  defaultCapacity,
  reservation,
  warningText,
  position,
  onClose,
  onSaveReservation,
  onDeleteReservation
}: ReservationCardProps) {
  const [draft, setDraft] = useState<ReservationDraft>(blankDraft);

  useEffect(() => {
    if (reservation) {
      setDraft({
        guestName: reservation.guestName,
        phone: reservation.phone,
        guestCount: reservation.guestCount,
        time: reservation.time,
        notes: reservation.notes,
        status: reservation.status
      });
      return;
    }
    setDraft({ ...blankDraft, guestCount: Math.max(1, defaultCapacity) });
  }, [reservation, objectLabel, defaultCapacity]);

  return (
    <section
      className="table-card reservation-card"
      style={{ left: position.left, top: position.top }}
      onClick={(event) => event.stopPropagation()}
    >
      <header className="table-card__head reservation-card__head">
        <div>
          <h4>Rezervasyon</h4>
          <span>{objectLabel}</span>
        </div>
        <div className={`status-pill status-pill--${draft.status}`}>{statusLabel[draft.status]}</div>
        <button className="btn btn--tiny btn--soft" onClick={onClose}>
          Kapat
        </button>
      </header>

      {warningText ? <div className="table-card__warning">{warningText}</div> : null}

      <form
        className="table-card__form"
        onSubmit={(event) => {
          event.preventDefault();
          onSaveReservation(draft, reservation?.id);
        }}
      >
        <label>
          Misafir Adı
          <input
            className="input input--compact"
            value={draft.guestName}
            onChange={(event) => setDraft((prev) => ({ ...prev, guestName: event.target.value }))}
            required
          />
        </label>
        <label>
          Telefon
          <input
            className="input input--compact"
            value={draft.phone}
            onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))}
            required
          />
        </label>
        <div className="table-card__form-row">
          <label>
            Kişi Sayısı
            <input
              className="input input--compact"
              type="number"
              min={1}
              max={30}
              value={draft.guestCount}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, guestCount: Math.max(1, Number(event.target.value)) }))
              }
            />
          </label>
          <label>
            Saat
            <input
              className="input input--compact"
              type="time"
              value={draft.time}
              onChange={(event) => setDraft((prev) => ({ ...prev, time: event.target.value }))}
            />
          </label>
        </div>

        <label>
          Durum
          <select
            className="input input--compact"
            value={draft.status}
            onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value as Reservation["status"] }))}
          >
            <option value="reserved">Rezerve</option>
            <option value="arrived">Geldi</option>
            <option value="cancelled">İptal</option>
            <option value="no_show">Gelmedi</option>
          </select>
        </label>

        <label>
          Notlar
          <textarea
            className="input input--compact input--textarea"
            value={draft.notes}
            onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
            rows={2}
          />
        </label>

        <div className="table-card__submit">
          <button className="btn btn--tiny btn--accent" type="submit">
            {reservation ? "Güncelle" : "Kaydet"}
          </button>
          {reservation ? (
            <button
              className="btn btn--tiny btn--soft"
              type="button"
              onClick={() => onDeleteReservation(reservation.id)}
            >
              Sil
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

export type { ReservationDraft };
