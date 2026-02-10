# GridForge API Reference

## Components

### `<GridForgeProvider>`

Top-level context provider. Wrap your entire grid UI in this component.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Child components |
| `conflictStrategy` | `ConflictStrategy` | `'block'` | How to resolve drop conflicts |
| `messages` | `Partial<MessageCatalog>` | `{}` | Override announcement strings |
| `announceDelay` | `number` | `150` | Debounce delay (ms) for announcements |
| `onItemMoved` | `(event: GridEvent) => void` | -- | Fired when an item moves within a grid |
| `onItemDropped` | `(event: GridEvent) => void` | -- | Fired when a grabbed item is dropped |
| `onItemRemoved` | `(event: GridEvent) => void` | -- | Fired when an item is removed |
| `onItemGrabbed` | `(event: GridEvent) => void` | -- | Fired when an item is grabbed |
| `onItemTapped` | `(event: GridEvent) => void` | -- | Fired when an item is tapped/rotated |
| `onItemFlipped` | `(event: GridEvent) => void` | -- | Fired when an item is flipped |
| `onItemTransferred` | `(event: GridEvent) => void` | -- | Fired on cross-grid transfers |
| `onGrabCancelled` | `(event: GridEvent) => void` | -- | Fired when a grab is cancelled |

### `<Grid>`

A 2D grid surface. Registers itself with the engine on mount.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | required | Unique grid identifier |
| `columns` | `number` | required | Number of columns |
| `rows` | `number` | `1` | Number of rows (1 = 1D grid) |
| `label` | `string` | required | Accessible name (REQUIRED) |
| `description` | `string` | -- | Accessible description |
| `allowStacking` | `boolean` | `false` | Allow multiple items per cell |
| `maxStackSize` | `number` | -- | Max items per cell (unlimited if omitted) |
| `blockedCells` | `Coordinates[]` | -- | Cells that cannot accept items |
| `renderCell` | `(coords, items) => ReactNode` | required | Cell render function |
| `className` | `string` | -- | CSS class for the grid container |
| `style` | `CSSProperties` | -- | Inline styles |

### `<Cell>`

