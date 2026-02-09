// @vitest-environment node
import { MovementResolver } from '../../core/MovementResolver.ts';
import type {
  ItemState,
  CellState,
  GridConfig,
  GridEngineReadonly,
  ConflictResolution,
  Coordinates,
} from '../../core/types.ts';
import { CoordinateSystem } from '../../core/CoordinateSystem.ts';

// ── Factory helpers ──────────────────────────────────────────────────────

function makeGridConfig(overrides?: Partial<GridConfig>): GridConfig {
  return {
    id: 'grid1',
    columns: 5,
    rows: 5,
    type: '2d',
    label: 'Test Grid',
    allowStacking: false,
    sparse: true,
    ...overrides,
  };
}

function makeItem(overrides?: Partial<ItemState>): ItemState {
  return {
    id: 'item1',
    label: 'Test Item',
    coordinates: { column: 2, row: 2 },
    gridId: 'grid1',
    tapAngle: 0,
    canMove: true,
    canRemove: true,
    canTap: true,
    metadata: {},
    ...overrides,
  };
}

function makeCell(
  coords: Coordinates,
  itemIds: string[] = [],
  overrides?: Partial<CellState>
): CellState {
  return {
    coordinates: { column: coords.column, row: coords.row },
    itemIds,
    isDropTarget: false,
    isBlocked: false,
    metadata: {},
    ...overrides,
  };
}

function makeCellsMap(cells: CellState[]): Map<string, CellState> {
  const map = new Map<string, CellState>();
  for (const cell of cells) {
    map.set(CoordinateSystem.toKey(cell.coordinates), cell);
  }
  return map;
}

