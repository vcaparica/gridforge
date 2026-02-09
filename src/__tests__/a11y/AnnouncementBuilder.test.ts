// @vitest-environment node
import { AnnouncementBuilder } from '../../accessibility/AnnouncementBuilder.ts';
import { DEFAULT_MESSAGES } from '../../accessibility/MessageCatalog.ts';
import type {
  GridEvent,
  GridEventType,
  GridEngineReadonly,
  ItemState,
  GridState,
  Coordinates,
} from '../../core/types.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<ItemState> = {}): ItemState {
  return {
    id: 'item-1',
    label: 'Test Card',
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
    itemIds: new Set(['item-1']),
    isRendered: true,
    ...overrides,
  };
}

function makeMockEngine(
  items: ItemState[] = [makeItem()],
  grids: GridState[] = [makeGridState()],
): GridEngineReadonly {
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const gridMap = new Map(grids.map((g) => [g.config.id, g]));

  return {
    getGrid: (gridId: string) => gridMap.get(gridId),
    getItem: (itemId: string) => itemMap.get(itemId),
    getItemsAt: (_gridId: string, _at: Coordinates) => items.slice(0, 1),
    getItemsInGrid: (_gridId: string) => items,
  };
}

// ---------------------------------------------------------------------------
// Event factories for each GridEventType
// ---------------------------------------------------------------------------

