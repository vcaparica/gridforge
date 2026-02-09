import type {
  Coordinates,
  TapAngle,
  ItemState,
  CellState,
  GridConfig,
  GridState,
  EngineState,
  ConflictStrategy,
  ConflictResolution,
  GridEventType,
  GridEvent,
  Direction,
  Result,
  MoveResult,
  GridEngineReadonly,
} from './types.ts';
import { CoordinateSystem } from './CoordinateSystem.ts';
import { TapSystem } from './TapSystem.ts';
import { MovementResolver } from './MovementResolver.ts';

/**
 * GridEngine is the main state machine for the GridForge module.
 *
 * It manages grid registration, item placement, grab/move/drop interactions,
 * tapping, face-down flipping, focus management, and event emission.
 *
 * Grids are sparse: cells are created on demand when items are placed.
 * Grids can be registered without being rendered (e.g. graveyard, exile zones).
 */
export class GridEngine implements GridEngineReadonly {
  private state: EngineState;
  private listeners: Map<GridEventType, Set<(event: GridEvent) => void>>;
  private conflictStrategy: ConflictStrategy;

  constructor(config: { conflictStrategy?: ConflictStrategy } = {}) {
    this.conflictStrategy = config.conflictStrategy ?? 'block';

    this.state = {
      grids: new Map(),
      items: new Map(),
      focusedGridId: null,
      focusedCell: null,
      grabbedItemId: null,
      grabbedFromGrid: null,
      grabbedFromCoords: null,
      mode: 'navigation',
      activeDropTargetGridId: null,
    };

    this.listeners = new Map();
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  /**
   * Returns the cell at the given coordinates, creating it lazily if it does
   * not yet exist. Sparse grids never pre-populate cells.
   */
  private getOrCreateCell(gridId: string, coords: Coordinates): CellState {
    const grid = this.state.grids.get(gridId);
    if (!grid) {
      throw new Error(`Grid "${gridId}" is not registered`);
    }

    const key = CoordinateSystem.toKey(coords);
    let cell = grid.cells.get(key);
    if (!cell) {
      cell = {
        coordinates: { column: coords.column, row: coords.row },
        itemIds: [],
        isDropTarget: false,
        isBlocked: false,
        metadata: {},
      };
      grid.cells.set(key, cell);
    }
    return cell;
  }

  /**
   * Creates a GridEvent with a timestamp and the supplied fields.
   */
  private createEvent(fields: Omit<GridEvent, 'timestamp'>): GridEvent {
    return { ...fields, timestamp: Date.now() };
  }

  /**
   * Emits an event to all registered listeners for its type.
   */
  private emit(event: GridEvent): void {
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }
  }

  /**
   * Removes an item from the cell it currently occupies.
   * Does NOT remove it from the items map or the grid's itemIds set.
   */
  private removeItemFromCell(item: ItemState): void {
    const grid = this.state.grids.get(item.gridId);
    if (!grid) return;

    const key = CoordinateSystem.toKey(item.coordinates);
    const cell = grid.cells.get(key);
    if (!cell) return;

    const idx = cell.itemIds.indexOf(item.id);
    if (idx !== -1) {
      cell.itemIds.splice(idx, 1);
    }
  }

  /**
   * Places an item into a cell (adds its id to the cell's itemIds array).
   * The cell is created on demand if it does not exist.
   */
  private placeItemInCell(gridId: string, coords: Coordinates, itemId: string): void {
    const cell = this.getOrCreateCell(gridId, coords);
    if (!cell.itemIds.includes(itemId)) {
      cell.itemIds.push(itemId);
    }
  }

  // =========================================================================
  // Grid Registry
  // =========================================================================

  registerGrid(config: GridConfig): void {
    if (this.state.grids.has(config.id)) {
      throw new Error(`Grid "${config.id}" is already registered`);
    }

    const gridState: GridState = {
      config: { ...config },
      cells: new Map(),
      itemIds: new Set(),
      isRendered: false,
    };

    this.state.grids.set(config.id, gridState);

    this.emit(
      this.createEvent({
        type: 'gridRegistered',
        gridId: config.id,
      })
    );
  }

