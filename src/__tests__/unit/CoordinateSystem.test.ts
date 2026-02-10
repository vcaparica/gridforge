// @vitest-environment node
import { CoordinateSystem } from '../../core/CoordinateSystem.ts';
import type { GridConfig } from '../../core/types.ts';

/** Helper to build a minimal GridConfig for testing. */
function makeGrid(columns: number, rows: number): GridConfig {
  return {
    id: 'test-grid',
    columns,
    rows,
    type: '2d',
    label: 'Test Grid',
    allowStacking: false,
    sparse: true,
  };
}

describe('CoordinateSystem', () => {
  // ── toKey ──────────────────────────────────────────────────────────

  describe('toKey', () => {
    it('converts (1,1) to "1,1"', () => {
      expect(CoordinateSystem.toKey({ column: 1, row: 1 })).toBe('1,1');
    });

    it('converts (5,3) to "5,3"', () => {
      expect(CoordinateSystem.toKey({ column: 5, row: 3 })).toBe('5,3');
    });
  });

  // ── fromKey ────────────────────────────────────────────────────────

  describe('fromKey', () => {
    it('parses "1,1" to { column: 1, row: 1 }', () => {
      expect(CoordinateSystem.fromKey('1,1')).toEqual({ column: 1, row: 1 });
    });

    it('parses "5,3" to { column: 5, row: 3 }', () => {
      expect(CoordinateSystem.fromKey('5,3')).toEqual({ column: 5, row: 3 });
    });
  });

  // ── isValid ────────────────────────────────────────────────────────

  describe('isValid', () => {
    const grid = makeGrid(5, 5);

    it('returns true for in-bounds coordinates', () => {
      expect(CoordinateSystem.isValid({ column: 3, row: 3 }, grid)).toBe(true);
    });

    it('returns false for out-of-bounds column (too low)', () => {
      expect(CoordinateSystem.isValid({ column: 0, row: 3 }, grid)).toBe(false);
    });

    it('returns false for out-of-bounds column (too high)', () => {
      expect(CoordinateSystem.isValid({ column: 6, row: 3 }, grid)).toBe(false);
    });

    it('returns false for out-of-bounds row (too low)', () => {
      expect(CoordinateSystem.isValid({ column: 3, row: 0 }, grid)).toBe(false);
    });

    it('returns false for out-of-bounds row (too high)', () => {
      expect(CoordinateSystem.isValid({ column: 3, row: 6 }, grid)).toBe(false);
    });

    it('returns true for the lower-left boundary (1,1)', () => {
      expect(CoordinateSystem.isValid({ column: 1, row: 1 }, grid)).toBe(true);
    });

    it('returns true for the upper-right boundary (max,max)', () => {
      expect(CoordinateSystem.isValid({ column: 5, row: 5 }, grid)).toBe(true);
    });
  });

  // ── adjacent ───────────────────────────────────────────────────────

  describe('adjacent', () => {
    const center = { column: 3, row: 3 };

    it('moves up (row - 1)', () => {
      expect(CoordinateSystem.adjacent(center, 'up')).toEqual({ column: 3, row: 2 });
    });

    it('moves down (row + 1)', () => {
      expect(CoordinateSystem.adjacent(center, 'down')).toEqual({ column: 3, row: 4 });
    });

    it('moves left (column - 1)', () => {
      expect(CoordinateSystem.adjacent(center, 'left')).toEqual({ column: 2, row: 3 });
    });

    it('moves right (column + 1)', () => {
      expect(CoordinateSystem.adjacent(center, 'right')).toEqual({ column: 4, row: 3 });
    });

    it('produces out-of-bounds coordinates when moving up from row 1', () => {
      const topEdge = { column: 1, row: 1 };
      expect(CoordinateSystem.adjacent(topEdge, 'up')).toEqual({ column: 1, row: 0 });
    });

    it('produces out-of-bounds coordinates when moving left from column 1', () => {
      const leftEdge = { column: 1, row: 1 };
      expect(CoordinateSystem.adjacent(leftEdge, 'left')).toEqual({ column: 0, row: 1 });
    });
  });

  // ── allCoordinates ─────────────────────────────────────────────────

  describe('allCoordinates', () => {
    it('returns 6 coordinates for a 3x2 grid in row-first order', () => {
      const grid = makeGrid(3, 2);
      const coords = CoordinateSystem.allCoordinates(grid);

      expect(coords).toHaveLength(6);
      expect(coords).toEqual([
        { column: 1, row: 1 },
        { column: 2, row: 1 },
        { column: 3, row: 1 },
        { column: 1, row: 2 },
        { column: 2, row: 2 },
        { column: 3, row: 2 },
      ]);
    });
  });

  // ── distance ───────────────────────────────────────────────────────

  describe('distance', () => {
    it('returns 0 for the same coordinate', () => {
      expect(CoordinateSystem.distance({ column: 2, row: 3 }, { column: 2, row: 3 })).toBe(0);
    });

    it('returns correct Manhattan distance for horizontal movement', () => {
      expect(CoordinateSystem.distance({ column: 1, row: 1 }, { column: 4, row: 1 })).toBe(3);
    });

    it('returns correct Manhattan distance for vertical movement', () => {
      expect(CoordinateSystem.distance({ column: 1, row: 1 }, { column: 1, row: 5 })).toBe(4);
    });

    it('returns correct Manhattan distance for diagonal movement', () => {
      expect(CoordinateSystem.distance({ column: 1, row: 1 }, { column: 4, row: 5 })).toBe(7);
    });
  });

  // ── equals ─────────────────────────────────────────────────────────

  describe('equals', () => {
    it('returns true for identical coordinates', () => {
      expect(CoordinateSystem.equals({ column: 3, row: 4 }, { column: 3, row: 4 })).toBe(true);
    });

    it('returns false when columns differ', () => {
      expect(CoordinateSystem.equals({ column: 3, row: 4 }, { column: 2, row: 4 })).toBe(false);
    });

    it('returns false when rows differ', () => {
      expect(CoordinateSystem.equals({ column: 3, row: 4 }, { column: 3, row: 5 })).toBe(false);
    });

    it('returns false when both differ', () => {
      expect(CoordinateSystem.equals({ column: 1, row: 1 }, { column: 5, row: 5 })).toBe(false);
    });
  });
});
