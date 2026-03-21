import { useState, useEffect } from "react";
import { type EffectiveFixture, type FixtureKind, type FixturePatch, type TableShape } from "../types";

// ─── Shape icons ────────────────────────────────────────────────────────────

function ShapeIcon({ shape }: { shape: TableShape }) {
  switch (shape) {
    case "square":
      return (
        <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true">
          <rect x="7" y="7" width="26" height="26" rx="2.5" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5" />
          <circle cx="20" cy="3"  r="2.5" fill="#a5b4fc" />
          <circle cx="20" cy="37" r="2.5" fill="#a5b4fc" />
          <circle cx="3"  cy="20" r="2.5" fill="#a5b4fc" />
          <circle cx="37" cy="20" r="2.5" fill="#a5b4fc" />
        </svg>
      );
    case "rectangle":
      return (
        <svg viewBox="0 0 52 36" width="46" height="32" aria-hidden="true">
          <rect x="6" y="7" width="40" height="22" rx="2.5" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5" />
          <circle cx="18" cy="3"  r="2.5" fill="#a5b4fc" />
          <circle cx="34" cy="3"  r="2.5" fill="#a5b4fc" />
          <circle cx="18" cy="33" r="2.5" fill="#a5b4fc" />
          <circle cx="34" cy="33" r="2.5" fill="#a5b4fc" />
        </svg>
      );
    case "round":
      return (
        <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true">
          <circle cx="20" cy="20" r="13" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5" />
          <circle cx="20" cy="3"  r="2.5" fill="#a5b4fc" />
          <circle cx="37" cy="20" r="2.5" fill="#a5b4fc" />
          <circle cx="20" cy="37" r="2.5" fill="#a5b4fc" />
          <circle cx="3"  cy="20" r="2.5" fill="#a5b4fc" />
        </svg>
      );
    case "booth":
      return (
        <svg viewBox="0 0 44 36" width="40" height="32" aria-hidden="true">
          <rect x="4" y="4"  width="36" height="18" rx="5" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5" />
          <rect x="4" y="25" width="36" height="6"  rx="2" fill="#a5b4fc" />
          <circle cx="14" cy="33" r="2.5" fill="#a5b4fc" />
          <circle cx="22" cy="33" r="2.5" fill="#a5b4fc" />
          <circle cx="30" cy="33" r="2.5" fill="#a5b4fc" />
        </svg>
      );
    case "bar":
      return (
        <svg viewBox="0 0 52 28" width="46" height="24" aria-hidden="true">
          <rect x="4" y="8" width="44" height="12" rx="3" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5" />
          <circle cx="14" cy="4" r="2.5" fill="#a5b4fc" />
          <circle cx="24" cy="4" r="2.5" fill="#a5b4fc" />
          <circle cx="34" cy="4" r="2.5" fill="#a5b4fc" />
          <circle cx="44" cy="4" r="2.5" fill="#a5b4fc" />
        </svg>
      );
  }
}

