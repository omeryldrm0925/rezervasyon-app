interface TableActionMenuProps {
  position: { left: number; top: number };
  mergeLabel: string;
  mergeDisabled?: boolean;
  splitDisabled?: boolean;
  reserveDisabled?: boolean;
  helperText?: string;
  onMerge: () => void;
  onSplit: () => void;
  onReserve: () => void;
  onEdit: () => void;
}

export function TableActionMenu({
  position,
  mergeLabel,
  mergeDisabled,
  splitDisabled,
  reserveDisabled,
  helperText,
  onMerge,
  onSplit,
  onReserve,
  onEdit
}: TableActionMenuProps) {
  return (
    <section
      className="table-action-menu"
      style={{ left: position.left, top: position.top }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="table-action-menu__row">
        <button className="btn btn--tiny btn--soft" onClick={onMerge} disabled={mergeDisabled}>
          {mergeLabel}
        </button>
        <button className="btn btn--tiny btn--soft" onClick={onSplit} disabled={splitDisabled}>
          Ayır
        </button>
        <button
          className="btn btn--tiny btn--accent table-action-menu__reserve"
          onClick={onReserve}
          disabled={reserveDisabled}
          title="Rezervasyon oluştur"
        >
          Rezervasyon
        </button>
        <button
          className="table-action-menu__edit"
          onClick={onEdit}
          title="Masa düzenle"
        >
          Düzenle
        </button>
      </div>
      {helperText ? <small>{helperText}</small> : null}
    </section>
  );
}
