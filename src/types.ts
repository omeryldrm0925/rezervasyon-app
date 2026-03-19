export type TableShape = "square" | "rectangle" | "round" | "bar" | "booth";
export type FixtureKind = "door" | "window";

export type ReservationStatus = "reserved" | "arrived" | "cancelled" | "no_show";
export type ReservationOwnerType = "table" | "group";

export type TargetMode = "day" | "default";
export type InteractionMode = "idle" | "editingObject" | "creatingReservation" | "merging";
export type GroupVisualType = "cluster" | "banquet";

export interface Table {
  id: string;
  label: string;
  shape: TableShape;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  maxCapacity?: number;
}

export interface Fixture {
  id: string;
  kind: FixtureKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label?: string;
}

export interface Area {
  id: string;
  name: string;
  defaultTables: Table[];
  defaultFixtures: Fixture[];
}

export interface MergedTableGroup {
  id: string;
  name: string;
  tableIds: string[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  capacity?: number;
  notes?: string;
  groupType?: GroupVisualType;
}

export type TablePatch = Partial<
  Pick<Table, "x" | "y" | "width" | "height" | "label" | "shape" | "capacity" | "maxCapacity">
> & { blocked?: boolean };

export type FixturePatch = Partial<
  Pick<Fixture, "x" | "y" | "width" | "height" | "rotation" | "label">
>;

export interface LayoutOverride {
  dateISO: string;
  areaId: string;
  /**
   * Override oluşturulduğu andaki area.defaultTables snapshot'ı.
   * Varsa, buildEffectiveTables bu snapshot'ı kullanır — varsayılan
   * plandaki sonraki değişiklikler override'lı günleri etkilemez.
   * Eski override kayıtlarında undefined olabilir (backwards compat).
   */
  baseTableSnapshot?: Table[];
  baseFixtureSnapshot?: Fixture[];
  tablePatches: Record<string, TablePatch>;
  addedTables: Table[];
  removedTableIds: string[];
  mergedGroups: MergedTableGroup[];
  fixturePatches: Record<string, FixturePatch>;
  addedFixtures: Fixture[];
  removedFixtureIds: string[];
}

export interface Reservation {
  id: string;
  dateISO: string;
  areaId: string;
  ownerType: ReservationOwnerType;
  ownerId: string;
  tableIds: string[];
  guestName: string;
  phone: string;
  guestCount: number;
  time: string;
  notes: string;
  status: ReservationStatus;
}

export type OverridesByDate = Record<string, Record<string, LayoutOverride>>;

export interface EffectiveTable extends Table {
  blocked: boolean;
  isAddedByOverride: boolean;
}

export interface EffectiveFixture extends Fixture {
  isAddedByOverride: boolean;
}

export interface MergeModeState {
  active: boolean;
  baseTableId: string | null;
  tableIds: string[];
}

export type SelectedObject =
  | { kind: "table"; id: string }
  | { kind: "group"; id: string }
  | { kind: "fixture"; id: string };

export interface StoreState {
  areas: Area[];
  reservations: Reservation[];
  overrides: OverridesByDate;
  activeAreaId: string | null;
  activeDateISO: string;
  selectedObject: SelectedObject | null;
  interactionMode: InteractionMode;
  highlightedReservationId: string | null;
  highlightedTableId: string | null;
  reservationSearchQuery: string;
  targetMode: TargetMode;
  layoutUnlocked: boolean;
  mergeMode: MergeModeState;
}

export type TableVisualState = "empty" | "reserved" | "arrived" | "blocked" | "warning";

export interface ReservationCapacityInfo {
  capacity: number;
  guestCount: number;
  hasMismatch: boolean;
}
