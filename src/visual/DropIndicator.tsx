import type { CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DropIndicatorProps {
  /** Whether the current drop target is a valid destination. */
  isValid: boolean;
  /** Whether dropping here would stack on top of existing items. */
  isStack: boolean;
  /** Optional additional CSS class names. */
  className?: string;
  /** Optional inline style overrides. */
  style?: CSSProperties;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Visual highlight rendered inside a cell that is currently targeted during
 * a drag operation. Purely decorative -- provides colour/glow cues to
 * indicate whether the drop is valid, invalid, or would result in stacking.
 *
 * CSS classes applied:
 *   - `gf-drop-indicator`              always
 *   - `gf-drop-indicator--valid`       green/blue glow (valid target)
 *   - `gf-drop-indicator--invalid`     red glow (cannot drop here)
 *   - `gf-drop-indicator--stack`       layered indicator (would stack)
 */
export const DropIndicator: React.FC<DropIndicatorProps> = ({
  isValid,
  isStack,
  className,
  style,
}) => {
  const classes = [
    'gf-drop-indicator',
    isValid ? 'gf-drop-indicator--valid' : 'gf-drop-indicator--invalid',
    isStack && 'gf-drop-indicator--stack',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const baseStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    borderRadius: 'inherit',
    transition: 'box-shadow 150ms ease, border-color 150ms ease',
    ...style,
  };

  return (
    <div
      className={classes}
      style={baseStyle}
      aria-hidden="true"
    >
      {isStack && (
        <div className="gf-drop-indicator__stack-icon" aria-hidden="true">
          {/* Small layered-cards icon to hint at stacking */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="3"
              y="1"
              width="12"
              height="16"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.4"
            />
            <rect
              x="5"
              y="3"
              width="12"
              height="16"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.7"
            />
          </svg>
        </div>
      )}
    </div>
  );
};
