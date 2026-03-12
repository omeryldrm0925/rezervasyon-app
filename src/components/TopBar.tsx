import { AreaMenu } from "./AreaMenu";
import { DateStrip } from "./DateStrip";
import { type Area, type TargetMode } from "../types";

interface TopBarProps {
  selectedDateISO: string;
  onDateChange: (dateISO: string) => void;
  onToday: () => void;
  hasOverride: (dateISO: string) => boolean;
  dateHasOverride: boolean;
  onResetDay: () => void;
  areas: Area[];
  activeAreaId: string | null;
  onSelectArea: (areaId: string) => void;
  onAddArea: (name: string) => void;
  onRenameArea: (areaId: string, name: string) => void;
  targetMode: TargetMode;
  onTargetModeChange: (targetMode: TargetMode) => void;
  layoutUnlocked: boolean;
  onLayoutUnlockedChange: (value: boolean) => void;
}

export function TopBar({
  selectedDateISO,
  onDateChange,
  onToday,
  hasOverride,
  dateHasOverride,
  onResetDay,
  areas,
  activeAreaId,
  onSelectArea,
  onAddArea,
  onRenameArea,
  targetMode,
  onTargetModeChange,
  layoutUnlocked,
  onLayoutUnlockedChange
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar__primary">
        {targetMode !== "default" ? (
          <div className="top-bar__date-wrap">
            <button className="btn btn--soft" onClick={onToday}>
              Bugün
            </button>
            <DateStrip selectedDateISO={selectedDateISO} onDateChange={onDateChange} hasOverride={hasOverride} />
            <input
              className="input input--date"
              type="date"
              value={selectedDateISO}
              onChange={(event) => onDateChange(event.target.value)}
            />
          </div>
        ) : null}

        <div className="top-bar__controls">
          {targetMode === "day" && dateHasOverride ? (
            <div className="override-chip">
              <span>Bu güne özel düzen var</span>
              <button className="btn btn--tiny btn--soft" onClick={onResetDay}>
                Sıfırla
              </button>
            </div>
          ) : null}

          <div className="target-toggle">
            <button
              className={`btn btn--tiny btn--soft ${targetMode === "day" ? "is-active" : ""}`}
              onClick={() => onTargetModeChange("day")}
            >
              Günlük Plan
            </button>
            <button
              className={`btn btn--tiny btn--soft ${targetMode === "default" ? "is-active" : ""}`}
              onClick={() => onTargetModeChange("default")}
            >
              Varsayılan Plan
            </button>
          </div>

          <label className="lock-toggle">
            <input
              type="checkbox"
              checked={layoutUnlocked}
              onChange={(event) => onLayoutUnlockedChange(event.target.checked)}
            />
            <span>Yerleşim Araçları</span>
          </label>

          <AreaMenu
            areas={areas}
            selectedAreaId={activeAreaId}
            onSelectArea={onSelectArea}
            onAddArea={onAddArea}
            onRenameArea={onRenameArea}
          />
        </div>
      </div>

      {targetMode === "default" ? (
        <div className="target-warning" role="status">
          Varsayılan plan düzenliyorsunuz — Bu alan için tüm günlerin temel düzeni.
        </div>
      ) : null}
    </header>
  );
}
