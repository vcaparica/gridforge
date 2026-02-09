# GridForge Examples

Copy-paste code snippets for common use cases.

## Basic 2D Grid with Items

A 3x3 grid with three draggable tokens.

```tsx
import { GridForgeProvider, Grid, Cell, Item } from 'gridforge';
import 'gridforge/styles/gridforge.css';

function BasicGrid() {
  const { engine } = useGridForge();

  useEffect(() => {
    engine.addItem(
      { id: 'token-1', label: 'Red Token', canMove: true, canRemove: true, canTap: false, metadata: {} },
      'board', { column: 1, row: 1 }
    );
    engine.addItem(
      { id: 'token-2', label: 'Blue Token', canMove: true, canRemove: true, canTap: false, metadata: {} },
      'board', { column: 2, row: 2 }
    );
    engine.addItem(
      { id: 'token-3', label: 'Green Token', canMove: true, canRemove: true, canTap: false, metadata: {} },
      'board', { column: 3, row: 3 }
    );
  }, [engine]);

  return (
    <Grid
      id="board"
      columns={3}
      rows={3}
      label="Game Board"
      renderCell={(coords, items) => (
        <Cell gridId="board" coordinates={coords}>
          {items.map((item) => (
            <Item key={item.id} id={item.id} label={item.label}>
              <div className="token" style={{ background: item.label.split(' ')[0].toLowerCase() }}>
                {item.label[0]}
              </div>
            </Item>
          ))}
        </Cell>
      )}
    />
  );
}

export default function App() {
  return (
    <GridForgeProvider conflictStrategy="swap">
      <BasicGrid />
    </GridForgeProvider>
  );
}
```

## 1D Tray (Hand of Cards)

A horizontal tray representing a player's hand.

```tsx
import { GridForgeProvider, ItemTray, Item } from 'gridforge';

const HAND = [
  { id: 'c1', name: 'Lightning Bolt', cost: 'R' },
  { id: 'c2', name: 'Counterspell', cost: 'UU' },
  { id: 'c3', name: 'Giant Growth', cost: 'G' },
  { id: 'c4', name: 'Dark Ritual', cost: 'B' },
  { id: 'c5', name: 'Healing Salve', cost: 'W' },
];

function HandOfCards() {
  return (
    <GridForgeProvider>
      <ItemTray id="hand" label="Your Hand" orientation="horizontal">
        {HAND.map((card) => (
          <Item key={card.id} id={card.id} label={card.name} canTap={false}>
            <div className="gf-card">
              <span>{card.name}</span>
              <span className="mana-cost">{card.cost}</span>
            </div>
          </Item>
        ))}
      </ItemTray>
    </GridForgeProvider>
  );
}
```

## Inventory Grid with Stacking

A 5x4 inventory where items can stack up to 10 per cell.

```tsx
function Inventory() {
  const { engine } = useGridForge();

  useEffect(() => {
    // Add 5 health potions to the same cell
    for (let i = 0; i < 5; i++) {
      engine.addItem(
        { id: `potion-${i}`, label: 'Health Potion', canMove: true, canRemove: true, canTap: false, metadata: { type: 'consumable' } },
        'inventory', { column: 1, row: 1 }
      );
    }
  }, [engine]);

  return (
    <Grid
      id="inventory"
      columns={5}
      rows={4}
      label="Inventory"
      allowStacking={true}
      maxStackSize={10}
      renderCell={(coords, items) => (
        <Cell gridId="inventory" coordinates={coords}>
          {items.length > 0 && (
            <Item key={items[0].id} id={items[0].id} label={items[0].label}>
              <div className="inventory-slot">
                <img src={`/icons/${items[0].metadata.type}.png`} alt="" />
                {items.length > 1 && (
                  <span className="stack-count">{items.length}</span>
                )}
              </div>
            </Item>
          )}
        </Cell>
      )}
    />
  );
}

export default function App() {
  return (
    <GridForgeProvider conflictStrategy="stack">
      <Inventory />
    </GridForgeProvider>
  );
}
```

## TCG Playmat with Multiple Zones

A full playmat with battlefield, hand, and graveyard.

```tsx
import { useState } from 'react';
import {
  GridForgeProvider, Grid, ItemTray, Cell, Item,
  HelpDialog, ContextMenu,
} from 'gridforge';
import { useGridForge } from 'gridforge/hooks';
import { TapSystem } from 'gridforge/core';
import 'gridforge/styles/gridforge.css';
import 'gridforge/styles/themes/theme-felt.css';

function TCGPlaymat() {
  const { engine } = useGridForge();
  const [helpOpen, setHelpOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    itemId: string; gridId: string; coords: Coordinates; anchor: HTMLElement;
  } | null>(null);

  const zoneActions = [
    {
      id: 'to-graveyard',
      label: 'Send to Graveyard',
      action: (item, eng) => {
        const gyItems = eng.getItemsInGrid('graveyard');
        eng.transferItem(item.id, 'graveyard', { column: gyItems.length + 1, row: 1 });
      },
    },
    {
      id: 'to-hand',
      label: 'Return to Hand',
      action: (item, eng) => {
        const handItems = eng.getItemsInGrid('hand');
        eng.transferItem(item.id, 'hand', { column: handItems.length + 1, row: 1 });
      },
      isAvailable: (item) => item.gridId !== 'hand',
    },
  ];

  return (
    <>
      {/* Battlefield: 7 columns x 4 rows */}
      <Grid
        id="battlefield"
        columns={7}
        rows={4}
        label="Battlefield"
        allowStacking={true}
        renderCell={(coords, items) => (
          <Cell gridId="battlefield" coordinates={coords}>
            {items.map((item) => (
              <Item key={item.id} id={item.id} label={item.label} canTap={true}>
                <div
                  className="gf-card"
                  style={{ transform: TapSystem.getCSSRotation(item.tapAngle) }}
                >
                  {item.isFaceDown ? (
                    <div className="gf-card-back" />
                  ) : (
                    <span>{item.label}</span>
                  )}
                </div>
              </Item>
            ))}
          </Cell>
        )}
      />

      {/* Hand */}
      <ItemTray id="hand" label="Your Hand" orientation="horizontal">
        {/* Items are added programmatically */}
      </ItemTray>

      {/* Graveyard */}
      <ItemTray id="graveyard" label="Graveyard" orientation="vertical">
        {/* Items arrive via transferItem */}
      </ItemTray>

      <HelpDialog isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      {contextMenu && (
        <ContextMenu
          itemId={contextMenu.itemId}
          gridId={contextMenu.gridId}
          coords={contextMenu.coords}
          anchorElement={contextMenu.anchor}
          onClose={() => setContextMenu(null)}
          customActions={zoneActions}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <GridForgeProvider conflictStrategy="stack">
      <TCGPlaymat />
    </GridForgeProvider>
  );
}
```

