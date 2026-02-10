import { useMemo } from 'react';
import { useGridForge } from './useGridForge.ts';
import { AriaPropsBuilder } from '../accessibility/AriaPropsBuilder.ts';
import { CoordinateSystem } from '../core/CoordinateSystem.ts';
import type { Coordinates, CellState, ItemState, GridType } from '../core/types.ts';

const EMPTY_CELL: CellState = {
  coordinates: { column: 0, row: 0 },
  itemIds: [],
  isDropTarget: false,
  isBlocked: false,
  metadata: {},
};

export function useCell(gridId: string, coords: Coordinates): {
  cell: CellState;
  items: ItemState[];
  isFocused: boolean;
  isGrabSource: boolean;
  isDropTarget: boolean;
  ariaProps: Record<string, string>;
} {
  const { engine, state } = useGridForge();

  const key = CoordinateSystem.toKey(coords);
  const grid = state.grids.get(gridId);

  const cell: CellState = useMemo(
    () => grid?.cells.get(key) ?? {
      ...EMPTY_CELL,
      coordinates: { column: coords.column, row: coords.row },
    },
    [grid, key, coords.column, coords.row],
  );

  const items = engine.getItemsAt(gridId, coords);

  const isFocused =
    state.focusedGridId === gridId &&
    state.focusedCell !== null &&
    CoordinateSystem.equals(state.focusedCell, coords);

  // Roving tabindex: when this grid is NOT the focused grid, cell (1,1)
  // must still have tabIndex="0" so the grid remains reachable via Tab/Shift+Tab.
  const isTabTarget =
    !isFocused &&
    state.focusedGridId !== gridId &&
    coords.column === 1 &&
    coords.row === 1;

  const isGrabSource =
    state.grabbedItemId !== null &&
    items.some((item) => item.id === state.grabbedItemId);

  const isDropTarget = cell.isDropTarget;

  const gridType: GridType = grid?.config.type ?? '2d';

  // Pass selectedStackIndex only for the focused cell
  const selectedStackIndex = isFocused ? state.selectedStackIndex : null;

  const ariaProps = useMemo(
    () =>
      AriaPropsBuilder.cellProps(
        cell,
        items,
        isFocused,
        isGrabSource,
        isDropTarget,
        gridType,
        selectedStackIndex,
        isTabTarget,
      ),
    [cell, items, isFocused, isGrabSource, isDropTarget, gridType, selectedStackIndex, isTabTarget],
  );

  return {
    cell,
    items,
    isFocused,
    isGrabSource,
    isDropTarget,
    ariaProps,
  };
}
