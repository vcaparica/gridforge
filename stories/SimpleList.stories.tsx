import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import '../src/styles/gridforge.css';

import { GridForgeProvider } from '../src/components/GridForgeProvider.tsx';
import { ItemTray } from '../src/components/ItemTray.tsx';
import { Cell } from '../src/components/Cell.tsx';
import { Item } from '../src/components/Item.tsx';
import { useGridForge } from '../src/hooks/useGridForge.ts';
import type { Coordinates } from '../src/core/types.ts';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const FRUITS = [
  { id: 'fruit-1', label: 'Red Apple', color: '#e53e3e' },
  { id: 'fruit-2', label: 'Blue Berry', color: '#3182ce' },
  { id: 'fruit-3', label: 'Green Lime', color: '#38a169' },
  { id: 'fruit-4', label: 'Gold Banana', color: '#d69e2e' },
  { id: 'fruit-5', label: 'Purple Grape', color: '#805ad5' },
];

// ---------------------------------------------------------------------------
// Inner component (uses hooks)
// ---------------------------------------------------------------------------

function SimpleListInner() {
  const { engine } = useGridForge();

  useEffect(() => {
    FRUITS.forEach((fruit, index) => {
      engine.addItem(
        {
          id: fruit.id,
          label: fruit.label,
          canMove: true,
          canRemove: false,
          canTap: false,
          metadata: { color: fruit.color },
        },
        'fruit-tray',
        { column: index + 1, row: 1 },
      );
    });
  }, [engine]);

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ color: '#e2e8f0', marginBottom: 16, fontFamily: 'system-ui' }}>
        Fruit Basket
      </h2>
      <p style={{ color: '#a0aec0', marginBottom: 24, fontFamily: 'system-ui', fontSize: 14 }}>
        Use arrow keys to navigate, Space/Enter to grab, arrow keys to reorder, Space/Enter to drop.
      </p>
      <ItemTray id="fruit-tray" label="Fruit basket">
        {FRUITS.map((fruit, index) => {
          const coords: Coordinates = { column: index + 1, row: 1 };
          return (
            <Cell
              key={fruit.id}
              gridId="fruit-tray"
              coordinates={coords}
              style={{ width: 100, height: 100 }}
            >
              <FruitItem id={fruit.id} />
            </Cell>
          );
        })}
      </ItemTray>
    </div>
  );
}

function FruitItem({ id }: { id: string }) {
  const { engine } = useGridForge();
  const item = engine.getItem(id);
  if (!item) return null;

  const fruit = FRUITS.find((f) => f.id === id);
  if (!fruit) return null;

  return (
    <Item id={id} label={fruit.label} canTap={false}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 12,
          background: fruit.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: 11,
          fontFamily: 'system-ui',
          textAlign: 'center',
          lineHeight: 1.2,
          padding: 4,
        }}
      >
        {fruit.label}
      </div>
    </Item>
  );
}

// ---------------------------------------------------------------------------
// Wrapper (provides context)
// ---------------------------------------------------------------------------

function SimpleListStory() {
  return (
    <GridForgeProvider conflictStrategy="swap">
      <SimpleListInner />
    </GridForgeProvider>
  );
}

// ---------------------------------------------------------------------------
// Meta & Story
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'Demos/Simple List',
  component: SimpleListStory,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <SimpleListStory />,
};
