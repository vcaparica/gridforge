import type { TapAngle } from './types.ts';

export class TapSystem {
  static readonly ANGLES: TapAngle[] = [0, 45, 90, 135, 180, 225, 270, 315];

  /**
   * Rotate clockwise (wraps last -> first).
   * Optional second arg: custom steps array, e.g. [0, 90].
   * If current angle is not in the steps array, resets to steps[0].
   */
  static tapClockwise(current: TapAngle, steps?: TapAngle[]): TapAngle {
    const angles = steps || TapSystem.ANGLES;
    const index = angles.indexOf(current);
    if (index === -1) return angles[0];
    return angles[(index + 1) % angles.length];
  }

  /**
   * Rotate counter-clockwise (wraps first -> last).
   * Optional second arg: custom steps array, e.g. [0, 90].
   * If current angle is not in the steps array, resets to steps[0].
   */
  static tapCounterClockwise(current: TapAngle, steps?: TapAngle[]): TapAngle {
    const angles = steps || TapSystem.ANGLES;
    const index = angles.indexOf(current);
    if (index === -1) return angles[0];
    return angles[(index - 1 + angles.length) % angles.length];
  }

  /**
   * Get human-readable label for a tap angle.
   *
   * 0   -> "upright"
   * 45  -> "tilted 45 degrees clockwise"
   * 90  -> "tapped" (MTG standard)
   * 135 -> "tilted 135 degrees clockwise"
   * 180 -> "inverted"
   * 225 -> "tilted 135 degrees counterclockwise"
   * 270 -> "tapped counterclockwise"
   * 315 -> "tilted 45 degrees counterclockwise"
   */
  static getLabel(angle: TapAngle): string {
    switch (angle) {
      case 0:
        return 'upright';
      case 45:
        return 'tilted 45 degrees clockwise';
      case 90:
        return 'tapped';
      case 135:
        return 'tilted 135 degrees clockwise';
      case 180:
        return 'inverted';
      case 225:
        return 'tilted 135 degrees counterclockwise';
      case 270:
        return 'tapped counterclockwise';
      case 315:
        return 'tilted 45 degrees counterclockwise';
    }
  }

  /**
   * Build full accessible label incorporating tap state.
   *
   * Examples:
   *   "Goblin token, upright"
   *   "Black Lotus, tapped"
   *   "Island, tilted 45 degrees clockwise"
   */
  static buildTappedLabel(itemLabel: string, angle: TapAngle): string {
    return `${itemLabel}, ${TapSystem.getLabel(angle)}`;
  }

  /** Get CSS transform value - returns e.g. "rotate(90deg)". */
  static getCSSRotation(angle: TapAngle): string {
    return `rotate(${angle}deg)`;
  }
}
