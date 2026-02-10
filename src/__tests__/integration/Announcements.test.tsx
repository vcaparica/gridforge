import { act } from '@testing-library/react';
import {
  renderGrid,
  getAssertiveAnnouncer,
  pressKey,
  focusGrid,
} from './helpers.tsx';

describe('Announcements', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('announces when an item is grabbed', async () => {
    renderGrid({
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
      ],
    });

    const grid = focusGrid('grid1');

    // Grab the item
    pressKey(grid, 'Enter');

    // The announcement uses requestAnimationFrame, so we advance timers
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    const announcer = getAssertiveAnnouncer()!;
    expect(announcer).toBeTruthy();
    expect(announcer.textContent).toContain('Grabbed Goblin');
  });

  it('announces when an item is moved during grab', async () => {
    renderGrid({
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
      ],
    });

    const grid = focusGrid('grid1');

    // Grab
    pressKey(grid, 'Enter');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    // Move right
    pressKey(grid, 'ArrowRight');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    const announcer = getAssertiveAnnouncer()!;
    // Should announce the move with coordinates
    expect(announcer.textContent).toContain('Goblin');
    expect(announcer.textContent).toContain('Column 2');
  });

  it('announces when an item is dropped', async () => {
    renderGrid({
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
      ],
    });

    const grid = focusGrid('grid1');

    // Grab
    pressKey(grid, 'Enter');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    // Move right
    pressKey(grid, 'ArrowRight');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    // Drop
    pressKey(grid, 'Enter');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    const announcer = getAssertiveAnnouncer()!;
    expect(announcer.textContent).toContain('Dropped Goblin');
    expect(announcer.textContent).toContain('Column 2');
    expect(announcer.textContent).toContain('Row 1');
  });

  it('announces when a grab is cancelled', async () => {
    renderGrid({
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 2, row: 2 },
      ],
    });

    const grid = focusGrid('grid1');

    // Navigate to the item
    pressKey(grid, 'ArrowRight');
    pressKey(grid, 'ArrowDown');

    // Grab
    pressKey(grid, 'Enter');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    // Move the item
    pressKey(grid, 'ArrowRight');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    // Cancel
    pressKey(grid, 'Escape');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    const announcer = getAssertiveAnnouncer()!;
    expect(announcer.textContent).toContain('cancelled');
    expect(announcer.textContent).toContain('Goblin');
  });

  it('announces when an item is tapped', async () => {
    renderGrid({
      items: [
        { id: 'card1', label: 'Black Lotus', gridId: 'grid1', column: 1, row: 1, canTap: true },
      ],
    });

    const grid = focusGrid('grid1');

    // Tap clockwise
    pressKey(grid, 't');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    const announcer = getAssertiveAnnouncer()!;
    expect(announcer.textContent).toContain('Black Lotus');
    expect(announcer.textContent).toContain('tapped');
    expect(announcer.textContent).toContain('clockwise');
  });

  it('announces when an item is flipped', async () => {
    renderGrid({
      items: [
        { id: 'card1', label: 'Forest', gridId: 'grid1', column: 1, row: 1 },
      ],
    });

    const grid = focusGrid('grid1');

    // Flip face down
    pressKey(grid, 'f');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    let announcer = getAssertiveAnnouncer()!;
    expect(announcer.textContent).toContain('Forest');
    expect(announcer.textContent).toContain('face down');

    // Flip face up
    pressKey(grid, 'f');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    announcer = getAssertiveAnnouncer()!;
    expect(announcer.textContent).toContain('Forest');
    expect(announcer.textContent).toContain('face up');
  });

  it('announces when cycling stack selection with [ key', async () => {
    renderGrid({
      allowStacking: true,
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
        { id: 'dragon', label: 'Dragon', gridId: 'grid1', column: 1, row: 1 },
      ],
    });

    const grid = focusGrid('grid1');

    // Cycle stack selection with [
    pressKey(grid, '[');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    const announcer = getAssertiveAnnouncer()!;
    expect(announcer.textContent).toContain('selected');
  });

  it('announcements are cleared after 3 seconds', async () => {
    renderGrid({
      items: [
        { id: 'goblin', label: 'Goblin', gridId: 'grid1', column: 1, row: 1 },
      ],
    });

    const grid = focusGrid('grid1');

    // Grab to trigger an announcement
    pressKey(grid, 'Enter');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    let announcer = getAssertiveAnnouncer()!;
    expect(announcer.textContent).toBeTruthy();

    // Advance past the 3-second clear timeout
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    announcer = getAssertiveAnnouncer()!;
    expect(announcer.textContent).toBe('');
  });
});
