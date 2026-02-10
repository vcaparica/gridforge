import {
  renderGrid,
  getCellAt,
  getItemElement,
  pressKey,
  focusGrid,
} from './helpers.tsx';

describe('Grab / Move / Drop Cycle', () => {
  it('grabs an item with Enter, moves it right, and drops it', () => {
    renderGrid({
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
      ],
    });

    const grid = focusGrid('grid1');

    // Focus is at (1,1) which has the Goblin
    // Press Enter to grab
    pressKey(grid, 'Enter');

    // The item should now be grabbed (aria-selected="true" on the item)
    const itemEl = getItemElement('goblin')!;
    expect(itemEl).toBeTruthy();
    expect(itemEl.getAttribute('aria-selected')).toBe('true');

    // Press ArrowRight to move the grabbed item to (2,1)
    pressKey(grid, 'ArrowRight');

    // Press Enter to drop
    pressKey(grid, 'Enter');

    // Verify item is no longer grabbed
    const itemAfterDrop = getItemElement('goblin')!;
    expect(itemAfterDrop.getAttribute('aria-selected')).not.toBe('true');

    // Verify item is now at cell (2,1)
    const cell21 = getCellAt('grid1', 2, 1)!;
    expect(cell21.querySelector('[data-gf-item-id="goblin"]')).toBeTruthy();

    // Verify item is no longer at cell (1,1)
    const cell11 = getCellAt('grid1', 1, 1)!;
    expect(cell11.querySelector('[data-gf-item-id="goblin"]')).toBeNull();
  });

  it('grabs with Space and moves multiple steps before dropping', () => {
    renderGrid({
      items: [
        { id: 'orc', label: 'Orc', gridId: 'grid1', column: 1, row: 1 },
      ],
    });

    const grid = focusGrid('grid1');

    // Grab with Space
    pressKey(grid, ' ');

    // Move right twice, then down once -> should end at (3,2)
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowDown');

    // Drop with Enter
    pressKey(grid, 'Enter');

    // Verify item is at (3,2)
    const cell32 = getCellAt('grid1', 3, 2)!;
    expect(cell32.querySelector('[data-gf-item-id="orc"]')).toBeTruthy();

    // Verify item is not at the original position
    const cell11 = getCellAt('grid1', 1, 1)!;
    expect(cell11.querySelector('[data-gf-item-id="orc"]')).toBeNull();
  });

  it('cancels a grab with Escape and returns item to original position', () => {
    renderGrid({
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 2, row: 2 },
      ],
    });

    const grid = focusGrid('grid1');

    // Navigate to (2,2)
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowDown');

    // Grab the item
    pressKey(grid, 'Enter');

    // Move it right
    pressKey(grid, 'ArrowRight');

    // Cancel with Escape
    pressKey(grid, 'Escape');

    // Item should be back at (2,2)
    const cell22 = getCellAt('grid1', 2, 2)!;
    expect(cell22.querySelector('[data-gf-item-id="goblin"]')).toBeTruthy();

    // Item should NOT be at (3,2)
    const cell32 = getCellAt('grid1', 3, 2)!;
    expect(cell32.querySelector('[data-gf-item-id="goblin"]')).toBeNull();

    // Item should no longer show as grabbed
    const itemEl = getItemElement('goblin')!;
    expect(itemEl.getAttribute('aria-selected')).not.toBe('true');
  });

  it('cannot move grabbed item beyond grid boundaries', () => {
    renderGrid({
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 3, row: 1 },
      ],
    });

    const grid = focusGrid('grid1');

    // Navigate to (3,1)
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowRight');

    // Grab the item
    pressKey(grid, 'Enter');

    // Try to move right (should be blocked since column 3 is the last)
    pressKey(grid, 'ArrowRight');

    // Item should still be at (3,1)
    const cell31 = getCellAt('grid1', 3, 1)!;
    expect(cell31.querySelector('[data-gf-item-id="goblin"]')).toBeTruthy();

    // Drop it
    pressKey(grid, 'Enter');
    const itemEl = getItemElement('goblin')!;
    expect(itemEl.getAttribute('aria-selected')).not.toBe('true');
  });

  it('does not grab a non-movable item', () => {
    renderGrid({
      items: [
        {
          id: 'wall',
          label: 'Wall',
          gridId: 'grid1',
          column: 1,
          row: 1,
          canMove: false,
        },
      ],
    });

    const grid = focusGrid('grid1');

    // Try to grab
    pressKey(grid, 'Enter');

    // Item should NOT be grabbed (no aria-selected="true")
    const itemEl = getItemElement('wall');
    // The item might still be null if canMove=false prevents certain states,
    // but if it exists it should not be selected
    if (itemEl) {
      expect(itemEl.getAttribute('aria-selected')).not.toBe('true');
    }
  });

  it('applies the gf-item--grabbed CSS class while grabbed', () => {
    renderGrid({
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
      ],
    });

    const grid = focusGrid('grid1');

    // Before grabbing, no grabbed class
    let itemEl = getItemElement('goblin');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.classList.contains('gf-item--grabbed')).toBe(false);

    // Grab
    pressKey(grid, 'Enter');

    // After grabbing, should have the class
    itemEl = getItemElement('goblin');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.classList.contains('gf-item--grabbed')).toBe(true);

    // Drop
    pressKey(grid, 'Enter');

    // After dropping, class should be removed
    itemEl = getItemElement('goblin');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.classList.contains('gf-item--grabbed')).toBe(false);
  });
});
