import { DateStrip } from "./DateStrip";
import { type TargetMode } from "../types";

interface TopBarProps {
  selectedDateISO: string;
  onDateChange: (dateISO: string) => void;
  onToday: () => void;
  hasOverride: (dateISO: string) => boolean;
  dateHasOverride: boolean;
  onResetDay: () => void;
  targetMode: TargetMode;
  onTargetModeChange: (targetMode: TargetMode) => void;
  layoutUnlocked: boolean;
  onLayoutUnlockedChange: (value: boolean) => void;
  /** Aktif alan için kaç günde özel düzenleme (override) olduğu */
  overrideCountForArea: number;
}

export function TopBar({
  selectedDateISO,
  onDateChange,
  onToday,
  hasOverride,
  dateHasOverride,
  onResetDay,
  targetMode,
  onTargetModeChange,
  layoutUnlocked,
  onLayoutUnlockedChange,
  overrideCountForArea
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

        </div>
      </div>

      {targetMode === "default" ? (
        <div className="target-warning" role="status">
          Varsayılan plan düzenliyorsunuz — Bu alan için tüm günlerin temel düzeni.
          {overrideCountForArea > 0
            ? ` ${overrideCountForArea} günde özel düzenleme var; o günler bu değişiklikten etkilenmeyecek.`
            : null}
        </div>
      ) : null}
    </header>
  );
}
