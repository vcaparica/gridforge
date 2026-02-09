import React from 'react';
import { render, act, type RenderResult } from '@testing-library/react';
import { GridForgeProvider } from '../../components/GridForgeProvider.tsx';
import { Grid } from '../../components/Grid.tsx';
import { Cell } from '../../components/Cell.tsx';
import { Item } from '../../components/Item.tsx';
import { useGridForge } from '../../hooks/useGridForge.ts';
import type { Coordinates, ItemState, ConflictStrategy } from '../../core/types.ts';
import type { GridEngine } from '../../core/GridEngine.ts';

// ---------------------------------------------------------------------------
// Item definition for test setup
// ---------------------------------------------------------------------------

export interface TestItemDef {
  id: string;
  label: string;
  gridId: string;
  column: number;
  row: number;
  canMove?: boolean;
  canRemove?: boolean;
  canTap?: boolean;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Default render cell function
// ---------------------------------------------------------------------------

export function defaultRenderCell(
  gridId: string,
  coords: Coordinates,
  items: ItemState[],
) {
  return (
    <Cell gridId={gridId} coordinates={coords}>
      {items.map((item) => (
        <Item
          key={item.id}
          id={item.id}
          label={item.label}
          canMove={item.canMove}
          canRemove={item.canRemove}
          canTap={item.canTap}
        >
          <div data-testid={`item-visual-${item.id}`}>{item.label}</div>
        </Item>
      ))}
    </Cell>
  );
}

// ---------------------------------------------------------------------------
// EngineExposer — a small component that exposes the engine via a ref
// ---------------------------------------------------------------------------

function EngineExposer({
  engineRef,
}: {
  engineRef: React.MutableRefObject<GridEngine | null>;
}) {
  const { engine } = useGridForge();
  engineRef.current = engine;
  return null;
}

// ---------------------------------------------------------------------------
// TestGrid component — renders a single grid (items added externally)
// ---------------------------------------------------------------------------

interface TestGridProps {
  gridId: string;
  columns: number;
  rows: number;
  label: string;
}

export function TestGrid({
  gridId,
  columns,
  rows,
  label,
}: TestGridProps) {
  return (
    <Grid
      id={gridId}
      columns={columns}
      rows={rows}
      label={label}
      renderCell={(coords, cellItems) =>
        defaultRenderCell(gridId, coords, cellItems)
      }
    />
  );
}

// ---------------------------------------------------------------------------
// renderGrid — convenience wrapper that mounts a provider + grid + items
//
// Items are added AFTER the initial render inside act() so that the
// provider's event subscriptions are already active. This ensures
// engine.addItem() triggers a dispatch → re-render cycle correctly.
// ---------------------------------------------------------------------------

interface RenderGridOptions {
  gridId?: string;
  columns?: number;
  rows?: number;
  label?: string;
  items?: TestItemDef[];
  conflictStrategy?: ConflictStrategy;
}

export function renderGrid(options: RenderGridOptions = {}): RenderResult {
  const {
    gridId = 'grid1',
    columns = 3,
    rows = 3,
    label = 'Battle Map',
    items = [],
    conflictStrategy,
  } = options;

  const engineRef: React.MutableRefObject<GridEngine | null> = { current: null };

  const result = render(
    <GridForgeProvider conflictStrategy={conflictStrategy}>
      <EngineExposer engineRef={engineRef} />
      <TestGrid
        gridId={gridId}
        columns={columns}
        rows={rows}
        label={label}
      />
    </GridForgeProvider>,
  );

  // Add items after render so the provider's event subscriptions are active.
  // The Grid's useEffect (registerGrid) runs during render's act() boundary,
  // and the provider's useEffect (event subscriptions) also runs. But React
  // runs child effects before parent effects, so items added during child
  // effects miss the subscription. By adding items in a separate act() block,
  // all subscriptions are guaranteed to be active.
  if (items.length > 0) {
    const engine = engineRef.current!;
    act(() => {
      for (const def of items) {
        if (!engine.getItem(def.id)) {
          engine.addItem(
            {
              id: def.id,
              label: def.label,
              canMove: def.canMove ?? true,
              canRemove: def.canRemove ?? true,
              canTap: def.canTap ?? true,
              metadata: def.metadata ?? {},
            },
            def.gridId,
            { column: def.column, row: def.row },
          );
        }
      }
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helper to get a cell element by its grid coordinates
// ---------------------------------------------------------------------------

export function getCellAt(
  gridId: string,
  column: number,
  row: number,
): HTMLElement | null {
  return document.querySelector(
    `[data-gf-grid-id="${gridId}"][data-gf-col="${column}"][data-gf-row="${row}"]`,
  );
}

// ---------------------------------------------------------------------------
// Helper to get the grid container element
// ---------------------------------------------------------------------------

export function getGridContainer(gridId: string): HTMLElement | null {
  return document.querySelector(`[data-gf-grid-id="${gridId}"][role="grid"]`);
}

// ---------------------------------------------------------------------------
// Helper to find an item element by id
// ---------------------------------------------------------------------------

export function getItemElement(itemId: string): HTMLElement | null {
  return document.querySelector(`[data-gf-item-id="${itemId}"]`);
}

// ---------------------------------------------------------------------------
// Helper to get the assertive announcer element
// ---------------------------------------------------------------------------

export function getAssertiveAnnouncer(): HTMLElement | null {
  return document.querySelector('[data-testid="gf-announcer-assertive"]');
}

// ---------------------------------------------------------------------------
// Helper to get the polite announcer element
// ---------------------------------------------------------------------------

export function getPoliteAnnouncer(): HTMLElement | null {
  return document.querySelector('[data-testid="gf-announcer-polite"]');
}

// ---------------------------------------------------------------------------
// pressKey — fire a keyDown event wrapped in act() for state flushing
// ---------------------------------------------------------------------------

export function pressKey(
  element: HTMLElement,
  key: string,
  options?: { shiftKey?: boolean; ctrlKey?: boolean; altKey?: boolean },
): void {
  act(() => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    });
    element.dispatchEvent(event);
  });
}

// ---------------------------------------------------------------------------
// focusGrid — focus the grid container and trigger engine.setFocusedGrid()
//
// The Grid component's onFocus handler calls engine.setFocusedGrid(id),
// which sets focusedGridId, defaults focusedCell to (1,1), and emits a
// 'focusMoved' event to trigger a React state sync.
// ---------------------------------------------------------------------------

export function focusGrid(gridId: string): HTMLElement {
  const grid = getGridContainer(gridId)!;

  // Focus the grid element — triggers Grid's handleFocus → engine.setFocusedGrid(id)
  // → emits focusMoved event → provider dispatch → React re-render
  act(() => {
    grid.focus();
  });

  return grid;
}
