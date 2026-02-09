import React, { useEffect, useRef, useCallback, type ReactNode, type CSSProperties } from 'react';
import { useGridForge } from '../hooks/useGridForge.ts';
import { useGridKeyboard } from '../hooks/useGridKeyboard.ts';
import { AriaPropsBuilder } from '../accessibility/AriaPropsBuilder.ts';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ItemTrayProps {
  id: string;
  label: string;
  orientation?: 'horizontal' | 'vertical';  // default 'horizontal'
  allowStacking?: boolean;                   // default false
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ItemTray: React.FC<ItemTrayProps> = ({
  id,
  label,
  orientation = 'horizontal',
  allowStacking = false,
  children,
  className,
  style,
}) => {
  const { engine, state } = useGridForge();
  const containerRef = useRef<HTMLDivElement>(null);

  // -- Keyboard handling ----------------------------------------------------
  const { onKeyDown } = useGridKeyboard(id);

  // -- Count children to determine the number of columns -------------------
  const childCount = React.Children.count(children);

  // -- Register / unregister grid with engine as a 1D grid -----------------
  useEffect(() => {
    const existing = engine.getGrid(id);
    if (!existing) {
      engine.registerGrid({
        id,
        columns: childCount || 1,
        rows: 1,
        type: '1d',
        label,
        allowStacking,
        sparse: true,
      });
    }

    // Mark as rendered so keyboard and grab operations work
    engine.setGridRendered(id, true);

    return () => {
      // On unmount: mark as not rendered, but do NOT unregister.
      // Items persist even when the tray is not rendered.
      engine.setGridRendered(id, false);
    };
    // We intentionally depend only on `id` for registration lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, engine]);

  // -- Update column count when children change ----------------------------
  useEffect(() => {
    const grid = engine.getGrid(id);
    if (grid && grid.config.columns !== childCount && childCount > 0) {
      // Update the grid config's column count to match the current child
      // count. This keeps the engine in sync when items are added/removed.
      grid.config.columns = childCount;
    }
  }, [id, engine, childCount]);

  // -- Focus management: set focused grid when container receives focus -----
  const handleFocus = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      // Only set focused grid if the focus event originated from outside
      // this tray (not from an internal cell refocus).
      if (!containerRef.current?.contains(event.relatedTarget as Node)) {
        engine.setFocusedGrid(id);
      }
    },
    [engine, id],
  );

  // -- Grid state from engine -----------------------------------------------
  const gridState = state.grids.get(id);

  // -- Build ARIA props -----------------------------------------------------
  const ariaProps = gridState
    ? AriaPropsBuilder.listboxProps(gridState)
    : {
        role: 'listbox' as const,
        'aria-label': label,
        'aria-orientation': orientation,
      };

  // Override the orientation from the builder (which defaults to horizontal)
  // to match the prop value, since AriaPropsBuilder.listboxProps always uses
  // 'horizontal'.
  ariaProps['aria-orientation'] = orientation;

  // -- Build inline style with flexbox layout --------------------------------
  const trayStyle: CSSProperties = {
    display: 'flex',
    flexDirection: orientation === 'horizontal' ? 'row' : 'column',
    ...style,
  };

  // -- Build CSS class list --------------------------------------------------
  const classes = [
    'gf-tray',
    `gf-tray--${orientation}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={containerRef}
      {...ariaProps}
      tabIndex={0}
      className={classes}
      style={trayStyle}
      onKeyDown={onKeyDown}
      onFocus={handleFocus}
      data-gf-grid-id={id}
      data-gf-grid-type="1d"
    >
      {children}
    </div>
  );
};
