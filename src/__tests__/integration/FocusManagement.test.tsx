import { screen } from '@testing-library/react';
import React, { useEffect } from 'react';
import { render, act } from '@testing-library/react';
import { GridForgeProvider } from '../../components/GridForgeProvider.tsx';
import { Grid } from '../../components/Grid.tsx';
import { Cell } from '../../components/Cell.tsx';
import { Item } from '../../components/Item.tsx';
import { useGridForge } from '../../hooks/useGridForge.ts';
import type { Coordinates, ItemState } from '../../core/types.ts';
import {
  renderGrid,
  getCellAt,
  pressKey,
  focusGrid,
} from './helpers.tsx';

describe('Focus Management', () => {
  it('first cell receives focus (tabindex="0") when the grid is focused', () => {
    renderGrid({
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 2, row: 2 },
      ],
    });

    // Before focusing, no cell should be actively focused (tabindex=0) since
    // the grid hasn't received focus yet
    const cell11Before = getCellAt('grid1', 1, 1)!;
    expect(cell11Before.getAttribute('tabindex')).toBe('-1');

    // Focus the grid
    focusGrid('grid1');

    // After focusing, (1,1) should have tabindex="0"
    const cell11After = getCellAt('grid1', 1, 1)!;
    expect(cell11After.getAttribute('tabindex')).toBe('0');
  });

  it('arrow key navigation updates which cell has tabindex="0"', () => {
    renderGrid();

    const grid = focusGrid('grid1');

    // (1,1) is focused
    expect(getCellAt('grid1', 1, 1)!.getAttribute('tabindex')).toBe('0');

    // Move right
    pressKey(grid, 'ArrowRight');
    expect(getCellAt('grid1', 1, 1)!.getAttribute('tabindex')).toBe('-1');
    expect(getCellAt('grid1', 2, 1)!.getAttribute('tabindex')).toBe('0');

    // Move down
    pressKey(grid, 'ArrowDown');
    expect(getCellAt('grid1', 2, 1)!.getAttribute('tabindex')).toBe('-1');
    expect(getCellAt('grid1', 2, 2)!.getAttribute('tabindex')).toBe('0');
  });

  it('programmatic focus moves to the focused cell', () => {
    renderGrid();

    const grid = focusGrid('grid1');

    // The cell (1,1) should receive DOM focus
    const cell11 = getCellAt('grid1', 1, 1)!;
    expect(document.activeElement).toBe(cell11);

    // Move to (2,1)
    pressKey(grid, 'ArrowRight');
    const cell21 = getCellAt('grid1', 2, 1)!;
    expect(document.activeElement).toBe(cell21);
  });

  it('only one cell has tabindex="0" at any given time', () => {
    renderGrid();

    const grid = focusGrid('grid1');

    // Navigate a bit
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowDown');
    pressKey(grid, 'ArrowRight');

    // Count cells with tabindex="0"
    const allCells = screen.getAllByRole('gridcell');
    const focusableCells = allCells.filter(
      (cell) => cell.getAttribute('tabindex') === '0',
    );
    expect(focusableCells).toHaveLength(1);

    // The focused cell should be (3,2)
    expect(focusableCells[0].getAttribute('data-gf-col')).toBe('3');
    expect(focusableCells[0].getAttribute('data-gf-row')).toBe('2');
  });

  it('focus returns to last focused cell when re-entering the grid', () => {
    // Create a component with a grid and an external button for Tab out/in
    function TestPage() {
      const { engine } = useGridForge();

      useEffect(() => {
        if (!engine.getItem('goblin')) {
          engine.addItem(
            { id: 'goblin', label: 'Goblin', canMove: true, canRemove: true, canTap: true, metadata: {} },
            'grid1',
            { column: 1, row: 1 },
          );
        }
      }, [engine]);

      return (
        <>
          <button data-testid="external-button">External</button>
          <Grid
            id="grid1"
            columns={3}
            rows={3}
            label="Battle Map"
            renderCell={(coords: Coordinates, items: ItemState[]) => (
              <Cell gridId="grid1" coordinates={coords}>
                {items.map((item) => (
                  <Item key={item.id} id={item.id} label={item.label}>
                    <div>{item.label}</div>
                  </Item>
                ))}
              </Cell>
            )}
          />
        </>
      );
    }

    render(
      <GridForgeProvider>
        <TestPage />
      </GridForgeProvider>,
    );

    const grid = focusGrid('grid1');
    const externalButton = screen.getByTestId('external-button');

    // Navigate to (2,2)
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowDown');

    const cell22 = getCellAt('grid1', 2, 2)!;
    expect(cell22.getAttribute('tabindex')).toBe('0');

    // Simulate tabbing out by focusing the external button
    act(() => {
      externalButton.focus();
    });
    expect(document.activeElement).toBe(externalButton);

    // Re-focus the grid (simulates tabbing back in)
    focusGrid('grid1');

    // The last focused cell (2,2) should still have tabindex="0"
    expect(getCellAt('grid1', 2, 2)!.getAttribute('tabindex')).toBe('0');
  });

  it('cell has gf-cell--focused CSS class when focused', () => {
    renderGrid();

    const grid = focusGrid('grid1');

    // (1,1) should have the focused class
    const cell11 = getCellAt('grid1', 1, 1)!;
    expect(cell11.classList.contains('gf-cell--focused')).toBe(true);

    // Move to (2,1)
    pressKey(grid, 'ArrowRight');

    // (1,1) should lose the focused class
    expect(cell11.classList.contains('gf-cell--focused')).toBe(false);

    // (2,1) should gain it
    const cell21 = getCellAt('grid1', 2, 1)!;
    expect(cell21.classList.contains('gf-cell--focused')).toBe(true);
  });

  it('occupied cell has gf-cell--occupied class and empty cell has gf-cell--empty', () => {
    renderGrid({
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
      ],
    });

    // Cell with an item should have occupied class
    const cell11 = getCellAt('grid1', 1, 1)!;
    expect(cell11.classList.contains('gf-cell--occupied')).toBe(true);
    expect(cell11.classList.contains('gf-cell--empty')).toBe(false);

    // Empty cell should have empty class
    const cell21 = getCellAt('grid1', 2, 1)!;
    expect(cell21.classList.contains('gf-cell--empty')).toBe(true);
    expect(cell21.classList.contains('gf-cell--occupied')).toBe(false);
  });
});
