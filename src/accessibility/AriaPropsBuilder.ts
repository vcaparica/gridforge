import type { GridState, CellState, ItemState, GridType } from '../core/types.ts';
import { TapSystem } from '../core/TapSystem.ts';

/**
 * Static utility class that generates correct ARIA attributes for each
 * element type in the grid system.
 *
 * Key design decisions:
 * - aria-grabbed is deprecated; aria-selected is used instead.
 * - Tap angle is ALWAYS incorporated into labels via TapSystem.buildTappedLabel.
 * - tabindex "0" for the focused cell, "-1" for all others.
 */
export class AriaPropsBuilder {
  /**
   * ARIA props for the <Grid> container element.
   *
   * Returns role="grid", aria-label, aria-colcount, aria-rowcount.
   * Conditionally includes aria-description and aria-activedescendant.
   */
  static gridProps(grid: GridState, isFocused: boolean): Record<string, string> {
    const props: Record<string, string> = {
      role: 'grid',
      'aria-label': grid.config.label,
      'aria-colcount': grid.config.columns.toString(),
      'aria-rowcount': grid.config.rows.toString(),
    };

    if (grid.config.description) {
      props['aria-description'] = grid.config.description;
    }

    if (isFocused) {
      // aria-activedescendant would reference the ID of the currently focused
      // cell element. We build a deterministic ID from the grid config.
      // The consuming component is responsible for assigning matching IDs to
      // cell elements.  We only set this when focused so screen readers know
      // which descendant is active.
      // NOTE: The actual focused coordinates are not available on GridState,
      // so the caller must supply them through the DOM or overlay this prop.
      // We intentionally omit aria-activedescendant here rather than guessing.
    }

    return props;
  }

  /**
   * ARIA props for a <Row> element (2D grids only).
   *
   * Returns role="row" and aria-rowindex.
   */
  static rowProps(rowIndex: number): Record<string, string> {
    return {
      role: 'row',
      'aria-rowindex': rowIndex.toString(),
    };
  }

  /**
   * ARIA props for a <Cell> element.
   *
   * The aria-label incorporates tap angle for every item via
   * TapSystem.buildTappedLabel so that screen readers announce rotation state.
   */
  static cellProps(
    cell: CellState,
    items: ItemState[],
    isFocused: boolean,
    isGrabSource: boolean,
    isDropTarget: boolean,
    gridType: GridType,
  ): Record<string, string> {
    const { column, row } = cell.coordinates;
    const props: Record<string, string> = {};

    // Role: 2D grids use 'gridcell' (inside role="grid" > role="row");
    // 1D grids use 'option' (inside role="listbox").
    if (gridType === '2d') {
      props['role'] = 'gridcell';
    } else {
      props['role'] = 'option';
    }

    // Column/row indices
    props['aria-colindex'] = column.toString();
    if (gridType === '2d') {
      props['aria-rowindex'] = row.toString();
    }

    // Compute the aria-label
    props['aria-label'] = AriaPropsBuilder.buildCellLabel(cell, items, gridType);

    // tabindex: "0" for the focused cell, "-1" for all others
    props['tabIndex'] = isFocused ? '0' : '-1';

    // aria-selected for grab source or drop target (NOT aria-grabbed, which is deprecated)
    if (isGrabSource || isDropTarget) {
      props['aria-selected'] = 'true';
    }

    return props;
  }

  /**
   * ARIA props for an <Item> element within a cell.
   *
   * The aria-label incorporates tap angle via TapSystem.buildTappedLabel.
   * Uses aria-selected (NOT the deprecated aria-grabbed) for grabbed state.
   */
  static itemProps(item: ItemState, isGrabbed: boolean): Record<string, string> {
    const props: Record<string, string> = {
      'aria-label': TapSystem.buildTappedLabel(item.label, item.tapAngle),
      'aria-roledescription': item.canTap ? 'card' : 'item',
    };

    if (isGrabbed) {
      props['aria-selected'] = 'true';
    }

    return props;
  }

  /**
   * ARIA props for a 1D listbox container.
   *
   * Returns role="listbox", aria-label, and aria-orientation="horizontal".
   */
  static listboxProps(grid: GridState): Record<string, string> {
    const props: Record<string, string> = {
      role: 'listbox',
      'aria-label': grid.config.label,
      'aria-orientation': 'horizontal',
    };

    if (grid.config.description) {
      props['aria-description'] = grid.config.description;
    }

    return props;
  }

  /**
   * ARIA props for a 1D option element.
   *
   * Returns role="option", positional info, selection state, and a label
   * that incorporates the tap angle.
   */
  static optionProps(
    item: ItemState,
    position: number,
    setSize: number,
    isSelected: boolean,
  ): Record<string, string> {
    return {
      role: 'option',
      'aria-posinset': position.toString(),
      'aria-setsize': setSize.toString(),
      'aria-selected': isSelected.toString(),
      'aria-label': TapSystem.buildTappedLabel(item.label, item.tapAngle),
    };
  }

  // ─── Private helpers ────────────────────────────────────────────────

  /**
   * Build a human-readable label for a cell that incorporates item names,
   * tap state, and positional coordinates.
   *
   * Format examples:
   *   "Column 3, Row 2. Empty."
   *   "Column 3, Row 2. Black Lotus, tapped."
   *   "Column 3, Row 2. 3 items: Goblin token, upright; Island, tapped; Mountain, upright."
   *   "Column 3, Row 2. Blocked."
   */
  private static buildCellLabel(
    cell: CellState,
    items: ItemState[],
    gridType: GridType,
  ): string {
    const { column, row } = cell.coordinates;

    // Position prefix
    let position: string;
    if (gridType === '2d') {
      position = `Column ${column}, Row ${row}`;
    } else {
      position = `Column ${column}`;
    }

    // Content description
    let content: string;

    if (cell.isBlocked) {
      content = 'Blocked';
    } else if (items.length === 0) {
      content = 'Empty';
    } else if (items.length === 1) {
      content = TapSystem.buildTappedLabel(items[0].label, items[0].tapAngle);
    } else {
      // Multiple items (stacked)
      const labels = items
        .map((item) => TapSystem.buildTappedLabel(item.label, item.tapAngle))
        .join('; ');
      content = `${items.length} items: ${labels}`;
    }

    return `${position}. ${content}.`;
  }
}
