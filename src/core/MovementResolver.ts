import type {
  ConflictStrategy,
  ConflictResolution,
  ItemState,
  CellState,
  GridConfig,
  GridEngineReadonly,
  Direction,
} from './types.ts';
import { CoordinateSystem } from './CoordinateSystem.ts';

/**
 * Resolves conflict strategies when an item attempts to move into an occupied cell.
 *
 * This resolver is ONLY invoked when the target cell already contains one or more items.
 * Empty cells always accept items without conflict resolution (sparse placement).
 */
export class MovementResolver {
  static resolve(
    strategy: ConflictStrategy,
    movingItem: ItemState,
    targetCell: CellState,
    occupants: ItemState[],
    gridConfig: GridConfig,
    allCells: Map<string, CellState>,
    engineReadonly: GridEngineReadonly,
    moveDirection?: Direction
  ): ConflictResolution {
    // Custom function strategy — delegate directly
    if (typeof strategy === 'function') {
      return strategy(movingItem, targetCell, occupants, engineReadonly);
    }

    switch (strategy) {
      case 'swap':
        return MovementResolver.resolveSwap(movingItem, occupants);

      case 'push':
        return MovementResolver.resolvePush(
          movingItem,
          occupants,
          gridConfig,
          allCells,
          moveDirection
        );

      case 'stack':
        return MovementResolver.resolveStack(targetCell, gridConfig);

      case 'block':
        return MovementResolver.resolveBlock();

      case 'replace':
        return MovementResolver.resolveReplace();
    }
  }

  /**
   * Swap: Exchange positions with the top occupant (last in the occupants array).
   * The displaced occupant moves to the moving item's original coordinates.
   */
  private static resolveSwap(
    movingItem: ItemState,
    occupants: ItemState[]
  ): ConflictResolution {
    const topOccupant = occupants[occupants.length - 1];

    return {
      action: 'swap',
      displacedItems: [
        {
          itemId: topOccupant.id,
          to: { column: movingItem.coordinates.column, row: movingItem.coordinates.row },
        },
      ],
    };
  }

  /**
   * Push: Push all occupants one cell in the movement direction.
   *
   * Falls back to block when:
   * - moveDirection is undefined (cross-grid or programmatic move)
   * - The push destination is out of bounds
   * - The push destination is already occupied
   */
  private static resolvePush(
    _movingItem: ItemState,
    occupants: ItemState[],
    gridConfig: GridConfig,
    allCells: Map<string, CellState>,
    moveDirection?: Direction
  ): ConflictResolution {
    // No direction available — cannot determine push direction
    if (moveDirection === undefined) {
      return MovementResolver.resolveBlock();
    }

    // Compute the destination one cell further in the movement direction
    const pushTarget = CoordinateSystem.adjacent(
      occupants[0].coordinates,
      moveDirection
    );

    // Out of bounds — block
    if (!CoordinateSystem.isValid(pushTarget, gridConfig)) {
      return MovementResolver.resolveBlock();
    }

    // Check if the push destination is occupied
    const pushTargetKey = CoordinateSystem.toKey(pushTarget);
    const pushTargetCell = allCells.get(pushTargetKey);

    if (pushTargetCell && pushTargetCell.itemIds.length > 0) {
      return MovementResolver.resolveBlock();
    }

    // Push all occupants to the adjacent cell
    const displacedItems = occupants.map((occupant) => ({
      itemId: occupant.id,
      to: { column: pushTarget.column, row: pushTarget.row },
    }));

    return {
      action: 'displace',
      displacedItems,
    };
  }

  /**
   * Stack: Allow the item to share the cell with existing occupants.
   *
   * Blocks if maxStackSize is defined and the cell has already reached that limit.
   */
  private static resolveStack(
    targetCell: CellState,
    gridConfig: GridConfig
  ): ConflictResolution {
    if (
      gridConfig.maxStackSize !== undefined &&
      targetCell.itemIds.length >= gridConfig.maxStackSize
    ) {
      return MovementResolver.resolveBlock();
    }

    return { action: 'stack' };
  }

  /**
   * Block: Deny placement.
   */
  private static resolveBlock(): ConflictResolution {
    return {
      action: 'block',
      message: 'Cell is occupied',
    };
  }

  /**
   * Replace: Remove all current occupants and allow placement.
   * The engine is responsible for the actual removal of displaced items.
   */
  private static resolveReplace(): ConflictResolution {
    return {
      action: 'allow',
      displacedItems: [],
    };
  }
}
