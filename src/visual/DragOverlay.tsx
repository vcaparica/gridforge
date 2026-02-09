import { createPortal } from 'react-dom';
import type { ReactNode, CSSProperties } from 'react';
import { useDragState } from '../hooks/useDragState.ts';
import { TapSystem } from '../core/TapSystem.ts';
import type { ItemState } from '../core/types.ts';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DragOverlayProps {
  /** Current pointer X coordinate (viewport-relative). */
  pointerX?: number;
  /** Current pointer Y coordinate (viewport-relative). */
  pointerY?: number;
  /** Render function that receives the dragged item and returns its visual. */
  renderItem?: (item: ItemState) => ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Visual ghost that follows the cursor during a mouse/touch drag.
 *
 * Only renders when the engine is in "grabbing" mode AND pointer coordinates
 * are provided (meaning the drag originated from mouse/touch, not keyboard).
 * Renders via a React portal to `document.body` so it sits above everything.
 */
export const DragOverlay: React.FC<DragOverlayProps> = ({
  pointerX,
  pointerY,
  renderItem,
}) => {
  const { isGrabbing, grabbedItem } = useDragState();

  // Only render when actively dragging via pointer (not keyboard).
  const hasPointer =
    pointerX !== undefined &&
    pointerY !== undefined &&
    pointerX !== null &&
    pointerY !== null;

  if (!isGrabbing || !grabbedItem || !hasPointer) {
    return null;
  }

  // -- Build inline styles --------------------------------------------------
  const style: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    transform: `translate(${pointerX}px, ${pointerY}px)`,
    pointerEvents: 'none',
    zIndex: 9999,
    opacity: 0.8,
    willChange: 'transform',
  };

  // Apply tap rotation as a nested transform so cursor offset and rotation
  // compose cleanly.
  const innerStyle: CSSProperties =
    grabbedItem.tapAngle !== 0
      ? { transform: TapSystem.getCSSRotation(grabbedItem.tapAngle) }
      : {};

  // -- Render content -------------------------------------------------------
  const content = renderItem ? (
    renderItem(grabbedItem)
  ) : (
    <div className="gf-drag-overlay__default-item">{grabbedItem.label}</div>
  );

  const overlay = (
    <div className="gf-drag-overlay" style={style} aria-hidden="true">
      <div className="gf-drag-overlay__inner" style={innerStyle}>
        {content}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
};
