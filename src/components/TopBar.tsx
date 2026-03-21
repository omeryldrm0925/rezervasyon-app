import { useEffect, useRef, useState } from "react";
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Dropdown dışına tıklayınca kapat
  useEffect(() => {
    if (!dropdownOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setDropdownOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDropdownOpen(false); };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [dropdownOpen]);

  function handleBugunIcin() {
    setDropdownOpen(false);
    onTargetModeChange("day");
    onLayoutUnlockedChange(true);
  }

  function handleGenelDuzen() {
    setDropdownOpen(false);
    const ok = window.confirm(
      "Genel düzeni değiştirmek tüm günleri etkiler.\nDevam etmek istiyor musunuz?"
    );
    if (ok) {
      onTargetModeChange("default");
      onLayoutUnlockedChange(true);
    }
  }

  function handleBitir() {
    onLayoutUnlockedChange(false);
    if (targetMode === "default") {
      onTargetModeChange("day");
      onToday();
    }
  }

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

          {/* Düzenle / Düzenlemeyi Bitir butonu */}
          {layoutUnlocked ? (
            <button
              className="btn btn--tiny btn--soft is-active"
              onClick={handleBitir}
              title="Düzenleme modundan çık"
            >
              {/* Check icon */}
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                <polyline points="2,8 6,13 14,3" />
              </svg>
              Düzenlemeyi Bitir
            </button>
          ) : (
            <div className="edit-btn-wrap" ref={dropdownRef}>
              <button
                className={`btn btn--tiny btn--soft${dropdownOpen ? " is-active" : ""}`}
                onClick={() => setDropdownOpen((prev) => !prev)}
                title="Düzenleme modunu seç"
              >
                {/* Pencil icon */}
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                  <path d="M11.5 2.5a2.121 2.121 0 013 3L5 15H2v-3L11.5 2.5z" />
                </svg>
                Düzenle
                {/* Chevron */}
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginLeft: 3 }}>
                  <polyline points="4,6 8,10 12,6" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="edit-dropdown">
                  <button className="edit-dropdown__item" onClick={handleBugunIcin}>
                    {/* Calendar icon */}
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="14" height="13" rx="2" />
                      <line x1="3" y1="8" x2="17" y2="8" />
                      <line x1="7" y1="2" x2="7" y2="6" />
                      <line x1="13" y1="2" x2="13" y2="6" />
                    </svg>
                    <span>
                      <strong>Bugün için</strong>
                      <br />
                      <span className="edit-dropdown__sub">Sadece bu günü düzenle</span>
                    </span>
                  </button>
                  <div className="edit-dropdown__divider" />
                  <button className="edit-dropdown__item" onClick={handleGenelDuzen}>
                    {/* Layout icon */}
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="7" height="16" rx="1.5" />
                      <rect x="11" y="2" width="7" height="7" rx="1.5" />
                      <rect x="11" y="11" width="7" height="7" rx="1.5" />
                    </svg>
                    <span>
                      <strong>Genel Düzen</strong>
                      <br />
                      <span className="edit-dropdown__sub">Tüm günleri etkiler</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
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
