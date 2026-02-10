import type { GridEvent, GridEngineReadonly, TapAngle } from '../core/types.ts';
import type { MessageCatalog } from './MessageCatalog.ts';
import { interpolate } from './MessageCatalog.ts';
import { TapSystem } from '../core/TapSystem.ts';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface Announcement {
  text: string;
  priority: 'assertive' | 'polite';
  debounceKey?: string;
}

// ---------------------------------------------------------------------------
// Priority classification
// ---------------------------------------------------------------------------

const ASSERTIVE_EVENTS = new Set([
  'itemGrabbed',
  'itemDropped',
  'grabCancelled',
  'moveBlocked',
  'itemTapped',
  'itemFlipped',
  'itemTransferred',
  'itemRemoved',
  'itemPlaced',
]);

const POLITE_EVENTS = new Set([
  'focusMoved',
  'gridRegistered',
  'gridUnregistered',
  'gridRenderStateChanged',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determine whether a tap from `prev` to `next` was clockwise.
 *
 * The TapSystem angles are arranged in clockwise order:
 *   0 -> 45 -> 90 -> 135 -> 180 -> 225 -> 270 -> 315 -> (wrap) 0
 *
 * A single clockwise step increases the index by 1 (mod 8).  We compute the
 * shortest-path direction using the modular index difference.
 */
function isTapClockwise(prev: TapAngle, next: TapAngle): boolean {
  const angles = TapSystem.ANGLES;
  const prevIdx = angles.indexOf(prev);
  const nextIdx = angles.indexOf(next);
  // Clockwise step count (mod 8)
  const cwSteps = (nextIdx - prevIdx + angles.length) % angles.length;
  // If the clockwise distance is <= 4 steps it's closer going CW; otherwise CCW.
  return cwSteps > 0 && cwSteps <= 4;
}

// ---------------------------------------------------------------------------
// AnnouncementBuilder
// ---------------------------------------------------------------------------

export class AnnouncementBuilder {
  constructor(private catalog: MessageCatalog) {}

  /**
   * Convert a `GridEvent` into a screen-reader `Announcement`.
   *
   * The returned object carries:
   * - `text`        — the interpolated human-readable string.
   * - `priority`    — `"assertive"` for user-initiated actions, `"polite"` for
   *                   passive / ambient changes.
   * - `debounceKey` — when set, the live-region manager should coalesce
   *                   announcements sharing the same key within a short window.
   */
  build(event: GridEvent, engineState: GridEngineReadonly): Announcement {
    const text = this.buildText(event, engineState);
    const priority = this.getPriority(event);
    const debounceKey = this.getDebounceKey(event);

    const announcement: Announcement = { text, priority };
    if (debounceKey !== undefined) {
      announcement.debounceKey = debounceKey;
    }
    return announcement;
  }

  // -----------------------------------------------------------------------
  // Priority
  // -----------------------------------------------------------------------

  private getPriority(event: GridEvent): 'assertive' | 'polite' {
    if (ASSERTIVE_EVENTS.has(event.type)) return 'assertive';
    if (POLITE_EVENTS.has(event.type)) return 'polite';
    // Default fallback for any unexpected event type (e.g. itemMoved)
    return 'assertive';
  }

  // -----------------------------------------------------------------------
  // Debounce
  // -----------------------------------------------------------------------

  private getDebounceKey(event: GridEvent): string | undefined {
    if (event.type === 'focusMoved') return 'focus';
    return undefined;
  }

  // -----------------------------------------------------------------------
  // Text building — dispatch to per-event-type handlers
  // -----------------------------------------------------------------------

  private buildText(event: GridEvent, engine: GridEngineReadonly): string {
    switch (event.type) {
      case 'itemPlaced':
        return this.buildItemPlaced(event, engine);
      case 'itemGrabbed':
        return this.buildItemGrabbed(event);
      case 'itemMoved':
        return this.buildItemMoved(event);
      case 'itemDropped':
        return this.buildItemDropped(event);
      case 'itemRemoved':
        return this.buildItemRemoved(event);
      case 'itemTapped':
        return this.buildItemTapped(event);
      case 'itemFlipped':
        return this.buildItemFlipped(event, engine);
      case 'itemTransferred':
        return this.buildItemTransferred(event, engine);
      case 'grabCancelled':
        return this.buildGrabCancelled(event);
      case 'moveBlocked':
        return this.buildMoveBlocked(event, engine);
      case 'focusMoved':
        return this.buildFocusMoved(event, engine);
      case 'gridRegistered':
      case 'gridUnregistered':
      case 'gridRenderStateChanged':
        return '';
      default:
        return '';
    }
  }

  // -----------------------------------------------------------------------
  // itemPlaced
  // -----------------------------------------------------------------------

  private buildItemPlaced(event: GridEvent, engine: GridEngineReadonly): string {
    const item = event.item ?? (event.itemId ? engine.getItem(event.itemId) : undefined);
    const coords = event.toCoords ?? item?.coordinates;
    if (!item || !coords) return '';

    return interpolate(this.catalog.cellOccupied, {
      col: coords.column,
      row: coords.row,
      itemLabel: item.label,
    });
  }

  // -----------------------------------------------------------------------
  // itemGrabbed
  // -----------------------------------------------------------------------

  private buildItemGrabbed(event: GridEvent): string {
    const item = event.item;
    const coords = event.fromCoords ?? item?.coordinates;
    if (!item || !coords) return '';

    return interpolate(this.catalog.itemGrabbed, {
      itemLabel: item.label,
      col: coords.column,
      row: coords.row,
    });
  }

  // -----------------------------------------------------------------------
  // itemMoved
  // -----------------------------------------------------------------------

  private buildItemMoved(event: GridEvent): string {
    const item = event.item;
    const coords = event.toCoords;
    if (!item || !coords) return '';

    const displaced = event.displacedItems;

    // No displaced items — plain move
    if (!displaced || displaced.length === 0) {
      return interpolate(this.catalog.itemMoved, {
        itemLabel: item.label,
        col: coords.column,
        row: coords.row,
      });
    }

    // Single displaced item — check if it's a swap (displaced to the mover's
    // original position) or a generic displacement
    if (displaced.length === 1) {
      const d = displaced[0];
      const fromCoords = event.fromCoords;

      // Swap: the displaced item moved to where the moving item came from
      const isSwap =
        fromCoords &&
        d.to.column === fromCoords.column &&
        d.to.row === fromCoords.row;

      if (isSwap) {
        const baseLine = interpolate(this.catalog.itemMoved, {
          itemLabel: item.label,
          col: coords.column,
          row: coords.row,
        });
        const swapLine = interpolate(this.catalog.itemMovedSwap, {
          otherLabel: d.item.label,
          otherCol: d.to.column,
          otherRow: d.to.row,
        });
        return `${baseLine} ${swapLine}`;
      }
    }

    // Stacking or generic occupied-cell move — build a resolution summary
    // from the displaced items' labels
    const resolutionParts = displaced.map((d) => {
      return interpolate(this.catalog.itemMovedSwap, {
        otherLabel: d.item.label,
        otherCol: d.to.column,
        otherRow: d.to.row,
      });
    });

    return interpolate(this.catalog.itemMovedToOccupied, {
      itemLabel: item.label,
      col: coords.column,
      row: coords.row,
      resolution: resolutionParts.join(' '),
    });
  }

  // -----------------------------------------------------------------------
  // itemDropped
  // -----------------------------------------------------------------------

  private buildItemDropped(event: GridEvent): string {
    const item = event.item;
    const coords = event.toCoords ?? item?.coordinates;
    if (!item || !coords) return '';

    return interpolate(this.catalog.itemDropped, {
      itemLabel: item.label,
      col: coords.column,
      row: coords.row,
    });
  }

  // -----------------------------------------------------------------------
  // itemRemoved
  // -----------------------------------------------------------------------

  private buildItemRemoved(event: GridEvent): string {
    const item = event.item;
    const coords = event.fromCoords ?? item?.coordinates;
    if (!item || !coords) return '';

    return interpolate(this.catalog.itemRemoved, {
      itemLabel: item.label,
      col: coords.column,
      row: coords.row,
    });
  }

  // -----------------------------------------------------------------------
  // itemTapped
  // -----------------------------------------------------------------------

  private buildItemTapped(event: GridEvent): string {
    const item = event.item;
    if (!item) return '';

    const prev = event.previousTapAngle;
    const next = event.newTapAngle;
    if (prev === undefined || next === undefined) return '';

    const tapLabel = TapSystem.getLabel(next);
    const clockwise = isTapClockwise(prev, next);

    const template = clockwise
      ? this.catalog.itemTappedClockwise
      : this.catalog.itemTappedCounterClockwise;

    return interpolate(template, {
      itemLabel: item.label,
      tapLabel,
    });
  }

  // -----------------------------------------------------------------------
  // itemFlipped
  // -----------------------------------------------------------------------

  private buildItemFlipped(event: GridEvent, engine: GridEngineReadonly): string {
    // Use the engine to get the current state of the item (after the flip)
    const item = event.itemId ? engine.getItem(event.itemId) : event.item;
    if (!item) return '';

    const template = item.isFaceDown
      ? this.catalog.itemFlippedFaceDown
      : this.catalog.itemFlippedFaceUp;

    return interpolate(template, {
      itemLabel: item.label,
    });
  }

  // -----------------------------------------------------------------------
  // itemTransferred
  // -----------------------------------------------------------------------

  private buildItemTransferred(event: GridEvent, engine: GridEngineReadonly): string {
    const item = event.item;
    const toGridId = event.toGrid;
    const coords = event.toCoords;
    if (!item || !toGridId || !coords) return '';

    const targetGrid = engine.getGrid(toGridId);
    const targetGridLabel = targetGrid?.config.label ?? toGridId;

    return interpolate(this.catalog.itemTransferred, {
      itemLabel: item.label,
      targetGridLabel,
      col: coords.column,
      row: coords.row,
    });
  }

  // -----------------------------------------------------------------------
  // grabCancelled
  // -----------------------------------------------------------------------

  private buildGrabCancelled(event: GridEvent): string {
    const item = event.item;
    const coords = event.fromCoords ?? item?.coordinates;
    if (!item || !coords) return '';

    return interpolate(this.catalog.grabCancelled, {
      itemLabel: item.label,
      col: coords.column,
      row: coords.row,
    });
  }

  // -----------------------------------------------------------------------
  // moveBlocked
  // -----------------------------------------------------------------------

  private buildMoveBlocked(event: GridEvent, engine: GridEngineReadonly): string {
    const reason = event.reason;

    if (reason === 'outOfBounds' || reason === 'noAvailableCell') {
      return this.catalog.moveBlockedOutOfBounds;
    }

    if (reason === 'occupied' || reason === 'blocked') {
      const coords = event.toCoords;
      const gridId = event.toGrid ?? event.gridId;

      if (reason === 'blocked' && coords) {
        return interpolate(this.catalog.moveBlockedCellBlocked, {
          col: coords.column,
          row: coords.row,
        });
      }

      if (coords && gridId) {
        const occupants = engine.getItemsAt(gridId, coords);
        const otherLabel = occupants.length > 0 ? occupants[0].label : 'another item';

        return interpolate(this.catalog.moveBlockedOccupied, {
          col: coords.column,
          row: coords.row,
          otherLabel,
        });
      }
    }

    // Fallback for unknown/missing reason
    return this.catalog.moveBlockedOutOfBounds;
  }

  // -----------------------------------------------------------------------
  // focusMoved
  // -----------------------------------------------------------------------

  private buildFocusMoved(event: GridEvent, engine: GridEngineReadonly): string {
    const coords = event.toCoords;
    const gridId = event.toGrid ?? event.gridId;
    if (!coords || !gridId) return '';

    const items = engine.getItemsAt(gridId, coords);

    if (items.length === 0) {
      return interpolate(this.catalog.cellEmpty, {
        col: coords.column,
        row: coords.row,
      });
    }

    if (items.length === 1) {
      return interpolate(this.catalog.cellOccupied, {
        col: coords.column,
        row: coords.row,
        itemLabel: items[0].label,
      });
    }

    // Multiple items — stacked cell
    const itemLabels = items.map((i) => i.label).join(', ');
    return interpolate(this.catalog.cellOccupiedStacked, {
      col: coords.column,
      row: coords.row,
      count: items.length,
      itemLabels,
    });
  }
}
