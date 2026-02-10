import type { ReactNode, CSSProperties } from 'react';
import { useItem } from '../hooks/useItem.ts';
import { TapSystem } from '../core/TapSystem.ts';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ItemProps {
  id: string;
  label: string;              // REQUIRED accessible name
  description?: string;
  canMove?: boolean;           // default true
  canRemove?: boolean;         // default true
  canTap?: boolean;            // default true for TCG, false for RPG tokens
  children: ReactNode;         // visual content
  className?: string;
  grabbedClassName?: string;
  tappedClassName?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Item: React.FC<ItemProps> = ({
  id,
  label: _label,
  description: _description,
  canMove: _canMove = true,
  canRemove: _canRemove = true,
  canTap: _canTap = true,
  children,
  className,
  grabbedClassName,
  tappedClassName,
}) => {
  const { item, isGrabbed, ariaProps } = useItem(id);

  // Derive tap angle from engine state, defaulting to 0 if item is not yet
  // registered (the parent Grid/ItemTray is responsible for registering items
  // with the engine via engine.addItem).
  const tapAngle = item?.tapAngle ?? 0;
  const isFaceDown = item?.isFaceDown ?? false;
  const isTapped = tapAngle !== 0;

  // -- Build CSS class list -------------------------------------------------
  const classes = [
    'gf-item',
    isGrabbed && 'gf-item--grabbed',
    isGrabbed && grabbedClassName,
    isTapped && 'gf-item--tapped',
    isTapped && tappedClassName,
    isFaceDown && 'gf-item--face-down',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // -- Build inline style with CSS rotation ---------------------------------
  const style: CSSProperties | undefined = isTapped
    ? { transform: TapSystem.getCSSRotation(tapAngle) }
    : undefined;

  return (
    <div
      className={classes}
      style={style}
      {...ariaProps}
      data-gf-item-id={id}
    >
      {children}
      {isFaceDown && <div className="gf-card-back" aria-hidden="true" />}
    </div>
  );
};
