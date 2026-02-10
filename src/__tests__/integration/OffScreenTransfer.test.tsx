import React, { useEffect, useState } from 'react';
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
// Helper render cell function
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
// Component where grid2 is registered but not rendered until toggled.
// Items are NOT added here; they are added externally via the engine ref.
// ---------------------------------------------------------------------------

interface OffScreenSetupProps {
  engineRef: React.MutableRefObject<GridEngine | null>;
  showGrid2Ref: React.MutableRefObject<(() => void) | null>;
}

function OffScreenSetup({ engineRef, showGrid2Ref }: OffScreenSetupProps) {
  const { engine } = useGridForge();
  const [showGrid2, setShowGrid2] = useState(false);

  useEffect(() => {
    engineRef.current = engine;
    showGrid2Ref.current = () => setShowGrid2(true);
  });

  useEffect(() => {
    // Register grid2 but do NOT render it yet
    if (!engine.getGrid('grid2')) {
      engine.registerGrid({
        id: 'grid2',
        columns: 3,
        rows: 3,
        type: '2d',
        label: 'Graveyard',
        allowStacking: false,
        sparse: true,
      });
    }
  }, [engine]);

  return (
    <>
      <Grid
        id="grid1"
        columns={3}
        rows={3}
        label="Battlefield"
        renderCell={(coords, cellItems) => renderCell('grid1', coords, cellItems)}
      />
      {showGrid2 && (
        <Grid
          id="grid2"
          columns={3}
          rows={3}
          label="Graveyard"
          renderCell={(coords, cellItems) => renderCell('grid2', coords, cellItems)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Helper: render the off-screen setup and add an item to grid1
// ---------------------------------------------------------------------------

function renderOffScreen() {
  const engineRef = { current: null } as React.MutableRefObject<GridEngine | null>;
  const showGrid2Ref = { current: null } as React.MutableRefObject<(() => void) | null>;

  render(
    <GridForgeProvider>
      <OffScreenSetup engineRef={engineRef} showGrid2Ref={showGrid2Ref} />
    </GridForgeProvider>,
  );

  const engine = engineRef.current!;

  // Add the goblin item after render so the provider's event subscriptions
  // are active. This ensures the addItem event triggers a re-render.
  act(() => {
    if (!engine.getItem('goblin')) {
      engine.addItem(
        {
          id: 'goblin',
          label: 'Goblin',
          canMove: true,
          canRemove: true,
          canTap: true,
          metadata: {},
        },
        'grid1',
        { column: 1, row: 1 },
      );
    }
  });

  return { engine, showGrid2Ref };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Off-Screen Transfer', () => {
  it('transfers an item to a non-rendered grid and it disappears from grid1', () => {
    const { engine } = renderOffScreen();

    // Verify item starts in grid1 visible
    let cell11 = getCellAt('grid1', 1, 1)!;
    expect(cell11.querySelector('[data-gf-item-id="goblin"]')).toBeTruthy();

    // Transfer to non-rendered grid2
    act(() => {
      const result = engine.transferItem('goblin', 'grid2', { column: 2, row: 2 });
      expect(result.success).toBe(true);
    });

    // Item should no longer be visible in grid1
    cell11 = getCellAt('grid1', 1, 1)!;
    expect(cell11.querySelector('[data-gf-item-id="goblin"]')).toBeNull();

    // Grid2 is not rendered so there should be no grid2 DOM element
    expect(screen.queryByRole('grid', { name: 'Graveyard' })).toBeNull();
  });

  it('item appears in grid2 when it is subsequently rendered', () => {
    const { engine, showGrid2Ref } = renderOffScreen();

    // Transfer item to grid2 (not yet rendered)
    act(() => {
      engine.transferItem('goblin', 'grid2', { column: 2, row: 2 });
    });

    // Now render grid2
    act(() => {
      showGrid2Ref.current!();
    });

    // Grid2 should now be visible
    expect(screen.getByRole('grid', { name: 'Graveyard' })).toBeInTheDocument();

    // Item should appear in grid2 at (2,2)
    const cell22Grid2 = getCellAt('grid2', 2, 2)!;
    expect(cell22Grid2).toBeTruthy();
    expect(cell22Grid2.querySelector('[data-gf-item-id="goblin"]')).toBeTruthy();
  });

  it('engine state correctly tracks the item on the non-rendered grid', () => {
    const { engine } = renderOffScreen();

    // Transfer
    act(() => {
      engine.transferItem('goblin', 'grid2', { column: 3, row: 1 });
    });

    // Verify engine state before rendering grid2
    const item = engine.getItem('goblin');
    expect(item).toBeDefined();
    expect(item!.gridId).toBe('grid2');
    expect(item!.coordinates).toEqual({ column: 3, row: 1 });

    // Grid2 should not be rendered
    const grid2State = engine.getGrid('grid2')!;
    expect(grid2State.isRendered).toBe(false);
    expect(grid2State.itemIds.has('goblin')).toBe(true);

    // Grid1 should not have the item
    const grid1State = engine.getGrid('grid1')!;
    expect(grid1State.itemIds.has('goblin')).toBe(false);
  });

  it('transfers item to off-screen grid and back to grid1', () => {
    const { engine } = renderOffScreen();

    // Transfer to grid2
    act(() => {
      engine.transferItem('goblin', 'grid2', { column: 1, row: 1 });
    });

    // Item gone from grid1
    const cell11 = getCellAt('grid1', 1, 1)!;
    expect(cell11.querySelector('[data-gf-item-id="goblin"]')).toBeNull();

    // Transfer back to grid1
    act(() => {
      const result = engine.transferItem('goblin', 'grid1', { column: 3, row: 3 });
      expect(result.success).toBe(true);
    });

    // Item should be visible again in grid1 at (3,3)
    const cell33 = getCellAt('grid1', 3, 3)!;
    expect(cell33.querySelector('[data-gf-item-id="goblin"]')).toBeTruthy();
  });

  it('multiple items can exist on a non-rendered grid', () => {
    const { engine, showGrid2Ref } = renderOffScreen();

    // Add a second item to grid1
    act(() => {
      engine.addItem(
        { id: 'orc', label: 'Orc', canMove: true, canRemove: true, canTap: true, metadata: {} },
        'grid1',
        { column: 2, row: 1 },
      );
    });

    // Transfer both items to grid2
    act(() => {
      engine.transferItem('goblin', 'grid2', { column: 1, row: 1 });
      engine.transferItem('orc', 'grid2', { column: 2, row: 1 });
    });

    // Engine state should reflect both items on grid2
    expect(engine.getItemsInGrid('grid2')).toHaveLength(2);
    expect(engine.getItemsInGrid('grid1')).toHaveLength(0);

    // Now render grid2
    act(() => {
      showGrid2Ref.current!();
    });

    // Both items should appear
    const goblinCell = getCellAt('grid2', 1, 1)!;
    expect(goblinCell.querySelector('[data-gf-item-id="goblin"]')).toBeTruthy();

    const orcCell = getCellAt('grid2', 2, 1)!;
    expect(orcCell.querySelector('[data-gf-item-id="orc"]')).toBeTruthy();
  });
});
