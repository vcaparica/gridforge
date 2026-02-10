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

  const cell: CellState = grid?.cells.get(key) ?? {
    ...EMPTY_CELL,
    coordinates: { column: coords.column, row: coords.row },
  };

  const items = engine.getItemsAt(gridId, coords);

  const isFocused =
    state.focusedGridId === gridId &&
    state.focusedCell !== null &&
    CoordinateSystem.equals(state.focusedCell, coords);

  const isGrabSource =
    state.grabbedItemId !== null &&
    items.some((item) => item.id === state.grabbedItemId);

  const isDropTarget = cell.isDropTarget;

  const gridType: GridType = grid?.config.type ?? '2d';

  const ariaProps = useMemo(
    () =>
      AriaPropsBuilder.cellProps(
        cell,
        items,
        isFocused,
        isGrabSource,
        isDropTarget,
        gridType,
      ),
    [cell, items, isFocused, isGrabSource, isDropTarget, gridType],
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
