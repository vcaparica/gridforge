// @vitest-environment node
import { TapSystem } from '../../core/TapSystem.ts';
import type { TapAngle } from '../../core/types.ts';

describe('TapSystem', () => {
  // ── tapClockwise ───────────────────────────────────────────────────

  describe('tapClockwise', () => {
    it.each([
      [0, 45],
      [45, 90],
      [90, 135],
      [135, 180],
      [180, 225],
      [225, 270],
      [270, 315],
      [315, 0],
    ] as [TapAngle, TapAngle][])(
      'rotates %d° clockwise to %d°',
      (input, expected) => {
        expect(TapSystem.tapClockwise(input)).toBe(expected);
      },
    );
  });

  // ── tapCounterClockwise ────────────────────────────────────────────

  describe('tapCounterClockwise', () => {
    it.each([
      [0, 315],
      [315, 270],
      [270, 225],
      [225, 180],
      [180, 135],
      [135, 90],
      [90, 45],
      [45, 0],
    ] as [TapAngle, TapAngle][])(
      'rotates %d° counterclockwise to %d°',
      (input, expected) => {
        expect(TapSystem.tapCounterClockwise(input)).toBe(expected);
      },
    );
  });

  // ── round-trip: clockwise then counterclockwise ────────────────────

  describe('tapClockwise then tapCounterClockwise', () => {
    it.each(TapSystem.ANGLES)(
      'returns to original angle when starting at %d°',
      (angle) => {
        const rotated = TapSystem.tapClockwise(angle);
        const restored = TapSystem.tapCounterClockwise(rotated);
        expect(restored).toBe(angle);
      },
    );
  });

  // ── getLabel ───────────────────────────────────────────────────────

  describe('getLabel', () => {
    it.each([
      [0, 'upright'],
      [45, 'tilted 45 degrees clockwise'],
      [90, 'tapped'],
      [135, 'tilted 135 degrees clockwise'],
      [180, 'inverted'],
      [225, 'tilted 135 degrees counterclockwise'],
      [270, 'tapped counterclockwise'],
      [315, 'tilted 45 degrees counterclockwise'],
    ] as [TapAngle, string][])(
      'returns "%s" for angle %d°',
      (angle, expectedLabel) => {
        expect(TapSystem.getLabel(angle)).toBe(expectedLabel);
      },
    );
  });

  // ── buildTappedLabel ───────────────────────────────────────────────

  describe('buildTappedLabel', () => {
    it('builds "Goblin token, upright" at angle 0', () => {
      expect(TapSystem.buildTappedLabel('Goblin token', 0)).toBe(
        'Goblin token, upright',
      );
    });

    it('builds "Black Lotus, tapped" at angle 90', () => {
      expect(TapSystem.buildTappedLabel('Black Lotus', 90)).toBe(
        'Black Lotus, tapped',
      );
    });
  });

  // ── getCSSRotation ─────────────────────────────────────────────────

  describe('getCSSRotation', () => {
    it.each([
      [0, 'rotate(0deg)'],
      [45, 'rotate(45deg)'],
      [90, 'rotate(90deg)'],
      [135, 'rotate(135deg)'],
      [180, 'rotate(180deg)'],
      [225, 'rotate(225deg)'],
      [270, 'rotate(270deg)'],
      [315, 'rotate(315deg)'],
    ] as [TapAngle, string][])(
      'returns "%s" for angle %d°',
      (angle, expectedCSS) => {
        expect(TapSystem.getCSSRotation(angle)).toBe(expectedCSS);
      },
    );
  });
});
