import {
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type CSSProperties,
  Children,
  cloneElement,
  isValidElement,
} from 'react';
import type { Coordinates, StackDisplay } from '../core/types.ts';
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
  stackDisplay?: StackDisplay; // inherited from Grid, default 'overlap'
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
  stackDisplay = 'overlap',
}) => {
  const cellRef = useRef<HTMLDivElement>(null);
  const { engine, state: ctxState } = useGridForge();

  const {
    cell,
    items,
    isFocused,
    isGrabSource,
    isDropTarget,
    ariaProps,
  } = useCell(gridId, coordinates);

  // -- Determine if this cell is the focused stacked cell ------------------
  const isThisCellFocused =
    ctxState.focusedGridId === gridId &&
    ctxState.focusedCell !== null &&
    CoordinateSystem.equals(ctxState.focusedCell, coordinates);
  const hasStack = items.length > 1;
  const selectedIdx = isThisCellFocused ? ctxState.selectedStackIndex : null;

  // -- Build CSS class list -------------------------------------------------
  const classes = [
    'gf-cell',
    items.length === 0 ? 'gf-cell--empty' : 'gf-cell--occupied',
    hasStack && 'gf-cell--stacked',
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

  // -- Click handler: focus this cell and grab/drop items -------------------
  const handleClick = useCallback(() => {
    // Set this grid as focused
    engine.setFocusedGrid(gridId);

    // Move focus to this cell
    engine.setFocusedCell(coordinates);

    // If an item is currently grabbed, drop it at the clicked cell
    if (ctxState.grabbedItemId !== null) {
      const grabbedItem = engine.getItem(ctxState.grabbedItemId);
      if (grabbedItem) {
        // Check if clicking the same cell the grabbed item is on — just drop
        const sameCell =
          grabbedItem.gridId === gridId &&
          grabbedItem.coordinates.column === coordinates.column &&
          grabbedItem.coordinates.row === coordinates.row;

        if (sameCell) {
          engine.drop();
        } else {
          // Move to target cell (handles same-grid and cross-grid + conflict resolution)
          const moveResult = engine.moveGrabbedTo(gridId, coordinates);
          if (moveResult.success) {
            engine.drop();
          }
          // On failure, keep the item grabbed so the user can try another cell.
          // The engine already emitted a moveBlocked event for the screen reader.
        }
      }
      return;
    }

    // For stacked cells, repeated clicks cycle through items
    if (items.length > 1) {
      engine.cycleStackSelection('next');
      return;
    }

    // If there are items and nothing is currently grabbed, grab the top one
    if (items.length > 0) {
      const topItem = items[items.length - 1];
      if (topItem.canMove) {
        engine.grab(topItem.id);
      }
    }
  }, [engine, ctxState.grabbedItemId, gridId, coordinates, items]);

  // -- Build the props to spread onto the element ---------------------------
  // Start with the ariaProps from useCell, then apply overrides.
  const spreadProps: Record<string, string> = { ...ariaProps };

  // Override aria-label if the consumer passed an explicit one
  if (ariaLabel) {
    spreadProps['aria-label'] = ariaLabel;
  }

  // Construct a deterministic ID so aria-activedescendant can reference us
  const cellId = `gf-cell-${gridId}-${CoordinateSystem.toKey(coordinates)}`;

  // -- Enhance children for stacking: selection highlight + cascade offsets --
  const CASCADE_SLICE = 16; // px per item slice in cascade mode
  const needsEnhancement = hasStack && (selectedIdx !== null || stackDisplay === 'cascade');

  const enhancedChildren = needsEnhancement
    ? Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;

        const extraProps: Record<string, unknown> = {};
        const existingClass = String((child.props as Record<string, unknown>).className ?? '');
        const classes: string[] = existingClass ? [existingClass] : [];

        // Stack selection highlight
        if (selectedIdx !== null && index === selectedIdx) {
          classes.push('gf-item--stack-selected');
        }

        if (classes.length > 0) {
          extraProps.className = classes.join(' ');
        }

        // Cascade: position every item with a top offset so each peeks out
        // below the one above it.
        if (stackDisplay === 'cascade') {
          const existingStyle = (child.props as Record<string, unknown>).style as CSSProperties | undefined;
          extraProps.style = {
            ...existingStyle,
            position: 'relative' as const,
            top: index * CASCADE_SLICE,
          };
        }

        if (Object.keys(extraProps).length === 0) return child;
        return cloneElement(child as React.ReactElement<Record<string, unknown>>, extraProps);
      })
    : children;

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
      data-gf-stack-count={items.length > 1 ? items.length : undefined}
    >
      {enhancedChildren}
    </div>
  );
};
