import { useGridForge } from './useGridForge.ts';
import type { GridState, ItemState, GridConfig } from '../core/types.ts';

export function useGrid(gridId: string): {
  grid: GridState | undefined;
  items: ItemState[];
  registerGrid: (config: Omit<GridConfig, 'id'>) => void;
  unregisterGrid: () => void;
} {
  const { engine, state } = useGridForge();
  const grid = state.grids.get(gridId);
  const items = grid ? engine.getItemsInGrid(gridId) : [];

  return {
    grid,
    items,
    registerGrid: (config) => engine.registerGrid({ ...config, id: gridId }),
    unregisterGrid: () => engine.unregisterGrid(gridId),
  };
}
