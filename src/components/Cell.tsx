import {
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from 'react';
import type { Coordinates } from '../core/types.ts';
import { CoordinateSystem } from '../core/CoordinateSystem.ts';
import { useCell } from '../hooks/useCell.ts';
import { useGridForge } from '../hooks/useGridForge.ts';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CellProps {
  gridId: string;
  coordinates: Coordinates;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;        // override computed label
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Cell: React.FC<CellProps> = ({
  gridId,
  coordinates,
  children,
  className,
  style,
  ariaLabel,
}) => {
  const cellRef = useRef<HTMLDivElement>(null);
  const { engine } = useGridForge();

  const {
    cell,
    items,
    isFocused,
    isGrabSource,
    isDropTarget,
    ariaProps,
  } = useCell(gridId, coordinates);

  // -- Build CSS class list -------------------------------------------------
  const classes = [
    'gf-cell',
    items.length === 0 ? 'gf-cell--empty' : 'gf-cell--occupied',
    isFocused && 'gf-cell--focused',
    isDropTarget && 'gf-cell--drop-target',
    isGrabSource && 'gf-cell--grab-source',
    cell.isBlocked && 'gf-cell--blocked',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // -- Programmatic focus: move DOM focus when the engine marks us focused ---
  useEffect(() => {
    if (isFocused && cellRef.current) {
      // Only call focus() if this element is not already the active element,
      // to avoid unnecessary focus-related side effects.
      if (document.activeElement !== cellRef.current) {
        cellRef.current.focus({ preventScroll: false });
      }
    }
  }, [isFocused]);

  // -- Click handler: focus this cell and grab the top item if present ------
  const handleClick = useCallback(() => {
    // Set this grid as focused
    engine.setFocusedGrid(gridId);

    // Move focus to this cell
    engine.setFocusedCell(coordinates);

    // If there are items and nothing is currently grabbed, grab the top one
    if (items.length > 0) {
      const topItem = items[items.length - 1];
      if (topItem.canMove) {
        engine.grab(topItem.id);
      }
    }
  }, [engine, gridId, coordinates, items]);

  // -- Build the props to spread onto the element ---------------------------
  // Start with the ariaProps from useCell, then apply overrides.
  const spreadProps: Record<string, string> = { ...ariaProps };

  // Override aria-label if the consumer passed an explicit one
  if (ariaLabel) {
    spreadProps['aria-label'] = ariaLabel;
  }

  // Construct a deterministic ID so aria-activedescendant can reference us
  const cellId = `gf-cell-${gridId}-${CoordinateSystem.toKey(coordinates)}`;

  return (
    <div
      ref={cellRef}
      id={cellId}
      {...spreadProps}
      className={classes}
      style={style}
      onClick={handleClick}
      data-gf-grid-id={gridId}
      data-gf-col={coordinates.column}
      data-gf-row={coordinates.row}
    >
      {children}
    </div>
  );
};
