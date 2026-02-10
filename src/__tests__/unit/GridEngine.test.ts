// @vitest-environment node
import { GridEngine } from '../../core/GridEngine.ts';
import type {
  GridConfig,
  GridEvent,
  ItemState,
  ConflictResolution,
} from '../../core/types.ts';

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

function makeItem(overrides?: Partial<Omit<ItemState, 'coordinates' | 'gridId' | 'tapAngle'>>) {
  return {
    id: 'item1',
    label: 'Test Item',
    canMove: true,
    canRemove: true,
    canTap: true,
    metadata: {},
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('GridEngine', () => {
  // ═══════════════════════════════════════════════════════════════════════
  // Grid Registry
  // ═══════════════════════════════════════════════════════════════════════

  describe('Grid Registry', () => {
    it('registerGrid then getGrid returns the grid', () => {
      const engine = new GridEngine();
      const config = makeGridConfig();
      engine.registerGrid(config);

      const grid = engine.getGrid('grid1');
      expect(grid).toBeDefined();
      expect(grid!.config.id).toBe('grid1');
      expect(grid!.config.columns).toBe(5);
      expect(grid!.config.rows).toBe(5);
    });

    it('register multiple grids then getAllGrids returns all', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig({ id: 'g1' }));
      engine.registerGrid(makeGridConfig({ id: 'g2' }));
      engine.registerGrid(makeGridConfig({ id: 'g3' }));

      const all = engine.getAllGrids();
      expect(all).toHaveLength(3);
      const ids = all.map((g) => g.config.id).sort();
      expect(ids).toEqual(['g1', 'g2', 'g3']);
    });

    it('unregisterGrid then getGrid returns undefined', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.unregisterGrid('grid1');

      expect(engine.getGrid('grid1')).toBeUndefined();
    });

    it('setGridRendered changes the isRendered flag', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());

      expect(engine.getGrid('grid1')!.isRendered).toBe(false);

      engine.setGridRendered('grid1', true);
      expect(engine.getGrid('grid1')!.isRendered).toBe(true);

      engine.setGridRendered('grid1', false);
      expect(engine.getGrid('grid1')!.isRendered).toBe(false);
    });

    it('getRenderedGrids returns only rendered grids', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig({ id: 'rendered1' }));
      engine.registerGrid(makeGridConfig({ id: 'rendered2' }));
      engine.registerGrid(makeGridConfig({ id: 'notRendered' }));

      engine.setGridRendered('rendered1', true);
      engine.setGridRendered('rendered2', true);

      const rendered = engine.getRenderedGrids();
      expect(rendered).toHaveLength(2);
      const ids = rendered.map((g) => g.config.id).sort();
      expect(ids).toEqual(['rendered1', 'rendered2']);
    });

    it('getNonRenderedGrids returns only non-rendered grids', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig({ id: 'rendered' }));
      engine.registerGrid(makeGridConfig({ id: 'notRendered1' }));
      engine.registerGrid(makeGridConfig({ id: 'notRendered2' }));

      engine.setGridRendered('rendered', true);

      const nonRendered = engine.getNonRenderedGrids();
      expect(nonRendered).toHaveLength(2);
      const ids = nonRendered.map((g) => g.config.id).sort();
      expect(ids).toEqual(['notRendered1', 'notRendered2']);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Item Management
  // ═══════════════════════════════════════════════════════════════════════

  describe('Item Management', () => {
    it('addItem places item with correct coords, gridId, and tapAngle=0', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());

      const result = engine.addItem(makeItem(), 'grid1', { column: 3, row: 3 });
      expect(result.success).toBe(true);

      const item = engine.getItem('item1');
      expect(item).toBeDefined();
      expect(item!.coordinates).toEqual({ column: 3, row: 3 });
      expect(item!.gridId).toBe('grid1');
      expect(item!.tapAngle).toBe(0);
    });

    it('addItem to non-existent grid returns error', () => {
      const engine = new GridEngine();
      const result = engine.addItem(makeItem(), 'nonexistent', { column: 1, row: 1 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not registered');
    });

    it('addItem with duplicate id returns error', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());

      engine.addItem(makeItem({ id: 'dup' }), 'grid1', { column: 1, row: 1 });
      const result = engine.addItem(makeItem({ id: 'dup' }), 'grid1', { column: 2, row: 2 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('removeItem then getItem returns undefined and cell is empty', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.addItem(makeItem(), 'grid1', { column: 3, row: 3 });

      const result = engine.removeItem('item1');
      expect(result.success).toBe(true);
      expect(engine.getItem('item1')).toBeUndefined();
      expect(engine.getItemsAt('grid1', { column: 3, row: 3 })).toHaveLength(0);
    });

    it('removeItem for non-existent item returns error', () => {
      const engine = new GridEngine();
      const result = engine.removeItem('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('getItemsAt returns items at the given coordinates', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig({ allowStacking: true }));

      engine.addItem(makeItem({ id: 'a' }), 'grid1', { column: 2, row: 2 });
      engine.addItem(makeItem({ id: 'b' }), 'grid1', { column: 2, row: 2 });
      engine.addItem(makeItem({ id: 'c' }), 'grid1', { column: 3, row: 3 });

      const at22 = engine.getItemsAt('grid1', { column: 2, row: 2 });
      expect(at22).toHaveLength(2);
      const ids = at22.map((i) => i.id).sort();
      expect(ids).toEqual(['a', 'b']);
    });

    it('getItemsInGrid returns all items in the grid', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());

      engine.addItem(makeItem({ id: 'a' }), 'grid1', { column: 1, row: 1 });
      engine.addItem(makeItem({ id: 'b' }), 'grid1', { column: 2, row: 2 });
      engine.addItem(makeItem({ id: 'c' }), 'grid1', { column: 3, row: 3 });

      const items = engine.getItemsInGrid('grid1');
      expect(items).toHaveLength(3);
    });

    it('sparse placement: addItem at (5,5) on a 5x5 grid succeeds', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig({ columns: 5, rows: 5 }));

      const result = engine.addItem(makeItem(), 'grid1', { column: 5, row: 5 });
      expect(result.success).toBe(true);

      const item = engine.getItem('item1');
      expect(item!.coordinates).toEqual({ column: 5, row: 5 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Grab / Move / Drop
  // ═══════════════════════════════════════════════════════════════════════

  describe('Grab / Move / Drop', () => {
    function setupGrabbableEngine() {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem(), 'grid1', { column: 3, row: 3 });
      return engine;
    }

    it('grab sets isGrabbing() to true', () => {
      const engine = setupGrabbableEngine();
      expect(engine.isGrabbing()).toBe(false);

      engine.grab('item1');
      expect(engine.isGrabbing()).toBe(true);
    });

    it('grab makes getGrabbedItem return the item', () => {
      const engine = setupGrabbableEngine();
      engine.grab('item1');

      const grabbed = engine.getGrabbedItem();
      expect(grabbed).not.toBeNull();
      expect(grabbed!.id).toBe('item1');
    });

    it('grab non-movable item returns error', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem({ id: 'immovable', canMove: false }), 'grid1', { column: 1, row: 1 });

      const result = engine.grab('immovable');
      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be moved');
    });

    it('grab when already grabbing returns error', () => {
      const engine = setupGrabbableEngine();
      engine.addItem(makeItem({ id: 'item2' }), 'grid1', { column: 1, row: 1 });

      engine.grab('item1');
      const result = engine.grab('item2');
      expect(result.success).toBe(false);
      expect(result.error).toContain('already grabbed');
    });

    it('moveGrabbed "right" moves item to the right', () => {
      const engine = setupGrabbableEngine();
      engine.grab('item1');
      const result = engine.moveGrabbed('right');

      expect(result.success).toBe(true);
      expect(engine.getItem('item1')!.coordinates).toEqual({ column: 4, row: 3 });
    });

    it('moveGrabbed "left" moves item to the left', () => {
      const engine = setupGrabbableEngine();
      engine.grab('item1');
      engine.moveGrabbed('left');

      expect(engine.getItem('item1')!.coordinates).toEqual({ column: 2, row: 3 });
    });

    it('moveGrabbed "up" moves item up', () => {
      const engine = setupGrabbableEngine();
      engine.grab('item1');
      engine.moveGrabbed('up');

      expect(engine.getItem('item1')!.coordinates).toEqual({ column: 3, row: 2 });
    });

    it('moveGrabbed "down" moves item down', () => {
      const engine = setupGrabbableEngine();
      engine.grab('item1');
      engine.moveGrabbed('down');

      expect(engine.getItem('item1')!.coordinates).toEqual({ column: 3, row: 4 });
    });

    it('moveGrabbed out of bounds returns blocked result', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });
      engine.grab('item1');

      const result = engine.moveGrabbed('up');
      expect(result.success).toBe(false);
      expect(result.error).toContain('out of bounds');
    });

    it('moveGrabbed to occupied cell with "block" strategy is blocked', () => {
      const engine = new GridEngine({ conflictStrategy: 'block' });
      engine.registerGrid(makeGridConfig());
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem({ id: 'mover' }), 'grid1', { column: 2, row: 2 });
      engine.addItem(makeItem({ id: 'blocker' }), 'grid1', { column: 3, row: 2 });
      engine.grab('mover');

      const result = engine.moveGrabbed('right');
      expect(result.success).toBe(false);
      expect(engine.getItem('mover')!.coordinates).toEqual({ column: 2, row: 2 });
    });

    it('drop sets isGrabbing() to false', () => {
      const engine = setupGrabbableEngine();
      engine.grab('item1');
      engine.moveGrabbed('right');
      engine.drop();

      expect(engine.isGrabbing()).toBe(false);
    });

    it('drop leaves item at its current position', () => {
      const engine = setupGrabbableEngine();
      engine.grab('item1');
      engine.moveGrabbed('right');
      engine.drop();

      expect(engine.getItem('item1')!.coordinates).toEqual({ column: 4, row: 3 });
    });

    it('cancelGrab returns item to its origin', () => {
      const engine = setupGrabbableEngine();
      engine.grab('item1');
      engine.moveGrabbed('right');
      engine.moveGrabbed('right');
      engine.cancelGrab();

      expect(engine.isGrabbing()).toBe(false);
      expect(engine.getItem('item1')!.coordinates).toEqual({ column: 3, row: 3 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Transfer
  // ═══════════════════════════════════════════════════════════════════════

  describe('Transfer', () => {
    it('transferItem to a rendered grid succeeds', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig({ id: 'source' }));
      engine.registerGrid(makeGridConfig({ id: 'dest' }));
      engine.setGridRendered('source', true);
      engine.setGridRendered('dest', true);
      engine.addItem(makeItem(), 'source', { column: 1, row: 1 });

      const result = engine.transferItem('item1', 'dest', { column: 3, row: 3 });
      expect(result.success).toBe(true);

      const item = engine.getItem('item1');
      expect(item!.gridId).toBe('dest');
      expect(item!.coordinates).toEqual({ column: 3, row: 3 });
    });

    it('transferItem to a non-rendered grid succeeds with new gridId and coords', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig({ id: 'source' }));
      engine.registerGrid(makeGridConfig({ id: 'graveyard' }));
      engine.setGridRendered('source', true);
      // graveyard stays non-rendered
      engine.addItem(makeItem(), 'source', { column: 1, row: 1 });

      const result = engine.transferItem('item1', 'graveyard', { column: 1, row: 1 });
      expect(result.success).toBe(true);

      const item = engine.getItem('item1');
      expect(item!.gridId).toBe('graveyard');
      expect(item!.coordinates).toEqual({ column: 1, row: 1 });
    });

    it('transferItem to non-existent grid returns error', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });

      const result = engine.transferItem('item1', 'nonexistent', { column: 1, row: 1 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not registered');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Tapping
  // ═══════════════════════════════════════════════════════════════════════

  describe('Tapping', () => {
    function setupTappableEngine() {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });
      return engine;
    }

    it('tapClockwise increases angle by 45', () => {
      const engine = setupTappableEngine();
      engine.tapClockwise('item1');

      expect(engine.getItem('item1')!.tapAngle).toBe(45);
    });

    it('tapClockwise 8 times wraps back to 0', () => {
      const engine = setupTappableEngine();

      for (let i = 0; i < 8; i++) {
        engine.tapClockwise('item1');
      }

      expect(engine.getItem('item1')!.tapAngle).toBe(0);
    });

    it('tapCounterClockwise decreases angle by 45 (wraps 0 to 315)', () => {
      const engine = setupTappableEngine();
      engine.tapCounterClockwise('item1');

      expect(engine.getItem('item1')!.tapAngle).toBe(315);
    });

    it('setTapAngle sets angle to a specific value', () => {
      const engine = setupTappableEngine();
      engine.setTapAngle('item1', 180);

      expect(engine.getItem('item1')!.tapAngle).toBe(180);
    });

    it('tap on non-tappable item returns error', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.addItem(makeItem({ id: 'notap', canTap: false }), 'grid1', { column: 1, row: 1 });

      const result = engine.tapClockwise('notap');
      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be tapped');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Flip
  // ═══════════════════════════════════════════════════════════════════════

  describe('Flip', () => {
    it('flipItem toggles isFaceDown true then false', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });

      engine.flipItem('item1');
      expect(engine.getItem('item1')!.isFaceDown).toBe(true);

      engine.flipItem('item1');
      expect(engine.getItem('item1')!.isFaceDown).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Focus
  // ═══════════════════════════════════════════════════════════════════════

  describe('Focus', () => {
    it('setFocusedGrid + setFocusedCell makes getFocusedCell return correct value', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());

      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 3, row: 4 });

      const focus = engine.getFocusedCell();
      expect(focus).not.toBeNull();
      expect(focus!.gridId).toBe('grid1');
      expect(focus!.coords).toEqual({ column: 3, row: 4 });
    });

    it('moveFocus up from (3,3) yields (3,2)', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 3, row: 3 });

      const result = engine.moveFocus('up');
      expect(result).toEqual({ column: 3, row: 2 });
      expect(engine.getFocusedCell()!.coords).toEqual({ column: 3, row: 2 });
    });

    it('moveFocus down from (3,3) yields (3,4)', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 3, row: 3 });

      const result = engine.moveFocus('down');
      expect(result).toEqual({ column: 3, row: 4 });
    });

    it('moveFocus left from (3,3) yields (2,3)', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 3, row: 3 });

      const result = engine.moveFocus('left');
      expect(result).toEqual({ column: 2, row: 3 });
    });

    it('moveFocus right from (3,3) yields (4,3)', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 3, row: 3 });

      const result = engine.moveFocus('right');
      expect(result).toEqual({ column: 4, row: 3 });
    });

    it('moveFocus at top edge returns null', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 3, row: 1 });

      const result = engine.moveFocus('up');
      expect(result).toBeNull();
    });

    it('moveFocus at bottom edge returns null', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 3, row: 5 });

      const result = engine.moveFocus('down');
      expect(result).toBeNull();
    });

    it('moveFocus at left edge returns null', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 1, row: 3 });

      const result = engine.moveFocus('left');
      expect(result).toBeNull();
    });

    it('moveFocus at right edge returns null', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 5, row: 3 });

      const result = engine.moveFocus('right');
      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Events
  // ═══════════════════════════════════════════════════════════════════════

  describe('Events', () => {
    it('on("itemPlaced") fires when addItem is called', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());

      const handler = vi.fn();
      engine.on('itemPlaced', handler);

      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].type).toBe('itemPlaced');
      expect(handler.mock.calls[0][0].itemId).toBe('item1');
    });

    it('on("itemGrabbed") fires when grab is called', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });

      const handler = vi.fn();
      engine.on('itemGrabbed', handler);

      engine.grab('item1');

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].type).toBe('itemGrabbed');
      expect(handler.mock.calls[0][0].itemId).toBe('item1');
    });

    it('on("itemMoved") fires when moveGrabbed is called', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem(), 'grid1', { column: 3, row: 3 });
      engine.grab('item1');

      const handler = vi.fn();
      engine.on('itemMoved', handler);

      engine.moveGrabbed('right');

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].type).toBe('itemMoved');
      expect(handler.mock.calls[0][0].fromCoords).toEqual({ column: 3, row: 3 });
      expect(handler.mock.calls[0][0].toCoords).toEqual({ column: 4, row: 3 });
    });

    it('on("itemDropped") fires when drop is called', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem(), 'grid1', { column: 3, row: 3 });
      engine.grab('item1');

      const handler = vi.fn();
      engine.on('itemDropped', handler);

      engine.drop();

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].type).toBe('itemDropped');
      expect(handler.mock.calls[0][0].itemId).toBe('item1');
    });

    it('on("itemRemoved") fires when removeItem is called', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });

      const handler = vi.fn();
      engine.on('itemRemoved', handler);

      engine.removeItem('item1');

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].type).toBe('itemRemoved');
      expect(handler.mock.calls[0][0].itemId).toBe('item1');
    });

    it('on("itemTapped") fires with previous and new angles', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });

      const handler = vi.fn();
      engine.on('itemTapped', handler);

      engine.tapClockwise('item1');

      expect(handler).toHaveBeenCalledOnce();
      const event = handler.mock.calls[0][0] as GridEvent;
      expect(event.type).toBe('itemTapped');
      expect(event.previousTapAngle).toBe(0);
      expect(event.newTapAngle).toBe(45);
    });

    it('on("itemFlipped") fires when flip is called', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });

      const handler = vi.fn();
      engine.on('itemFlipped', handler);

      engine.flipItem('item1');

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].type).toBe('itemFlipped');
    });

    it('on("itemTransferred") fires for cross-grid transfer', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig({ id: 'source' }));
      engine.registerGrid(makeGridConfig({ id: 'dest' }));
      engine.addItem(makeItem(), 'source', { column: 1, row: 1 });

      const handler = vi.fn();
      engine.on('itemTransferred', handler);

      engine.transferItem('item1', 'dest', { column: 2, row: 2 });

      expect(handler).toHaveBeenCalledOnce();
      const event = handler.mock.calls[0][0] as GridEvent;
      expect(event.type).toBe('itemTransferred');
      expect(event.fromGrid).toBe('source');
      expect(event.toGrid).toBe('dest');
    });

    it('on("grabCancelled") fires when cancelGrab is called', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem(), 'grid1', { column: 3, row: 3 });
      engine.grab('item1');
      engine.moveGrabbed('right');

      const handler = vi.fn();
      engine.on('grabCancelled', handler);

      engine.cancelGrab();

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].type).toBe('grabCancelled');
    });

    it('on("moveBlocked") fires when a move is blocked', () => {
      const engine = new GridEngine({ conflictStrategy: 'block' });
      engine.registerGrid(makeGridConfig());
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem({ id: 'mover' }), 'grid1', { column: 2, row: 2 });
      engine.addItem(makeItem({ id: 'blocker' }), 'grid1', { column: 3, row: 2 });
      engine.grab('mover');

      const handler = vi.fn();
      engine.on('moveBlocked', handler);

      engine.moveGrabbed('right');

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].type).toBe('moveBlocked');
    });

    it('off() removes the listener', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());

      const handler = vi.fn();
      engine.on('itemPlaced', handler);
      engine.off('itemPlaced', handler);

      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });
      expect(handler).not.toHaveBeenCalled();
    });

    it('on() returns an unsubscribe function that works', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());

      const handler = vi.fn();
      const unsubscribe = engine.on('itemPlaced', handler);

      // Calling unsubscribe should remove the handler
      unsubscribe();

      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Conflict Strategies (with occupied cells)
  // ═══════════════════════════════════════════════════════════════════════

  describe('Conflict Strategies', () => {
    describe('swap strategy', () => {
      it('items exchange positions', () => {
        const engine = new GridEngine({ conflictStrategy: 'swap' });
        engine.registerGrid(makeGridConfig());
        engine.setGridRendered('grid1', true);
        engine.addItem(makeItem({ id: 'mover' }), 'grid1', { column: 2, row: 2 });
        engine.addItem(makeItem({ id: 'occupant' }), 'grid1', { column: 3, row: 2 });
        engine.grab('mover');

        const result = engine.moveGrabbed('right');
        expect(result.success).toBe(true);

        // mover should be at (3,2), occupant at (2,2)
        expect(engine.getItem('mover')!.coordinates).toEqual({ column: 3, row: 2 });
        expect(engine.getItem('occupant')!.coordinates).toEqual({ column: 2, row: 2 });
      });
    });

    describe('stack strategy', () => {
      it('item stacks on the occupied cell', () => {
        const engine = new GridEngine({ conflictStrategy: 'stack' });
        engine.registerGrid(makeGridConfig({ allowStacking: true }));
        engine.setGridRendered('grid1', true);
        engine.addItem(makeItem({ id: 'mover' }), 'grid1', { column: 2, row: 2 });
        engine.addItem(makeItem({ id: 'occupant' }), 'grid1', { column: 3, row: 2 });
        engine.grab('mover');

        const result = engine.moveGrabbed('right');
        expect(result.success).toBe(true);

        // Both items should now be at (3,2)
        expect(engine.getItem('mover')!.coordinates).toEqual({ column: 3, row: 2 });
        expect(engine.getItem('occupant')!.coordinates).toEqual({ column: 3, row: 2 });

        const itemsAtTarget = engine.getItemsAt('grid1', { column: 3, row: 2 });
        expect(itemsAtTarget).toHaveLength(2);
      });
    });

    describe('push strategy', () => {
      it('occupant is pushed in the move direction', () => {
        const engine = new GridEngine({ conflictStrategy: 'push' });
        engine.registerGrid(makeGridConfig());
        engine.setGridRendered('grid1', true);
        engine.addItem(makeItem({ id: 'mover' }), 'grid1', { column: 2, row: 2 });
        engine.addItem(makeItem({ id: 'occupant' }), 'grid1', { column: 3, row: 2 });
        engine.grab('mover');

        const result = engine.moveGrabbed('right');
        expect(result.success).toBe(true);

        // mover at (3,2), occupant pushed to (4,2)
        expect(engine.getItem('mover')!.coordinates).toEqual({ column: 3, row: 2 });
        expect(engine.getItem('occupant')!.coordinates).toEqual({ column: 4, row: 2 });
      });
    });

    describe('replace strategy', () => {
      it('occupant is removed and mover is placed', () => {
        const engine = new GridEngine({ conflictStrategy: 'replace' });
        engine.registerGrid(makeGridConfig());
        engine.setGridRendered('grid1', true);
        engine.addItem(makeItem({ id: 'mover' }), 'grid1', { column: 2, row: 2 });
        engine.addItem(makeItem({ id: 'victim' }), 'grid1', { column: 3, row: 2 });
        engine.grab('mover');

        const result = engine.moveGrabbed('right');
        expect(result.success).toBe(true);

        // mover at (3,2), victim removed entirely
        expect(engine.getItem('mover')!.coordinates).toEqual({ column: 3, row: 2 });
        expect(engine.getItem('victim')).toBeUndefined();
      });
    });

    describe('custom function strategy', () => {
      it('the custom function is called and its resolution applied', () => {
        const customResolver = vi.fn().mockReturnValue({
          action: 'allow',
          displacedItems: [],
        } satisfies ConflictResolution);

        const engine = new GridEngine({ conflictStrategy: customResolver });
        engine.registerGrid(makeGridConfig());
        engine.setGridRendered('grid1', true);
        engine.addItem(makeItem({ id: 'mover' }), 'grid1', { column: 2, row: 2 });
        engine.addItem(makeItem({ id: 'occupant' }), 'grid1', { column: 3, row: 2 });
        engine.grab('mover');

        const result = engine.moveGrabbed('right');
        expect(result.success).toBe(true);
        expect(customResolver).toHaveBeenCalledOnce();

        // The custom resolver returned 'allow' with empty displacedItems (replace behavior)
        // so the occupant should be removed and mover placed
        expect(engine.getItem('mover')!.coordinates).toEqual({ column: 3, row: 2 });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Blocked Cell Skipping
  // ═══════════════════════════════════════════════════════════════════════

  describe('Blocked Cell Skipping', () => {
    it('should skip over a single blocked cell', () => {
      const engine = new GridEngine({ conflictStrategy: 'block' });
      engine.registerGrid(makeGridConfig({ columns: 5, rows: 1 }));
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });

      // Block column 2
      const grid = engine.getGrid('grid1')!;
      grid.cells.set('2,1', {
        coordinates: { column: 2, row: 1 },
        itemIds: [],
        isDropTarget: false,
        isBlocked: true,
        metadata: {},
      });

      engine.grab('item1');
      const result = engine.moveGrabbed('right');
      expect(result.success).toBe(true);
      // Should land on column 3, skipping the blocked column 2
      expect(engine.getItem('item1')!.coordinates).toEqual({ column: 3, row: 1 });
    });

    it('should skip over multiple consecutive blocked cells', () => {
      const engine = new GridEngine({ conflictStrategy: 'block' });
      engine.registerGrid(makeGridConfig({ columns: 5, rows: 1 }));
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });

      // Block columns 2 and 3
      const grid = engine.getGrid('grid1')!;
      grid.cells.set('2,1', {
        coordinates: { column: 2, row: 1 },
        itemIds: [],
        isDropTarget: false,
        isBlocked: true,
        metadata: {},
      });
      grid.cells.set('3,1', {
        coordinates: { column: 3, row: 1 },
        itemIds: [],
        isDropTarget: false,
        isBlocked: true,
        metadata: {},
      });

      engine.grab('item1');
      const result = engine.moveGrabbed('right');
      expect(result.success).toBe(true);
      expect(engine.getItem('item1')!.coordinates).toEqual({ column: 4, row: 1 });
    });

    it('should block if all cells in direction are blocked or out of bounds', () => {
      const engine = new GridEngine({ conflictStrategy: 'block' });
      engine.registerGrid(makeGridConfig({ columns: 3, rows: 1 }));
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });

      // Block columns 2 and 3
      const grid = engine.getGrid('grid1')!;
      grid.cells.set('2,1', {
        coordinates: { column: 2, row: 1 },
        itemIds: [],
        isDropTarget: false,
        isBlocked: true,
        metadata: {},
      });
      grid.cells.set('3,1', {
        coordinates: { column: 3, row: 1 },
        itemIds: [],
        isDropTarget: false,
        isBlocked: true,
        metadata: {},
      });

      engine.grab('item1');
      const result = engine.moveGrabbed('right');
      expect(result.success).toBe(false);
      expect(engine.getItem('item1')!.coordinates).toEqual({ column: 1, row: 1 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Focus Follows Item During Grab Movement
  // ═══════════════════════════════════════════════════════════════════════

  describe('Focus Follows Item During Grab Movement', () => {
    it('moveGrabbed updates focusedCell to item new position', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem(), 'grid1', { column: 3, row: 3 });

      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 3, row: 3 });
      engine.grab('item1');
      engine.moveGrabbed('right');

      const focus = engine.getFocusedCell();
      expect(focus).not.toBeNull();
      expect(focus!.gridId).toBe('grid1');
      expect(focus!.coords).toEqual({ column: 4, row: 3 });
    });

    it('moveGrabbedTo cross-grid updates focusedGridId and focusedCell', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig({ id: 'grid1' }));
      engine.registerGrid(makeGridConfig({ id: 'grid2' }));
      engine.setGridRendered('grid1', true);
      engine.setGridRendered('grid2', true);
      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });

      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 1, row: 1 });
      engine.grab('item1');
      engine.moveGrabbedTo('grid2', { column: 2, row: 3 });

      const focus = engine.getFocusedCell();
      expect(focus).not.toBeNull();
      expect(focus!.gridId).toBe('grid2');
      expect(focus!.coords).toEqual({ column: 2, row: 3 });
    });

    it('moveGrabbedTo non-rendered grid does NOT update focus', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig({ id: 'grid1' }));
      engine.registerGrid(makeGridConfig({ id: 'offscreen' }));
      engine.setGridRendered('grid1', true);
      // offscreen stays non-rendered
      engine.addItem(makeItem(), 'grid1', { column: 2, row: 2 });

      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 2, row: 2 });
      engine.grab('item1');
      engine.moveGrabbedTo('offscreen', { column: 1, row: 1 });

      const focus = engine.getFocusedCell();
      expect(focus).not.toBeNull();
      expect(focus!.gridId).toBe('grid1');
      expect(focus!.coords).toEqual({ column: 2, row: 2 });
    });

    it('cancelGrab restores focus to original position', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem(), 'grid1', { column: 2, row: 2 });

      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 2, row: 2 });
      engine.grab('item1');
      engine.moveGrabbed('right');
      engine.moveGrabbed('down');

      // Focus should have followed to (3,3)
      expect(engine.getFocusedCell()!.coords).toEqual({ column: 3, row: 3 });

      engine.cancelGrab();

      // Focus should return to original (2,2)
      const focus = engine.getFocusedCell();
      expect(focus).not.toBeNull();
      expect(focus!.gridId).toBe('grid1');
      expect(focus!.coords).toEqual({ column: 2, row: 2 });
    });

    it('cancelGrab cross-grid restores focus to original grid', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig({ id: 'grid1' }));
      engine.registerGrid(makeGridConfig({ id: 'grid2' }));
      engine.setGridRendered('grid1', true);
      engine.setGridRendered('grid2', true);
      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });

      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 1, row: 1 });
      engine.grab('item1');
      engine.moveGrabbedTo('grid2', { column: 3, row: 3 });

      // Focus should have followed to grid2
      expect(engine.getFocusedCell()!.gridId).toBe('grid2');

      engine.cancelGrab();

      // Focus should return to grid1 at original position
      const focus = engine.getFocusedCell();
      expect(focus).not.toBeNull();
      expect(focus!.gridId).toBe('grid1');
      expect(focus!.coords).toEqual({ column: 1, row: 1 });
    });

    it('focus follows through multiple moves', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });

      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 1, row: 1 });
      engine.grab('item1');

      engine.moveGrabbed('right');
      expect(engine.getFocusedCell()!.coords).toEqual({ column: 2, row: 1 });

      engine.moveGrabbed('down');
      expect(engine.getFocusedCell()!.coords).toEqual({ column: 2, row: 2 });

      engine.moveGrabbed('left');
      expect(engine.getFocusedCell()!.coords).toEqual({ column: 1, row: 2 });
    });

    it('drop preserves focus at item current position', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig());
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });

      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 1, row: 1 });
      engine.grab('item1');
      engine.moveGrabbed('right');
      engine.moveGrabbed('down');
      engine.drop();

      const focus = engine.getFocusedCell();
      expect(focus).not.toBeNull();
      expect(focus!.coords).toEqual({ column: 2, row: 2 });
    });

    it('selectedStackIndex resets when focus follows item', () => {
      const engine = new GridEngine();
      engine.registerGrid(makeGridConfig({ allowStacking: true }));
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem({ id: 'a' }), 'grid1', { column: 1, row: 1 });
      engine.addItem(makeItem({ id: 'b' }), 'grid1', { column: 1, row: 1 });

      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 1, row: 1 });
      engine.cycleStackSelection('next');
      expect(engine.getSelectedStackIndex()).not.toBeNull();

      // Grab item 'a' (it's in the stack) and move it
      engine.grab('a');
      engine.moveGrabbed('right');

      expect(engine.getSelectedStackIndex()).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Stack Selection Cycling
  // ═══════════════════════════════════════════════════════════════════════

  describe('Stack Selection Cycling', () => {
    it('should cycle through items in a stacked cell', () => {
      const engine = new GridEngine({ conflictStrategy: 'stack' });
      engine.registerGrid(makeGridConfig({ allowStacking: true }));
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem({ id: 'a' }), 'grid1', { column: 1, row: 1 });
      engine.addItem(makeItem({ id: 'b' }), 'grid1', { column: 1, row: 1 });
      engine.addItem(makeItem({ id: 'c' }), 'grid1', { column: 1, row: 1 });

      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 1, row: 1 });

      // First cycle: should select second-from-top (index 1)
      const r1 = engine.cycleStackSelection('next');
      expect(r1.success).toBe(true);
      expect(engine.getSelectedStackIndex()).toBe(1);

      // Cycle again: should select bottom (index 0)
      engine.cycleStackSelection('next');
      expect(engine.getSelectedStackIndex()).toBe(0);

      // Cycle again: should wrap to top (index 2)
      engine.cycleStackSelection('next');
      expect(engine.getSelectedStackIndex()).toBe(2);
    });

    it('should cycle in previous direction', () => {
      const engine = new GridEngine({ conflictStrategy: 'stack' });
      engine.registerGrid(makeGridConfig({ allowStacking: true }));
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem({ id: 'a' }), 'grid1', { column: 1, row: 1 });
      engine.addItem(makeItem({ id: 'b' }), 'grid1', { column: 1, row: 1 });

      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 1, row: 1 });

      // First previous cycle: starts from top, goes to bottom (index 0)
      engine.cycleStackSelection('previous');
      expect(engine.getSelectedStackIndex()).toBe(0);
    });

    it('should fail on cells with 0 or 1 items', () => {
      const engine = new GridEngine({ conflictStrategy: 'block' });
      engine.registerGrid(makeGridConfig());
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem(), 'grid1', { column: 1, row: 1 });

      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 1, row: 1 });

      const result = engine.cycleStackSelection('next');
      expect(result.success).toBe(false);
    });

    it('should reset selectedStackIndex when focus moves', () => {
      const engine = new GridEngine({ conflictStrategy: 'stack' });
      engine.registerGrid(makeGridConfig({ allowStacking: true }));
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem({ id: 'a' }), 'grid1', { column: 1, row: 1 });
      engine.addItem(makeItem({ id: 'b' }), 'grid1', { column: 1, row: 1 });

      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 1, row: 1 });
      engine.cycleStackSelection('next');
      expect(engine.getSelectedStackIndex()).not.toBeNull();

      // Moving focus should reset
      engine.moveFocus('right');
      expect(engine.getSelectedStackIndex()).toBeNull();
    });

    it('should emit stackSelectionChanged event', () => {
      const engine = new GridEngine({ conflictStrategy: 'stack' });
      engine.registerGrid(makeGridConfig({ allowStacking: true }));
      engine.setGridRendered('grid1', true);
      engine.addItem(makeItem({ id: 'a' }), 'grid1', { column: 1, row: 1 });
      engine.addItem(makeItem({ id: 'b' }), 'grid1', { column: 1, row: 1 });

      engine.setFocusedGrid('grid1');
      engine.setFocusedCell({ column: 1, row: 1 });

      const events: GridEvent[] = [];
      engine.on('stackSelectionChanged', (e) => events.push(e));

      engine.cycleStackSelection('next');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('stackSelectionChanged');
      expect(events[0].selectedStackIndex).toBe(0);
    });
  });
});
