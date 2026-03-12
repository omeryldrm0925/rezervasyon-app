interface TableActionMenuProps {
  position: { left: number; top: number };
  mergeLabel: string;
  mergeDisabled?: boolean;
  splitDisabled?: boolean;
  helperText?: string;
  onMerge: () => void;
  onSplit: () => void;
  onEdit: () => void;
}

export function TableActionMenu({
  position,
  mergeLabel,
  mergeDisabled,
  splitDisabled,
  helperText,
  onMerge,
  onSplit,
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
          className="table-action-menu__edit btn btn--tiny btn--soft"
          onClick={onEdit}
          title="Masa düzenle"
        >
          ✎
        </button>
      </div>
      {helperText ? <small>{helperText}</small> : null}
    </section>
  );
}
