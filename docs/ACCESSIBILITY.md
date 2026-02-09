# GridForge Accessibility Guide

GridForge implements the [WAI-ARIA Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) to make grid-based drag-and-drop fully accessible to keyboard and screen reader users.

## Architecture Overview

GridForge's accessibility is built on three pillars:

1. **ARIA Grid Pattern** -- Grids use `role="grid"`, rows use `role="row"`, and cells use `role="gridcell"`. This gives screen readers a structural understanding of the layout.

2. **Live Region Announcements** -- A visually hidden `aria-live` region announces every meaningful interaction: focus changes, grabs, moves, drops, taps, flips, and blocked actions.

3. **Roving Tabindex** -- Only the focused cell has `tabindex="0"`; all others have `tabindex="-1"`. The user presses Tab to enter the grid, arrow keys to move within it, and Tab again to leave.

## What Developers MUST Do

### 1. Provide accessible labels

Every `<Grid>`, `<ItemTray>`, and `<Item>` requires a `label` prop. This is not optional. Screen readers depend on these labels to identify elements.

```tsx
<Grid id="battlefield" columns={6} rows={4} label="Battlefield">
  ...
</Grid>

<Item id="card-1" label="Lightning Bolt">
  <CardFace />
</Item>
```

### 2. Wrap everything in GridForgeProvider

The provider creates the announcement live region. Without it, screen readers receive no feedback during interactions.

```tsx
<GridForgeProvider>
  <Grid id="board" columns={3} rows={3} label="Game Board" renderCell={...} />
</GridForgeProvider>
```

### 3. Do not suppress focus styles

GridForge renders a visible focus ring via `--gf-focus-ring`. Do not remove it. You may customize its color and size, but it must remain visible and high-contrast (at least 3:1 ratio against adjacent colors per WCAG 2.1 SC 1.4.11).

## Keyboard Interaction Model

GridForge has two modes: **Navigation** and **Grab**.

### Navigation Mode

The user enters a grid by pressing Tab. Arrow keys move focus between cells. The screen reader announces cell contents as focus moves.

Available actions in navigation mode:

- **Arrow keys** -- Move focus between cells
- **Enter / Space** -- Grab the item in the focused cell
- **Delete / Backspace** -- Remove the item
- **T** -- Tap (rotate) the item clockwise
- **Shift+T** -- Tap counterclockwise
- **F** -- Flip the item face-down / face-up
- **Home** -- Jump to first cell in the current row
- **End** -- Jump to last cell in the current row
- **Ctrl+Home** -- Jump to the first cell in the grid
- **Ctrl+End** -- Jump to the last cell in the grid
- **?** -- Open the help dialog
- **F10** -- Open the context menu for the focused item

### Grab Mode

After pressing Enter/Space on an item, the user enters Grab mode. The screen reader announces "Grabbed [item] from Column X, Row Y."

Available actions in grab mode:

- **Arrow keys** -- Move the grabbed item one cell in that direction
- **Enter** -- Drop the item at the current position
- **Escape** -- Cancel the grab and return the item to its origin
- **Tab** -- Cycle the target grid forward (for cross-grid transfers)
- **Shift+Tab** -- Cycle the target grid backward
- **Home / End** -- Jump to row start/end
- **Ctrl+Home / Ctrl+End** -- Jump to grid start/end

## Announcement Catalog

GridForge announces every interaction via `aria-live` regions. The default messages use `{placeholder}` interpolation and can be overridden via the `messages` prop on `<GridForgeProvider>`.

### Grid Entry

| Key | Default Message |
|-----|-----------------|
| `gridEntered` | `"{gridLabel}. {columns} columns by {rows} rows. Use arrow keys to navigate."` |
| `gridEntered1D` | `"{gridLabel}. {count} slots. Use arrow keys to navigate."` |

### Cell Focus

| Key | Default Message |
|-----|-----------------|
| `cellEmpty` | `"Column {col}, Row {row}. Empty."` |
| `cellOccupied` | `"Column {col}, Row {row}. {itemLabel}."` |
| `cellOccupiedStacked` | `"Column {col}, Row {row}. {count} items: {itemLabels}."` |
| `cellBlocked` | `"Column {col}, Row {row}. Blocked."` |

### Grab / Move / Drop

