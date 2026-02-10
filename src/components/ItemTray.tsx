import React, { useEffect, useRef, useCallback, useMemo, type ReactNode, type CSSProperties } from 'react';
import { useGridForge } from '../hooks/useGridForge.ts';
import { useGridKeyboard } from '../hooks/useGridKeyboard.ts';
import { AriaPropsBuilder } from '../accessibility/AriaPropsBuilder.ts';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ElasticMode = 'scroll' | 'shrink' | 'scroll-shrink';

export interface ItemTrayProps {
  id: string;
  label: string;
  orientation?: 'horizontal' | 'vertical';  // default 'horizontal'
  allowStacking?: boolean;                   // default false
  /** Enable elastic sizing: the tray adapts to its item count. */
  elastic?: boolean;
  /** How the tray handles overflow when elastic is true.
   *  - 'scroll': items keep full size, tray scrolls when space runs out
   *  - 'shrink': items shrink proportionally (down to minItemSize) to fit
   *  - 'scroll-shrink': items shrink first, then tray scrolls
   *  Default: 'scroll' */
  elasticMode?: ElasticMode;
  /** Minimum number of visible slots (even when fewer items exist). */
  minSlots?: number;
  /** Maximum slot count before overflow/scrolling. */
  maxSlots?: number;
  /** Minimum size (px) per item when shrinking in 'shrink' or 'scroll-shrink' mode. */
  minItemSize?: number;
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
  elastic = false,
  elasticMode = 'scroll',
  minSlots,
  maxSlots,
  minItemSize,
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

  // -- Elastic slot count: adapt to item count within min/max bounds --------
  const slotCount = useMemo(() => {
    let count = childCount || 1;
    if (elastic) {
      // Ensure at least minSlots slots are available
      if (minSlots !== undefined && count < minSlots) {
        count = minSlots;
      }
      // Cap at maxSlots if specified
      if (maxSlots !== undefined && count > maxSlots) {
        count = maxSlots;
      }
    }
    return count;
  }, [childCount, elastic, minSlots, maxSlots]);

  // -- Register / unregister grid with engine as a 1D grid -----------------
  useEffect(() => {
    const existing = engine.getGrid(id);
    if (!existing) {
      engine.registerGrid({
        id,
        columns: slotCount,
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

  // -- Update column count when slot count changes --------------------------
  useEffect(() => {
    const grid = engine.getGrid(id);
    if (grid && grid.config.columns !== slotCount && slotCount > 0) {
      grid.config.columns = slotCount;
    }
  }, [id, engine, slotCount]);

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
  const trayStyle: CSSProperties = useMemo(() => {
    const base: CSSProperties = {
      display: 'flex',
      flexDirection: orientation === 'horizontal' ? 'row' : 'column',
      ...style,
    };

    if (elastic) {
      const needsShrink = elasticMode === 'shrink' || elasticMode === 'scroll-shrink';
      const needsScroll = elasticMode === 'scroll' || elasticMode === 'scroll-shrink';

      if (needsScroll) {
        if (orientation === 'horizontal') {
          base.overflowX = 'auto';
        } else {
          base.overflowY = 'auto';
        }
      }

      if (needsShrink) {
        base.flexWrap = 'nowrap';
      }

      if (minItemSize !== undefined && needsShrink) {
        // Items will be sized via CSS on the children
        (base as Record<string, string>)['--gf-tray-min-item-size'] = `${minItemSize}px`;
      }
    }

    return base;
  }, [orientation, style, elastic, elasticMode, minItemSize]);

  // -- Build CSS class list --------------------------------------------------
  const classes = [
    'gf-tray',
    `gf-tray--${orientation}`,
    elastic && 'gf-tray--elastic',
    elastic && `gf-tray--elastic-${elasticMode}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={containerRef}
      {...ariaProps}
      role="listbox"
      tabIndex={0}
      className={classes}
      style={trayStyle}
      onKeyDown={onKeyDown}
      onFocus={handleFocus}
      data-gf-grid-id={id}
      data-gf-grid-type="1d"
      data-gf-elastic={elastic ? 'true' : undefined}
    >
      {children}
    </div>
  );
};