  unregisterGrid(gridId: string): void {
    const grid = this.state.grids.get(gridId);
    if (!grid) {
      throw new Error(`Grid "${gridId}" is not registered`);
    }

    // Remove all items that belong to this grid
    for (const itemId of grid.itemIds) {
      this.state.items.delete(itemId);
    }

    // Clear focus if it was on this grid
    if (this.state.focusedGridId === gridId) {
      this.state.focusedGridId = null;
      this.state.focusedCell = null;
    }

    // Cancel grab if the grabbed item was on this grid
    if (this.state.grabbedFromGrid === gridId) {
      this.state.grabbedItemId = null;
      this.state.grabbedFromGrid = null;
      this.state.grabbedFromCoords = null;
      this.state.mode = 'navigation';
      this.state.activeDropTargetGridId = null;
    }

    this.state.grids.delete(gridId);

    this.emit(
      this.createEvent({
        type: 'gridUnregistered',
        gridId,
      })
    );
  }

  setGridRendered(gridId: string, isRendered: boolean): void {
    const grid = this.state.grids.get(gridId);
    if (!grid) {
      throw new Error(`Grid "${gridId}" is not registered`);
    }

    grid.isRendered = isRendered;

    this.emit(
      this.createEvent({
        type: 'gridRenderStateChanged',
        gridId,
      })
    );
  }

  getGrid(gridId: string): GridState | undefined {
    return this.state.grids.get(gridId);
  }

  getAllGrids(): GridState[] {
    return Array.from(this.state.grids.values());
  }

  getRenderedGrids(): GridState[] {
    return Array.from(this.state.grids.values()).filter((g) => g.isRendered);
  }

  getNonRenderedGrids(): GridState[] {
    return Array.from(this.state.grids.values()).filter((g) => !g.isRendered);
  }

  // =========================================================================
  // Item Management
  // =========================================================================

  addItem(
    item: Omit<ItemState, 'coordinates' | 'gridId' | 'tapAngle'>,
    gridId: string,
    at: Coordinates
  ): Result {
    const grid = this.state.grids.get(gridId);
    if (!grid) {
      return { success: false, error: `Grid "${gridId}" is not registered` };
    }

    if (!CoordinateSystem.isValid(at, grid.config)) {
      return { success: false, error: `Coordinates (${at.column}, ${at.row}) are out of bounds for grid "${gridId}"` };
    }

    if (this.state.items.has(item.id)) {
      return { success: false, error: `Item "${item.id}" already exists` };
    }

    // Check for conflicts at the target cell
    const key = CoordinateSystem.toKey(at);
    const existingCell = grid.cells.get(key);
    if (existingCell && existingCell.itemIds.length > 0) {
      if (existingCell.isBlocked) {
        return { success: false, error: `Cell (${at.column}, ${at.row}) is blocked` };
      }
      if (!grid.config.allowStacking) {
        return { success: false, error: `Cell (${at.column}, ${at.row}) is occupied and stacking is not allowed` };
      }
      if (
        grid.config.maxStackSize !== undefined &&
        existingCell.itemIds.length >= grid.config.maxStackSize
      ) {
        return { success: false, error: `Cell (${at.column}, ${at.row}) has reached max stack size` };
      }
    }

    // Construct the full ItemState
    const fullItem: ItemState = {
      ...item,
      coordinates: { column: at.column, row: at.row },
      gridId,
      tapAngle: 0,
    };

    // Register the item
    this.state.items.set(fullItem.id, fullItem);
    grid.itemIds.add(fullItem.id);
    this.placeItemInCell(gridId, at, fullItem.id);

    const event = this.createEvent({
      type: 'itemPlaced',
      itemId: fullItem.id,
      item: { ...fullItem },
      toGrid: gridId,
      toCoords: { column: at.column, row: at.row },
    });

    this.emit(event);

    return { success: true, event };
  }