function FixtureIcon({ kind }: { kind: FixtureKind }) {
  switch (kind) {
    case "door":
      return (
        <svg viewBox="0 0 36 36" width="32" height="32" aria-hidden="true">
          <line x1="6" y1="6" x2="6" y2="30" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="6" y1="6" x2="26" y2="6" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
          <path d="M26 6 A20 20 0 0 1 6 26" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "window":
      return (
        <svg viewBox="0 0 44 24" width="36" height="20" aria-hidden="true">
          <rect x="3" y="5" width="38" height="14" rx="4" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" />
          <line x1="16" y1="5" x2="16" y2="19" stroke="#3b82f6" strokeWidth="1" />
          <line x1="28" y1="5" x2="28" y2="19" stroke="#3b82f6" strokeWidth="1" />
        </svg>
      );
    case "wall":
      return (
        <svg viewBox="0 0 44 14" width="38" height="12" aria-hidden="true">
          <rect x="2" y="2" width="40" height="10" rx="2" fill="#9ca3af" stroke="#6b7280" strokeWidth="1.2" />
        </svg>
      );
    case "tree":
      return (
        <svg viewBox="0 0 36 36" width="32" height="32" aria-hidden="true">
          <circle cx="18" cy="15" r="11" fill="#34d399" />
          <rect x="16" y="25" width="4" height="7" rx="1" fill="#78350f" />
        </svg>
      );
    case "pool":
      return (
        <svg viewBox="0 0 48 32" width="42" height="28" aria-hidden="true">
          <rect x="3" y="3" width="42" height="26" rx="6" fill="#bae6fd" stroke="#38bdf8" strokeWidth="1.5" />
          <path d="M8 16 Q14 10 20 16 Q26 22 32 16 Q38 10 44 16" fill="none" stroke="#0ea5e9" strokeWidth="1.5" />
        </svg>
      );
    case "restroom":
      return (
        <svg viewBox="0 0 36 36" width="30" height="30" aria-hidden="true">
          <rect x="3" y="3" width="30" height="30" rx="4" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.2" />
          <circle cx="12" cy="11" r="3" fill="#6b7280" />
          <path d="M7 15h10v7H15v6H9v-6H7z" fill="#6b7280" />
          <circle cx="25" cy="11" r="3" fill="#6b7280" />
          <path d="M20 15h10l-2 6h-2v6h-2v-6h-2z" fill="#6b7280" />
        </svg>
      );
    case "cashier":
      return (
        <svg viewBox="0 0 40 32" width="34" height="28" aria-hidden="true">
          <rect x="3" y="3" width="34" height="22" rx="3" fill="#d1d5db" stroke="#6b7280" strokeWidth="1.2" />
          <rect x="8" y="8" width="8" height="5" rx="1" fill="#9ca3af" />
          <rect x="24" y="8" width="8" height="10" rx="1" fill="#9ca3af" />
          <rect x="8" y="15" width="14" height="3" rx="1" fill="#9ca3af" />
          <rect x="8" y="27" width="24" height="3" rx="1" fill="#6b7280" />
        </svg>
      );
    case "bar_counter":
      return (
        <svg viewBox="0 0 52 20" width="44" height="18" aria-hidden="true">
          <rect x="2" y="4" width="48" height="14" rx="3" fill="#fde68a" stroke="#d97706" strokeWidth="1.2" />
          <line x1="18" y1="4" x2="18" y2="18" stroke="#d97706" strokeWidth="1" opacity=".5" />
          <line x1="34" y1="4" x2="34" y2="18" stroke="#d97706" strokeWidth="1" opacity=".5" />
        </svg>
      );
    case "stairs":
      return (
        <svg viewBox="0 0 36 32" width="30" height="26" aria-hidden="true">
          <path d="M2 30 L2 22 L10 22 L10 16 L18 16 L18 10 L26 10 L26 4 L34 4 L34 30 Z"
            fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.2" />
          <line x1="2" y1="22" x2="10" y2="22" stroke="#6b7280" strokeWidth="1.2" />
          <line x1="10" y1="16" x2="18" y2="16" stroke="#6b7280" strokeWidth="1.2" />
          <line x1="18" y1="10" x2="26" y2="10" stroke="#6b7280" strokeWidth="1.2" />
          <line x1="26" y1="4" x2="34" y2="4" stroke="#6b7280" strokeWidth="1.2" />
        </svg>
      );
    case "pillar":
      return (
        <svg viewBox="0 0 28 28" width="24" height="24" aria-hidden="true">
          <rect x="4" y="2" width="20" height="24" rx="2" fill="#d1d5db" stroke="#6b7280" strokeWidth="1.2" />
          <rect x="2" y="2" width="24" height="4" rx="1" fill="#9ca3af" />
          <rect x="2" y="22" width="24" height="4" rx="1" fill="#9ca3af" />
        </svg>
      );
  }
}

// ─── Table / fixture item lists ──────────────────────────────────────────────

export { ShapeIcon, FixtureIcon };

export const tableItems: Array<{ shape: TableShape; label: string }> = [
  { shape: "square",    label: "Kare" },
  { shape: "rectangle", label: "Dikdörtgen" },
  { shape: "round",     label: "Yuvarlak" },
  { shape: "booth",     label: "Loca" },
  { shape: "bar",       label: "Bar" },
];

export const fixtureItems: Array<{ kind: FixtureKind; label: string }> = [
  { kind: "door",        label: "Kapı" },
  { kind: "window",      label: "Pencere" },
  { kind: "wall",        label: "Duvar" },
  { kind: "tree",        label: "Bitki" },
  { kind: "pool",        label: "Havuz" },
  { kind: "restroom",    label: "WC" },
  { kind: "cashier",     label: "Kasa" },
  { kind: "bar_counter", label: "Bar Tezgahı" },
  { kind: "stairs",      label: "Merdiven" },
  { kind: "pillar",      label: "Kolon" },
];

// ─── Fixture Inspector ───────────────────────────────────────────────────────

function FixtureInspector({
  fixture,
  onUpdate,
  onDelete,
}: {
  fixture: EffectiveFixture;
  onUpdate: (patch: FixturePatch) => void;
  onDelete: () => void;
}) {
  const [label, setLabel]   = useState(fixture.label ?? "");
  const [width, setWidth]   = useState(String(Math.round(fixture.width)));
  const [height, setHeight] = useState(String(Math.round(fixture.height)));

  useEffect(() => {
    setLabel(fixture.label ?? "");
    setWidth(String(Math.round(fixture.width)));
    setHeight(String(Math.round(fixture.height)));
  }, [fixture.id, fixture.label, fixture.width, fixture.height]);

  function commitLabel() {
    const v = label.trim();
    if (v && v !== (fixture.label ?? "")) onUpdate({ label: v });
  }
  function commitWidth() {
    const v = parseInt(width, 10);
    if (!isNaN(v) && v > 0 && v !== Math.round(fixture.width)) onUpdate({ width: Math.max(8, v) });
  }
  function commitHeight() {
    const v = parseInt(height, 10);
    if (!isNaN(v) && v > 0 && v !== Math.round(fixture.height)) onUpdate({ height: Math.max(8, v) });
  }

  return (
    <div className="fixture-inspector">
      <p className="fixture-inspector__title">Eleman Özellikleri</p>
      <div className="fixture-inspector__field">
        <label className="fixture-inspector__label">İsim</label>
        <input
          className="fixture-inspector__input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitLabel(); } }}
        />
      </div>
      <div className="fixture-inspector__row">
        <div className="fixture-inspector__field">
          <label className="fixture-inspector__label">G (px)</label>
          <input
            className="fixture-inspector__input"
            type="number"
            min={8}
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            onBlur={commitWidth}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitWidth(); } }}
          />
        </div>
        <div className="fixture-inspector__field">
          <label className="fixture-inspector__label">Y (px)</label>
          <input
            className="fixture-inspector__input"
            type="number"
            min={8}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            onBlur={commitHeight}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitHeight(); } }}
          />
        </div>
      </div>
      <button
        className="fixture-inspector__delete"
        onClick={() => {
          if (!window.confirm("Bu nesneyi silmek istiyor musun?")) return;
          onDelete();
        }}
      >
        Sil
      </button>
    </div>
  );
}

