import { useMemo } from 'react';
import type { CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type GridLinesVariant = 'clean' | 'parchment' | 'felt';

export interface GridLinesProps {
  /** Number of columns in the grid. */
  columns: number;
  /** Number of rows in the grid. */
  rows: number;
  /** Additional CSS class names. */
  className?: string;
  /** Visual variant -- affects line colour, weight, and style. Default: 'clean'. */
  variant?: GridLinesVariant;
}

// ---------------------------------------------------------------------------
// Variant configurations
// ---------------------------------------------------------------------------

interface VariantConfig {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  opacity: number;
}

const VARIANT_CONFIGS: Record<GridLinesVariant, VariantConfig> = {
  clean: {
    stroke: '#d1d5db',    // subtle gray
    strokeWidth: 1,
    opacity: 0.6,
  },
  parchment: {
    stroke: '#a07850',    // warm brown
    strokeWidth: 0.8,
    strokeDasharray: '4 2 6 2',  // hand-drawn irregularity
    opacity: 0.35,
  },
  felt: {
    stroke: '#9ca3af',    // muted gray for dark backgrounds
    strokeWidth: 0.5,
    opacity: 0.15,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Optional decorative SVG grid background. Renders a pattern of horizontal
 * and vertical lines sized to match the grid's column/row count.
 *
 * The component uses an SVG `<pattern>` element for efficient rendering --
 * the browser tiles a single cell-sized pattern across the full SVG rather
 * than drawing `columns + rows` individual lines.
 *
 * Positioned absolutely so it sits behind the grid cells.
 */
export const GridLines: React.FC<GridLinesProps> = ({
  columns,
  rows,
  className,
  variant = 'clean',
}) => {
  const config = VARIANT_CONFIGS[variant];

  // Generate a stable pattern ID to avoid collisions when multiple GridLines
  // are on the same page.
  const patternId = useMemo(
    () => `gf-grid-pattern-${variant}-${columns}x${rows}-${Math.random().toString(36).slice(2, 8)}`,
    [variant, columns, rows],
  );

  // Each cell is represented as one pattern unit. The viewBox and pattern
  // dimensions are normalised so that one "unit" = one cell.
  const cellSize = 1;
  const totalWidth = columns * cellSize;
  const totalHeight = rows * cellSize;

  const classes = ['gf-grid-lines', className].filter(Boolean).join(' ');

  const containerStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
  };

  return (
    <div className={classes} style={containerStyle} aria-hidden="true">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id={patternId}
            x="0"
            y="0"
            width={cellSize}
            height={cellSize}
            patternUnits="userSpaceOnUse"
          >
            {/* Right edge of each cell */}
            <line
              x1={cellSize}
              y1={0}
              x2={cellSize}
              y2={cellSize}
              stroke={config.stroke}
              strokeWidth={config.strokeWidth / Math.max(columns, rows)}
              strokeDasharray={config.strokeDasharray}
              opacity={config.opacity}
            />
            {/* Bottom edge of each cell */}
            <line
              x1={0}
              y1={cellSize}
              x2={cellSize}
              y2={cellSize}
              stroke={config.stroke}
              strokeWidth={config.strokeWidth / Math.max(columns, rows)}
              strokeDasharray={config.strokeDasharray}
              opacity={config.opacity}
            />
          </pattern>
        </defs>

        {/* Fill the entire SVG with the pattern */}
        <rect
          x="0"
          y="0"
          width={totalWidth}
          height={totalHeight}
          fill={`url(#${patternId})`}
        />

        {/* Outer border lines along top and left edges (the pattern only
            draws right/bottom edges, so we need explicit top/left borders). */}
        <line
          x1={0}
          y1={0}
          x2={totalWidth}
          y2={0}
          stroke={config.stroke}
          strokeWidth={config.strokeWidth / Math.max(columns, rows)}
          strokeDasharray={config.strokeDasharray}
          opacity={config.opacity}
        />
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={totalHeight}
          stroke={config.stroke}
          strokeWidth={config.strokeWidth / Math.max(columns, rows)}
          strokeDasharray={config.strokeDasharray}
          opacity={config.opacity}
        />
      </svg>
    </div>
  );
};