  removeItem(itemId: string): Result {
    const item = this.state.items.get(itemId);
    if (!item) {
      return { success: false, error: `Item "${itemId}" does not exist` };
    }

    if (!item.canRemove) {
      return { success: false, error: `Item "${itemId}" cannot be removed` };
    }

    // If this item is currently grabbed, cancel the grab
    if (this.state.grabbedItemId === itemId) {
      this.state.grabbedItemId = null;
      this.state.grabbedFromGrid = null;
      this.state.grabbedFromCoords = null;
      this.state.mode = 'navigation';
      this.state.activeDropTargetGridId = null;
    }

    // Remove from cell
    this.removeItemFromCell(item);

    // Remove from grid's itemIds set
    const grid = this.state.grids.get(item.gridId);
    if (grid) {
      grid.itemIds.delete(itemId);
    }

    // Remove from items map
    this.state.items.delete(itemId);

    const event = this.createEvent({
      type: 'itemRemoved',
      itemId,
      item: { ...item },
      fromGrid: item.gridId,
      fromCoords: { column: item.coordinates.column, row: item.coordinates.row },
    });

    this.emit(event);

    return { success: true, event };
  }

  getItem(itemId: string): ItemState | undefined {
    return this.state.items.get(itemId);
  }

  getItemsAt(gridId: string, at: Coordinates): ItemState[] {
    const grid = this.state.grids.get(gridId);
    if (!grid) return [];

    const key = CoordinateSystem.toKey(at);
    const cell = grid.cells.get(key);
    if (!cell) return [];

    return cell.itemIds
      .map((id) => this.state.items.get(id))
      .filter((item): item is ItemState => item !== undefined);
  }

  getItemsInGrid(gridId: string): ItemState[] {
    const grid = this.state.grids.get(gridId);
    if (!grid) return [];

    return Array.from(grid.itemIds)
      .map((id) => this.state.items.get(id))
      .filter((item): item is ItemState => item !== undefined);
  }

  getAllItems(): ItemState[] {
    return Array.from(this.state.items.values());
  }

  // =========================================================================
  // Grab / Move / Drop
  // =========================================================================

  grab(itemId: string): Result {
    if (this.state.grabbedItemId !== null) {
      return { success: false, error: 'Another item is already grabbed' };
    }

    const item = this.state.items.get(itemId);
    if (!item) {
      return { success: false, error: `Item "${itemId}" does not exist` };
    }

    if (!item.canMove) {
      return { success: false, error: `Item "${itemId}" cannot be moved` };
    }

    // Check the item's grid is rendered (can only grab from rendered grids)
    const grid = this.state.grids.get(item.gridId);
    if (!grid || !grid.isRendered) {
      return { success: false, error: `Cannot grab from non-rendered grid "${item.gridId}"` };
    }

    this.state.grabbedItemId = itemId;
    this.state.grabbedFromGrid = item.gridId;
    this.state.grabbedFromCoords = { column: item.coordinates.column, row: item.coordinates.row };
    this.state.mode = 'grabbing';
    this.state.activeDropTargetGridId = item.gridId;

    const event = this.createEvent({
      type: 'itemGrabbed',
      itemId,
      item: { ...item },
      fromGrid: item.gridId,
      fromCoords: { column: item.coordinates.column, row: item.coordinates.row },
    });

    this.emit(event);

    return { success: true, event };
  }

  moveGrabbed(direction: Direction): MoveResult {
    if (this.state.grabbedItemId === null) {
      return { success: false, error: 'No item is currently grabbed' };
    }

    const item = this.state.items.get(this.state.grabbedItemId);
    if (!item) {
      return { success: false, error: 'Grabbed item no longer exists' };
    }

    const grid = this.state.grids.get(item.gridId);
    if (!grid) {
      return { success: false, error: `Grid "${item.gridId}" no longer exists` };
    }

    // Compute target coordinates
    const targetCoords = CoordinateSystem.adjacent(item.coordinates, direction);

    // Bounds check
    if (!CoordinateSystem.isValid(targetCoords, grid.config)) {
      const event = this.createEvent({
        type: 'moveBlocked',
        itemId: item.id,
        item: { ...item },
        fromGrid: item.gridId,
        fromCoords: { column: item.coordinates.column, row: item.coordinates.row },
        reason: 'Target is out of bounds',
      });
      this.emit(event);
      return { success: false, error: 'Target is out of bounds', event };
    }

    // Check for blocked cell
    const targetKey = CoordinateSystem.toKey(targetCoords);
    const targetCell = grid.cells.get(targetKey);
    if (targetCell && targetCell.isBlocked) {
      const event = this.createEvent({
        type: 'moveBlocked',
        itemId: item.id,
        item: { ...item },
        fromGrid: item.gridId,
        fromCoords: { column: item.coordinates.column, row: item.coordinates.row },
        reason: 'Target cell is blocked',
      });
      this.emit(event);
      return { success: false, error: 'Target cell is blocked', event };
    }

    // Get occupants at the target cell
    const occupants = this.getItemsAt(item.gridId, targetCoords);

    // If the target is occupied, invoke conflict resolution
    if (occupants.length > 0) {
      const targetCellForResolver = this.getOrCreateCell(item.gridId, targetCoords);
      const resolution = MovementResolver.resolve(
        this.conflictStrategy,
        item,
        targetCellForResolver,
        occupants,
        grid.config,
        grid.cells,
        this.getReadonlySnapshot(),
        direction
      );

      return this.applyResolution(item, targetCoords, resolution, direction);
    }

    // Target is empty -- move freely
    return this.executeMove(item, item.gridId, targetCoords);
  }

