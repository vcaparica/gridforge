import React, { useEffect } from 'react';
import { render, act } from '@testing-library/react';
import { GridForgeProvider } from '../../components/GridForgeProvider.tsx';
import { Grid } from '../../components/Grid.tsx';
import { Cell } from '../../components/Cell.tsx';
import { Item } from '../../components/Item.tsx';
import { useGridForge } from '../../hooks/useGridForge.ts';
import type { Coordinates, ItemState } from '../../core/types.ts';
import type { GridEngine } from '../../core/GridEngine.ts';
import {
  renderGrid,
  getCellAt,
  pressKey,
  focusGrid,
} from './helpers.tsx';

// ---------------------------------------------------------------------------
// Shared render cell function
// ---------------------------------------------------------------------------

function renderCell(gridId: string, coords: Coordinates, items: ItemState[]) {
  return (
    <Cell gridId={gridId} coordinates={coords}>
      {items.map((item) => (
        <Item key={item.id} id={item.id} label={item.label} canMove={item.canMove}>
          <div data-testid={`item-visual-${item.id}`}>{item.label}</div>
        </Item>
      ))}
    </Cell>
  );
}

// ---------------------------------------------------------------------------
// Two-grid test component
// ---------------------------------------------------------------------------

function TwoGridSetup({
  engineRef,
}: {
  engineRef: React.MutableRefObject<GridEngine | null>;
}) {
  const { engine } = useGridForge();
  useEffect(() => { engineRef.current = engine; });

  return (
    <>
      <Grid
        id="grid1"
        columns={3}
        rows={3}
        label="Battle Map"
        renderCell={(coords, cellItems) => renderCell('grid1', coords, cellItems)}
      />
      <Grid
        id="grid2"
        columns={3}
        rows={3}
        label="Reserve"
        renderCell={(coords, cellItems) => renderCell('grid2', coords, cellItems)}
      />
    </>
  );
}

