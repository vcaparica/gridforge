/**
 * MouseDragHandler: Mouse-based drag interactions on a grid.
 *
 * Translates mouse pointer events into GridEngine grab/move/drop operations.
 * Uses data attributes on DOM elements to identify items and cells:
 *
 *   - `data-gf-item-id`  on item elements
 *   - `data-gf-grid-id`  on cell elements
 *   - `data-gf-col`      on cell elements (1-based column)
 *   - `data-gf-row`      on cell elements (1-based row)
 *
 * Only responds to mouse pointer events (pointerType === 'mouse').
 */

import type { GridEngine } from '../core/GridEngine.ts';
import type { Coordinates } from '../core/types.ts';
import { PointerTracker, type Cleanup, type PointerPosition } from './PointerTracker.ts';

export interface DragState {
  isDragging: boolean;
  itemId: string | null;
  startPos: PointerPosition | null;
  currentPos: PointerPosition | null;
  originGridId: string | null;
  originCoords: Coordinates | null;
}

export interface MouseDragCallbacks {
  onDragStart: (itemId: string, pos: PointerPosition) => void;
  onDragMove: (pos: PointerPosition, targetCell: { gridId: string; coords: Coordinates } | null) => void;
  onDragEnd: (targetCell: { gridId: string; coords: Coordinates } | null) => void;
  onDragCancel: () => void;
}

function createInitialDragState(): DragState {
  return {
    isDragging: false,
    itemId: null,
    startPos: null,
    currentPos: null,
    originGridId: null,
    originCoords: null,
  };
}

export class MouseDragHandler {
  private tracker: PointerTracker;
  private engine: GridEngine;
  private state: DragState;
  private callbacks: MouseDragCallbacks;

  constructor(engine: GridEngine, callbacks: MouseDragCallbacks) {
    this.tracker = new PointerTracker();
    this.engine = engine;
    this.callbacks = callbacks;
    this.state = createInitialDragState();
  }

  /**
   * Attaches mouse drag handling to a grid container element.
   * Returns a cleanup function that detaches all listeners.
   */
  attach(element: HTMLElement): Cleanup {
    return this.tracker.start(element, {
      onPointerDown: (pos, target) => this.handlePointerDown(pos, target),
      onPointerMove: (pos) => this.handlePointerMove(pos),
      onPointerUp: (pos) => this.handlePointerUp(pos),
      onPointerCancel: () => this.handlePointerCancel(),
    });
  }

  /**
   * Returns the current drag state (read-only snapshot).
   */
  getState(): DragState {
    return { ...this.state };
  }

  // ---------------------------------------------------------------------------
  // Pointer event handlers
  // ---------------------------------------------------------------------------

  private handlePointerDown(pos: PointerPosition, target: HTMLElement): void {
    // Only handle mouse input
    if (pos.pointerType !== 'mouse') {
      return;
    }

    // Walk up the DOM from the event target to find an element with
    // a `data-gf-item-id` attribute.
    const itemElement = target.closest<HTMLElement>('[data-gf-item-id]');
    if (!itemElement) {
      return;
    }

    const itemId = itemElement.getAttribute('data-gf-item-id');
    if (!itemId) {
      return;
    }

    // Look up the item in the engine to get its current grid position
    const item = this.engine.getItem(itemId);
    if (!item) {
      return;
    }

    // Attempt to grab the item through the engine
    const result = this.engine.grab(itemId);
    if (!result.success) {
      return;
    }

    // Grab succeeded -- enter dragging state
    this.state = {
      isDragging: true,
      itemId,
      startPos: pos,
      currentPos: pos,
      originGridId: item.gridId,
      originCoords: { column: item.coordinates.column, row: item.coordinates.row },
    };

    this.callbacks.onDragStart(itemId, pos);
  }

  private handlePointerMove(pos: PointerPosition): void {
    if (!this.state.isDragging || pos.pointerType !== 'mouse') {
      return;
    }

    this.state.currentPos = pos;

    const targetCell = this.hitTestCell(pos.x, pos.y);

    // If the pointer is over a valid cell that differs from the item's
    // current position, move the grabbed item there via the engine.
    if (targetCell) {
      this.engine.moveGrabbedTo(targetCell.gridId, targetCell.coords);
    }

    this.callbacks.onDragMove(pos, targetCell);
  }

  private handlePointerUp(pos: PointerPosition): void {
    if (!this.state.isDragging || pos.pointerType !== 'mouse') {
      return;
    }

    const targetCell = this.hitTestCell(pos.x, pos.y);

    if (targetCell) {
      // Drop at the current position (the engine has already moved
      // the item there during pointermove).
      this.engine.drop();
      this.callbacks.onDragEnd(targetCell);
    } else {
      // No valid cell under the pointer -- cancel the grab so the
      // item returns to its origin.
      this.engine.cancelGrab();
      this.callbacks.onDragCancel();
    }

    this.state = createInitialDragState();
  }

  private handlePointerCancel(): void {
    if (!this.state.isDragging) {
      return;
    }

    this.engine.cancelGrab();
    this.callbacks.onDragCancel();
    this.state = createInitialDragState();
  }

  // ---------------------------------------------------------------------------
  // Hit testing
  // ---------------------------------------------------------------------------

  /**
   * Determines which grid cell is under the given screen coordinates.
   *
   * Uses `document.elementsFromPoint` to find DOM elements at (x, y),
   * then walks through them looking for one that carries the GridForge
   * cell data attributes (`data-gf-grid-id`, `data-gf-col`, `data-gf-row`).
   *
   * Returns `null` if no matching cell is found.
   */
  private hitTestCell(x: number, y: number): { gridId: string; coords: Coordinates } | null {
    const elements = document.elementsFromPoint(x, y);

    for (const el of elements) {
      const gridId = el.getAttribute('data-gf-grid-id');
      const colStr = el.getAttribute('data-gf-col');
      const rowStr = el.getAttribute('data-gf-row');

      if (gridId && colStr && rowStr) {
        const column = parseInt(colStr, 10);
        const row = parseInt(rowStr, 10);

        if (!isNaN(column) && !isNaN(row)) {
          return { gridId, coords: { column, row } };
        }
      }
    }

    return null;
  }
}