  moveGrabbedTo(gridId: string, coords: Coordinates): MoveResult {
    if (this.state.grabbedItemId === null) {
      return { success: false, error: 'No item is currently grabbed' };
    }

    const item = this.state.items.get(this.state.grabbedItemId);
    if (!item) {
      return { success: false, error: 'Grabbed item no longer exists' };
    }

    const targetGrid = this.state.grids.get(gridId);
    if (!targetGrid) {
      return { success: false, error: `Grid "${gridId}" is not registered` };
    }

    if (!CoordinateSystem.isValid(coords, targetGrid.config)) {
      return { success: false, error: `Coordinates (${coords.column}, ${coords.row}) are out of bounds for grid "${gridId}"` };
    }

    // Check for blocked cell
    const targetKey = CoordinateSystem.toKey(coords);
    const targetCell = targetGrid.cells.get(targetKey);
    if (targetCell && targetCell.isBlocked) {
      const event = this.createEvent({
        type: 'moveBlocked',
        itemId: item.id,
        item: { ...item },
        fromGrid: item.gridId,
        fromCoords: { column: item.coordinates.column, row: item.coordinates.row },
        toGrid: gridId,
        toCoords: coords,
        reason: 'Target cell is blocked',
      });
      this.emit(event);
      return { success: false, error: 'Target cell is blocked', event };
    }

    // Get occupants at target
    const occupants = this.getItemsAt(gridId, coords);

    if (occupants.length > 0) {
      const targetCellForResolver = this.getOrCreateCell(gridId, coords);
      const resolution = MovementResolver.resolve(
        this.conflictStrategy,
        item,
        targetCellForResolver,
        occupants,
        targetGrid.config,
        targetGrid.cells,
        this.getReadonlySnapshot(),
        undefined // no directional movement for cross-grid moves
      );

      return this.applyResolution(item, coords, resolution, undefined, gridId);
    }

    // Target is empty
    return this.executeMove(item, gridId, coords);
  }

