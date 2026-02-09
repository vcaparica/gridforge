// === Coordinates ===
export interface Coordinates {
  column: number; // 1-based
  row: number;    // 1-based
}

// === Tap / Rotation ===
// Tap angles in degrees. 0 = upright, 90 = tapped clockwise (standard MTG "tapped").
// Supports 45-degree increments: 0, 45, 90, 135, 180, 225, 270, 315
export type TapAngle = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;

export interface TapState {
  angle: TapAngle;
  label: string; // Human-readable: "upright", "tapped 45°", "tapped 90°", etc.
}

// === Items ===
export interface ItemState {
  id: string;
  label: string;                    // accessible name (REQUIRED)
  description?: string;             // accessible description
  coordinates: Coordinates;
  gridId: string;                   // which grid this item belongs to
  tapAngle: TapAngle;              // current rotation
  canMove: boolean;
  canRemove: boolean;
  canTap: boolean;                 // whether this item supports tapping
  isFaceDown?: boolean;            // for TCG: face-down cards
  zIndex?: number;                 // for stacking order in a cell
  metadata: Record<string, unknown>; // developer-defined custom data
}

// === Cells ===
export interface CellState {
  coordinates: Coordinates;
  itemIds: string[];               // supports stacking/multiple items
  isDropTarget: boolean;           // currently highlighted as drop target
  isBlocked: boolean;              // permanently non-droppable
  metadata: Record<string, unknown>;
}

// === Grids ===
export type GridType = '1d' | '2d';

export interface GridConfig {
  id: string;
  columns: number;
  rows: number;                    // 1 for 1D grids
  type: GridType;
  label: string;                   // accessible name (REQUIRED)
  description?: string;
  allowStacking: boolean;          // can multiple items share a cell?
  maxStackSize?: number;           // limit items per cell (undefined = unlimited)
  sparse: boolean;                 // ALWAYS true — items can go anywhere
}

export interface GridState {
  config: GridConfig;
  cells: Map<string, CellState>;   // key = "col,row"
  itemIds: Set<string>;            // items currently on this grid
  isRendered: boolean;             // whether the grid is currently mounted in the DOM
}

// === Engine State ===
export type InteractionMode = 'navigation' | 'grabbing';

export interface EngineState {
  grids: Map<string, GridState>;
  items: Map<string, ItemState>;
  focusedGridId: string | null;
  focusedCell: Coordinates | null;
  grabbedItemId: string | null;
  grabbedFromGrid: string | null;
  grabbedFromCoords: Coordinates | null;
  mode: InteractionMode;
  activeDropTargetGridId: string | null; // during grab, which grid is the target
}

// === Conflict Resolution ===
export type ConflictStrategy =
  | 'swap'
  | 'push'
  | 'stack'
  | 'block'
  | 'replace'
  | ConflictResolver;

export type ConflictResolver = (
  movingItem: ItemState,
  targetCell: CellState,
  occupants: ItemState[],
  engine: GridEngineReadonly
) => ConflictResolution;

export interface ConflictResolution {
  action: 'allow' | 'block' | 'swap' | 'displace' | 'stack';
  displacedItems?: Array<{ itemId: string; to: Coordinates; toGrid?: string }>;
  message?: string; // custom announcement override
}

// === Events ===
export type GridEventType =
  | 'itemPlaced'
  | 'itemGrabbed'
  | 'itemMoved'
  | 'itemDropped'
  | 'itemRemoved'
  | 'itemTapped'
  | 'itemFlipped'
  | 'itemTransferred' // moved between grids (including non-rendered ones)
  | 'grabCancelled'
  | 'moveBlocked'
  | 'focusMoved'
  | 'gridRegistered'
  | 'gridUnregistered'
  | 'gridRenderStateChanged';

export interface GridEvent {
  type: GridEventType;
  timestamp: number;
  itemId?: string;
  item?: ItemState;
  fromGrid?: string;
  toGrid?: string;
  fromCoords?: Coordinates;
  toCoords?: Coordinates;
  previousTapAngle?: TapAngle;
  newTapAngle?: TapAngle;
  displacedItems?: Array<{ item: ItemState; to: Coordinates }>;
  reason?: string; // for moveBlocked
  gridId?: string; // for grid events
}

// === Direction ===
export type Direction = 'up' | 'down' | 'left' | 'right';

// === Results ===
export interface Result {
  success: boolean;
  event?: GridEvent;
  error?: string;
}

export interface MoveResult extends Result {
  displaced?: Array<{ item: ItemState; to: Coordinates }>;
}

// === Readonly Engine Interface ===
export interface GridEngineReadonly {
  getGrid(gridId: string): GridState | undefined;
  getItem(itemId: string): ItemState | undefined;
  getItemsAt(gridId: string, at: Coordinates): ItemState[];
  getItemsInGrid(gridId: string): ItemState[];
}
