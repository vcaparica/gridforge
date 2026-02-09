// @vitest-environment node
import { interpolate, DEFAULT_MESSAGES } from '../../accessibility/MessageCatalog.ts';
import type { MessageCatalog } from '../../accessibility/MessageCatalog.ts';

describe('MessageCatalog', () => {
  // ── interpolate ─────────────────────────────────────────────────────

  describe('interpolate', () => {
    it('replaces all placeholders in a template', () => {
      const template = 'Column {col}, Row {row}. {itemLabel}.';
      const result = interpolate(template, {
        col: 'A',
        row: 'B',
        itemLabel: 'Black Lotus',
      });
      expect(result).toBe('Column A, Row B. Black Lotus.');
    });

    it('leaves placeholders as-is when keys are missing', () => {
      const template = 'Column {col}, Row {row}. {itemLabel}.';
      const result = interpolate(template, { col: '3' });
      expect(result).toBe('Column 3, Row {row}. {itemLabel}.');
    });

    it('converts number values to strings', () => {
      const template = 'Column {col}, Row {row}.';
      const result = interpolate(template, { col: 3, row: 5 });
      expect(result).toBe('Column 3, Row 5.');
    });
  });

  // ── DEFAULT_MESSAGES completeness ───────────────────────────────────

  describe('DEFAULT_MESSAGES', () => {
    it('every key is a non-empty string', () => {
      const keys = Object.keys(DEFAULT_MESSAGES) as (keyof MessageCatalog)[];
      expect(keys.length).toBeGreaterThan(0);

      for (const key of keys) {
        const value = DEFAULT_MESSAGES[key];
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });

    it('every template produces a string with no remaining {placeholder} patterns when all common placeholders are supplied', () => {
      const dummyValues: Record<string, string> = {
        col: '1',
        row: '2',
        itemLabel: 'Test Item',
        gridLabel: 'Test Grid',
        columns: '8',
        rows: '8',
        count: '3',
        itemLabels: 'Item A, Item B, Item C',
        tapLabel: 'tapped',
        otherLabel: 'Other Item',
        otherCol: '4',
        otherRow: '5',
        targetGridLabel: 'Target Grid',
        sourceGridLabel: 'Source Grid',
        position: '1',
        resolution: 'Swapped with Other Item',
      };

      const keys = Object.keys(DEFAULT_MESSAGES) as (keyof MessageCatalog)[];
      for (const key of keys) {
        const template = DEFAULT_MESSAGES[key];
        const result = interpolate(template, dummyValues);
        expect(result).not.toMatch(
          /\{(col|row|itemLabel|gridLabel|columns|rows|count|itemLabels|tapLabel|otherLabel|otherCol|otherRow|targetGridLabel|sourceGridLabel|position|resolution)\}/,
        );
      }
    });
  });
});
