import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Coordinates, ItemState } from '../core/types.ts';
import type { GridEngine } from '../core/GridEngine.ts';
import { useGridForge } from '../hooks/useGridForge.ts';

export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  action: (item: ItemState, engine: GridEngine) => void;
  isAvailable?: (item: ItemState) => boolean;
}

export interface ContextMenuProps {
  itemId: string;
  gridId: string;
  coords: Coordinates;
  anchorElement: HTMLElement;
  onClose: () => void;
  customActions?: ContextMenuAction[];
}

// A separator sentinel used internally to render dividers
interface MenuSeparator {
  type: 'separator';
}

interface MenuItem {
  type: 'item';
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  onActivate: () => void;
}

type MenuEntry = MenuItem | MenuSeparator;

export function ContextMenu({
  itemId,
  gridId,
  coords: _coords,
  anchorElement,
  onClose,
  customActions,
}: ContextMenuProps): ReactNode {
  const { engine, state } = useGridForge();
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const item = state.items.get(itemId);

  // Build the list of menu entries
  const entries: MenuEntry[] = [];

  if (item) {
    // "Grab" - available if not currently grabbed
    if (state.grabbedItemId !== itemId) {
      entries.push({
        type: 'item',
        id: 'grab',
        label: 'Grab',
        shortcut: 'Enter',
        onActivate: () => {
          engine.grab(itemId);
          onClose();
        },
      });
    }

    // "Tap clockwise" - available if item.canTap
    if (item.canTap) {
      entries.push({
        type: 'item',
        id: 'tap-clockwise',
        label: 'Tap clockwise',
        shortcut: 'T',
        onActivate: () => {
          engine.tapClockwise(itemId);
          onClose();
        },
      });
    }

    // "Tap counterclockwise" - available if item.canTap
    if (item.canTap) {
      entries.push({
        type: 'item',
        id: 'tap-counterclockwise',
        label: 'Tap counterclockwise',
        shortcut: 'Shift+T',
        onActivate: () => {
          engine.tapCounterClockwise(itemId);
          onClose();
        },
      });
    }

    // "Flip"
    entries.push({
      type: 'item',
      id: 'flip',
      label: 'Flip',
      shortcut: 'F',
      onActivate: () => {
        engine.flipItem(itemId);
        onClose();
      },
    });

    // "Remove" - available if item.canRemove
    if (item.canRemove) {
      entries.push({
        type: 'item',
        id: 'remove',
        label: 'Remove',
        shortcut: 'Delete',
        onActivate: () => {
          engine.removeItem(itemId);
          onClose();
        },
      });
    }

    // Custom actions
    if (customActions) {
      for (const action of customActions) {
        if (action.isAvailable && !action.isAvailable(item)) continue;
        entries.push({
          type: 'item',
          id: action.id,
          label: action.label,
          icon: action.icon,
          shortcut: action.shortcut,
          onActivate: () => {
            action.action(item, engine);
            onClose();
          },
        });
      }
    }

    // Separator before "Send to..." entries
    const allGrids = engine.getAllGrids();
    const otherGrids = allGrids.filter((g) => g.config.id !== gridId);
    if (otherGrids.length > 0) {
      entries.push({ type: 'separator' });

      for (const targetGrid of otherGrids) {
        entries.push({
          type: 'item',
          id: `send-to-${targetGrid.config.id}`,
          label: `Send to ${targetGrid.config.label}`,
          onActivate: () => {
            engine.transferItem(itemId, targetGrid.config.id, { column: 1, row: 1 });
            onClose();
          },
        });
      }
    }
  }

  // Collect only actual menu items (not separators) for keyboard navigation
  const menuItems = entries.filter((e): e is MenuItem => e.type === 'item');

  // Position the menu near the anchor element
  useEffect(() => {
    const rect = anchorElement.getBoundingClientRect();
    setPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    });
  }, [anchorElement]);

  // Focus the first menu item on open
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const firstItem = menu.querySelector<HTMLElement>('[role="menuitem"]');
    firstItem?.focus();
  }, []);

  // Click outside closes the menu
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      const menu = menuRef.current;
      if (menu && !menu.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const nextIndex = (activeIndex + 1) % menuItems.length;
          setActiveIndex(nextIndex);
          const menu = menuRef.current;
          if (menu) {
            const items = menu.querySelectorAll<HTMLElement>('[role="menuitem"]');
            items[nextIndex]?.focus();
          }
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prevIndex = (activeIndex - 1 + menuItems.length) % menuItems.length;
          setActiveIndex(prevIndex);
          const menu = menuRef.current;
          if (menu) {
            const items = menu.querySelectorAll<HTMLElement>('[role="menuitem"]');
            items[prevIndex]?.focus();
          }
          break;
        }
        case 'Enter': {
          e.preventDefault();
          menuItems[activeIndex]?.onActivate();
          break;
        }
        case 'Escape': {
          e.preventDefault();
          onClose();
          break;
        }
        case 'Home': {
          e.preventDefault();
          setActiveIndex(0);
          const menu = menuRef.current;
          if (menu) {
            const items = menu.querySelectorAll<HTMLElement>('[role="menuitem"]');
            items[0]?.focus();
          }
          break;
        }
        case 'End': {
          e.preventDefault();
          const lastIndex = menuItems.length - 1;
          setActiveIndex(lastIndex);
          const menu = menuRef.current;
          if (menu) {
            const items = menu.querySelectorAll<HTMLElement>('[role="menuitem"]');
            items[lastIndex]?.focus();
          }
          break;
        }
      }
    },
    [activeIndex, menuItems, onClose],
  );

  if (!item) return null;

  // Track the menuitem index separately since separators are not menuitems
  let menuItemIndex = 0;

  return createPortal(
    <div
      className="gf-context-menu"
      role="menu"
      ref={menuRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {entries.map((entry) => {
        if (entry.type === 'separator') {
          return (
            <div
              key={`separator-${menuItemIndex}`}
              className="gf-context-menu__separator"
              role="separator"
            />
          );
        }

        const currentIndex = menuItemIndex;
        menuItemIndex++;

        return (
          <div
            key={entry.id}
            className={
              'gf-context-menu__item' +
              (currentIndex === activeIndex ? ' gf-context-menu__item--active' : '')
            }
            role="menuitem"
            tabIndex={currentIndex === activeIndex ? 0 : -1}
            onClick={() => entry.onActivate()}
            onKeyDown={handleKeyDown}
            onMouseEnter={() => {
              setActiveIndex(currentIndex);
              const menu = menuRef.current;
              if (menu) {
                const items = menu.querySelectorAll<HTMLElement>('[role="menuitem"]');
                items[currentIndex]?.focus();
              }
            }}
          >
            {entry.icon && <span className="gf-context-menu__icon">{entry.icon}</span>}
            <span className="gf-context-menu__label">{entry.label}</span>
            {entry.shortcut && (
              <span className="gf-context-menu__shortcut">{entry.shortcut}</span>
            )}
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