  /**
   * Apply a ConflictResolution result and carry out the appropriate action.
   */
  private applyResolution(
    item: ItemState,
    targetCoords: Coordinates,
    resolution: ConflictResolution,
    _direction?: Direction,
    targetGridId?: string
  ): MoveResult {
    const destGridId = targetGridId ?? item.gridId;

    switch (resolution.action) {
      case 'allow':
      case 'stack': {
        // For 'replace' (returns 'allow' with empty displacedItems), remove occupants first
        if (resolution.action === 'allow' && resolution.displacedItems !== undefined) {
          // This is a 'replace' resolution — remove current occupants
          const occupants = this.getItemsAt(destGridId, targetCoords);
          for (const occupant of occupants) {
            this.removeItemFromCell(occupant);
            const grid = this.state.grids.get(occupant.gridId);
            if (grid) {
              grid.itemIds.delete(occupant.id);
            }
            this.state.items.delete(occupant.id);
            this.emit(
              this.createEvent({
                type: 'itemRemoved',
                itemId: occupant.id,
                item: { ...occupant },
                fromGrid: occupant.gridId,
                fromCoords: { column: occupant.coordinates.column, row: occupant.coordinates.row },
              })
            );
          }
        }
        return this.executeMove(item, destGridId, targetCoords);
      }

      case 'block': {
        const event = this.createEvent({
          type: 'moveBlocked',
          itemId: item.id,
          item: { ...item },
          fromGrid: item.gridId,
          fromCoords: { column: item.coordinates.column, row: item.coordinates.row },
          toGrid: destGridId,
          toCoords: targetCoords,
          reason: resolution.message ?? 'Cell is occupied',
        });
        this.emit(event);
        return { success: false, error: resolution.message ?? 'Cell is occupied', event };
      }

      case 'swap': {
        if (!resolution.displacedItems || resolution.displacedItems.length === 0) {
          return { success: false, error: 'Swap resolution did not specify displaced items' };
        }

        const displaced: Array<{ item: ItemState; to: Coordinates }> = [];

        // Move displaced items to the moving item's current position
        for (const displacement of resolution.displacedItems) {
          const displacedItem = this.state.items.get(displacement.itemId);
          if (!displacedItem) continue;

          const displacedToGrid = displacement.toGrid ?? displacedItem.gridId;

          // Remove from current cell
          this.removeItemFromCell(displacedItem);

          // Update coordinates and grid
          const oldGrid = this.state.grids.get(displacedItem.gridId);
          const newGrid = this.state.grids.get(displacedToGrid);

          if (displacedItem.gridId !== displacedToGrid) {
            if (oldGrid) oldGrid.itemIds.delete(displacedItem.id);
            if (newGrid) newGrid.itemIds.add(displacedItem.id);
            displacedItem.gridId = displacedToGrid;
          }

          displacedItem.coordinates = { column: displacement.to.column, row: displacement.to.row };
          this.placeItemInCell(displacedToGrid, displacement.to, displacedItem.id);

          displaced.push({ item: { ...displacedItem }, to: displacement.to });
        }

        // Now move the grabbed item to the target
        const moveResult = this.executeMove(item, destGridId, targetCoords);
        moveResult.displaced = displaced;

        return moveResult;
      }

      case 'displace': {
        if (!resolution.displacedItems || resolution.displacedItems.length === 0) {
          return { success: false, error: 'Displace resolution did not specify displaced items' };
        }

        const displaced: Array<{ item: ItemState; to: Coordinates }> = [];

        for (const displacement of resolution.displacedItems) {
          const displacedItem = this.state.items.get(displacement.itemId);
          if (!displacedItem) continue;

          const displacedToGrid = displacement.toGrid ?? displacedItem.gridId;

          // Remove from current cell
          this.removeItemFromCell(displacedItem);

          // Update coordinates and grid
          const oldGrid = this.state.grids.get(displacedItem.gridId);
          const newGrid = this.state.grids.get(displacedToGrid);

          if (displacedItem.gridId !== displacedToGrid) {
            if (oldGrid) oldGrid.itemIds.delete(displacedItem.id);
            if (newGrid) newGrid.itemIds.add(displacedItem.id);
            displacedItem.gridId = displacedToGrid;
          }

          displacedItem.coordinates = { column: displacement.to.column, row: displacement.to.row };
          this.placeItemInCell(displacedToGrid, displacement.to, displacedItem.id);

          displaced.push({ item: { ...displacedItem }, to: displacement.to });
        }

        // Now move the grabbed item to the target
        const moveResult = this.executeMove(item, destGridId, targetCoords);
        moveResult.displaced = displaced;

        return moveResult;
      }

      default:
        return { success: false, error: `Unknown resolution action: ${(resolution as ConflictResolution).action}` };
    }
  }

  /**
   * Executes the actual move of an item to a new position, emitting the
   * appropriate event. Handles both same-grid and cross-grid moves.
   */
  private executeMove(item: ItemState, toGridId: string, toCoords: Coordinates): MoveResult {
    const fromGrid = item.gridId;
    const fromCoords = { column: item.coordinates.column, row: item.coordinates.row };

    // Remove from old cell
    this.removeItemFromCell(item);

    // Handle cross-grid movement
    if (item.gridId !== toGridId) {
      const oldGrid = this.state.grids.get(item.gridId);
      if (oldGrid) {
        oldGrid.itemIds.delete(item.id);
      }
      const newGrid = this.state.grids.get(toGridId);
      if (newGrid) {
        newGrid.itemIds.add(item.id);
      }
      item.gridId = toGridId;

      // Update active drop target grid during grab
      if (this.state.grabbedItemId === item.id) {
        this.state.activeDropTargetGridId = toGridId;
      }
    }

    // Update item coordinates
    item.coordinates = { column: toCoords.column, row: toCoords.row };

    // Place in new cell
    this.placeItemInCell(toGridId, toCoords, item.id);

    const isCrossGrid = fromGrid !== toGridId;
    const eventType: GridEventType = isCrossGrid ? 'itemTransferred' : 'itemMoved';

    const event = this.createEvent({
      type: eventType,
      itemId: item.id,
      item: { ...item },
      fromGrid,
      toGrid: toGridId,
      fromCoords,
      toCoords: { column: toCoords.column, row: toCoords.row },
    });

    this.emit(event);

    return { success: true, event };
  }

