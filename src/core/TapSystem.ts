import type { TapAngle } from './types.ts';

export class TapSystem {
  static readonly ANGLES: TapAngle[] = [0, 45, 90, 135, 180, 225, 270, 315];

  /** Rotate clockwise by 45 degrees (wraps 315 -> 0). */
  static tapClockwise(current: TapAngle): TapAngle {
    const index = TapSystem.ANGLES.indexOf(current);
    return TapSystem.ANGLES[(index + 1) % TapSystem.ANGLES.length];
  }

  /** Rotate counter-clockwise by 45 degrees (wraps 0 -> 315). */
  static tapCounterClockwise(current: TapAngle): TapAngle {
    const index = TapSystem.ANGLES.indexOf(current);
    return TapSystem.ANGLES[
      (index - 1 + TapSystem.ANGLES.length) % TapSystem.ANGLES.length
    ];
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