// ─── Tab icons ───────────────────────────────────────────────────────────────

function TablesTabIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="8" width="18" height="9" rx="2" />
      <line x1="8"  y1="8" x2="8"  y2="5" />
      <line x1="12" y1="8" x2="12" y2="5" />
      <line x1="16" y1="8" x2="16" y2="5" />
    </svg>
  );
}

function DecorTabIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="9" r="5" />
      <line x1="12" y1="14" x2="12" y2="20" />
      <line x1="9"  y1="20" x2="15" y2="20" />
    </svg>
  );
}

// ─── SidePanel ───────────────────────────────────────────────────────────────

interface SidePanelProps {
  enabled: boolean;
  onQuickAddTable: (shape: TableShape) => void;
  onQuickAddFixture: (kind: FixtureKind) => void;
  selectedFixture?: EffectiveFixture | null;
  onUpdateFixture?: (id: string, patch: FixturePatch) => void;
  onDeleteFixture?: (id: string) => void;
}

export function SidePanel({
  enabled,
  onQuickAddTable,
  onQuickAddFixture,
  selectedFixture,
  onUpdateFixture,
  onDeleteFixture,
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<"tables" | "fixtures" | null>(null);

  // Auto-open fixtures tab when a fixture is selected
  useEffect(() => {
    if (selectedFixture && enabled) {
      setActiveTab("fixtures");
    }
  }, [selectedFixture?.id, enabled]);

  // Close panel when editing is disabled
  useEffect(() => {
    if (!enabled) setActiveTab(null);
  }, [enabled]);

  const isOpen = enabled && activeTab !== null;

  function handleTabClick(tab: "tables" | "fixtures") {
    if (!enabled) return;
    setActiveTab(prev => prev === tab ? null : tab);
  }

  const disabledTitle = "Düzenleme modunu aç";

  return (
    <div className={`side-panel-v2${isOpen ? " side-panel-v2--open" : ""}`}>

      {/* ── Icon strip ── */}
      <div className="side-panel-v2__strip">
        <button
          className={`side-panel-v2__tab${activeTab === "tables" && isOpen ? " is-active" : ""}${!enabled ? " is-disabled" : ""}`}
          onClick={() => handleTabClick("tables")}
          title={!enabled ? disabledTitle : "Masalar"}
          aria-label="Masalar"
        >
          <TablesTabIcon />
          <span className="side-panel-v2__tab-label">Masa</span>
        </button>

        <button
          className={`side-panel-v2__tab${activeTab === "fixtures" && isOpen ? " is-active" : ""}${!enabled ? " is-disabled" : ""}`}
          onClick={() => handleTabClick("fixtures")}
          title={!enabled ? disabledTitle : "Dekorasyon"}
          aria-label="Dekorasyon"
        >
          <DecorTabIcon />
          <span className="side-panel-v2__tab-label">Dekor</span>
        </button>
      </div>

      {/* ── Content panel ── */}
      {isOpen && (
        <div className="side-panel-v2__content">
          {activeTab === "tables" && (
            <>
              <p className="side-panel__section-title">Masalar</p>
              <div className="side-panel__grid">
                {tableItems.map((item) => (
                  <button
                    key={item.shape}
                    className="side-panel__item"
                    draggable
                    title={item.label}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/x-table-shape", item.shape);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => onQuickAddTable(item.shape)}
                  >
                    <span className="side-panel__item-icon"><ShapeIcon shape={item.shape} /></span>
                    <span className="side-panel__item-label">{item.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {activeTab === "fixtures" && (
            <>
              <p className="side-panel__section-title">Dekorasyon</p>
              <div className="side-panel__grid">
                {fixtureItems.map((item) => (
                  <button
                    key={item.kind}
                    className="side-panel__item"
                    draggable
                    title={item.label}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/x-fixture-kind", item.kind);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => onQuickAddFixture(item.kind)}
                  >
                    <span className="side-panel__item-icon"><FixtureIcon kind={item.kind} /></span>
                    <span className="side-panel__item-label">{item.label}</span>
                  </button>
                ))}
              </div>

              {selectedFixture && onUpdateFixture && onDeleteFixture && (
                <FixtureInspector
                  fixture={selectedFixture}
                  onUpdate={(patch) => onUpdateFixture(selectedFixture.id, patch)}
                  onDelete={() => onDeleteFixture(selectedFixture.id)}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
