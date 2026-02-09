import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { GridForgeProvider } from '../../components/GridForgeProvider.tsx';
import { Grid } from '../../components/Grid.tsx';
import { Cell } from '../../components/Cell.tsx';
import { Item } from '../../components/Item.tsx';
import { useGridForge } from '../../hooks/useGridForge.ts';
import type { Coordinates, ItemState } from '../../core/types.ts';
import type { GridEngine } from '../../core/GridEngine.ts';
import { getCellAt } from './helpers.tsx';

// ---------------------------------------------------------------------------
// Shared render cell function
// ---------------------------------------------------------------------------

function renderCell(gridId: string, coords: Coordinates, items: ItemState[]) {
  return (
    <Cell gridId={gridId} coordinates={coords}>
      {items.map((item) => (
        <Item key={item.id} id={item.id} label={item.label}>
          <div data-testid={`item-visual-${item.id}`}>{item.label}</div>
        </Item>
      ))}
    </Cell>
  );
}

// ---------------------------------------------------------------------------
// Two-grid test component — renders grids only, items added externally
// ---------------------------------------------------------------------------

function TwoGridSetup({
  engineRef,
}: {
  engineRef: React.MutableRefObject<GridEngine | null>;
}) {
  const { engine } = useGridForge();
  engineRef.current = engine;

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

  // Add items after render so the provider's event subscriptions are active.
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

describe('Cross-Grid Transfer', () => {
  it('renders two grids side by side', () => {
    const engineRef = { current: null } as React.MutableRefObject<GridEngine | null>;

    renderTwoGrids(engineRef);

    expect(screen.getByRole('grid', { name: 'Battle Map' })).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: 'Reserve' })).toBeInTheDocument();
  });

  it('transfers an item from grid1 to grid2 via engine.transferItem()', () => {
    const engineRef = { current: null } as React.MutableRefObject<GridEngine | null>;

    renderTwoGrids(engineRef, [
      { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
    ]);

    // Verify item starts in grid1
    let cell11Grid1 = getCellAt('grid1', 1, 1)!;
    expect(cell11Grid1.querySelector('[data-gf-item-id="goblin"]')).toBeTruthy();

    const engine = engineRef.current!;
    expect(engine).toBeTruthy();

    // Transfer item to grid2 at (2,2)
    act(() => {
      const result = engine.transferItem('goblin', 'grid2', { column: 2, row: 2 });
      expect(result.success).toBe(true);
    });

    // Item should now be in grid2
    const itemInGrid2 = getCellAt('grid2', 2, 2);
    expect(itemInGrid2).toBeTruthy();
    expect(itemInGrid2!.querySelector('[data-gf-item-id="goblin"]')).toBeTruthy();

    // Item should no longer be in grid1
    cell11Grid1 = getCellAt('grid1', 1, 1)!;
    expect(cell11Grid1.querySelector('[data-gf-item-id="goblin"]')).toBeNull();
  });

  it('transfers multiple items between grids', () => {
    const engineRef = { current: null } as React.MutableRefObject<GridEngine | null>;

    renderTwoGrids(engineRef, [
      { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
      { id: 'orc', label: 'Orc', gridId: 'grid1', column: 2, row: 1 },
    ]);

    const engine = engineRef.current!;

    act(() => {
      engine.transferItem('goblin', 'grid2', { column: 1, row: 1 });
      engine.transferItem('orc', 'grid2', { column: 2, row: 1 });
    });

    // Both items should be in grid2
    const goblinCell = getCellAt('grid2', 1, 1)!;
    expect(goblinCell.querySelector('[data-gf-item-id="goblin"]')).toBeTruthy();

    const orcCell = getCellAt('grid2', 2, 1)!;
    expect(orcCell.querySelector('[data-gf-item-id="orc"]')).toBeTruthy();

    // Grid1 should be empty
    const g1Cell11 = getCellAt('grid1', 1, 1)!;
    expect(g1Cell11.querySelector('[data-gf-item-id="goblin"]')).toBeNull();

    const g1Cell21 = getCellAt('grid1', 2, 1)!;
    expect(g1Cell21.querySelector('[data-gf-item-id="orc"]')).toBeNull();
  });

  it('transfer fails for out-of-bounds coordinates', () => {
    const engineRef = { current: null } as React.MutableRefObject<GridEngine | null>;

    renderTwoGrids(engineRef, [
      { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
    ]);

    const engine = engineRef.current!;

    let result: { success: boolean };
    act(() => {
      result = engine.transferItem('goblin', 'grid2', { column: 5, row: 1 });
    });
    expect(result!.success).toBe(false);

    // Item should still be in grid1
    const cell11 = getCellAt('grid1', 1, 1)!;
    expect(cell11.querySelector('[data-gf-item-id="goblin"]')).toBeTruthy();
  });

  it('verifies the engine item state reflects the transfer', () => {
    const engineRef = { current: null } as React.MutableRefObject<GridEngine | null>;

    renderTwoGrids(engineRef, [
      { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
    ]);

    const engine = engineRef.current!;

    act(() => {
      engine.transferItem('goblin', 'grid2', { column: 3, row: 3 });
    });

    // Verify the engine's item state
    const item = engine.getItem('goblin');
    expect(item).toBeDefined();
    expect(item!.gridId).toBe('grid2');
    expect(item!.coordinates.column).toBe(3);
    expect(item!.coordinates.row).toBe(3);

    // Verify the grid's itemIds set
    const grid1 = engine.getGrid('grid1')!;
    expect(grid1.itemIds.has('goblin')).toBe(false);

    const grid2 = engine.getGrid('grid2')!;
    expect(grid2.itemIds.has('goblin')).toBe(true);
  });
});