function makeEventForType(type: GridEventType): GridEvent {
  const item = makeItem();
  const base: Partial<GridEvent> = { type, timestamp: Date.now() };

  switch (type) {
    case 'itemPlaced':
      return { ...base, item, toCoords: { column: 3, row: 2 }, toGrid: 'grid-1' } as GridEvent;
    case 'itemGrabbed':
      return { ...base, item, fromCoords: { column: 3, row: 2 }, fromGrid: 'grid-1' } as GridEvent;
    case 'itemMoved':
      return {
        ...base,
        item,
        fromCoords: { column: 3, row: 2 },
        toCoords: { column: 4, row: 2 },
      } as GridEvent;
    case 'itemDropped':
      return { ...base, item, toCoords: { column: 4, row: 2 } } as GridEvent;
    case 'itemRemoved':
      return { ...base, item, fromCoords: { column: 3, row: 2 } } as GridEvent;
    case 'itemTapped':
      return {
        ...base,
        item,
        previousTapAngle: 0,
        newTapAngle: 90,
      } as GridEvent;
    case 'itemFlipped':
      return { ...base, item, itemId: 'item-1' } as GridEvent;
    case 'itemTransferred':
      return {
        ...base,
        item,
        toGrid: 'grid-1',
        toCoords: { column: 1, row: 1 },
      } as GridEvent;
    case 'grabCancelled':
      return { ...base, item, fromCoords: { column: 3, row: 2 } } as GridEvent;
    case 'moveBlocked':
      return {
        ...base,
        reason: 'outOfBounds',
      } as GridEvent;
    case 'focusMoved':
      return {
        ...base,
        toCoords: { column: 3, row: 2 },
        toGrid: 'grid-1',
        gridId: 'grid-1',
      } as GridEvent;
    case 'gridRegistered':
    case 'gridUnregistered':
    case 'gridRenderStateChanged':
      return { ...base, gridId: 'grid-1' } as GridEvent;
    default:
      return base as GridEvent;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AnnouncementBuilder', () => {
  const builder = new AnnouncementBuilder(DEFAULT_MESSAGES);
  const engine = makeMockEngine();

  // ── Every event type produces an announcement ───────────────────────

  describe('produces an announcement for every GridEventType', () => {
    const allEventTypes: GridEventType[] = [
      'itemPlaced',
      'itemGrabbed',
      'itemMoved',
      'itemDropped',
      'itemRemoved',
      'itemTapped',
      'itemFlipped',
      'itemTransferred',
      'grabCancelled',
      'moveBlocked',
      'focusMoved',
      'gridRegistered',
      'gridUnregistered',
      'gridRenderStateChanged',
    ];

    it.each(allEventTypes)('%s returns a string', (eventType) => {
      const event = makeEventForType(eventType);
      const announcement = builder.build(event, engine);
      expect(typeof announcement.text).toBe('string');
    });

    // Assertive priority events
    const assertiveTypes: GridEventType[] = [
      'itemGrabbed',
      'itemDropped',
      'grabCancelled',
      'moveBlocked',
      'itemTapped',
      'itemFlipped',
      'itemTransferred',
      'itemRemoved',
      'itemPlaced',
    ];

    it.each(assertiveTypes)('%s has assertive priority', (eventType) => {
      const event = makeEventForType(eventType);
      const announcement = builder.build(event, engine);
      expect(announcement.priority).toBe('assertive');
    });

    // Polite priority events
    const politeTypes: GridEventType[] = [
      'focusMoved',
      'gridRegistered',
      'gridUnregistered',
      'gridRenderStateChanged',
    ];

    it.each(politeTypes)('%s has polite priority', (eventType) => {
      const event = makeEventForType(eventType);
      const announcement = builder.build(event, engine);
      expect(announcement.priority).toBe('polite');
    });

    // Non-empty text for user-action events
    const nonEmptyTypes: GridEventType[] = [
      'itemPlaced',
      'itemGrabbed',
      'itemMoved',
      'itemDropped',
      'itemRemoved',
      'itemTapped',
      'itemFlipped',
      'itemTransferred',
      'grabCancelled',
      'moveBlocked',
      'focusMoved',
    ];

    it.each(nonEmptyTypes)('%s produces non-empty text', (eventType) => {
      const event = makeEventForType(eventType);
      const announcement = builder.build(event, engine);
      expect(announcement.text.length).toBeGreaterThan(0);
    });

    // Debounce key
    it('focusMoved has debounceKey "focus"', () => {
      const event = makeEventForType('focusMoved');
      const announcement = builder.build(event, engine);
      expect(announcement.debounceKey).toBe('focus');
    });

    it.each(assertiveTypes)('%s has no debounceKey', (eventType) => {
      const event = makeEventForType(eventType);
      const announcement = builder.build(event, engine);
      expect(announcement.debounceKey).toBeUndefined();
    });
  });

  // ── Specific announcement content ──────────────────────────────────

  describe('specific announcement content', () => {
    it('itemTapped with previousTapAngle=0, newTapAngle=90 contains "clockwise"', () => {
      const event: GridEvent = {
        type: 'itemTapped',
        timestamp: Date.now(),
        item: makeItem({ label: 'Black Lotus' }),
        previousTapAngle: 0,
        newTapAngle: 90,
      };
      const announcement = builder.build(event, engine);
      expect(announcement.text).toContain('clockwise');
    });

    it('itemFlipped with face-down item contains "face down"', () => {
      const faceDownItem = makeItem({ id: 'flip-1', label: 'Mystery Card', isFaceDown: true });
      const faceDownEngine = makeMockEngine([faceDownItem]);
      const event: GridEvent = {
        type: 'itemFlipped',
        timestamp: Date.now(),
        itemId: 'flip-1',
        item: faceDownItem,
      };
      const announcement = builder.build(event, faceDownEngine);
      expect(announcement.text).toContain('face down');
    });

    it('itemFlipped with face-up item contains "face up"', () => {
      const faceUpItem = makeItem({ id: 'flip-2', label: 'Revealed Card', isFaceDown: false });
      const faceUpEngine = makeMockEngine([faceUpItem]);
      const event: GridEvent = {
        type: 'itemFlipped',
        timestamp: Date.now(),
        itemId: 'flip-2',
        item: faceUpItem,
      };
      const announcement = builder.build(event, faceUpEngine);
      expect(announcement.text).toContain('face up');
    });

    it('moveBlocked with reason "blocked" does not produce out-of-bounds text', () => {
      const event: GridEvent = {
        type: 'moveBlocked',
        timestamp: Date.now(),
        reason: 'blocked',
        toCoords: { column: 3, row: 2 },
        toGrid: 'grid-1',
      };
      const announcement = builder.build(event, engine);
      expect(announcement.text.length).toBeGreaterThan(0);
      expect(announcement.text).not.toBe(DEFAULT_MESSAGES.moveBlockedOutOfBounds);
    });

    it('moveBlocked with reason "occupied" mentions another item', () => {
      const event: GridEvent = {
        type: 'moveBlocked',
        timestamp: Date.now(),
        reason: 'occupied',
        toCoords: { column: 3, row: 2 },
        toGrid: 'grid-1',
        gridId: 'grid-1',
      };
      const announcement = builder.build(event, engine);
      expect(announcement.text.length).toBeGreaterThan(0);
      expect(announcement.text).not.toBe(DEFAULT_MESSAGES.moveBlockedOutOfBounds);
    });

    it('moveBlocked with reason "noAvailableCell" uses out-of-bounds text', () => {
      const event: GridEvent = {
        type: 'moveBlocked',
        timestamp: Date.now(),
        reason: 'noAvailableCell',
      };
      const announcement = builder.build(event, engine);
      expect(announcement.text).toBe(DEFAULT_MESSAGES.moveBlockedOutOfBounds);
    });

    it('itemTransferred contains the target grid label', () => {
      const targetGrid = makeGridState({
        config: {
          id: 'grid-2',
          columns: 4,
          rows: 1,
          type: '1d',
          label: 'Player Hand',
          allowStacking: false,
          sparse: true,
        },
      });
      const item = makeItem({ label: 'Lightning Bolt' });
      const transferEngine = makeMockEngine([item], [makeGridState(), targetGrid]);
      const event: GridEvent = {
        type: 'itemTransferred',
        timestamp: Date.now(),
        item,
        toGrid: 'grid-2',
        toCoords: { column: 1, row: 1 },
      };
      const announcement = builder.build(event, transferEngine);
      expect(announcement.text).toContain('Player Hand');
    });
  });
});
