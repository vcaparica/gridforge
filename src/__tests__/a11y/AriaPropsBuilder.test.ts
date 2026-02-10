// @vitest-environment node
import { AriaPropsBuilder } from '../../accessibility/AriaPropsBuilder.ts';
import type { GridState, CellState, ItemState } from '../../core/types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGridState(overrides: Partial<GridState> = {}): GridState {
  return {
    config: {
      id: 'grid-1',
      columns: 8,
      rows: 8,
      type: '2d',
      label: 'Main Battlefield',
      allowStacking: false,
      sparse: true,
    },
    cells: new Map(),
    itemIds: new Set(),
    isRendered: true,
    ...overrides,
  };
}

function makeCell(overrides: Partial<CellState> = {}): CellState {
  return {
    coordinates: { column: 3, row: 2 },
    itemIds: [],
    isDropTarget: false,
    isBlocked: false,
    metadata: {},
    ...overrides,
  };
}

function makeItem(overrides: Partial<ItemState> = {}): ItemState {
  return {
    id: 'item-1',
    label: 'Black Lotus',
    coordinates: { column: 3, row: 2 },
    gridId: 'grid-1',
    tapAngle: 0,
    canMove: true,
    canRemove: true,
    canTap: true,
    isFaceDown: false,
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AriaPropsBuilder', () => {
  // ── gridProps ───────────────────────────────────────────────────────

  describe('gridProps', () => {
    it('returns role="grid" with correct aria-label, aria-colcount, aria-rowcount', () => {
      const grid = makeGridState();
      const props = AriaPropsBuilder.gridProps(grid, false);

      expect(props['role']).toBe('grid');
      expect(props['aria-label']).toBe('Main Battlefield');
      expect(props['aria-colcount']).toBe('8');
      expect(props['aria-rowcount']).toBe('8');
    });

    it('includes aria-description when grid has a description', () => {
      const grid = makeGridState({
        config: {
          id: 'grid-1',
          columns: 8,
          rows: 8,
          type: '2d',
          label: 'Main Battlefield',
          description: 'An 8x8 game board',
          allowStacking: false,
          sparse: true,
        },
      });
      const props = AriaPropsBuilder.gridProps(grid, false);

      expect(props['aria-description']).toBe('An 8x8 game board');
    });

    it('omits aria-description when grid has no description', () => {
      const grid = makeGridState();
      const props = AriaPropsBuilder.gridProps(grid, false);

      expect(props['aria-description']).toBeUndefined();
    });
  });

  // ── rowProps ────────────────────────────────────────────────────────

  describe('rowProps', () => {
    it('returns role="row" and correct aria-rowindex', () => {
      const props = AriaPropsBuilder.rowProps(5);

      expect(props['role']).toBe('row');
      expect(props['aria-rowindex']).toBe('5');
    });
  });

  // ── cellProps ───────────────────────────────────────────────────────

  describe('cellProps', () => {
    it('returns role="gridcell" with tabindex="-1" for an empty unfocused 2D cell', () => {
      const cell = makeCell();
      const props = AriaPropsBuilder.cellProps(cell, [], false, false, false, '2d');

      expect(props['role']).toBe('gridcell');
      expect(props['tabIndex']).toBe('-1');
    });

    it('returns role="option" for a 1D grid cell', () => {
      const cell = makeCell();
      const props = AriaPropsBuilder.cellProps(cell, [], false, false, false, '1d');

      expect(props['role']).toBe('option');
    });

    it('empty cell aria-label contains "Empty"', () => {
      const cell = makeCell();
      const props = AriaPropsBuilder.cellProps(cell, [], false, false, false, '2d');

      expect(props['aria-label']).toContain('Empty');
    });

    it('focused cell has tabindex="0"', () => {
      const cell = makeCell();
      const props = AriaPropsBuilder.cellProps(cell, [], true, false, false, '2d');

      expect(props['tabIndex']).toBe('0');
    });

    it('occupied cell aria-label contains item label with tap state', () => {
      const item = makeItem({ label: 'Black Lotus', tapAngle: 0 });
      const cell = makeCell({ itemIds: ['item-1'] });
      const props = AriaPropsBuilder.cellProps(cell, [item], false, false, false, '2d');

      expect(props['aria-label']).toContain('Black Lotus');
      expect(props['aria-label']).toContain('upright');
    });

    it('tapped item cell aria-label contains tap state', () => {
      const item = makeItem({ label: 'Goblin Token', tapAngle: 90 });
      const cell = makeCell({ itemIds: ['item-1'] });
      const props = AriaPropsBuilder.cellProps(cell, [item], false, false, false, '2d');

      expect(props['aria-label']).toContain('tapped');
    });

    it('blocked cell aria-label contains "Blocked"', () => {
      const cell = makeCell({ isBlocked: true });
      const props = AriaPropsBuilder.cellProps(cell, [], false, false, false, '2d');

      expect(props['aria-label']).toContain('Blocked');
    });

    it('grab source cell has aria-selected="true"', () => {
      const item = makeItem();
      const cell = makeCell({ itemIds: ['item-1'] });
      const props = AriaPropsBuilder.cellProps(cell, [item], false, true, false, '2d');

      expect(props['aria-selected']).toBe('true');
    });

    it('drop target cell has aria-selected="true"', () => {
      const cell = makeCell({ isDropTarget: true });
      const props = AriaPropsBuilder.cellProps(cell, [], false, false, true, '2d');

      expect(props['aria-selected']).toBe('true');
    });
  });

  // ── itemProps ───────────────────────────────────────────────────────

  describe('itemProps', () => {
    it('aria-label includes tap state via TapSystem', () => {
      const item = makeItem({ label: 'Black Lotus', tapAngle: 90 });
      const props = AriaPropsBuilder.itemProps(item, false);

      expect(props['aria-label']).toContain('Black Lotus');
      expect(props['aria-label']).toContain('tapped');
    });

    it('grabbed item has aria-selected="true"', () => {
      const item = makeItem();
      const props = AriaPropsBuilder.itemProps(item, true);

      expect(props['aria-selected']).toBe('true');
    });

    it('non-grabbed item does not have aria-selected', () => {
      const item = makeItem();
      const props = AriaPropsBuilder.itemProps(item, false);

      expect(props['aria-selected']).toBeUndefined();
    });

    it('item with canTap has aria-roledescription="card"', () => {
      const item = makeItem({ canTap: true });
      const props = AriaPropsBuilder.itemProps(item, false);

      expect(props['aria-roledescription']).toBe('card');
    });

    it('item without canTap has aria-roledescription="item"', () => {
      const item = makeItem({ canTap: false });
      const props = AriaPropsBuilder.itemProps(item, false);

      expect(props['aria-roledescription']).toBe('item');
    });
  });

  // ── listboxProps ────────────────────────────────────────────────────

  describe('listboxProps', () => {
    it('returns role="listbox" with correct aria-label', () => {
      const grid = makeGridState({
        config: {
          id: 'hand-1',
          columns: 7,
          rows: 1,
          type: '1d',
          label: 'Player Hand',
          allowStacking: false,
          sparse: true,
        },
      });
      const props = AriaPropsBuilder.listboxProps(grid);

      expect(props['role']).toBe('listbox');
      expect(props['aria-label']).toBe('Player Hand');
    });
  });

  // ── optionProps ─────────────────────────────────────────────────────

  describe('optionProps', () => {
    it('returns role="option" with correct positional and selection attributes', () => {
      const item = makeItem({ label: 'Island', tapAngle: 0 });
      const props = AriaPropsBuilder.optionProps(item, 3, 7, true);

      expect(props['role']).toBe('option');
      expect(props['aria-posinset']).toBe('3');
      expect(props['aria-setsize']).toBe('7');
      expect(props['aria-selected']).toBe('true');
    });

    it('returns aria-selected="false" when not selected', () => {
      const item = makeItem({ label: 'Mountain', tapAngle: 0 });
      const props = AriaPropsBuilder.optionProps(item, 1, 5, false);

      expect(props['aria-selected']).toBe('false');
    });

    it('aria-label includes tap state via TapSystem', () => {
      const item = makeItem({ label: 'Lightning Bolt', tapAngle: 90 });
      const props = AriaPropsBuilder.optionProps(item, 2, 5, false);

      expect(props['aria-label']).toContain('Lightning Bolt');
      expect(props['aria-label']).toContain('tapped');
    });
  });
});