## RPG Battle Map

An 8x8 battle map with blocked terrain cells and character tokens.

```tsx
const WALLS = [
  { column: 3, row: 2 }, { column: 3, row: 3 }, { column: 3, row: 4 },
  { column: 6, row: 1 }, { column: 6, row: 2 }, { column: 6, row: 3 },
];

function BattleMap() {
  const { engine } = useGridForge();

  useEffect(() => {
    engine.addItem(
      { id: 'fighter', label: 'Aldric the Fighter', canMove: true, canRemove: false, canTap: false, metadata: { hp: 45, ac: 18 } },
      'map', { column: 1, row: 1 }
    );
    engine.addItem(
      { id: 'wizard', label: 'Mira the Wizard', canMove: true, canRemove: false, canTap: false, metadata: { hp: 22, ac: 12 } },
      'map', { column: 2, row: 1 }
    );
    engine.addItem(
      { id: 'goblin-1', label: 'Goblin', canMove: true, canRemove: true, canTap: false, metadata: { hp: 7, ac: 15 } },
      'map', { column: 7, row: 5 }
    );
  }, [engine]);

  return (
    <Grid
      id="map"
      columns={8}
      rows={8}
      label="Battle Map - Dungeon Level 3"
      blockedCells={WALLS}
      renderCell={(coords, items) => (
        <Cell gridId="map" coordinates={coords}>
          {items.map((item) => (
            <Item key={item.id} id={item.id} label={item.label} canTap={false}>
              <div className="token-circle">
                {item.label[0]}
              </div>
            </Item>
          ))}
        </Cell>
      )}
    />
  );
}

export default function App() {
  return (
    <GridForgeProvider conflictStrategy="block">
      <BattleMap />
    </GridForgeProvider>
  );
}
```

## Custom Conflict Resolver

A resolver that allows stacking only items of the same type, and swaps otherwise.

```tsx
import type { ConflictResolver } from 'gridforge';

const sameTypeStacker: ConflictResolver = (movingItem, targetCell, occupants, engine) => {
  const movingType = movingItem.metadata.type as string;
  const allSameType = occupants.every(
    (occ) => (occ.metadata.type as string) === movingType
  );

  if (allSameType) {
    return { action: 'stack', message: `Stacked with ${occupants.length} other ${movingType}(s)` };
  }

  if (occupants.length === 1) {
    return {
      action: 'swap',
      displacedItems: [{
        itemId: occupants[0].id,
        to: movingItem.coordinates,
      }],
    };
  }

  return { action: 'block', message: 'Cannot stack different item types' };
};

// Usage:
<GridForgeProvider conflictStrategy={sameTypeStacker}>
  ...
</GridForgeProvider>
```

## Custom Context Menu Actions

Adding game-specific actions to the context menu.

```tsx
import type { ContextMenuAction } from 'gridforge';

const rpgActions: ContextMenuAction[] = [
  {
    id: 'inspect',
    label: 'Inspect',
    shortcut: 'I',
    action: (item) => {
      alert(`${item.label}\nHP: ${item.metadata.hp}\nAC: ${item.metadata.ac}`);
    },
  },
  {
    id: 'damage',
    label: 'Apply Damage',
    shortcut: 'D',
    action: (item, engine) => {
      const damage = prompt('How much damage?');
      if (damage) {
        const hp = (item.metadata.hp as number) - parseInt(damage, 10);
        // Update metadata (you would typically manage this in your own state)
        console.log(`${item.label} takes ${damage} damage. HP: ${hp}`);
        if (hp <= 0) {
          engine.removeItem(item.id);
        }
      }
    },
    isAvailable: (item) => item.metadata.hp !== undefined,
  },
  {
    id: 'clone',
    label: 'Duplicate Token',
    action: (item, engine) => {
      const grid = engine.getGrid(item.gridId);
      if (!grid) return;
      // Find an empty adjacent cell
      for (let c = 1; c <= grid.config.columns; c++) {
        for (let r = 1; r <= grid.config.rows; r++) {
          const occupants = engine.getItemsAt(item.gridId, { column: c, row: r });
          if (occupants.length === 0) {
            engine.addItem(
              { id: `${item.id}-clone-${Date.now()}`, label: `${item.label} (copy)`, canMove: true, canRemove: true, canTap: false, metadata: { ...item.metadata } },
              item.gridId, { column: c, row: r }
            );
            return;
          }
        }
      }
    },
  },
];
```
