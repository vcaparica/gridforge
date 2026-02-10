/**
 * PointerTracker: Unified mouse + touch + pen tracking.
 *
 * Uses the PointerEvent API to provide a single abstraction over
 * mouse, touch, and pen input. Only tracks one pointer at a time
 * (the first one that goes down) and ignores subsequent pointers
 * until the active one is released.
 */

export interface PointerPosition {
  x: number;
  y: number;
  pointerId: number;
  pointerType: 'mouse' | 'touch' | 'pen';
}

export interface PointerCallbacks {
  onPointerDown: (pos: PointerPosition, target: HTMLElement) => void;
  onPointerMove: (pos: PointerPosition) => void;
  onPointerUp: (pos: PointerPosition) => void;
  onPointerCancel: () => void;
}

export type Cleanup = () => void;

/**
 * Extracts a PointerPosition from a native PointerEvent.
 */
function toPointerPosition(event: PointerEvent): PointerPosition {
  return {
    x: event.clientX,
    y: event.clientY,
    pointerId: event.pointerId,
    pointerType: event.pointerType as PointerPosition['pointerType'],
  };
}

export class PointerTracker {
  /**
   * Begins tracking pointer events on the given element.
   *
   * Only one pointer is tracked at a time. The first pointer that
   * goes down becomes the "active" pointer; all other pointers are
   * ignored until the active one is released or cancelled.
   *
   * Returns a cleanup function that removes all event listeners.
   */
  start(element: HTMLElement, callbacks: PointerCallbacks): Cleanup {
    let activePointerId: number | null = null;

    const handlePointerDown = (event: PointerEvent): void => {
      // Only track one pointer at a time
      if (activePointerId !== null) {
        return;
      }

      activePointerId = event.pointerId;

      // Capture the pointer so we receive move/up events even if the
      // pointer leaves the element bounds.
      element.setPointerCapture(event.pointerId);

      const pos = toPointerPosition(event);
      const target = event.target as HTMLElement;
      callbacks.onPointerDown(pos, target);
    };

    const handlePointerMove = (event: PointerEvent): void => {
      if (event.pointerId !== activePointerId) {
        return;
      }

      callbacks.onPointerMove(toPointerPosition(event));
    };

    const handlePointerUp = (event: PointerEvent): void => {
      if (event.pointerId !== activePointerId) {
        return;
      }

      // Release capture before calling the callback so the element
      // is in a clean state when the consumer processes the event.
      element.releasePointerCapture(event.pointerId);
      activePointerId = null;

      callbacks.onPointerUp(toPointerPosition(event));
    };

    const handlePointerCancel = (event: PointerEvent): void => {
      if (event.pointerId !== activePointerId) {
        return;
      }

      activePointerId = null;
      callbacks.onPointerCancel();
    };

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerUp);
    element.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      // If there is still an active pointer, release capture
      if (activePointerId !== null) {
        try {
          element.releasePointerCapture(activePointerId);
        } catch {
          // Pointer may already have been released
        }
        activePointerId = null;
      }

      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerCancel);
    };
  }
}
