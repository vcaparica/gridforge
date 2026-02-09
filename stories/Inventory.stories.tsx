import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import '../src/styles/gridforge.css';
import '../src/styles/themes/theme-modern.css';

import { GridForgeProvider } from '../src/components/GridForgeProvider.tsx';
import { Grid } from '../src/components/Grid.tsx';
import { Cell } from '../src/components/Cell.tsx';
import { Item } from '../src/components/Item.tsx';
import { useGridForge } from '../src/hooks/useGridForge.ts';
import type { Coordinates, ItemState } from '../src/core/types.ts';

// ---------------------------------------------------------------------------
// Item data
// ---------------------------------------------------------------------------

interface InventoryItem {
  id: string;
  label: string;
  icon: string;
  color: string;
  position: Coordinates;
  stackCount?: number;
}

const INVENTORY_ITEMS: InventoryItem[] = [
  { id: 'inv-hp-potion', label: 'Health Potion x3', icon: '\u2764', color: '#e74c3c', position: { column: 1, row: 1 }, stackCount: 3 },
  { id: 'inv-mp-potion', label: 'Mana Potion x2', icon: '\u2b50', color: '#3498db', position: { column: 2, row: 1 }, stackCount: 2 },
  { id: 'inv-sword', label: 'Iron Sword', icon: '\u2694', color: '#95a5a6', position: { column: 4, row: 1 } },
  { id: 'inv-shield', label: 'Wooden Shield', icon: '\u26e8', color: '#8b6914', position: { column: 5, row: 1 } },
  { id: 'inv-bow', label: 'Short Bow', icon: '\u{1F3F9}', color: '#6d4c1a', position: { column: 1, row: 2 } },
  { id: 'inv-arrow', label: 'Arrows x5', icon: '\u{27B3}', color: '#7f8c8d', position: { column: 2, row: 2 }, stackCount: 5 },
  { id: 'inv-ring', label: 'Ring of Power', icon: '\u{1F48D}', color: '#f1c40f', position: { column: 4, row: 2 } },
  { id: 'inv-scroll', label: 'Fire Scroll', icon: '\u{1F4DC}', color: '#e67e22', position: { column: 5, row: 2 } },
  { id: 'inv-gem', label: 'Ruby Gem', icon: '\u{1F48E}', color: '#c0392b', position: { column: 6, row: 2 } },
  { id: 'inv-boots', label: 'Leather Boots', icon: '\u{1F462}', color: '#8e6b3e', position: { column: 1, row: 3 } },
  { id: 'inv-coin', label: 'Gold Coins x4', icon: '\u{1FA99}', color: '#d4ac0d', position: { column: 3, row: 3 }, stackCount: 4 },
  { id: 'inv-key', label: 'Dungeon Key', icon: '\u{1F511}', color: '#d4ac0d', position: { column: 6, row: 3 } },
  { id: 'inv-herb', label: 'Healing Herb x2', icon: '\u{1F33F}', color: '#27ae60', position: { column: 2, row: 4 }, stackCount: 2 },
  { id: 'inv-torch', label: 'Torch', icon: '\u{1F525}', color: '#e74c3c', position: { column: 5, row: 4 } },
];

const BLOCKED_CELLS: Coordinates[] = [
  { column: 3, row: 1 },
  { column: 6, row: 1 },
  { column: 3, row: 2 },
  { column: 4, row: 4 },
];

const GRID_COLUMNS = 6;
const GRID_ROWS = 4;

// ---------------------------------------------------------------------------
// Item visual
// ---------------------------------------------------------------------------

function InventorySlotItem({ id }: { id: string }) {
  const invItem = INVENTORY_ITEMS.find((item) => item.id === id);
  if (!invItem) return null;

  return (
    <Item id={id} label={invItem.label} canTap={false}>
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 8,
          background: `${invItem.color}22`,
          border: `1px solid ${invItem.color}66`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        <span style={{ fontSize: 24, lineHeight: 1 }}>
          {invItem.icon}
        </span>
        <span
          style={{
            fontSize: 8,
            color: '#4a5568',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 600,
            marginTop: 2,
            textAlign: 'center',
            lineHeight: 1.1,
            maxWidth: 56,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {invItem.label.replace(/ x\d+$/, '')}
        </span>
        {invItem.stackCount && invItem.stackCount > 1 && (
          <span
            style={{
              position: 'absolute',
              bottom: 2,
              right: 4,
              fontSize: 10,
              fontWeight: 800,
              color: '#fff',
              background: invItem.color,
              borderRadius: 6,
              padding: '0 4px',
              lineHeight: '16px',
              fontFamily: 'system-ui',
              minWidth: 16,
              textAlign: 'center',
            }}
          >
            {invItem.stackCount}
          </span>
        )}
      </div>
    </Item>
  );
}

// ---------------------------------------------------------------------------
// Inner component
// ---------------------------------------------------------------------------

function InventoryInner() {
  const { engine } = useGridForge();

  useEffect(() => {
    INVENTORY_ITEMS.forEach((item) => {
      engine.addItem(
        {
          id: item.id,
          label: item.label,
          canMove: true,
          canRemove: false,
          canTap: false,
          metadata: {
            icon: item.icon,
            color: item.color,
            stackCount: item.stackCount ?? 1,
          },
        },
        'inventory',
        item.position,
      );
    });
  }, [engine]);

  return (
    <div style={{ padding: 32, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h2 style={{ color: '#1f2937', marginBottom: 8 }}>
        Inventory
      </h2>
      <p style={{ color: '#6b7280', marginBottom: 8, fontSize: 14 }}>
        6x4 inventory grid. Some slots are locked (hatched).
        Items can stack up to 5 per slot. Items skip over locked slots when moved.
      </p>
      <p style={{ color: '#9ca3af', marginBottom: 24, fontSize: 12 }}>
        Navigate: arrow keys. Grab: Space/Enter. Drop: Space/Enter.
        Use [ and ] to cycle through stacked items.
      </p>

      <Grid
        id="inventory"
        columns={GRID_COLUMNS}
        rows={GRID_ROWS}
        label="Inventory grid"
        description="A 6 by 4 game inventory with stackable items and locked slots"
        allowStacking={true}
        maxStackSize={5}
        blockedCells={BLOCKED_CELLS}
        renderCell={(coords: Coordinates, items: ItemState[]) => {
          const isBlocked = BLOCKED_CELLS.some(
            (bc) => bc.column === coords.column && bc.row === coords.row,
          );
          return (
            <Cell
              gridId="inventory"
              coordinates={coords}
              style={{
                width: 72,
                height: 72,
                ...(isBlocked ? { cursor: 'not-allowed' } : {}),
              }}
            >
              {items.map((item) => (
                <InventorySlotItem key={item.id} id={item.id} />
              ))}
            </Cell>
          );
        }}
      />

      <div
        style={{
          marginTop: 16,
          padding: '8px 12px',
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          fontSize: 12,
          color: '#6b7280',
        }}
      >
        <strong>Legend:</strong> Hatched cells = locked equipment slots.
        Stack indicator shows quantity in bottom-right corner.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

function InventoryStory() {
  return (
    <GridForgeProvider conflictStrategy="stack">
      <InventoryInner />
    </GridForgeProvider>
  );
}

// ---------------------------------------------------------------------------
// Meta & Story
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'Demos/Inventory',
  component: InventoryStory,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'light' },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <InventoryStory />,
};