A single cell inside a grid. Receives focus via roving tabindex.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gridId` | `string` | required | Parent grid ID |
| `coordinates` | `Coordinates` | required | Cell position |
| `children` | `ReactNode` | -- | Cell contents (items) |
| `className` | `string` | -- | CSS class |
| `style` | `CSSProperties` | -- | Inline styles |
| `ariaLabel` | `string` | -- | Override the computed accessible label |

### `<Item>`

A draggable item placed inside a cell.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | required | Unique item identifier |
| `label` | `string` | required | Accessible name (REQUIRED) |
| `description` | `string` | -- | Accessible description |
| `canMove` | `boolean` | `true` | Whether the item can be grabbed/moved |
| `canRemove` | `boolean` | `true` | Whether the item can be deleted |
| `canTap` | `boolean` | `true` | Whether the item supports tapping |
| `children` | `ReactNode` | required | Visual content |
| `className` | `string` | -- | CSS class |
| `grabbedClassName` | `string` | -- | Additional class when grabbed |
| `tappedClassName` | `string` | -- | Additional class when tapped |

### `<ItemTray>`

A 1D horizontal or vertical strip for items (e.g., a hand of cards).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | required | Unique tray identifier |
| `label` | `string` | required | Accessible name (REQUIRED) |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout direction |
| `allowStacking` | `boolean` | `false` | Allow stacking in tray slots |
| `children` | `ReactNode` | required | Tray contents |
| `className` | `string` | -- | CSS class |
| `style` | `CSSProperties` | -- | Inline styles |

### `<HelpDialog>`

Accessible modal dialog showing keyboard shortcuts.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | required | Whether the dialog is visible |
| `onClose` | `() => void` | required | Called when the dialog should close |
| `returnFocusRef` | `RefObject<HTMLElement>` | -- | Element to return focus to on close |

### `<ContextMenu>`

Right-click / F10 context menu for item actions.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `itemId` | `string` | required | Target item |
| `gridId` | `string` | required | Grid containing the item |
| `coords` | `Coordinates` | required | Cell coordinates |
| `anchorElement` | `HTMLElement` | required | DOM element to position near |
| `onClose` | `() => void` | required | Called when the menu should close |
| `customActions` | `ContextMenuAction[]` | -- | Additional menu actions |

#### `ContextMenuAction`

```ts
interface ContextMenuAction {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  action: (item: ItemState, engine: GridEngine) => void;
  isAvailable?: (item: ItemState) => boolean;
}
```

---

## Hooks

### `useGridForge()`

Access the engine and state from context. Must be inside `<GridForgeProvider>`.

```ts
function useGridForge(): {
  engine: GridEngine;
  state: EngineState;
  announce: (announcement: Announcement) => void;
  messageCatalog: MessageCatalog;
}
```

### `useGrid(gridId)`

Read grid state and register/unregister grids programmatically.

```ts
function useGrid(gridId: string): {
  grid: GridState | undefined;
  items: ItemState[];
  registerGrid: (config: Omit<GridConfig, 'id'>) => void;
  unregisterGrid: () => void;
}
```

### `useCell(gridId, coords)`

Read cell state including focus, drop-target, and ARIA props.

```ts
function useCell(gridId: string, coords: Coordinates): {
  cell: CellState;
  items: ItemState[];
  isFocused: boolean;
  isGrabSource: boolean;
  isDropTarget: boolean;
  ariaProps: Record<string, string>;
}
```

### `useItem(itemId)`

Read item state and get action callbacks.

```ts
function useItem(itemId: string): {
  item: ItemState | undefined;
  isGrabbed: boolean;
  tapClockwise: () => void;
  tapCounterClockwise: () => void;
  flip: () => void;
  remove: () => void;
  transferTo: (gridId: string, coords: Coordinates) => Result;
  ariaProps: Record<string, string>;
}
```

### `useDragState()`

Read the current drag/grab state.

```ts
function useDragState(): {
  isGrabbing: boolean;
  grabbedItem: ItemState | null;
  originGrid: string | null;
  originCoords: Coordinates | null;
  targetGrid: string | null;
}
```

### `useAnnounce()`

Get the announcement function for custom screen reader messages.

```ts
function useAnnounce(): (announcement: Announcement) => void;
```

### `useGridKeyboard(gridId, options?)`

Wire keyboard handling into a grid. Returns an `onKeyDown` handler.

```ts
function useGridKeyboard(gridId: string, options?: {
  onShowHelp?: () => void;
  onContextMenu?: (itemId: string) => void;
}): {
  onKeyDown: (event: React.KeyboardEvent) => void;
}
```

---

## Core Types

### `Coordinates`

```ts
interface Coordinates {
  column: number; // 1-based
  row: number;    // 1-based
}
```

### `TapAngle`

```ts
type TapAngle = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;
```

### `ItemState`

```ts
interface ItemState {
  id: string;
  label: string;
  description?: string;
  coordinates: Coordinates;
  gridId: string;
  tapAngle: TapAngle;
  canMove: boolean;
  canRemove: boolean;
  canTap: boolean;
  isFaceDown?: boolean;
  zIndex?: number;
  metadata: Record<string, unknown>;
}
```

### `CellState`

```ts
interface CellState {
  coordinates: Coordinates;
  itemIds: string[];
  isDropTarget: boolean;
  isBlocked: boolean;
  metadata: Record<string, unknown>;
}
```

### `GridConfig`

```ts
interface GridConfig {
  id: string;
  columns: number;
  rows: number;          // 1 for 1D grids
  type: '1d' | '2d';
  label: string;
  description?: string;
  allowStacking: boolean;
  maxStackSize?: number;
  sparse: boolean;       // always true
}
```

### `GridState`

```ts
interface GridState {
  config: GridConfig;
  cells: Map<string, CellState>;  // key = "col,row"
  itemIds: Set<string>;
  isRendered: boolean;
}
```

### `EngineState`

```ts
interface EngineState {
  grids: Map<string, GridState>;
  items: Map<string, ItemState>;
  focusedGridId: string | null;
  focusedCell: Coordinates | null;
  grabbedItemId: string | null;
  grabbedFromGrid: string | null;
  grabbedFromCoords: Coordinates | null;
  mode: 'navigation' | 'grabbing';
  activeDropTargetGridId: string | null;
}
```

### `ConflictStrategy`

```ts
type ConflictStrategy =
  | 'swap'      // swap the moving item with the occupant
  | 'push'      // push the occupant in the movement direction
  | 'stack'     // stack on top of the occupant
  | 'block'     // prevent the move (default)
  | 'replace'   // remove the occupant, place the moving item
  | ConflictResolver;  // custom function
```

### `ConflictResolver` (custom function)

```ts
type ConflictResolver = (
  movingItem: ItemState,
  targetCell: CellState,
  occupants: ItemState[],
  engine: GridEngineReadonly,
) => ConflictResolution;

