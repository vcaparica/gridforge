/**
 * MessageCatalog — default English strings for every screen reader announcement
 * in GridForge.  Uses `{placeholder}` syntax for interpolation.
 */

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface MessageCatalog {
  // Grid entry
  gridEntered: string;
  gridEntered1D: string;

  // Cell focus
  cellEmpty: string;
  cellOccupied: string;
  cellOccupiedStacked: string;
  cellBlocked: string;

  // Grab
  itemGrabbed: string;

  // Move (during grab)
  itemMoved: string;
  itemMovedToOccupied: string;
  itemMovedSwap: string;
  itemMovedStack: string;

  // Drop
  itemDropped: string;

  // Cancel
  grabCancelled: string;

  // Move blocked
  moveBlockedOutOfBounds: string;
  moveBlockedOccupied: string;
  moveBlockedCellBlocked: string;

  // Remove
  itemRemoved: string;

  // Tap
  itemTappedClockwise: string;
  itemTappedCounterClockwise: string;

  // Flip
  itemFlippedFaceDown: string;
  itemFlippedFaceUp: string;

  // Transfer (cross-grid)
  itemTransferred: string;
  itemTransferredFromNonRendered: string;

  // Grid cycling during grab
  gridCycled: string;

  // Help
  helpText: string;

  // 1D-specific overrides
  slotEmpty1D: string;
  slotOccupied1D: string;
}

// ---------------------------------------------------------------------------
// Default English messages
// ---------------------------------------------------------------------------

export const DEFAULT_MESSAGES: MessageCatalog = {
  // Grid entry
  gridEntered:
    '{gridLabel}. {columns} columns by {rows} rows. Use arrow keys to navigate. Press Enter or Space to grab an item. Press question mark for help.',
  gridEntered1D:
    '{gridLabel}. {count} slots. Use arrow keys to navigate.',

  // Cell focus
  cellEmpty:
    'Column {col}, Row {row}. Empty.',
  cellOccupied:
    'Column {col}, Row {row}. {itemLabel}.',
  cellOccupiedStacked:
    'Column {col}, Row {row}. {count} items: {itemLabels}.',
  cellBlocked:
    'Column {col}, Row {row}. Blocked.',

  // Grab
  itemGrabbed:
    'Grabbed {itemLabel} from Column {col}, Row {row}. Use arrow keys to move. Enter to drop. Escape to cancel. Tab to switch target grid.',

  // Move (during grab)
  itemMoved:
    '{itemLabel} moved to Column {col}, Row {row}.',
  itemMovedToOccupied:
    '{itemLabel} moved to Column {col}, Row {row}. {resolution}.',
  itemMovedSwap:
    'Swapped with {otherLabel}, now at Column {otherCol}, Row {otherRow}.',
  itemMovedStack:
    'Stacked on {otherLabel}.',

  // Drop
  itemDropped:
    'Dropped {itemLabel} at Column {col}, Row {row}.',

  // Cancel
  grabCancelled:
    'Move cancelled. {itemLabel} returned to Column {col}, Row {row}.',

  // Move blocked
  moveBlockedOutOfBounds:
    'Edge of grid.',
  moveBlockedOccupied:
    'Blocked. Column {col}, Row {row} is occupied by {otherLabel}.',
  moveBlockedCellBlocked:
    'Blocked. Column {col}, Row {row} is not available.',

  // Remove
  itemRemoved:
    'Removed {itemLabel} from Column {col}, Row {row}.',

  // Tap
  itemTappedClockwise:
    '{itemLabel} tapped clockwise to {tapLabel}.',
  itemTappedCounterClockwise:
    '{itemLabel} tapped counterclockwise to {tapLabel}.',

  // Flip
  itemFlippedFaceDown:
    '{itemLabel} turned face down.',
  itemFlippedFaceUp:
    '{itemLabel} turned face up.',

  // Transfer (cross-grid)
  itemTransferred:
    '{itemLabel} sent to {targetGridLabel}, Column {col}, Row {row}.',
  itemTransferredFromNonRendered:
    '{itemLabel} arrived from {sourceGridLabel} at Column {col}, Row {row}.',

  // Grid cycling during grab
  gridCycled:
    'Now targeting {gridLabel}. Use arrow keys to choose a cell.',

  // Help — comprehensive keyboard shortcut reference
  helpText: [
    'GridForge Keyboard Shortcuts.',
    '',
    'Navigation Mode:',
    '  Arrow Keys — Move focus between cells.',
    '  Home — Move focus to the first cell in the current row.',
    '  End — Move focus to the last cell in the current row.',
    '  Control+Home — Move focus to the first cell in the grid.',
    '  Control+End — Move focus to the last cell in the grid.',
    '  Page Up — Move focus up by one page of rows.',
    '  Page Down — Move focus down by one page of rows.',
    '  Enter or Space — Grab the item in the focused cell.',
    '  Delete or Backspace — Remove the item in the focused cell.',
    '  T — Tap (rotate) the focused item clockwise.',
    '  Shift+T — Tap (rotate) the focused item counterclockwise.',
    '  F — Flip the focused item (toggle face up / face down).',
    '  ? — Open this help dialog.',
    '  Escape — Exit the grid.',
    '',
    'Grab Mode (after grabbing an item):',
    '  Arrow Keys — Move the grabbed item to an adjacent cell.',
    '  Enter — Drop the item in the current cell.',
    '  Escape — Cancel the move and return the item to its original cell.',
    '  Tab — Cycle the target grid forward (for cross-grid transfers).',
    '  Shift+Tab — Cycle the target grid backward.',
    '',
    'TCG Shortcuts (available in Navigation Mode):',
    '  T — Tap the selected card clockwise (e.g., 0 to 90 degrees).',
    '  Shift+T — Tap the selected card counterclockwise (e.g., 90 to 0 degrees).',
    '  F — Flip the selected card between face up and face down.',
  ].join('\n'),

  // 1D-specific overrides
  slotEmpty1D:
    'Slot {position}. Empty.',
  slotOccupied1D:
    'Slot {position}. {itemLabel}.',
};

// ---------------------------------------------------------------------------
// Interpolation helper
// ---------------------------------------------------------------------------

/**
 * Replace all `{key}` placeholders in `template` with the corresponding value
 * from `values`.  If a key is not found in the `values` record the placeholder
 * is left as-is in the output string.
 */
export function interpolate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return String(values[key]);
    }
    return match;
  });
}