  drop(): Result {
    if (this.state.grabbedItemId === null) {
      return { success: false, error: 'No item is currently grabbed' };
    }

    const item = this.state.items.get(this.state.grabbedItemId);
    if (!item) {
      return { success: false, error: 'Grabbed item no longer exists' };
    }

    const droppedAt = { column: item.coordinates.column, row: item.coordinates.row };
    const droppedOnGrid = item.gridId;

    // Clear grab state
    this.state.grabbedItemId = null;
    this.state.grabbedFromGrid = null;
    this.state.grabbedFromCoords = null;
    this.state.mode = 'navigation';
    this.state.activeDropTargetGridId = null;

    const event = this.createEvent({
      type: 'itemDropped',
      itemId: item.id,
      item: { ...item },
      toGrid: droppedOnGrid,
      toCoords: droppedAt,
    });

    this.emit(event);

    return { success: true, event };
  }

  cancelGrab(): Result {
    if (this.state.grabbedItemId === null) {
      return { success: false, error: 'No item is currently grabbed' };
    }

    const item = this.state.items.get(this.state.grabbedItemId);
    if (!item) {
      return { success: false, error: 'Grabbed item no longer exists' };
    }

    const originalGrid = this.state.grabbedFromGrid!;
    const originalCoords = this.state.grabbedFromCoords!;

    // Move the item back to its original position
    this.removeItemFromCell(item);

    // Handle cross-grid return (if the item was moved to another grid during grab)
    if (item.gridId !== originalGrid) {
      const currentGrid = this.state.grids.get(item.gridId);
      if (currentGrid) {
        currentGrid.itemIds.delete(item.id);
      }
      const origGrid = this.state.grids.get(originalGrid);
      if (origGrid) {
        origGrid.itemIds.add(item.id);
      }
      item.gridId = originalGrid;
    }

    item.coordinates = { column: originalCoords.column, row: originalCoords.row };
    this.placeItemInCell(originalGrid, originalCoords, item.id);

    // Clear grab state
    this.state.grabbedItemId = null;
    this.state.grabbedFromGrid = null;
    this.state.grabbedFromCoords = null;
    this.state.mode = 'navigation';
    this.state.activeDropTargetGridId = null;

    const event = this.createEvent({
      type: 'grabCancelled',
      itemId: item.id,
      item: { ...item },
      fromGrid: originalGrid,
      fromCoords: { column: originalCoords.column, row: originalCoords.row },
    });

    this.emit(event);

    return { success: true, event };
  }

  isGrabbing(): boolean {
    return this.state.grabbedItemId !== null;
  }

  getGrabbedItem(): ItemState | null {
    if (this.state.grabbedItemId === null) return null;
    return this.state.items.get(this.state.grabbedItemId) ?? null;
  }

  // =========================================================================
  // Direct Transfer
  // =========================================================================