| Key | Default Message |
|-----|-----------------|
| `itemGrabbed` | `"Grabbed {itemLabel} from Column {col}, Row {row}. ..."` |
| `itemMoved` | `"{itemLabel} moved to Column {col}, Row {row}."` |
| `itemMovedSwap` | `"Swapped with {otherLabel}, now at Column {otherCol}, Row {otherRow}."` |
| `itemMovedStack` | `"Stacked on {otherLabel}."` |
| `itemDropped` | `"Dropped {itemLabel} at Column {col}, Row {row}."` |
| `grabCancelled` | `"Move cancelled. {itemLabel} returned to Column {col}, Row {row}."` |

### Blocked Moves

| Key | Default Message |
|-----|-----------------|
| `moveBlockedOutOfBounds` | `"Edge of grid."` |
| `moveBlockedOccupied` | `"Blocked. Column {col}, Row {row} is occupied by {otherLabel}."` |
| `moveBlockedCellBlocked` | `"Blocked. Column {col}, Row {row} is not available."` |

### Tap / Flip / Transfer

| Key | Default Message |
|-----|-----------------|
| `itemTappedClockwise` | `"{itemLabel} tapped clockwise to {tapLabel}."` |
| `itemTappedCounterClockwise` | `"{itemLabel} tapped counterclockwise to {tapLabel}."` |
| `itemFlippedFaceDown` | `"{itemLabel} turned face down."` |
| `itemFlippedFaceUp` | `"{itemLabel} turned face up."` |
| `itemTransferred` | `"{itemLabel} sent to {targetGridLabel}, Column {col}, Row {row}."` |

### 1D-Specific

| Key | Default Message |
|-----|-----------------|
| `slotEmpty1D` | `"Slot {position}. Empty."` |
| `slotOccupied1D` | `"Slot {position}. {itemLabel}."` |

### Overriding Messages

```tsx
<GridForgeProvider messages={{
  cellEmpty: "Row {row}, Column {col}. No items here.",
  itemGrabbed: "Picked up {itemLabel}. Arrow keys to move, Enter to place.",
}}>
```

## Screen Reader Testing Guide

### NVDA (Windows, free)

1. Install NVDA from nvaccess.org
2. Press **Insert+Space** to toggle focus mode (pass-through) vs browse mode
3. Navigate to the grid with Tab. NVDA should announce the grid label
4. Press arrow keys -- each cell should be announced
5. Press Enter on an occupied cell -- grab announcement should fire
6. Move with arrows and press Enter -- drop announcement should fire
7. Check the Speech Viewer (Tools > Speech Viewer) to verify announcements

### JAWS (Windows, commercial)

1. Press **Insert+Z** to toggle virtual cursor off
2. Tab to the grid. JAWS should announce the grid role and label
3. Arrow keys should announce cells. Grab/move/drop should produce announcements
4. Note: JAWS may buffer rapid announcements. If announcements seem delayed, increase `announceDelay` on the provider

### VoiceOver (macOS)

1. Press **Cmd+F5** to enable VoiceOver
2. Use **Ctrl+Option+Arrow** keys to navigate to the grid
3. Press **Ctrl+Option+Shift+Down** to interact with the grid
4. Arrow keys move focus between cells
5. Press **Ctrl+Option+Space** to activate (grab/drop)
6. VoiceOver may announce "grid" when entering the component

## High Contrast and Forced Colors

GridForge includes a `@media (forced-colors: active)` block that ensures:

- Focus rings use the system `Highlight` color with a 3px solid outline
- Grabbed items use a 3px dashed `Highlight` outline
- All interactive states remain visible without relying on color alone

## Reduced Motion

When `prefers-reduced-motion: reduce` is active, GridForge disables:

- Item transition animations
- Tap rotation transitions
- All keyframe animations (duration set to 0s)

Items still move instantly; only the visual transition is removed.

## Known Screen Reader Quirks

- **NVDA + Firefox**: The `aria-live` assertive region may not announce if the page is still loading. Ensure grids mount after the page is interactive.
- **JAWS**: Rapid successive announcements (e.g., holding an arrow key during grab mode) may be coalesced. The `announceDelay` prop (default 150ms) helps debounce these.
- **VoiceOver + Safari**: VoiceOver sometimes re-reads the grid label when focus moves to the first cell. This is a VoiceOver behavior, not a GridForge bug.
- **Mobile screen readers (TalkBack, VoiceOver iOS)**: GridForge's keyboard model does not currently map to touch gestures. Touch-based screen reader usage requires additional integration work.
