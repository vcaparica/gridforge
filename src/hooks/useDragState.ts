import { useGridForge } from './useGridForge.ts';
import type { ItemState, Coordinates } from '../core/types.ts';

export function useDragState(): {
  isGrabbing: boolean;
  grabbedItem: ItemState | null;
  originGrid: string | null;
  originCoords: Coordinates | null;
  targetGrid: string | null;
} {
  const { state } = useGridForge();

  const isGrabbing = state.mode === 'grabbing';

  const grabbedItem =
    state.grabbedItemId !== null
      ? state.items.get(state.grabbedItemId) ?? null
      : null;

  return {
    isGrabbing,
    grabbedItem,
    originGrid: state.grabbedFromGrid,
    originCoords: state.grabbedFromCoords,
    targetGrid: state.activeDropTargetGridId,
  };
}
