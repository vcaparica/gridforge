import { screen } from '@testing-library/react';
import {
  renderGrid,
  getCellAt,
  getGridContainer,
  pressKey,
  focusGrid,
} from './helpers.tsx';

describe('Sparse Grid', () => {
  const sparseItems = [
    { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
    { id: 'dragon', label: 'Dragon', gridId: 'grid1', column: 3, row: 3 },
    { id: 'knight', label: 'Knight', gridId: 'grid1', column: 5, row: 1 },
  ];

  it('renders a 5x5 grid with items at non-adjacent positions', () => {
    renderGrid({
      columns: 5,
      rows: 5,
      items: sparseItems,
    });

    const grid = screen.getByRole('grid', { name: 'Battle Map' });
    expect(grid).toBeInTheDocument();

    // Verify all 25 cells exist (5x5)
    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(25);

    // Verify each item exists at the correct cell
    const goblinCell = getCellAt('grid1', 1, 1)!;
    expect(goblinCell.querySelector('[data-gf-item-id="goblin"]')).toBeTruthy();

    const dragonCell = getCellAt('grid1', 3, 3)!;
    expect(dragonCell.querySelector('[data-gf-item-id="dragon"]')).toBeTruthy();

    const knightCell = getCellAt('grid1', 5, 1)!;
    expect(knightCell.querySelector('[data-gf-item-id="knight"]')).toBeTruthy();
  });

  it('cells between items are empty', () => {
    renderGrid({
      columns: 5,
      rows: 5,
      items: sparseItems,
    });

    // Check that (2,1) is empty
    const cell21 = getCellAt('grid1', 2, 1)!;
    expect(cell21.querySelector('[data-gf-item-id]')).toBeNull();

    // Check that (2,2) is empty
    const cell22 = getCellAt('grid1', 2, 2)!;
    expect(cell22.querySelector('[data-gf-item-id]')).toBeNull();

    // Check that (4,4) is empty
    const cell44 = getCellAt('grid1', 4, 4)!;
    expect(cell44.querySelector('[data-gf-item-id]')).toBeNull();
  });

  it('can navigate to each item cell via arrow keys', () => {
    renderGrid({
      columns: 5,
      rows: 5,
      items: sparseItems,
    });

    const grid = focusGrid('grid1');

    // Focus starts at (1,1) which has the Goblin
    const cell11 = getCellAt('grid1', 1, 1)!;
    expect(cell11.getAttribute('tabindex')).toBe('0');
    // The cell's aria-label should mention "Goblin"
    expect(cell11.getAttribute('aria-label')).toContain('Goblin');

    // Navigate to (3,3) where the Dragon is: right 2, down 2
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowDown');
    pressKey(grid, 'ArrowDown');

    const cell33 = getCellAt('grid1', 3, 3)!;
    expect(cell33.getAttribute('tabindex')).toBe('0');
    expect(cell33.getAttribute('aria-label')).toContain('Dragon');

    // Navigate to (5,1) where the Knight is: right 2, up 2
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowUp');
    pressKey(grid, 'ArrowUp');

    const cell51 = getCellAt('grid1', 5, 1)!;
    expect(cell51.getAttribute('tabindex')).toBe('0');
    expect(cell51.getAttribute('aria-label')).toContain('Knight');
  });

  it('empty cells show "Empty" in their aria-label', () => {
    renderGrid({
      columns: 5,
      rows: 5,
      items: sparseItems,
    });

    const grid = focusGrid('grid1');

    // Navigate to (2,1) which is empty
    pressKey(grid, 'ArrowRight');

    const cell21 = getCellAt('grid1', 2, 1)!;
    expect(cell21.getAttribute('tabindex')).toBe('0');
    expect(cell21.getAttribute('aria-label')).toContain('Empty');
  });

  it('can grab and move an item across sparse empty cells', () => {
    renderGrid({
      columns: 5,
      rows: 5,
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
      ],
    });

    const grid = focusGrid('grid1');

    // Grab the goblin at (1,1)
    pressKey(grid, 'Enter');

    // Move right 4 times to get to (5,1)
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowRight');

    // Drop
    pressKey(grid, 'Enter');

    // Verify item is at (5,1)
    const cell51 = getCellAt('grid1', 5, 1)!;
    expect(cell51.querySelector('[data-gf-item-id="goblin"]')).toBeTruthy();

    // Verify item is not at original (1,1)
    const cell11 = getCellAt('grid1', 1, 1)!;
    expect(cell11.querySelector('[data-gf-item-id="goblin"]')).toBeNull();
  });

  it('each cell has correct aria-colindex and aria-rowindex attributes', () => {
    renderGrid({
      columns: 5,
      rows: 5,
      items: sparseItems,
    });

    // Check a few cells for correct positioning attributes
    const cell11 = getCellAt('grid1', 1, 1)!;
    expect(cell11.getAttribute('aria-colindex')).toBe('1');
    expect(cell11.getAttribute('aria-rowindex')).toBe('1');

    const cell33 = getCellAt('grid1', 3, 3)!;
    expect(cell33.getAttribute('aria-colindex')).toBe('3');
    expect(cell33.getAttribute('aria-rowindex')).toBe('3');

    const cell51 = getCellAt('grid1', 5, 1)!;
    expect(cell51.getAttribute('aria-colindex')).toBe('5');
    expect(cell51.getAttribute('aria-rowindex')).toBe('1');

    const cell55 = getCellAt('grid1', 5, 5)!;
    expect(cell55.getAttribute('aria-colindex')).toBe('5');
    expect(cell55.getAttribute('aria-rowindex')).toBe('5');
  });
});
