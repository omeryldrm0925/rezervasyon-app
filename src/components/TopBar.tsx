import { useEffect, useRef, useState } from "react";
import { type TargetMode } from "../types";

interface TopBarProps {
  onToday: () => void;
  targetMode: TargetMode;
  onTargetModeChange: (targetMode: TargetMode) => void;
  layoutUnlocked: boolean;
  onLayoutUnlockedChange: (value: boolean) => void;
  restaurantName: string;
  userEmail: string;
  onSignOut: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function TopBar({
  onToday,
  targetMode,
  onTargetModeChange,
  layoutUnlocked,
  onLayoutUnlockedChange,
  restaurantName,
  userEmail,
  onSignOut,
  searchQuery,
  onSearchChange,
}: TopBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarPos, setAvatarPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const avatarRef = useRef<HTMLDivElement | null>(null);
  const avatarBtnRef = useRef<HTMLButtonElement | null>(null);

  // Düzenle dropdown dışına tıklayınca kapat
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

  // Avatar dropdown dışına tıklayınca kapat
  useEffect(() => {
    if (!avatarOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!avatarRef.current?.contains(e.target as Node)) setAvatarOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAvatarOpen(false); };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [avatarOpen]);

  function handleToggleAvatar() {
    if (!avatarOpen && avatarBtnRef.current) {
      const rect = avatarBtnRef.current.getBoundingClientRect();
      setAvatarPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setAvatarOpen((prev) => !prev);
  }

  const initials = userEmail
    ? userEmail.split("@")[0].slice(0, 2).toUpperCase()
    : "?";

  function handleBugunIcin() {
    onTargetModeChange("day");
    onLayoutUnlockedChange(true);
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

        {/* Sol: Logo + restoran adı + avatar */}
        <div className="top-bar__brand">
          <img src="/tablora-logo.png" alt="Tablora" className="top-bar__logo-img" />
          {restaurantName && (
            <>
              <span className="top-bar__divider">|</span>
              <span className="top-bar__restname">{restaurantName}</span>
            </>
          )}

          {/* Avatar */}
          <div className="top-bar__avatar-wrap" ref={avatarRef}>
            <button
              ref={avatarBtnRef}
              className="top-bar__avatar"
              onClick={handleToggleAvatar}
              title={userEmail}
            >
              {initials}
            </button>
            {avatarOpen && (
              <div
                className="top-bar__avatar-dropdown"
                style={{ position: "fixed", top: avatarPos.top, right: avatarPos.right, left: "auto" }}
              >
                <div style={{ padding: "8px 12px 6px", borderBottom: "1px solid #2e2e2e", marginBottom: 4 }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 1 }}>Giriş yapılan hesap</div>
                  <div style={{ fontSize: 12, color: "#ddd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{userEmail}</div>
                </div>
                <button className="top-bar__avatar-item" onClick={() => setAvatarOpen(false)}>
                  Profil Ayarları
                </button>
                <button className="top-bar__avatar-item" onClick={() => setAvatarOpen(false)}>
                  Şifre Değiştir
                </button>
                <div className="top-bar__avatar-divider" />
                <button
                  className="top-bar__avatar-item top-bar__avatar-item--danger"
                  onClick={() => { setAvatarOpen(false); onSignOut(); }}
                >
                  Çıkış Yap
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Orta: Arama barı */}
        <div className="top-bar__search-wrap">
          <input
            className="top-bar__search"
            type="search"
            placeholder="İsim veya telefon ara..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="top-bar__controls">
          {layoutUnlocked ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="edit-toggle">
                  <div
                    className="edit-toggle__slider"
                    style={{
                      left: targetMode === "day" ? "4px" : "50%",
                      width: "calc(50% - 4px)",
                    }}
                  />
                  <button
                    className={`edit-toggle__option ${targetMode === "day" ? "active" : ""}`}
                    onClick={handleBugunIcin}
                  >
                    Bugün İçin
                  </button>
                  <button
                    className={`edit-toggle__option ${targetMode === "default" ? "active" : ""}`}
                    onClick={() => {
                      onTargetModeChange("default");
                      onLayoutUnlockedChange(true);
                    }}
                  >
                    Genel Düzen
                  </button>
                </div>
                <button
                  onClick={handleBitir}
                  title="Düzenlemeyi Bitir"
                  style={{ background: "none", border: "none", color: "#d6ff3f", fontSize: 18, cursor: "pointer", padding: "4px 8px", lineHeight: 1 }}
                >
                  ✓
                </button>
              </div>
              {targetMode === "default" && (
                <span style={{ fontSize: 11, color: "rgba(214,255,63,.65)", letterSpacing: ".02em" }}>
                  Bu değişiklikler tüm günleri etkiler
                </span>
              )}
            </div>
          ) : (
            <button className="edit-toggle__idle" onClick={() => { onTargetModeChange("day"); onLayoutUnlockedChange(true); }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11.5 2.5a2.121 2.121 0 013 3L5 15H2v-3L11.5 2.5z" />
              </svg>
              Düzenle
            </button>
          )}
        </div>
      </div>

    </header>
  );
}
