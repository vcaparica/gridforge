import type { Coordinates, Direction, GridConfig } from './types.ts';

export class CoordinateSystem {
  /**
   * Converts coordinates to a string key in "column,row" format.
   */
  static toKey(coords: Coordinates): string {
    return `${coords.column},${coords.row}`;
  }

  /**
   * Parses a "column,row" string key back into coordinates.
   */
  static fromKey(key: string): Coordinates {
    const [column, row] = key.split(',').map(Number);
    return { column, row };
  }

  /**
   * Checks whether coordinates fall within the grid bounds.
   * Coordinates are 1-based: column in [1, grid.columns], row in [1, grid.rows].
   */
  static isValid(coords: Coordinates, grid: GridConfig): boolean {
    return (
      coords.column >= 1 &&
      coords.column <= grid.columns &&
      coords.row >= 1 &&
      coords.row <= grid.rows
    );
  }

  /**
   * Returns the neighboring coordinates in the given direction.
   * The result may be out of bounds — use isValid() to check.
   *
   * up = row-1, down = row+1, left = col-1, right = col+1
   */
  static adjacent(coords: Coordinates, direction: Direction): Coordinates {
    switch (direction) {
      case 'up':
        return { column: coords.column, row: coords.row - 1 };
      case 'down':
        return { column: coords.column, row: coords.row + 1 };
      case 'left':
        return { column: coords.column - 1, row: coords.row };
      case 'right':
        return { column: coords.column + 1, row: coords.row };
    }
  }

  /**
   * Generates all valid coordinates for a grid, iterating row-first:
   * (1,1), (2,1), (3,1), ..., (1,2), (2,2), (3,2), ...
   */
  static allCoordinates(grid: GridConfig): Coordinates[] {
    const coords: Coordinates[] = [];
    for (let row = 1; row <= grid.rows; row++) {
      for (let column = 1; column <= grid.columns; column++) {
        coords.push({ column, row });
      }
    }
    return coords;
  }

  /**
   * Returns the Manhattan distance between two coordinates.
   */
  static distance(a: Coordinates, b: Coordinates): number {
    return Math.abs(a.column - b.column) + Math.abs(a.row - b.row);
  }

  /**
   * Checks whether two coordinates are equal.
   */
  static equals(a: Coordinates, b: Coordinates): boolean {
    return a.column === b.column && a.row === b.row;
  }
}