  transferItem(itemId: string, toGrid: string, toCoords: Coordinates): Result {
    const item = this.state.items.get(itemId);
    if (!item) {
      return { success: false, error: `Item "${itemId}" does not exist` };
    }

    const targetGrid = this.state.grids.get(toGrid);
    if (!targetGrid) {
      return { success: false, error: `Grid "${toGrid}" is not registered` };
    }

    if (!CoordinateSystem.isValid(toCoords, targetGrid.config)) {
      return { success: false, error: `Coordinates (${toCoords.column}, ${toCoords.row}) are out of bounds for grid "${toGrid}"` };
    }

    // Check for blocked cell
    const targetKey = CoordinateSystem.toKey(toCoords);
    const targetCell = targetGrid.cells.get(targetKey);
    if (targetCell && targetCell.isBlocked) {
      return { success: false, error: `Target cell (${toCoords.column}, ${toCoords.row}) is blocked` };
    }

    // Check for occupancy conflicts
    const occupants = this.getItemsAt(toGrid, toCoords);
    if (occupants.length > 0) {
      if (!targetGrid.config.allowStacking) {
        return { success: false, error: `Cell (${toCoords.column}, ${toCoords.row}) is occupied and stacking is not allowed` };
      }
      if (
        targetGrid.config.maxStackSize !== undefined &&
        targetCell &&
        targetCell.itemIds.length >= targetGrid.config.maxStackSize
      ) {
        return { success: false, error: `Cell (${toCoords.column}, ${toCoords.row}) has reached max stack size` };
      }
    }

    const fromGrid = item.gridId;
    const fromCoords = { column: item.coordinates.column, row: item.coordinates.row };

    // Remove from old cell
    this.removeItemFromCell(item);

    // Handle cross-grid transfer
    if (item.gridId !== toGrid) {
      const oldGrid = this.state.grids.get(item.gridId);
      if (oldGrid) {
        oldGrid.itemIds.delete(item.id);
      }
      targetGrid.itemIds.add(item.id);
      item.gridId = toGrid;
    }

    // Update coordinates
    item.coordinates = { column: toCoords.column, row: toCoords.row };

    // Place in new cell
    this.placeItemInCell(toGrid, toCoords, item.id);

    const event = this.createEvent({
      type: 'itemTransferred',
      itemId: item.id,
      item: { ...item },
      fromGrid,
      toGrid,
      fromCoords,
      toCoords: { column: toCoords.column, row: toCoords.row },
    });

    this.emit(event);

    return { success: true, event };
  }

  // =========================================================================
  // Tapping
  // =========================================================================

  tapClockwise(itemId: string): Result {
    const item = this.state.items.get(itemId);
    if (!item) {
      return { success: false, error: `Item "${itemId}" does not exist` };
    }

    if (!item.canTap) {
      return { success: false, error: `Item "${itemId}" cannot be tapped` };
    }

    const previousTapAngle = item.tapAngle;
    const newTapAngle = TapSystem.tapClockwise(previousTapAngle);
    item.tapAngle = newTapAngle;

    const event = this.createEvent({
      type: 'itemTapped',
      itemId: item.id,
      item: { ...item },
      previousTapAngle,
      newTapAngle,
      gridId: item.gridId,
    });

    this.emit(event);

    return { success: true, event };
  }

  tapCounterClockwise(itemId: string): Result {
    const item = this.state.items.get(itemId);
    if (!item) {
      return { success: false, error: `Item "${itemId}" does not exist` };
    }

    if (!item.canTap) {
      return { success: false, error: `Item "${itemId}" cannot be tapped` };
    }

    const previousTapAngle = item.tapAngle;
    const newTapAngle = TapSystem.tapCounterClockwise(previousTapAngle);
    item.tapAngle = newTapAngle;

    const event = this.createEvent({
      type: 'itemTapped',
      itemId: item.id,
      item: { ...item },
      previousTapAngle,
      newTapAngle,
      gridId: item.gridId,
    });

    this.emit(event);

    return { success: true, event };
  }

  setTapAngle(itemId: string, angle: TapAngle): Result {
    const item = this.state.items.get(itemId);
    if (!item) {
      return { success: false, error: `Item "${itemId}" does not exist` };
    }

    if (!item.canTap) {
      return { success: false, error: `Item "${itemId}" cannot be tapped` };
    }

    if (!TapSystem.ANGLES.includes(angle)) {
      return { success: false, error: `Invalid tap angle: ${angle}` };
    }

    const previousTapAngle = item.tapAngle;
    item.tapAngle = angle;

    const event = this.createEvent({
      type: 'itemTapped',
      itemId: item.id,
      item: { ...item },
      previousTapAngle,
      newTapAngle: angle,
      gridId: item.gridId,
    });

    this.emit(event);

    return { success: true, event };
  }

  // =========================================================================
  // Face Down
  // =========================================================================

