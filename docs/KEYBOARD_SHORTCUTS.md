# GridForge Keyboard Shortcuts

Quick reference card for all keyboard interactions. Print this page or keep it handy while developing.

---

## Navigation Mode

Active when no item is grabbed. Use these keys to browse the grid and interact with items.

| Key | Action |
|-----|--------|
| **Arrow Up** | Move focus up one row |
| **Arrow Down** | Move focus down one row |
| **Arrow Left** | Move focus left one column |
| **Arrow Right** | Move focus right one column |
| **Home** | Jump to the first cell in the current row |
| **End** | Jump to the last cell in the current row |
| **Ctrl + Home** | Jump to the first cell in the grid (top-left) |
| **Ctrl + End** | Jump to the last cell in the grid (bottom-right) |
| **Enter** or **Space** | Grab the item in the focused cell |
| **Delete** or **Backspace** | Remove the item in the focused cell |
| **T** | Tap (rotate) the focused item 45 degrees clockwise |
| **Shift + T** | Tap the focused item 45 degrees counterclockwise |
| **F** | Flip the focused item (toggle face-up / face-down) |
| **?** | Open the keyboard shortcuts help dialog |
| **F10** | Open the context menu for the focused item |
| **Tab** | Leave the grid (move to next focusable element) |
| **Shift + Tab** | Leave the grid (move to previous focusable element) |

---

## Grab Mode

Active after grabbing an item with Enter or Space. The grabbed item follows your arrow key movements.

| Key | Action |
|-----|--------|
| **Arrow Up** | Move the grabbed item up one row |
| **Arrow Down** | Move the grabbed item down one row |
| **Arrow Left** | Move the grabbed item left one column |
| **Arrow Right** | Move the grabbed item right one column |
| **Home** | Move the grabbed item to the start of the current row |
| **End** | Move the grabbed item to the end of the current row |
| **Ctrl + Home** | Move the grabbed item to the first cell in the grid |
| **Ctrl + End** | Move the grabbed item to the last cell in the grid |
| **Enter** or **Space** | Drop the item at its current position |
| **Escape** | Cancel the grab and return the item to its original cell |
| **Tab** | Cycle the target grid forward (cross-grid transfer) |
| **Shift + Tab** | Cycle the target grid backward |

---

## TCG Card Shortcuts

These shortcuts work in Navigation mode when an item supports the corresponding action.

| Key | Action |
|-----|--------|
| **T** | Tap the card clockwise (e.g., 0 to 90 degrees, standard MTG tap) |
| **Shift + T** | Untap the card counterclockwise (e.g., 90 back to 0 degrees) |
| **F** | Flip the card between face-up and face-down |

### Tap Angle Cycle

Each press of T advances the angle by 45 degrees:

```
0 (upright) -> 45 -> 90 (tapped) -> 135 -> 180 (inverted) -> 225 -> 270 -> 315 -> 0
```

Shift+T reverses this cycle.

---

## Context Menu

When the context menu is open (via F10 or right-click):

| Key | Action |
|-----|--------|
| **Arrow Down** | Move to the next menu item |
| **Arrow Up** | Move to the previous menu item |
| **Enter** | Activate the focused menu item |
| **Escape** | Close the context menu |

---

## Help Dialog

When the help dialog is open (via ?):

| Key | Action |
|-----|--------|
| **Escape** | Close the help dialog |
| **Tab** | Cycle focus within the dialog (focus trap) |

---

## Mode Indicator

You can tell which mode is active:

- **Navigation mode**: Arrow keys move the focus ring between cells. The screen reader announces cell contents.
- **Grab mode**: Arrow keys physically move the grabbed item. The screen reader announces the item's new position. A dashed outline appears on the grab-origin cell.

Press **?** at any time in Navigation mode to open the built-in help dialog with this same information.
