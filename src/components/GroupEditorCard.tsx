import { type MergedTableGroup, type TargetMode } from "../types";

interface GroupEditorCardProps {
  group: MergedTableGroup;
  targetMode: TargetMode;
  position: { left: number; top: number };
  onRenameGroup: (name: string) => void;
}

export function GroupEditorCard({ group, targetMode, position, onRenameGroup }: GroupEditorCardProps) {
  return (
    <section
      className="table-card object-editor-card"
      style={{ left: position.left, top: position.top }}
      onClick={(event) => event.stopPropagation()}
    >
      <header className="table-card__head">
        <div>
          <h4>Grup Düzenle</h4>
          <span>{targetMode === "default" ? "Varsayılan Plan" : "Günlük Plan"}</span>
        </div>
      </header>

      <form className="table-card__form">
        <label>
          Grup Adı
          <input
            className="input input--compact"
            value={group.name}
            onChange={(event) => onRenameGroup(event.target.value)}
            maxLength={32}
          />
        </label>
        <small className="group-editor-info">
          {group.tableIds.length} masa · kapasite {group.capacity ?? "—"}
        </small>
      </form>
    </section>
  );
}