  flipItem(itemId: string): Result {
    const item = this.state.items.get(itemId);
    if (!item) {
      return { success: false, error: `Item "${itemId}" does not exist` };
    }

    item.isFaceDown = !item.isFaceDown;

    const event = this.createEvent({
      type: 'itemFlipped',
      itemId: item.id,
      item: { ...item },
      gridId: item.gridId,
    });

    this.emit(event);

    return { success: true, event };
  }

  // =========================================================================
  // Focus Management (logical, not DOM)
  // =========================================================================

  setFocusedGrid(gridId: string): void {
    const grid = this.state.grids.get(gridId);
    if (!grid) {
      throw new Error(`Grid "${gridId}" is not registered`);
    }

    const fromCoords = this.state.focusedCell
      ? { column: this.state.focusedCell.column, row: this.state.focusedCell.row }
      : null;

    this.state.focusedGridId = gridId;

    // If no cell is focused yet, default to (1, 1)
    if (this.state.focusedCell === null) {
      this.state.focusedCell = { column: 1, row: 1 };
    }

    const toCoords = { column: this.state.focusedCell.column, row: this.state.focusedCell.row };

    // Emit focusMoved so the React layer can sync state
    const event = this.createEvent({
      type: 'focusMoved',
      gridId,
      fromCoords: fromCoords ?? toCoords,
      toCoords,
    });
    this.emit(event);
  }

  setFocusedCell(coords: Coordinates): void {
    if (this.state.focusedGridId === null) {
      return;
    }

    const grid = this.state.grids.get(this.state.focusedGridId);
    if (!grid) return;

    if (!CoordinateSystem.isValid(coords, grid.config)) {
      return;
    }

    const fromCoords = this.state.focusedCell
      ? { column: this.state.focusedCell.column, row: this.state.focusedCell.row }
      : { column: coords.column, row: coords.row };

    this.state.focusedCell = { column: coords.column, row: coords.row };

    // Emit focusMoved so the React layer can sync state
    const event = this.createEvent({
      type: 'focusMoved',
      gridId: this.state.focusedGridId,
      fromCoords,
      toCoords: { column: coords.column, row: coords.row },
    });
    this.emit(event);
  }

  moveFocus(direction: Direction): Coordinates | null {
    if (this.state.focusedGridId === null || this.state.focusedCell === null) {
      return null;
    }

    const grid = this.state.grids.get(this.state.focusedGridId);
    if (!grid) return null;

    const newCoords = CoordinateSystem.adjacent(this.state.focusedCell, direction);

    // Don't wrap - return null if at edge
    if (!CoordinateSystem.isValid(newCoords, grid.config)) {
      return null;
    }

    const fromCoords = { column: this.state.focusedCell.column, row: this.state.focusedCell.row };
    this.state.focusedCell = { column: newCoords.column, row: newCoords.row };

    const event = this.createEvent({
      type: 'focusMoved',
      gridId: this.state.focusedGridId,
      fromCoords,
      toCoords: { column: newCoords.column, row: newCoords.row },
    });

    this.emit(event);

    return { column: newCoords.column, row: newCoords.row };
  }

  getFocusedCell(): { gridId: string; coords: Coordinates } | null {
    if (this.state.focusedGridId === null || this.state.focusedCell === null) {
      return null;
    }

    return {
      gridId: this.state.focusedGridId,
      coords: { column: this.state.focusedCell.column, row: this.state.focusedCell.row },
    };
  }

  // =========================================================================
  // Event System
  // =========================================================================

  on(event: GridEventType, handler: (event: GridEvent) => void): () => void {
    let handlers = this.listeners.get(event);
    if (!handlers) {
      handlers = new Set();
      this.listeners.set(event, handlers);
    }
    handlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }

  off(event: GridEventType, handler: (event: GridEvent) => void): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  // =========================================================================
  // Readonly Snapshot
  // =========================================================================

  getState(): EngineState {
    return this.state;
  }

  getReadonlySnapshot(): GridEngineReadonly {
    return {
      getGrid: (gridId: string) => this.getGrid(gridId),
      getItem: (itemId: string) => this.getItem(itemId),
      getItemsAt: (gridId: string, at: Coordinates) => this.getItemsAt(gridId, at),
      getItemsInGrid: (gridId: string) => this.getItemsInGrid(gridId),
    };
  }
}
