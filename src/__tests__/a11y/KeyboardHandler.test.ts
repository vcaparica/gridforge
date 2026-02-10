// @vitest-environment node
import { resolveKeyAction } from '../../accessibility/KeyboardHandler.ts';
import type { KeyAction } from '../../accessibility/KeyboardHandler.ts';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function key(
  keyValue: string,
  modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {},
) {
  return {
    key: keyValue,
    ctrlKey: modifiers.ctrl ?? false,
    shiftKey: modifiers.shift ?? false,
    altKey: modifiers.alt ?? false,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KeyboardHandler — resolveKeyAction', () => {
  // ── Navigation mode ─────────────────────────────────────────────────

  describe('navigation mode', () => {
    const mode = 'navigation' as const;

    // Arrow keys → moveFocus
    it('ArrowUp → moveFocus up', () => {
      const action = resolveKeyAction(mode, key('ArrowUp'));
      expect(action).toEqual({ type: 'moveFocus', direction: 'up' });
    });

    it('ArrowDown → moveFocus down', () => {
      const action = resolveKeyAction(mode, key('ArrowDown'));
      expect(action).toEqual({ type: 'moveFocus', direction: 'down' });
    });

    it('ArrowLeft → moveFocus left', () => {
      const action = resolveKeyAction(mode, key('ArrowLeft'));
      expect(action).toEqual({ type: 'moveFocus', direction: 'left' });
    });

    it('ArrowRight → moveFocus right', () => {
      const action = resolveKeyAction(mode, key('ArrowRight'));
      expect(action).toEqual({ type: 'moveFocus', direction: 'right' });
    });

    // Enter / Space → grab
    it('Enter → grab', () => {
      const action = resolveKeyAction(mode, key('Enter'));
      expect(action).toEqual({ type: 'grab' });
    });

    it('Space → grab', () => {
      const action = resolveKeyAction(mode, key(' '));
      expect(action).toEqual({ type: 'grab' });
    });

    // Delete / Backspace → remove
    it('Delete → remove', () => {
      const action = resolveKeyAction(mode, key('Delete'));
      expect(action).toEqual({ type: 'remove' });
    });

    it('Backspace → remove', () => {
      const action = resolveKeyAction(mode, key('Backspace'));
      expect(action).toEqual({ type: 'remove' });
    });

    // t / T → tap
    it('t (no shift) → tapClockwise', () => {
      const action = resolveKeyAction(mode, key('t'));
      expect(action).toEqual({ type: 'tapClockwise' });
    });

    it('T (shift) → tapCounterClockwise', () => {
      const action = resolveKeyAction(mode, key('T', { shift: true }));
      expect(action).toEqual({ type: 'tapCounterClockwise' });
    });

    // f → flipItem
    it('f (no shift) → flipItem', () => {
      const action = resolveKeyAction(mode, key('f'));
      expect(action).toEqual({ type: 'flipItem' });
    });

    // Home / End
    it('Home → jumpStart', () => {
      const action = resolveKeyAction(mode, key('Home'));
      expect(action).toEqual({ type: 'jumpStart' });
    });

    it('End → jumpEnd', () => {
      const action = resolveKeyAction(mode, key('End'));
      expect(action).toEqual({ type: 'jumpEnd' });
    });

    it('Ctrl+Home → jumpGridStart', () => {
      const action = resolveKeyAction(mode, key('Home', { ctrl: true }));
      expect(action).toEqual({ type: 'jumpGridStart' });
    });

    it('Ctrl+End → jumpGridEnd', () => {
      const action = resolveKeyAction(mode, key('End', { ctrl: true }));
      expect(action).toEqual({ type: 'jumpGridEnd' });
    });

    // ? → showHelp
    it('? → showHelp', () => {
      const action = resolveKeyAction(mode, key('?'));
      expect(action).toEqual({ type: 'showHelp' });
    });

    // F10 → contextMenu
    it('F10 → contextMenu', () => {
      const action = resolveKeyAction(mode, key('F10'));
      expect(action).toEqual({ type: 'contextMenu' });
    });

    // [ and ] → cycleStack
    it('[ → cycleStack previous', () => {
      const action = resolveKeyAction(mode, key('['));
      expect(action).toEqual({ type: 'cycleStack', direction: 'previous' });
    });

    it('] → cycleStack next', () => {
      const action = resolveKeyAction(mode, key(']'));
      expect(action).toEqual({ type: 'cycleStack', direction: 'next' });
    });

    // Tab / Shift+Tab → none (let browser handle)
    it('Tab → none', () => {
      const action = resolveKeyAction(mode, key('Tab'));
      expect(action).toEqual({ type: 'none' });
    });

    it('Shift+Tab → none', () => {
      const action = resolveKeyAction(mode, key('Tab', { shift: true }));
      expect(action).toEqual({ type: 'none' });
    });

    // Random key → none
    it('random key "a" → none', () => {
      const action = resolveKeyAction(mode, key('a'));
      expect(action).toEqual({ type: 'none' });
    });
  });

  // ── Grabbing mode ───────────────────────────────────────────────────

  describe('grabbing mode', () => {
    const mode = 'grabbing' as const;

    // Arrow keys → moveGrabbed
    it('ArrowUp → moveGrabbed up', () => {
      const action = resolveKeyAction(mode, key('ArrowUp'));
      expect(action).toEqual({ type: 'moveGrabbed', direction: 'up' });
    });

    it('ArrowDown → moveGrabbed down', () => {
      const action = resolveKeyAction(mode, key('ArrowDown'));
      expect(action).toEqual({ type: 'moveGrabbed', direction: 'down' });
    });

    it('ArrowLeft → moveGrabbed left', () => {
      const action = resolveKeyAction(mode, key('ArrowLeft'));
      expect(action).toEqual({ type: 'moveGrabbed', direction: 'left' });
    });

    it('ArrowRight → moveGrabbed right', () => {
      const action = resolveKeyAction(mode, key('ArrowRight'));
      expect(action).toEqual({ type: 'moveGrabbed', direction: 'right' });
    });

    // Enter / Space → drop
    it('Enter → drop', () => {
      const action = resolveKeyAction(mode, key('Enter'));
      expect(action).toEqual({ type: 'drop' });
    });

    it('Space → drop', () => {
      const action = resolveKeyAction(mode, key(' '));
      expect(action).toEqual({ type: 'drop' });
    });

    // Escape → cancelGrab
    it('Escape → cancelGrab', () => {
      const action = resolveKeyAction(mode, key('Escape'));
      expect(action).toEqual({ type: 'cancelGrab' });
    });

    // Tab → cycleGrid next, Shift+Tab → cycleGrid previous
    it('Tab → cycleGrid next', () => {
      const action = resolveKeyAction(mode, key('Tab'));
      expect(action).toEqual({ type: 'cycleGrid', direction: 'next' });
    });

    it('Shift+Tab → cycleGrid previous', () => {
      const action = resolveKeyAction(mode, key('Tab', { shift: true }));
      expect(action).toEqual({ type: 'cycleGrid', direction: 'previous' });
    });

    // Home / End
    it('Home → jumpStart', () => {
      const action = resolveKeyAction(mode, key('Home'));
      expect(action).toEqual({ type: 'jumpStart' });
    });

    it('End → jumpEnd', () => {
      const action = resolveKeyAction(mode, key('End'));
      expect(action).toEqual({ type: 'jumpEnd' });
    });

    it('Ctrl+Home → jumpGridStart', () => {
      const action = resolveKeyAction(mode, key('Home', { ctrl: true }));
      expect(action).toEqual({ type: 'jumpGridStart' });
    });

    it('Ctrl+End → jumpGridEnd', () => {
      const action = resolveKeyAction(mode, key('End', { ctrl: true }));
      expect(action).toEqual({ type: 'jumpGridEnd' });
    });

    // Random key → none
    it('random key "a" → none', () => {
      const action = resolveKeyAction(mode, key('a'));
      expect(action).toEqual({ type: 'none' });
    });
  });
});
