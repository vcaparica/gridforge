import { useCallback } from 'react';
import { useGridForge } from './useGridForge.ts';
import { resolveKeyAction } from '../accessibility/KeyboardHandler.ts';


export function useGridKeyboard(
  gridId: string,
  options?: {
    onShowHelp?: () => void;
    onContextMenu?: (itemId: string) => void;
  },
): {
  onKeyDown: (event: React.KeyboardEvent) => void;
} {
  const { engine, state } = useGridForge();

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const action = resolveKeyAction(state.mode, event);

      switch (action.type) {
        case 'none':
          return;

        case 'moveFocus': {
          // Ensure this grid is the focused grid
          if (state.focusedGridId !== gridId) {
            engine.setFocusedGrid(gridId);
          }
          engine.moveFocus(action.direction);
          event.preventDefault();
          break;
        }

        case 'grab': {
          // Find the item at the focused cell to grab — use selectedStackIndex
          // if cycling through a stack, otherwise default to topmost item.
          if (state.focusedCell) {
            const items = engine.getItemsAt(gridId, state.focusedCell);
            if (items.length > 0) {
              const idx = state.selectedStackIndex;
              const target = (idx !== null && idx >= 0 && idx < items.length)
                ? items[idx]
                : items[items.length - 1];
              engine.grab(target.id);
            }
          }
          event.preventDefault();
          break;
        }

        case 'drop': {
          // If focus is on a different grid than the grabbed item,
          // move the item to the focused cell first, then drop.
          const grabbedForDrop = state.grabbedItemId
            ? engine.getItem(state.grabbedItemId)
            : null;
          if (
            grabbedForDrop &&
            grabbedForDrop.gridId !== gridId &&
            state.focusedCell
          ) {
            const moveResult = engine.moveGrabbedTo(gridId, state.focusedCell);
            if (moveResult.success) {
              engine.drop();
            }
          } else {
            engine.drop();
          }
          event.preventDefault();
          break;
        }

        case 'cancelGrab': {
          engine.cancelGrab();
          event.preventDefault();
          break;
        }

        case 'moveGrabbed': {
          // If focus is on a different grid than the grabbed item,
          // navigate focus instead so the user can browse destination
          // cells before dropping.
          const grabbedForMove = state.grabbedItemId
            ? engine.getItem(state.grabbedItemId)
            : null;
          if (grabbedForMove && grabbedForMove.gridId !== gridId) {
            if (state.focusedGridId !== gridId) {
              engine.setFocusedGrid(gridId);
            }
            engine.moveFocus(action.direction);
          } else {
            engine.moveGrabbed(action.direction);
          }
          event.preventDefault();
          break;
        }

        case 'remove': {
          if (state.focusedCell) {
            const items = engine.getItemsAt(gridId, state.focusedCell);
            if (items.length > 0) {
              const idx = state.selectedStackIndex;
              const target = (idx !== null && idx >= 0 && idx < items.length)
                ? items[idx]
                : items[items.length - 1];
              engine.removeItem(target.id);
            }
          }
          event.preventDefault();
          break;
        }

        case 'tapClockwise': {
          if (state.focusedCell) {
            const items = engine.getItemsAt(gridId, state.focusedCell);
            if (items.length > 0) {
              const idx = state.selectedStackIndex;
              const target = (idx !== null && idx >= 0 && idx < items.length)
                ? items[idx]
                : items[items.length - 1];
              engine.tapClockwise(target.id);
            }
          }
          event.preventDefault();
          break;
        }

        case 'tapCounterClockwise': {
          if (state.focusedCell) {
            const items = engine.getItemsAt(gridId, state.focusedCell);
            if (items.length > 0) {
              const idx = state.selectedStackIndex;
              const target = (idx !== null && idx >= 0 && idx < items.length)
                ? items[idx]
                : items[items.length - 1];
              engine.tapCounterClockwise(target.id);
            }
          }
          event.preventDefault();
          break;
        }

        case 'flipItem': {
          if (state.focusedCell) {
            const items = engine.getItemsAt(gridId, state.focusedCell);
            if (items.length > 0) {
              const idx = state.selectedStackIndex;
              const target = (idx !== null && idx >= 0 && idx < items.length)
                ? items[idx]
                : items[items.length - 1];
              engine.flipItem(target.id);
            }
          }
          event.preventDefault();
          break;
        }

        case 'cycleStack': {
          engine.cycleStackSelection(action.direction);
          event.preventDefault();
          break;
        }

        case 'cycleGrid': {
          const renderedGrids = engine.getRenderedGrids();
          if (renderedGrids.length <= 1) {
            event.preventDefault();
            break;
          }

          const currentIndex = renderedGrids.findIndex(
            (g) => g.config.id === (state.activeDropTargetGridId ?? gridId),
          );

          let nextIndex: number;
          if (action.direction === 'next') {
            nextIndex = (currentIndex + 1) % renderedGrids.length;
          } else {
            nextIndex =
              (currentIndex - 1 + renderedGrids.length) % renderedGrids.length;
          }

          const nextGrid = renderedGrids[nextIndex];
          // Move focus to the next grid without moving the grabbed item.
          // The user can then browse cells with arrow keys and drop with
          // Enter/Space.
          engine.setFocusedGrid(nextGrid.config.id);
          engine.setFocusedCell({ column: 1, row: 1 });

          event.preventDefault();
          break;
        }

        case 'jumpStart': {
          if (state.focusedCell) {
            engine.setFocusedCell({ column: 1, row: state.focusedCell.row });
          }
          event.preventDefault();
          break;
        }

        case 'jumpEnd': {
          const grid = engine.getGrid(gridId);
          if (grid && state.focusedCell) {
            engine.setFocusedCell({
              column: grid.config.columns,
              row: state.focusedCell.row,
            });
          }
          event.preventDefault();
          break;
        }

        case 'jumpGridStart': {
          engine.setFocusedCell({ column: 1, row: 1 });
          event.preventDefault();
          break;
        }

        case 'jumpGridEnd': {
          const grid = engine.getGrid(gridId);
          if (grid) {
            engine.setFocusedCell({
              column: grid.config.columns,
              row: grid.config.rows,
            });
          }
          event.preventDefault();
          break;
        }

        case 'showHelp': {
          if (options?.onShowHelp) {
            options.onShowHelp();
            event.preventDefault();
          }
          // If no handler is provided, let the event propagate naturally
          break;
        }

        case 'contextMenu': {
          if (options?.onContextMenu && state.focusedCell) {
            const items = engine.getItemsAt(gridId, state.focusedCell);
            if (items.length > 0) {
              options.onContextMenu(items[items.length - 1].id);
              event.preventDefault();
            }
          }
          // If no handler is provided, let the event propagate naturally
          break;
        }
      }
    },
    [engine, state, gridId, options],
  );

  return { onKeyDown };
}
