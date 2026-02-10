import React, { useEffect } from 'react';
import { render, act } from '@testing-library/react';
import { GridForgeProvider } from '../../components/GridForgeProvider.tsx';
import { Grid } from '../../components/Grid.tsx';
import { Cell } from '../../components/Cell.tsx';
import { Item } from '../../components/Item.tsx';
import { useGridForge } from '../../hooks/useGridForge.ts';
import type { Coordinates, ItemState } from '../../core/types.ts';
import type { GridEngine } from '../../core/GridEngine.ts';
import { getCellAt, pressKey } from './helpers.tsx';

// ---------------------------------------------------------------------------
// Helper: get document.activeElement as HTMLElement (non-null assertion)
// ---------------------------------------------------------------------------

function activeElement(): HTMLElement {
  return document.activeElement as HTMLElement;
}

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
// Four-grid test component
// ---------------------------------------------------------------------------

function FourGridSetup({
  engineRef,
}: {
  engineRef: React.MutableRefObject<GridEngine | null>;
}) {
  const { engine } = useGridForge();
  useEffect(() => { engineRef.current = engine; });

  return (
    <>
      <Grid
        id="gridA"
        columns={3}
        rows={3}
        label="Grid A"
        renderCell={(coords, cellItems) => renderCell('gridA', coords, cellItems)}
      />
      <Grid
        id="gridB"
        columns={3}
        rows={3}
        label="Grid B"
        renderCell={(coords, cellItems) => renderCell('gridB', coords, cellItems)}
      />
      <Grid
        id="gridC"
        columns={3}
        rows={3}
        label="Grid C"
        renderCell={(coords, cellItems) => renderCell('gridC', coords, cellItems)}
      />
      <Grid
        id="gridD"
        columns={3}
        rows={3}
        label="Grid D"
        renderCell={(coords, cellItems) => renderCell('gridD', coords, cellItems)}
      />
    </>
  );
}

function renderFourGrids(
  engineRef: React.MutableRefObject<GridEngine | null>,
) {
  const result = render(
    <GridForgeProvider>
      <FourGridSetup engineRef={engineRef} />
    </GridForgeProvider>,
  );

  const engine = engineRef.current!;
  act(() => {
    engine.addItem(
      {
        id: 'token',
        label: 'Token',
        canMove: true,
        canRemove: true,
        canTap: true,
        metadata: {},
      },
      'gridA',
      { column: 1, row: 1 },
    );
  });

  return result;
}

// ---------------------------------------------------------------------------
// Helper: focus a grid by focusing its container (works for both grid & listbox)
// ---------------------------------------------------------------------------

function focusGridByAttr(gridId: string): HTMLElement {
  const container = document.querySelector(
    `[data-gf-grid-id="${gridId}"][role="grid"], [data-gf-grid-id="${gridId}"][role="listbox"]`,
  ) as HTMLElement;

  act(() => {
    container.focus();
  });

  return container;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Tab cycling while grabbing visits all grids', () => {
  it('Tab cycles through all 4 grids in order while grabbing', () => {
    const engineRef = { current: null } as React.MutableRefObject<GridEngine | null>;
    renderFourGrids(engineRef);

    // Focus Grid A and grab the token
    focusGridByAttr('gridA');
    const cellA11 = getCellAt('gridA', 1, 1)!;
    expect(document.activeElement).toBe(cellA11);

    // Grab
    pressKey(activeElement(), 'Enter');

    // Tab 1: A → B
    pressKey(activeElement(), 'Tab');
    const cellB11 = getCellAt('gridB', 1, 1)!;
    expect(document.activeElement).toBe(cellB11);

    // Tab 2: B → C
    pressKey(activeElement(), 'Tab');
    const cellC11 = getCellAt('gridC', 1, 1)!;
    expect(document.activeElement).toBe(cellC11);

    // Tab 3: C → D
    pressKey(activeElement(), 'Tab');
    const cellD11 = getCellAt('gridD', 1, 1)!;
    expect(document.activeElement).toBe(cellD11);

    // Tab 4: D → A (wraps around)
    pressKey(activeElement(), 'Tab');
    expect(document.activeElement).toBe(cellA11);
  });

  it('Shift+Tab cycles backwards through all grids while grabbing', () => {
    const engineRef = { current: null } as React.MutableRefObject<GridEngine | null>;
    renderFourGrids(engineRef);

    // Focus Grid A and grab the token
    focusGridByAttr('gridA');
    expect(document.activeElement).toBe(getCellAt('gridA', 1, 1));

    // Grab
    pressKey(activeElement(), 'Enter');

    // Shift+Tab 1: A → D (wraps backwards)
    pressKey(activeElement(), 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(getCellAt('gridD', 1, 1));

    // Shift+Tab 2: D → C
    pressKey(activeElement(), 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(getCellAt('gridC', 1, 1));

    // Shift+Tab 3: C → B
    pressKey(activeElement(), 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(getCellAt('gridB', 1, 1));

    // Shift+Tab 4: B → A
    pressKey(activeElement(), 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(getCellAt('gridA', 1, 1));
  });

  it('Tab + arrow browsing + Tab continues cycling correctly', () => {
    const engineRef = { current: null } as React.MutableRefObject<GridEngine | null>;
    renderFourGrids(engineRef);

    // Focus Grid A and grab the token
    focusGridByAttr('gridA');
    pressKey(activeElement(), 'Enter');

    // Tab to Grid B
    pressKey(activeElement(), 'Tab');
    expect(document.activeElement).toBe(getCellAt('gridB', 1, 1));

    // Browse around Grid B with arrow keys (focus moves, item stays on A)
    pressKey(activeElement(), 'ArrowRight');
    expect(document.activeElement).toBe(getCellAt('gridB', 2, 1));

    pressKey(activeElement(), 'ArrowDown');
    expect(document.activeElement).toBe(getCellAt('gridB', 2, 2));

    // Tab again: should go to Grid C, not back to A
    pressKey(activeElement(), 'Tab');
    expect(document.activeElement).toBe(getCellAt('gridC', 1, 1));

    // Tab again: should go to Grid D
    pressKey(activeElement(), 'Tab');
    expect(document.activeElement).toBe(getCellAt('gridD', 1, 1));
  });
});
