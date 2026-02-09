/**
 * TouchDragHandler: Touch-based drag interactions on a grid.
 *
 * Uses a long-press gesture (default 300ms) to initiate a drag. This
 * distinguishes intentional drag-to-move from scrolling or tapping.
 *
 * Lifecycle:
 *   1. Touch down: start the long-press timer.
 *   2. Timer fires (long press): grab the item, enter drag mode.
 *   3. Touch move: if dragging, hit-test cells and move the item.
 *   4. Touch end: if dragging, drop or cancel. If not dragging (short
 *      tap), clear the timer and do nothing.
 *   5. Touch cancel: abort everything.
 *
 * Prevents the browser context menu during long press so the gesture
 * is not interrupted.
 *
 * Uses the same data-attribute conventions as MouseDragHandler:
 *
 *   - `data-gf-item-id`  on item elements
 *   - `data-gf-grid-id`  on cell elements
 *   - `data-gf-col`      on cell elements (1-based column)
 *   - `data-gf-row`      on cell elements (1-based row)
 */

import type { GridEngine } from '../core/GridEngine.ts';
import type { Coordinates } from '../core/types.ts';
import { PointerTracker, type Cleanup, type PointerPosition } from './PointerTracker.ts';
import type { MouseDragCallbacks, DragState } from './MouseDragHandler.ts';

const DEFAULT_LONG_PRESS_DELAY = 300;

/**
 * Maximum distance (in pixels) the touch can move during the long-press
 * wait before the gesture is cancelled. This avoids accidental grabs
 * when the user is scrolling.
 */
const LONG_PRESS_MOVE_TOLERANCE = 10;

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

export class TouchDragHandler {
  private tracker: PointerTracker;
  private engine: GridEngine;
  private state: DragState;
  private callbacks: MouseDragCallbacks;
  private longPressTimer: ReturnType<typeof setTimeout> | null;
  private longPressDelay: number;

  /** The item id detected on pointerdown, held until the long-press fires. */
  private pendingItemId: string | null;
  /** The pointer position recorded on pointerdown. */
  private pendingPos: PointerPosition | null;

  constructor(
    engine: GridEngine,
    callbacks: MouseDragCallbacks,
    longPressDelay: number = DEFAULT_LONG_PRESS_DELAY,
  ) {
    this.tracker = new PointerTracker();
    this.engine = engine;
    this.callbacks = callbacks;
    this.longPressDelay = longPressDelay;
    this.longPressTimer = null;
    this.pendingItemId = null;
    this.pendingPos = null;
    this.state = createInitialDragState();
  }

  /**
   * Attaches touch drag handling to a grid container element.
   * Returns a cleanup function that detaches all listeners.
   */
  attach(element: HTMLElement): Cleanup {
    // Prevent the browser context menu on long press so the gesture
    // completes without interruption.
    const handleContextMenu = (event: Event): void => {
      if (this.longPressTimer !== null || this.state.isDragging) {
        event.preventDefault();
      }
    };

    element.addEventListener('contextmenu', handleContextMenu);

    const cleanupTracker = this.tracker.start(element, {
      onPointerDown: (pos, target) => this.handlePointerDown(pos, target),
      onPointerMove: (pos) => this.handlePointerMove(pos),
      onPointerUp: (pos) => this.handlePointerUp(pos),
      onPointerCancel: () => this.handlePointerCancel(),
    });

    return () => {
      this.clearLongPressTimer();
      element.removeEventListener('contextmenu', handleContextMenu);
      cleanupTracker();
    };
  }

  /**
   * Returns the current drag state (read-only snapshot).
   */
  getState(): DragState {
    return { ...this.state };
  }

  // ---------------------------------------------------------------------------
  // Long-press timer
  // ---------------------------------------------------------------------------

  private clearLongPressTimer(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private startLongPressTimer(): void {
    this.clearLongPressTimer();

    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;
      this.onLongPress();
    }, this.longPressDelay);
  }

  /**
   * Called when the long-press timer fires. Attempts to grab the item
   * that was under the initial touch point.
   */
  private onLongPress(): void {
    const itemId = this.pendingItemId;
    const pos = this.pendingPos;

    // Clear pending state regardless of outcome
    this.pendingItemId = null;
    this.pendingPos = null;

    if (!itemId || !pos) {
      return;
    }

    const item = this.engine.getItem(itemId);
    if (!item) {
      return;
    }

    const result = this.engine.grab(itemId);
    if (!result.success) {
      return;
    }

    // Enter dragging state
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

  // ---------------------------------------------------------------------------
  // Pointer event handlers
  // ---------------------------------------------------------------------------

  private handlePointerDown(pos: PointerPosition, target: HTMLElement): void {
    // Only handle touch input
    if (pos.pointerType !== 'touch') {
      return;
    }

    // Walk up the DOM to find an item element
    const itemElement = target.closest<HTMLElement>('[data-gf-item-id]');
    if (!itemElement) {
      return;
    }

    const itemId = itemElement.getAttribute('data-gf-item-id');
    if (!itemId) {
      return;
    }

    // Store the pending item and position for when the timer fires
    this.pendingItemId = itemId;
    this.pendingPos = pos;

    // Start the long-press countdown
    this.startLongPressTimer();
  }

  private handlePointerMove(pos: PointerPosition): void {
    if (pos.pointerType !== 'touch') {
      return;
    }

    // If we are still waiting for the long-press timer, check whether
    // the touch has moved too far from the initial point. If so, cancel
    // the timer (the user is likely scrolling).
    if (this.longPressTimer !== null && this.pendingPos) {
      const dx = pos.x - this.pendingPos.x;
      const dy = pos.y - this.pendingPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > LONG_PRESS_MOVE_TOLERANCE) {
        this.clearLongPressTimer();
        this.pendingItemId = null;
        this.pendingPos = null;
        return;
      }
    }

    // If we are dragging, perform hit-testing and move the item
    if (!this.state.isDragging) {
      return;
    }

    this.state.currentPos = pos;

    const targetCell = this.hitTestCell(pos.x, pos.y);

    if (targetCell) {
      this.engine.moveGrabbedTo(targetCell.gridId, targetCell.coords);
    }

    this.callbacks.onDragMove(pos, targetCell);
  }

  private handlePointerUp(pos: PointerPosition): void {
    if (pos.pointerType !== 'touch') {
      return;
    }

    // If the long-press timer is still running, the user released
    // before the threshold -- this is a short tap, not a drag.
    if (this.longPressTimer !== null) {
      this.clearLongPressTimer();
      this.pendingItemId = null;
      this.pendingPos = null;
      return;
    }

    if (!this.state.isDragging) {
      return;
    }

    const targetCell = this.hitTestCell(pos.x, pos.y);

    if (targetCell) {
      this.engine.drop();
      this.callbacks.onDragEnd(targetCell);
    } else {
      this.engine.cancelGrab();
      this.callbacks.onDragCancel();
    }

    this.state = createInitialDragState();
  }

  private handlePointerCancel(): void {
    this.clearLongPressTimer();
    this.pendingItemId = null;
    this.pendingPos = null;

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
