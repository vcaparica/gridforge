import { useMemo, useCallback } from 'react';
import { useGridForge } from './useGridForge.ts';
import { AriaPropsBuilder } from '../accessibility/AriaPropsBuilder.ts';
import type { ItemState, Coordinates, Result } from '../core/types.ts';

export function useItem(itemId: string): {
  item: ItemState | undefined;
  isGrabbed: boolean;
  tapClockwise: () => void;
  tapCounterClockwise: () => void;
  flip: () => void;
  remove: () => void;
  transferTo: (gridId: string, coords: Coordinates) => Result;
  ariaProps: Record<string, string>;
} {
  const { engine, state } = useGridForge();

  const item = state.items.get(itemId);
  const isGrabbed = state.grabbedItemId === itemId;

  const tapClockwise = useCallback(
    () => engine.tapClockwise(itemId),
    [engine, itemId],
  );

  const tapCounterClockwise = useCallback(
    () => engine.tapCounterClockwise(itemId),
    [engine, itemId],
  );

  const flip = useCallback(
    () => engine.flipItem(itemId),
    [engine, itemId],
  );

  const remove = useCallback(
    () => engine.removeItem(itemId),
    [engine, itemId],
  );

  const transferTo = useCallback(
    (gridId: string, coords: Coordinates): Result =>
      engine.transferItem(itemId, gridId, coords),
    [engine, itemId],
  );

  const ariaProps = useMemo(
    () => (item ? AriaPropsBuilder.itemProps(item, isGrabbed) : {}),
    [item, isGrabbed],
  );

  return {
    item,
    isGrabbed,
    tapClockwise,
    tapCounterClockwise,
    flip,
    remove,
    transferTo,
    ariaProps,
  };
}