interface ConflictResolution {
  action: 'allow' | 'block' | 'swap' | 'displace' | 'stack';
  displacedItems?: Array<{ itemId: string; to: Coordinates; toGrid?: string }>;
  message?: string;
}
```

### `GridEvent`

```ts
interface GridEvent {
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
  reason?: string;
  gridId?: string;
}

type GridEventType =
  | 'itemPlaced' | 'itemGrabbed' | 'itemMoved' | 'itemDropped'
  | 'itemRemoved' | 'itemTapped' | 'itemFlipped' | 'itemTransferred'
  | 'grabCancelled' | 'moveBlocked' | 'focusMoved'
  | 'gridRegistered' | 'gridUnregistered' | 'gridRenderStateChanged';
```

### `Result` / `MoveResult`

```ts
interface Result {
  success: boolean;
  event?: GridEvent;
  error?: string;
}

interface MoveResult extends Result {
  displaced?: Array<{ item: ItemState; to: Coordinates }>;
}
```

---

## GridEngine Public API

| Method | Signature | Description |
|--------|-----------|-------------|
| `registerGrid` | `(config: GridConfig) => void` | Register a new grid |
| `unregisterGrid` | `(gridId: string) => void` | Remove a grid and its items |
| `setGridRendered` | `(gridId, isRendered) => void` | Mark grid as mounted/unmounted |
| `getGrid` | `(gridId: string) => GridState?` | Get grid state |
| `getAllGrids` | `() => GridState[]` | All registered grids |
| `getRenderedGrids` | `() => GridState[]` | Only rendered grids |
| `getNonRenderedGrids` | `() => GridState[]` | Only non-rendered grids |
| `addItem` | `(item, gridId, at) => Result` | Place a new item |
| `removeItem` | `(itemId: string) => Result` | Remove an item |
| `getItem` | `(itemId: string) => ItemState?` | Get item state |
| `getItemsAt` | `(gridId, at) => ItemState[]` | Items at coordinates |
| `getItemsInGrid` | `(gridId: string) => ItemState[]` | All items in a grid |
| `getAllItems` | `() => ItemState[]` | All items across all grids |
| `grab` | `(itemId: string) => Result` | Grab an item |
| `moveGrabbed` | `(direction: Direction) => MoveResult` | Move grabbed item by one cell |
| `moveGrabbedTo` | `(gridId, coords) => MoveResult` | Move grabbed item to specific cell |
| `drop` | `() => Result` | Drop the grabbed item |
| `cancelGrab` | `() => Result` | Cancel grab, return item to origin |
| `isGrabbing` | `() => boolean` | Whether an item is currently grabbed |
| `getGrabbedItem` | `() => ItemState \| null` | The currently grabbed item |
| `transferItem` | `(itemId, toGrid, toCoords) => Result` | Direct cross-grid transfer |
| `tapClockwise` | `(itemId: string) => Result` | Rotate item clockwise by 45 degrees |
| `tapCounterClockwise` | `(itemId: string) => Result` | Rotate item counterclockwise |
| `setTapAngle` | `(itemId, angle) => Result` | Set an exact tap angle |
| `flipItem` | `(itemId: string) => Result` | Toggle face-up / face-down |
| `setFocusedGrid` | `(gridId: string) => void` | Set logical focus to a grid |
| `setFocusedCell` | `(coords: Coordinates) => void` | Set logical focus to a cell |
| `moveFocus` | `(direction: Direction) => Coordinates?` | Move focus by one cell |
| `getFocusedCell` | `() => { gridId, coords } \| null` | Current focus position |
| `on` | `(event, handler) => () => void` | Subscribe to events (returns unsub fn) |
| `off` | `(event, handler) => void` | Unsubscribe from events |
| `getState` | `() => EngineState` | Full engine state |

---

## TapSystem Static Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `ANGLES` | `TapAngle[]` | `[0, 45, 90, 135, 180, 225, 270, 315]` |
| `tapClockwise` | `(current: TapAngle) => TapAngle` | Next angle clockwise |
| `tapCounterClockwise` | `(current: TapAngle) => TapAngle` | Next angle counterclockwise |
| `getLabel` | `(angle: TapAngle) => string` | Human-readable label |
| `buildTappedLabel` | `(itemLabel, angle) => string` | e.g. `"Black Lotus, tapped"` |
| `getCSSRotation` | `(angle: TapAngle) => string` | e.g. `"rotate(90deg)"` |
