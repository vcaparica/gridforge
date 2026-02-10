# Building a TCG Interface with GridForge

This guide walks through building a trading card game (TCG) interface like Magic: The Gathering using GridForge. You will learn how to set up zones, tap/untap cards, flip cards face-down, transfer cards between zones, and use non-rendered grids for hidden zones.

## Zone Architecture

A typical TCG playmat has several zones:

| Zone | GridForge Model | Rendered? |
|------|-----------------|-----------|
| Battlefield | 2D Grid (e.g., 6x4) | Yes |
| Hand | 1D ItemTray | Yes |
| Graveyard | 1D Grid or ItemTray | Yes |
| Exile | 1D Grid | Yes (or no) |
| Library (deck) | Non-rendered grid | No |
| Face-down pile | Non-rendered grid | No |

## Basic Setup

```tsx
import {
  GridForgeProvider,
  Grid,
  ItemTray,
  Item,
  Cell,
} from 'gridforge';
import 'gridforge/styles/gridforge.css';
import 'gridforge/styles/themes/theme-felt.css'; // card-table feel

function Playmat() {
  return (
    <GridForgeProvider
      conflictStrategy="stack"
      onItemTapped={(e) => console.log('Tapped:', e.item?.label, e.newTapAngle)}
      onItemTransferred={(e) => console.log('Transferred:', e.item?.label, 'to', e.toGrid)}
    >
      <Battlefield />
      <Hand />
      <Graveyard />
    </GridForgeProvider>
  );
}
```

## Setting Up the Battlefield

The battlefield is a 2D grid where creatures, enchantments, and lands are placed.

```tsx
function Battlefield() {
  return (
    <Grid
      id="battlefield"
      columns={7}
      rows={4}
      label="Battlefield"
      allowStacking={true}
      maxStackSize={3}
      renderCell={(coords, items) => (
        <Cell gridId="battlefield" coordinates={coords}>
          {items.map((item) => (
            <CardItem key={item.id} item={item} />
          ))}
        </Cell>
      )}
    />
  );
}
```

## Setting Up the Hand

The hand is a 1D tray. Cards are hidden from the opponent but visible to the player.

```tsx
function Hand() {
  return (
    <ItemTray id="hand" label="Your Hand" orientation="horizontal">
      {handCards.map((card) => (
        <Item
          key={card.id}
          id={card.id}
          label={card.name}
          canTap={false}  // cards in hand cannot be tapped
        >
          <CardFace name={card.name} cost={card.cost} />
        </Item>
      ))}
    </ItemTray>
  );
}
```

## Setting Up the Graveyard

```tsx
function Graveyard() {
  return (
    <ItemTray id="graveyard" label="Graveyard" orientation="vertical">
      {/* Items transferred here appear automatically */}
    </ItemTray>
  );
}
```

## Tapping and Untapping Cards

Tapping is built into GridForge. When a player uses a land for mana or attacks with a creature, the card rotates 90 degrees.

```tsx
function CardItem({ item }: { item: ItemState }) {
  const { tapClockwise, tapCounterClockwise, ariaProps } = useItem(item.id);

  return (
    <Item
      id={item.id}
      label={item.label}
      canTap={true}
    >
      <div
        className="gf-card"
        style={{ transform: TapSystem.getCSSRotation(item.tapAngle) }}
      >
        <CardFace name={item.label} />
      </div>
    </Item>
  );
}
```

Keyboard users press **T** to tap and **Shift+T** to untap. The screen reader announces "Lightning Bolt tapped clockwise to tapped."

### Untap Phase

To untap all cards at the start of a turn:

```tsx
function untapAll(engine: GridEngine) {
  const battlefieldItems = engine.getItemsInGrid('battlefield');
  for (const item of battlefieldItems) {
    if (item.tapAngle !== 0) {
      engine.setTapAngle(item.id, 0);
    }
  }
}
```

## Flipping Cards Face-Down

Morph and manifest mechanics require face-down cards. Press **F** to flip.