function makeReadonly(): GridEngineReadonly {
  return {
    getGrid: () => undefined,
    getItem: () => undefined,
    getItemsAt: () => [],
    getItemsInGrid: () => [],
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('MovementResolver', () => {
  // ── swap ──────────────────────────────────────────────────────────────

  describe('swap strategy', () => {
    it('returns action "swap" with correct displaced item', () => {
      const movingItem = makeItem({ id: 'mover', coordinates: { column: 1, row: 1 } });
      const occupant = makeItem({ id: 'occupant', coordinates: { column: 2, row: 2 } });
      const targetCell = makeCell({ column: 2, row: 2 }, ['occupant']);
      const config = makeGridConfig();
      const allCells = makeCellsMap([targetCell]);

      const result = MovementResolver.resolve(
        'swap',
        movingItem,
        targetCell,
        [occupant],
        config,
        allCells,
        makeReadonly(),
        'right'
      );

      expect(result.action).toBe('swap');
      expect(result.displacedItems).toHaveLength(1);
      expect(result.displacedItems![0].itemId).toBe('occupant');
      expect(result.displacedItems![0].to).toEqual({ column: 1, row: 1 });
    });

    it('swaps with the top item of the stack (last in occupants array)', () => {
      const movingItem = makeItem({ id: 'mover', coordinates: { column: 1, row: 1 } });
      const bottom = makeItem({ id: 'bottom', coordinates: { column: 2, row: 2 } });
      const top = makeItem({ id: 'top', coordinates: { column: 2, row: 2 } });
      const targetCell = makeCell({ column: 2, row: 2 }, ['bottom', 'top']);
      const config = makeGridConfig({ allowStacking: true });
      const allCells = makeCellsMap([targetCell]);

      const result = MovementResolver.resolve(
        'swap',
        movingItem,
        targetCell,
        [bottom, top],
        config,
        allCells,
        makeReadonly(),
        'right'
      );

      expect(result.action).toBe('swap');
      expect(result.displacedItems).toHaveLength(1);
      expect(result.displacedItems![0].itemId).toBe('top');
    });
  });

  // ── push ──────────────────────────────────────────────────────────────

  describe('push strategy', () => {
    it('returns action "displace" with correct push destination', () => {
      const movingItem = makeItem({ id: 'mover', coordinates: { column: 2, row: 3 } });
      const occupant = makeItem({ id: 'occupant', coordinates: { column: 3, row: 3 } });
      const targetCell = makeCell({ column: 3, row: 3 }, ['occupant']);
      const config = makeGridConfig();
      const allCells = makeCellsMap([targetCell]);

      const result = MovementResolver.resolve(
        'push',
        movingItem,
        targetCell,
        [occupant],
        config,
        allCells,
        makeReadonly(),
        'right'
      );

      expect(result.action).toBe('displace');
      expect(result.displacedItems).toHaveLength(1);
      expect(result.displacedItems![0].itemId).toBe('occupant');
      // Pushed one cell further to the right: column 3 -> column 4
      expect(result.displacedItems![0].to).toEqual({ column: 4, row: 3 });
    });

    it('blocks when no direction is provided', () => {
      const movingItem = makeItem({ id: 'mover', coordinates: { column: 1, row: 1 } });
      const occupant = makeItem({ id: 'occupant', coordinates: { column: 2, row: 2 } });
      const targetCell = makeCell({ column: 2, row: 2 }, ['occupant']);
      const config = makeGridConfig();
      const allCells = makeCellsMap([targetCell]);

      const result = MovementResolver.resolve(
        'push',
        movingItem,
        targetCell,
        [occupant],
        config,
        allCells,
        makeReadonly(),
        undefined
      );

      expect(result.action).toBe('block');
    });

    it('blocks when push destination is out of bounds', () => {
      const movingItem = makeItem({ id: 'mover', coordinates: { column: 4, row: 3 } });
      const occupant = makeItem({ id: 'occupant', coordinates: { column: 5, row: 3 } });
      const targetCell = makeCell({ column: 5, row: 3 }, ['occupant']);
      const config = makeGridConfig({ columns: 5 });
      const allCells = makeCellsMap([targetCell]);

      const result = MovementResolver.resolve(
        'push',
        movingItem,
        targetCell,
        [occupant],
        config,
        allCells,
        makeReadonly(),
        'right'
      );

      // Column 5 + right = column 6, which is out of bounds for a 5-column grid
      expect(result.action).toBe('block');
    });

    it('blocks when push destination is occupied', () => {
      const movingItem = makeItem({ id: 'mover', coordinates: { column: 2, row: 3 } });
      const occupant = makeItem({ id: 'occupant', coordinates: { column: 3, row: 3 } });
      const targetCell = makeCell({ column: 3, row: 3 }, ['occupant']);
      const blockerCell = makeCell({ column: 4, row: 3 }, ['blocker']);
      const config = makeGridConfig();
      const allCells = makeCellsMap([targetCell, blockerCell]);

      const result = MovementResolver.resolve(
        'push',
        movingItem,
        targetCell,
        [occupant],
        config,
        allCells,
        makeReadonly(),
        'right'
      );

      expect(result.action).toBe('block');
    });
  });

  // ── stack ─────────────────────────────────────────────────────────────

  describe('stack strategy', () => {
    it('returns action "stack" for normal case', () => {
      const movingItem = makeItem({ id: 'mover', coordinates: { column: 1, row: 1 } });
      const occupant = makeItem({ id: 'occupant', coordinates: { column: 2, row: 2 } });
      const targetCell = makeCell({ column: 2, row: 2 }, ['occupant']);
      const config = makeGridConfig({ allowStacking: true });
      const allCells = makeCellsMap([targetCell]);

      const result = MovementResolver.resolve(
        'stack',
        movingItem,
        targetCell,
        [occupant],
        config,
        allCells,
        makeReadonly(),
        'right'
      );

      expect(result.action).toBe('stack');
    });

    it('blocks when maxStackSize is reached', () => {
      const movingItem = makeItem({ id: 'mover', coordinates: { column: 1, row: 1 } });
      const occupant1 = makeItem({ id: 'occ1', coordinates: { column: 2, row: 2 } });
      const occupant2 = makeItem({ id: 'occ2', coordinates: { column: 2, row: 2 } });
      const targetCell = makeCell({ column: 2, row: 2 }, ['occ1', 'occ2']);
      const config = makeGridConfig({ allowStacking: true, maxStackSize: 2 });
      const allCells = makeCellsMap([targetCell]);

      const result = MovementResolver.resolve(
        'stack',
        movingItem,
        targetCell,
        [occupant1, occupant2],
        config,
        allCells,
        makeReadonly(),
        'right'
      );

      expect(result.action).toBe('block');
    });
  });

  // ── block ─────────────────────────────────────────────────────────────

  describe('block strategy', () => {
    it('always returns action "block"', () => {
      const movingItem = makeItem({ id: 'mover', coordinates: { column: 1, row: 1 } });
      const occupant = makeItem({ id: 'occupant', coordinates: { column: 2, row: 2 } });
      const targetCell = makeCell({ column: 2, row: 2 }, ['occupant']);
      const config = makeGridConfig();
      const allCells = makeCellsMap([targetCell]);

      const result = MovementResolver.resolve(
        'block',
        movingItem,
        targetCell,
        [occupant],
        config,
        allCells,
        makeReadonly(),
        'right'
      );

      expect(result.action).toBe('block');
      expect(result.message).toBe('Cell is occupied');
    });
  });

  // ── replace ───────────────────────────────────────────────────────────

  describe('replace strategy', () => {
    it('returns action "allow" with empty displacedItems', () => {
      const movingItem = makeItem({ id: 'mover', coordinates: { column: 1, row: 1 } });
      const occupant = makeItem({ id: 'occupant', coordinates: { column: 2, row: 2 } });
      const targetCell = makeCell({ column: 2, row: 2 }, ['occupant']);
      const config = makeGridConfig();
      const allCells = makeCellsMap([targetCell]);

      const result = MovementResolver.resolve(
        'replace',
        movingItem,
        targetCell,
        [occupant],
        config,
        allCells,
        makeReadonly(),
        'right'
      );

      expect(result.action).toBe('allow');
      expect(result.displacedItems).toEqual([]);
    });
  });

  // ── custom resolver ───────────────────────────────────────────────────

  describe('custom resolver', () => {
    it('calls the function with correct args and returns its result', () => {
      const movingItem = makeItem({ id: 'mover', coordinates: { column: 1, row: 1 } });
      const occupant = makeItem({ id: 'occupant', coordinates: { column: 2, row: 2 } });
      const targetCell = makeCell({ column: 2, row: 2 }, ['occupant']);
      const config = makeGridConfig();
      const allCells = makeCellsMap([targetCell]);
      const readonly = makeReadonly();

      const customResolution: ConflictResolution = {
        action: 'allow',
        message: 'custom resolution',
      };

      const customResolver = vi.fn().mockReturnValue(customResolution);

      const result = MovementResolver.resolve(
        customResolver,
        movingItem,
        targetCell,
        [occupant],
        config,
        allCells,
        readonly,
        'right'
      );

      expect(customResolver).toHaveBeenCalledOnce();
      expect(customResolver).toHaveBeenCalledWith(
        movingItem,
        targetCell,
        [occupant],
        readonly
      );
      expect(result).toBe(customResolution);
    });
  });
});
