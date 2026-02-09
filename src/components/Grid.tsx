import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
  type ReactNode,
  type CSSProperties,
} from 'react';
import type { Coordinates, ItemState, StackDisplay } from '../core/types.ts';
import { CoordinateSystem } from '../core/CoordinateSystem.ts';
import { AriaPropsBuilder } from '../accessibility/AriaPropsBuilder.ts';
import { useGridForge } from '../hooks/useGridForge.ts';
import { useGridKeyboard } from '../hooks/useGridKeyboard.ts';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GridProps {
  id: string;
  columns: number;
  rows?: number;              // default 1 (making it 1D)
  label: string;              // REQUIRED accessible name
  description?: string;
  allowStacking?: boolean;    // default false
  maxStackSize?: number;
  stackDisplay?: StackDisplay; // default 'overlap'
  blockedCells?: Coordinates[];
  renderCell: (coords: Coordinates, items: ItemState[]) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Grid: React.FC<GridProps> = ({
  id,
  columns,
  rows: rowsProp = 1,
  label,
  description,
  allowStacking = false,
  maxStackSize,
  stackDisplay = 'overlap',
  blockedCells,
  renderCell,
  className,
  style,
}) => {
  const rows = rowsProp;
  const is2D = rows > 1;

  const { engine, state } = useGridForge();
  const containerRef = useRef<HTMLDivElement>(null);
  const prevBlockedKeysRef = useRef<Set<string>>(new Set());

  // -- Help dialog and context menu state -----------------------------------
  const [_showHelp, setShowHelp] = useState(false);
  const [_contextMenuTarget, setContextMenuTarget] = useState<string | null>(null);

  const handleShowHelp = useCallback(() => {
    setShowHelp((prev) => !prev);
  }, []);

  const handleContextMenu = useCallback((itemId: string) => {
    setContextMenuTarget(itemId);
  }, []);

  // -- Keyboard handling ----------------------------------------------------
  const { onKeyDown } = useGridKeyboard(id, {
    onShowHelp: handleShowHelp,
    onContextMenu: handleContextMenu,
  });

  // -- Register / unregister grid with engine -------------------------------
  useEffect(() => {
    // Only register if the grid is not already registered. This handles
    // StrictMode double-mounts and re-renders where the grid already exists
    // (e.g., items were placed before mount).
    const existing = engine.getGrid(id);
    if (!existing) {
      engine.registerGrid({
        id,
        columns,
        rows,
        type: is2D ? '2d' : '1d',
        label,
        description,
        allowStacking,
        maxStackSize,
        sparse: true,
      });
    }

    // Mark as rendered so keyboard and grab operations work
    engine.setGridRendered(id, true);

    return () => {
      // On unmount: mark as not rendered, but do NOT unregister.
      // Items persist even when the grid is not rendered.
      engine.setGridRendered(id, false);
    };
    // We intentionally depend only on `id` for registration lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, engine]);

  // -- Blocked cells: mark/unmark when the blockedCells prop changes --------
  useEffect(() => {
    const grid = engine.getGrid(id);
    if (!grid) return;

    const newBlockedKeys = new Set<string>();
    if (blockedCells) {
      for (const coords of blockedCells) {
        newBlockedKeys.add(CoordinateSystem.toKey(coords));
      }
    }

    // Unblock cells that were previously blocked but are no longer in the list
    for (const oldKey of prevBlockedKeysRef.current) {
      if (!newBlockedKeys.has(oldKey)) {
        const cell = grid.cells.get(oldKey);
        if (cell) {
          cell.isBlocked = false;
        }
      }
    }

    // Block new cells
    if (blockedCells) {
      for (const coords of blockedCells) {
        const key = CoordinateSystem.toKey(coords);
        let cell = grid.cells.get(key);
        if (!cell) {
          cell = {
            coordinates: { column: coords.column, row: coords.row },
            itemIds: [],
            isDropTarget: false,
            isBlocked: true,
            metadata: {},
          };
          grid.cells.set(key, cell);
        } else {
          cell.isBlocked = true;
        }
      }
    }

    prevBlockedKeysRef.current = newBlockedKeys;
  }, [id, engine, blockedCells]);

  // -- Focus management: set focused grid when container receives focus -----
  const handleFocus = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      // Only set focused grid if the focus event originated from outside
      // this grid (not from an internal cell refocus).
      if (!containerRef.current?.contains(event.relatedTarget as Node)) {
        engine.setFocusedGrid(id);
      }
    },
    [engine, id],
  );

  // -- Grid state from engine -----------------------------------------------
  const gridState = state.grids.get(id);
  const isFocused = state.focusedGridId === id;

  // -- Build items lookup for cells -----------------------------------------
  const getItemsAtCoords = useCallback(
    (coords: Coordinates): ItemState[] => {
      return engine.getItemsAt(id, coords);
    },
    [engine, id],
  );

  // -- Compute the CSS grid style -------------------------------------------
  const gridStyle: CSSProperties = useMemo(
    () => ({
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, var(--gf-cell-size, 80px))`,
      ...style,
    }),
    [columns, style],
  );

  // -- 2D Grid rendering ----------------------------------------------------
  if (is2D) {
    // Build ARIA props from the builder if we have grid state, otherwise
    // construct minimal props.
    const ariaProps = gridState
      ? AriaPropsBuilder.gridProps(gridState, isFocused)
      : {
          role: 'grid' as const,
          'aria-label': label,
          'aria-colcount': columns.toString(),
          'aria-rowcount': rows.toString(),
        };

    if (description && !ariaProps['aria-description']) {
      ariaProps['aria-description'] = description;
    }

    return (
      <div
        ref={containerRef}
        {...ariaProps}
        tabIndex={0}
        className={`gf-grid ${className || ''}`.trim()}
        style={gridStyle}
        onKeyDown={onKeyDown}
        onFocus={handleFocus}
        data-gf-grid-id={id}
        data-gf-grid-type="2d"
        data-gf-stack-display={stackDisplay}
      >
        {Array.from({ length: rows }, (_, rowIdx) => {
          const rowNumber = rowIdx + 1;
          const rowAriaProps = AriaPropsBuilder.rowProps(rowNumber);

          return (
            <div key={rowNumber} {...rowAriaProps}>
              {Array.from({ length: columns }, (_, colIdx) => {
                const colNumber = colIdx + 1;
                const coords: Coordinates = { column: colNumber, row: rowNumber };
                const items = getItemsAtCoords(coords);
                return (
                  <React.Fragment key={CoordinateSystem.toKey(coords)}>
                    {renderCell(coords, items)}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  // -- 1D Grid rendering (listbox) ------------------------------------------
  const listboxProps = gridState
    ? AriaPropsBuilder.listboxProps(gridState)
    : {
        role: 'listbox' as const,
        'aria-label': label,
        'aria-orientation': 'horizontal' as const,
      };

  if (description && !listboxProps['aria-description']) {
    listboxProps['aria-description'] = description;
  }

  return (
    <div
      ref={containerRef}
      {...listboxProps}
      tabIndex={0}
      className={`gf-grid ${className || ''}`.trim()}
      style={gridStyle}
      onKeyDown={onKeyDown}
      onFocus={handleFocus}
      data-gf-grid-id={id}
      data-gf-grid-type="1d"
      data-gf-stack-display={stackDisplay}
    >
      {Array.from({ length: columns }, (_, colIdx) => {
        const colNumber = colIdx + 1;
        const coords: Coordinates = { column: colNumber, row: 1 };
        const items = getItemsAtCoords(coords);
        return (
          <React.Fragment key={CoordinateSystem.toKey(coords)}>
            {renderCell(coords, items)}
          </React.Fragment>
        );
      })}
    </div>
  );
};