```tsx
<Item id="morph-creature" label="Face-down creature" canTap={true}>
  {item.isFaceDown ? (
    <div className="gf-card-back" />
  ) : (
    <CardFace name="Willbender" />
  )}
</Item>
```

The screen reader announces "Face-down creature turned face down" or "Willbender turned face up."

## Cross-Zone Transfers via Context Menu

Use the context menu to move cards between zones (e.g., send a creature to the graveyard).

```tsx
const zoneTransferActions: ContextMenuAction[] = [
  {
    id: 'send-to-graveyard',
    label: 'Send to Graveyard',
    shortcut: 'G',
    action: (item, engine) => {
      const gy = engine.getGrid('graveyard');
      if (gy) {
        const slot = gy.itemIds.size + 1;
        engine.transferItem(item.id, 'graveyard', { column: slot, row: 1 });
      }
    },
  },
  {
    id: 'send-to-exile',
    label: 'Exile',
    action: (item, engine) => {
      engine.transferItem(item.id, 'exile', { column: 1, row: 1 });
    },
  },
  {
    id: 'return-to-hand',
    label: 'Return to Hand',
    action: (item, engine) => {
      const hand = engine.getGrid('hand');
      if (hand) {
        const slot = hand.itemIds.size + 1;
        engine.transferItem(item.id, 'hand', { column: slot, row: 1 });
      }
    },
    isAvailable: (item) => item.gridId === 'battlefield',
  },
];
```

Pass these to your `<ContextMenu>`:

```tsx
<ContextMenu
  itemId={selectedItemId}
  gridId={selectedGridId}
  coords={selectedCoords}
  anchorElement={anchorRef.current}
  onClose={() => setMenuOpen(false)}
  customActions={zoneTransferActions}
/>
```

## Non-Rendered Grids for Hidden Zones

The library (deck) is a stack of cards that should not be visible on screen. Register it as a grid but do not render a `<Grid>` component.

```tsx
function useDeck(engine: GridEngine) {
  useEffect(() => {
    // Register without rendering
    engine.registerGrid({
      id: 'library',
      columns: 1,
      rows: 60,   // max deck size
      type: '1d',
      label: 'Library',
      allowStacking: true,
      sparse: true,
    });

    return () => engine.unregisterGrid('library');
  }, [engine]);
}
```

### Drawing a Card

Transfer from the non-rendered library to the rendered hand:

```tsx
function drawCard(engine: GridEngine) {
  const libraryItems = engine.getItemsInGrid('library');
  if (libraryItems.length === 0) return;

  const topCard = libraryItems[libraryItems.length - 1];
  const handItems = engine.getItemsInGrid('hand');
  const nextSlot = handItems.length + 1;

  engine.transferItem(topCard.id, 'hand', { column: nextSlot, row: 1 });
}
```

The screen reader announces: "[Card name] arrived from Library at Slot [N]."

## Cross-Grid Keyboard Transfer

While grabbing an item, press **Tab** to cycle the target grid. This moves the grabbed item from the current grid to the next rendered grid. Press **Tab** again to cycle to the next grid. Press **Enter** to drop.

This allows fully keyboard-driven cross-zone transfers without using the context menu.

## Putting It All Together

```tsx
function TCGApp() {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <GridForgeProvider conflictStrategy="stack">
      <h1>My Card Game</h1>
      <Battlefield onShowHelp={() => setHelpOpen(true)} />
      <Hand />
      <div className="side-zones">
        <Graveyard />
        <ExileZone />
      </div>
      <DeckCounter />
      <HelpDialog isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </GridForgeProvider>
  );
}
```

Key points:

- Use `conflictStrategy="stack"` so creatures and enchantments can share cells
- Give every zone a descriptive `label` for screen reader users
- Register hidden zones (library, sideboard) via the engine without rendering them
- Use `transferItem()` for programmatic zone changes
- Use Tab cycling during grab mode for keyboard-driven zone transfers
