import { screen } from '@testing-library/react';
import {
  renderGrid,
  getCellAt,
  getGridContainer,
  pressKey,
  focusGrid,
} from './helpers.tsx';

describe('Grid Navigation', () => {
  it('renders a 3x3 grid with cells accessible by role', () => {
    renderGrid({
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
        { id: 'orc', label: 'Orc', gridId: 'grid1', column: 2, row: 2 },
        { id: 'dragon', label: 'Dragon', gridId: 'grid1', column: 3, row: 3 },
      ],
    });

    const grid = screen.getByRole('grid', { name: 'Battle Map' });
    expect(grid).toBeInTheDocument();

    // There should be 9 gridcells (3x3)
    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(9);
  });

  it('focuses the first cell (1,1) when the grid receives focus', () => {
    renderGrid({
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
      ],
    });

    const grid = focusGrid('grid1');

    // The cell at (1,1) should now be focused (tabindex="0")
    const cell11 = getCellAt('grid1', 1, 1)!;
    expect(cell11).toBeTruthy();
    expect(cell11.getAttribute('tabindex')).toBe('0');
  });

  it('moves focus right and down with arrow keys', () => {
    renderGrid({
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
      ],
    });

    const grid = focusGrid('grid1');

    // Press ArrowRight -> should move focus to (2,1)
    pressKey(grid, 'ArrowRight');
    const cell21 = getCellAt('grid1', 2, 1)!;
    expect(cell21.getAttribute('tabindex')).toBe('0');

    // The previous cell should have tabindex="-1"
    const cell11 = getCellAt('grid1', 1, 1)!;
    expect(cell11.getAttribute('tabindex')).toBe('-1');

    // Press ArrowDown -> should move focus to (2,2)
    pressKey(grid, 'ArrowDown');
    const cell22 = getCellAt('grid1', 2, 2)!;
    expect(cell22.getAttribute('tabindex')).toBe('0');
    expect(cell21.getAttribute('tabindex')).toBe('-1');
  });

  it('moves focus left and up with arrow keys', () => {
    renderGrid({
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 2, row: 2 },
      ],
    });

    const grid = focusGrid('grid1');

    // Move to (2,2) first
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowDown');

    const cell22 = getCellAt('grid1', 2, 2)!;
    expect(cell22.getAttribute('tabindex')).toBe('0');

    // Press ArrowLeft -> should move focus to (1,2)
    pressKey(grid, 'ArrowLeft');
    const cell12 = getCellAt('grid1', 1, 2)!;
    expect(cell12.getAttribute('tabindex')).toBe('0');
    expect(cell22.getAttribute('tabindex')).toBe('-1');

    // Press ArrowUp -> should move focus to (1,1)
    pressKey(grid, 'ArrowUp');
    const cell11 = getCellAt('grid1', 1, 1)!;
    expect(cell11.getAttribute('tabindex')).toBe('0');
    expect(cell12.getAttribute('tabindex')).toBe('-1');
  });

  it('does not wrap focus beyond grid boundaries', () => {
    renderGrid();

    const grid = focusGrid('grid1');

    // Focus starts at (1,1). Press ArrowLeft -> should stay at (1,1)
    pressKey(grid, 'ArrowLeft');
    const cell11 = getCellAt('grid1', 1, 1)!;
    expect(cell11.getAttribute('tabindex')).toBe('0');

    // Press ArrowUp -> should stay at (1,1)
    pressKey(grid, 'ArrowUp');
    expect(cell11.getAttribute('tabindex')).toBe('0');

    // Move to bottom-right corner (3,3)
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowDown');
    pressKey(grid, 'ArrowDown');

    const cell33 = getCellAt('grid1', 3, 3)!;
    expect(cell33.getAttribute('tabindex')).toBe('0');

    // Press ArrowRight -> should stay at (3,3)
    pressKey(grid, 'ArrowRight');
    expect(cell33.getAttribute('tabindex')).toBe('0');

    // Press ArrowDown -> should stay at (3,3)
    pressKey(grid, 'ArrowDown');
    expect(cell33.getAttribute('tabindex')).toBe('0');
  });

  it('Home jumps to the first cell in the current row', () => {
    renderGrid();

    const grid = focusGrid('grid1');

    // Move to (3,2)
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowDown');

    const cell32 = getCellAt('grid1', 3, 2)!;
    expect(cell32.getAttribute('tabindex')).toBe('0');

    // Press Home -> focus should jump to (1,2) (first cell in row 2)
    pressKey(grid, 'Home');

    const cell12 = getCellAt('grid1', 1, 2)!;
    expect(cell12.getAttribute('tabindex')).toBe('0');
    expect(cell32.getAttribute('tabindex')).toBe('-1');
  });

  it('End jumps to the last cell in the current row', () => {
    renderGrid();

    const grid = focusGrid('grid1');

    // Move to (1,2)
    pressKey(grid, 'ArrowDown');

    const cell12 = getCellAt('grid1', 1, 2)!;
    expect(cell12.getAttribute('tabindex')).toBe('0');

    // Press End -> focus should jump to (3,2) (last cell in row 2)
    pressKey(grid, 'End');

    const cell32 = getCellAt('grid1', 3, 2)!;
    expect(cell32.getAttribute('tabindex')).toBe('0');
    expect(cell12.getAttribute('tabindex')).toBe('-1');
  });

  it('Ctrl+Home jumps to the first cell in the grid (1,1)', () => {
    renderGrid();

    const grid = focusGrid('grid1');

    // Move to (3,3)
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowDown');
    pressKey(grid, 'ArrowDown');

    const cell33 = getCellAt('grid1', 3, 3)!;
    expect(cell33.getAttribute('tabindex')).toBe('0');

    // Press Ctrl+Home -> focus should jump to (1,1)
    pressKey(grid, 'Home', { ctrlKey: true });

    const cell11 = getCellAt('grid1', 1, 1)!;
    expect(cell11.getAttribute('tabindex')).toBe('0');
    expect(cell33.getAttribute('tabindex')).toBe('-1');
  });

  it('Ctrl+End jumps to the last cell in the grid (3,3)', () => {
    renderGrid();

    const grid = focusGrid('grid1');

    // Focus starts at (1,1)
    const cell11 = getCellAt('grid1', 1, 1)!;
    expect(cell11.getAttribute('tabindex')).toBe('0');

    // Press Ctrl+End -> focus should jump to (3,3)
    pressKey(grid, 'End', { ctrlKey: true });

    const cell33 = getCellAt('grid1', 3, 3)!;
    expect(cell33.getAttribute('tabindex')).toBe('0');
    expect(cell11.getAttribute('tabindex')).toBe('-1');
  });
});
