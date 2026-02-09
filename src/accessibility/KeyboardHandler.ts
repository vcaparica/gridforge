import type { InteractionMode, Direction } from '../core/types.ts';

export type KeyAction =
  | { type: 'moveFocus'; direction: Direction }
  | { type: 'grab' }
  | { type: 'drop' }
  | { type: 'cancelGrab' }
  | { type: 'moveGrabbed'; direction: Direction }
  | { type: 'remove' }
  | { type: 'tapClockwise' }
  | { type: 'tapCounterClockwise' }
  | { type: 'flipItem' }
  | { type: 'cycleGrid'; direction: 'next' | 'previous' }
  | { type: 'cycleStack'; direction: 'next' | 'previous' }
  | { type: 'jumpStart' }
  | { type: 'jumpEnd' }
  | { type: 'jumpGridStart' }
  | { type: 'jumpGridEnd' }
  | { type: 'showHelp' }
  | { type: 'contextMenu' }
  | { type: 'none' };

const NONE: KeyAction = { type: 'none' };

interface KeyEvent {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

function resolveArrowDirection(key: string): Direction | null {
  switch (key) {
    case 'ArrowUp':    return 'up';
    case 'ArrowDown':  return 'down';
    case 'ArrowLeft':  return 'left';
    case 'ArrowRight': return 'right';
    default:           return null;
  }
}

function resolveNavigationAction(event: KeyEvent): KeyAction {
  const { key, ctrlKey, shiftKey } = event;

  // Arrow keys: moveFocus
  const direction = resolveArrowDirection(key);
  if (direction !== null) {
    return { type: 'moveFocus', direction };
  }

  // Enter or Space: grab
  if (key === 'Enter' || key === ' ') {
    return { type: 'grab' };
  }

  // Delete or Backspace: remove
  if (key === 'Delete' || key === 'Backspace') {
    return { type: 'remove' };
  }

  // t (lowercase, no shift): tapClockwise
  // T or t with shiftKey: tapCounterClockwise
  if (key === 't' && !shiftKey) {
    return { type: 'tapClockwise' };
  }
  if ((key === 'T' || (key === 't' && shiftKey)) && shiftKey) {
    return { type: 'tapCounterClockwise' };
  }

  // f (lowercase, no shift): flipItem
  if (key === 'f' && !shiftKey) {
    return { type: 'flipItem' };
  }

  // Home / End with or without Ctrl
  if (key === 'Home') {
    return ctrlKey ? { type: 'jumpGridStart' } : { type: 'jumpStart' };
  }
  if (key === 'End') {
    return ctrlKey ? { type: 'jumpGridEnd' } : { type: 'jumpEnd' };
  }

  // [ : cycle stack selection previous (deeper)
  // ] : cycle stack selection next (toward top)
  if (key === '[') {
    return { type: 'cycleStack', direction: 'previous' };
  }
  if (key === ']') {
    return { type: 'cycleStack', direction: 'next' };
  }

  // ? (Shift+/): showHelp
  if (key === '?') {
    return { type: 'showHelp' };
  }

  // F10 or ContextMenu: contextMenu
  if (key === 'F10' || key === 'ContextMenu') {
    return { type: 'contextMenu' };
  }

  // Tab / Shift+Tab: none (let browser handle)
  // Everything else: none
  return NONE;
}

function resolveGrabbingAction(event: KeyEvent): KeyAction {
  const { key, ctrlKey, shiftKey } = event;

  // Arrow keys: moveGrabbed
  const direction = resolveArrowDirection(key);
  if (direction !== null) {
    return { type: 'moveGrabbed', direction };
  }

  // Enter or Space: drop
  if (key === 'Enter' || key === ' ') {
    return { type: 'drop' };
  }

  // Escape: cancelGrab
  if (key === 'Escape') {
    return { type: 'cancelGrab' };
  }

  // Tab (no shift): cycleGrid next
  // Shift+Tab: cycleGrid previous
  if (key === 'Tab') {
    return { type: 'cycleGrid', direction: shiftKey ? 'previous' : 'next' };
  }

  // Home / End with or without Ctrl
  if (key === 'Home') {
    return ctrlKey ? { type: 'jumpGridStart' } : { type: 'jumpStart' };
  }
  if (key === 'End') {
    return ctrlKey ? { type: 'jumpGridEnd' } : { type: 'jumpEnd' };
  }

  // Everything else: none
  return NONE;
}

export function resolveKeyAction(
  mode: InteractionMode,
  event: KeyEvent
): KeyAction {
  switch (mode) {
    case 'navigation': return resolveNavigationAction(event);
    case 'grabbing':   return resolveGrabbingAction(event);
    default:           return NONE;
  }
}
