import {
  renderGrid,
  getGridContainer,
  getItemElement,
  pressKey,
  focusGrid,
} from './helpers.tsx';

describe('Tap and Flip', () => {
  it('taps an item clockwise with the T key', () => {
    renderGrid({
      items: [
        { id: 'card1', label: 'Black Lotus', gridId: 'grid1', column: 1, row: 1, canTap: true },
      ],
    });

    const grid = focusGrid('grid1');

    // Verify initial state: the item aria-label should include "upright"
    let itemEl = getItemElement('card1');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.getAttribute('aria-label')).toContain('upright');

    // Press 't' to tap clockwise (0 -> 45)
    pressKey(grid, 't');

    // After first tap, angle should be 45: "tilted 45 degrees clockwise"
    itemEl = getItemElement('card1');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.getAttribute('aria-label')).toContain('tilted 45 degrees clockwise');

    // Press 't' again (45 -> 90 = "tapped")
    pressKey(grid, 't');
    itemEl = getItemElement('card1');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.getAttribute('aria-label')).toContain('tapped');
  });

  it('taps an item counterclockwise with Shift+T', () => {
    renderGrid({
      items: [
        { id: 'card1', label: 'Island', gridId: 'grid1', column: 1, row: 1, canTap: true },
      ],
    });

    const grid = focusGrid('grid1');

    // First, tap clockwise to 45 degrees
    pressKey(grid, 't');
    let itemEl = getItemElement('card1');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.getAttribute('aria-label')).toContain('tilted 45 degrees clockwise');

    // Now tap counterclockwise with Shift+T -> back to 0 (upright)
    pressKey(grid, 'T', { shiftKey: true });
    itemEl = getItemElement('card1');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.getAttribute('aria-label')).toContain('upright');
  });

  it('applies gf-item--tapped CSS class when tapped past 0 degrees', () => {
    renderGrid({
      items: [
        { id: 'card1', label: 'Mountain', gridId: 'grid1', column: 1, row: 1, canTap: true },
      ],
    });

    const grid = focusGrid('grid1');

    // At 0 degrees, should not have tapped class
    let itemEl = getItemElement('card1');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.classList.contains('gf-item--tapped')).toBe(false);

    // Tap clockwise (0 -> 45)
    pressKey(grid, 't');
    itemEl = getItemElement('card1');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.classList.contains('gf-item--tapped')).toBe(true);

    // Tap counterclockwise (45 -> 0)
    pressKey(grid, 'T', { shiftKey: true });
    itemEl = getItemElement('card1');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.classList.contains('gf-item--tapped')).toBe(false);
  });

  it('flips an item face down and back with the F key', () => {
    renderGrid({
      items: [
        { id: 'card1', label: 'Forest', gridId: 'grid1', column: 1, row: 1 },
      ],
    });

    const grid = focusGrid('grid1');

    // Initially should NOT have face-down class
    let itemEl = getItemElement('card1');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.classList.contains('gf-item--face-down')).toBe(false);

    // Press 'f' to flip face down
    pressKey(grid, 'f');
    itemEl = getItemElement('card1');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.classList.contains('gf-item--face-down')).toBe(true);

    // Press 'f' again to flip face up
    pressKey(grid, 'f');
    itemEl = getItemElement('card1');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.classList.contains('gf-item--face-down')).toBe(false);
  });

  it('shows the card-back overlay when face down', () => {
    renderGrid({
      items: [
        { id: 'card1', label: 'Swamp', gridId: 'grid1', column: 1, row: 1 },
      ],
    });

    const grid = focusGrid('grid1');

    // Initially no card-back element
    let itemEl = getItemElement('card1');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.querySelector('.gf-card-back')).toBeNull();

    // Flip face down
    pressKey(grid, 'f');
    itemEl = getItemElement('card1');
    expect(itemEl).toBeTruthy();
    const cardBack = itemEl!.querySelector('.gf-card-back');
    expect(cardBack).toBeTruthy();
    expect(cardBack!.getAttribute('aria-hidden')).toBe('true');

    // Flip face up again
    pressKey(grid, 'f');
    itemEl = getItemElement('card1');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.querySelector('.gf-card-back')).toBeNull();
  });

  it('does not tap an item that has canTap=false', () => {
    renderGrid({
      items: [
        { id: 'token1', label: 'Goblin Token', gridId: 'grid1', column: 1, row: 1, canTap: false },
      ],
    });

    const grid = focusGrid('grid1');

    // Attempt to tap
    pressKey(grid, 't');

    // Should still show upright (no change)
    const itemEl = getItemElement('token1');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.getAttribute('aria-label')).toContain('upright');
    expect(itemEl!.classList.contains('gf-item--tapped')).toBe(false);
  });

  it('tapping cycles through multiple angles correctly', () => {
    renderGrid({
      items: [
        { id: 'card1', label: 'Plains', gridId: 'grid1', column: 1, row: 1, canTap: true },
      ],
    });

    const grid = focusGrid('grid1');

    // Tap clockwise 4 times: 0->45->90->135->180
    pressKey(grid, 't');
    pressKey(grid, 't');
    pressKey(grid, 't');
    pressKey(grid, 't');

    let itemEl = getItemElement('card1');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.getAttribute('aria-label')).toContain('inverted');

    // Tap clockwise 4 more times: 180->225->270->315->0
    pressKey(grid, 't');
    pressKey(grid, 't');
    pressKey(grid, 't');
    pressKey(grid, 't');

    itemEl = getItemElement('card1');
    expect(itemEl).toBeTruthy();
    expect(itemEl!.getAttribute('aria-label')).toContain('upright');
    expect(itemEl!.classList.contains('gf-item--tapped')).toBe(false);
  });
});
