import { useMemo, useRef } from "react";
import { addDays, formatDateCompact, formatDayLabel } from "../utils/date";

interface DateStripProps {
  selectedDateISO: string;
  onDateChange: (dateISO: string) => void;
  hasOverride: (dateISO: string) => boolean;
}

export function DateStrip({ selectedDateISO, onDateChange, hasOverride }: DateStripProps) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const dates = useMemo(
    () => Array.from({ length: 12 }, (_, index) => addDays(selectedDateISO, index - 3)),
    [selectedDateISO]
  );

  return (
    <div
      className="date-strip"
      ref={stripRef}
      onWheel={(event) => {
        event.preventDefault();
        if (!stripRef.current) return;
        stripRef.current.scrollLeft += event.deltaY + event.deltaX;
      }}
    >
      {dates.map((dateISO) => {
        const isActive = dateISO === selectedDateISO;
        return (
          <button
            key={dateISO}
            className={`date-tile ${isActive ? "is-active" : ""}`}
            onClick={() => onDateChange(dateISO)}
          >
            <span>{formatDayLabel(dateISO)}</span>
            <strong>{formatDateCompact(dateISO)}</strong>
            {hasOverride(dateISO) ? <i className="date-tile__dot" /> : null}
          </button>
        );
      })}
    </div>
  );
}