function renderTwoGrids(
  engineRef: React.MutableRefObject<GridEngine | null>,
  items?: Array<{
    id: string;
    label: string;
    gridId: string;
    column: number;
    row: number;
  }>,
) {
  const result = render(
    <GridForgeProvider>
      <TwoGridSetup engineRef={engineRef} />
    </GridForgeProvider>,
  );

  if (items && items.length > 0) {
    const engine = engineRef.current!;
    act(() => {
      for (const def of items) {
        if (!engine.getItem(def.id)) {
          engine.addItem(
            {
              id: def.id,
              label: def.label,
              canMove: true,
              canRemove: true,
              canTap: true,
              metadata: {},
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
// Off-screen grid test component (grid2 registered but not rendered)
// ---------------------------------------------------------------------------

function OffScreenSetup({
  engineRef,
}: {
  engineRef: React.MutableRefObject<GridEngine | null>;
}) {
  const { engine } = useGridForge();
  useEffect(() => { engineRef.current = engine; });

  useEffect(() => {
    if (!engine.getGrid('offscreen')) {
      engine.registerGrid({
        id: 'offscreen',
        columns: 3,
        rows: 3,
        type: '2d',
        label: 'Offscreen Zone',
        allowStacking: false,
        sparse: true,
      });
    }
  }, [engine]);

  return (
    <Grid
      id="grid1"
      columns={3}
      rows={3}
      label="Battle Map"
      renderCell={(coords, cellItems) => renderCell('grid1', coords, cellItems)}
    />
  );
}

function renderWithOffScreen(
  engineRef: React.MutableRefObject<GridEngine | null>,
  items?: Array<{
    id: string;
    label: string;
    gridId: string;
    column: number;
    row: number;
  }>,
) {
  const result = render(
    <GridForgeProvider>
      <OffScreenSetup engineRef={engineRef} />
    </GridForgeProvider>,
  );

  if (items && items.length > 0) {
    const engine = engineRef.current!;
    act(() => {
      for (const def of items) {
        if (!engine.getItem(def.id)) {
          engine.addItem(
            {
              id: def.id,
              label: def.label,
              canMove: true,
              canRemove: true,
              canTap: true,
              metadata: {},
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
// Tests
// ---------------------------------------------------------------------------

describe('Focus Follows Item', () => {
  it('grab and move within same grid → DOM focus follows item', () => {
    renderGrid({
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
      ],
    });

    const grid = focusGrid('grid1');

    // Focus at (1,1), grab the Goblin
    const cell11 = getCellAt('grid1', 1, 1)!;
    expect(document.activeElement).toBe(cell11);

    pressKey(grid, 'Enter');

    // Move right → item and focus move to (2,1)
    pressKey(grid, 'ArrowRight');

    const cell21 = getCellAt('grid1', 2, 1)!;
    expect(document.activeElement).toBe(cell21);
    expect(cell21.getAttribute('tabindex')).toBe('0');
    expect(cell11.getAttribute('tabindex')).toBe('-1');

    // Move down → item and focus move to (2,2)
    pressKey(grid, 'ArrowDown');

    const cell22 = getCellAt('grid1', 2, 2)!;
    expect(document.activeElement).toBe(cell22);

    // Drop
    pressKey(grid, 'Enter');

    // Focus should remain at (2,2)
    expect(document.activeElement).toBe(cell22);
    expect(cell22.getAttribute('tabindex')).toBe('0');
  });

  it('grab, cross-grid move via engine → DOM focus moves to second grid cell', () => {
    const engineRef = { current: null } as React.MutableRefObject<GridEngine | null>;

    renderTwoGrids(engineRef, [
      { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
    ]);

    const grid1 = focusGrid('grid1');

    // Grab
    pressKey(grid1, 'Enter');

    // Cross-grid move via engine (simulates Tab-cycle or programmatic cross-grid grab move)
    const engine = engineRef.current!;
    act(() => {
      engine.moveGrabbedTo('grid2', { column: 2, row: 2 });
    });

    // Focus should now be on grid2 cell (2,2)
    const cell22Grid2 = getCellAt('grid2', 2, 2)!;
    expect(document.activeElement).toBe(cell22Grid2);
    expect(cell22Grid2.getAttribute('tabindex')).toBe('0');
  });

  it('cancel grab → DOM focus returns to original cell', () => {
    renderGrid({
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 2, row: 2 },
      ],
    });

    const grid = focusGrid('grid1');

    // Navigate to (2,2)
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowDown');

    const cell22 = getCellAt('grid1', 2, 2)!;
    expect(document.activeElement).toBe(cell22);

    // Grab
    pressKey(grid, 'Enter');

    // Move right and down
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowDown');

    // Focus should be at (3,3)
    const cell33 = getCellAt('grid1', 3, 3)!;
    expect(document.activeElement).toBe(cell33);

    // Cancel grab with Escape
    pressKey(grid, 'Escape');

    // Focus should return to original (2,2)
    expect(document.activeElement).toBe(cell22);
    expect(cell22.getAttribute('tabindex')).toBe('0');
  });

  it('cancel cross-grid grab → DOM focus returns to original grid cell', () => {
    const engineRef = { current: null } as React.MutableRefObject<GridEngine | null>;

    renderTwoGrids(engineRef, [
      { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
    ]);

    const grid1 = focusGrid('grid1');

    // Grab
    pressKey(grid1, 'Enter');

    // Move cross-grid
    const engine = engineRef.current!;
    act(() => {
      engine.moveGrabbedTo('grid2', { column: 3, row: 3 });
    });

    // Focus should be on grid2
    const cell33Grid2 = getCellAt('grid2', 3, 3)!;
    expect(document.activeElement).toBe(cell33Grid2);

    // Cancel
    act(() => {
      engine.cancelGrab();
    });

    // Focus should return to grid1 at (1,1)
    const cell11Grid1 = getCellAt('grid1', 1, 1)!;
    expect(document.activeElement).toBe(cell11Grid1);
    expect(cell11Grid1.getAttribute('tabindex')).toBe('0');
  });

  it('move to non-rendered grid → DOM focus stays in source grid', () => {
    const engineRef = { current: null } as React.MutableRefObject<GridEngine | null>;

    renderWithOffScreen(engineRef, [
      { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 2, row: 2 },
    ]);

    const grid1 = focusGrid('grid1');

    // Navigate to (2,2)
    pressKey(grid1, 'ArrowRight');
    pressKey(grid1, 'ArrowDown');

    const cell22 = getCellAt('grid1', 2, 2)!;
    expect(document.activeElement).toBe(cell22);

    // Grab
    pressKey(grid1, 'Enter');

    // Move to non-rendered grid via engine
    const engine = engineRef.current!;
    act(() => {
      engine.moveGrabbedTo('offscreen', { column: 1, row: 1 });
    });

    // Focus should stay at grid1 (2,2) since offscreen is not rendered
    expect(document.activeElement).toBe(cell22);
    expect(cell22.getAttribute('tabindex')).toBe('0');
  });
});
