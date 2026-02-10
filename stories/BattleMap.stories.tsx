import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import '../src/styles/gridforge.css';
import '../src/styles/themes/theme-parchment.css';

import { GridForgeProvider } from '../src/components/GridForgeProvider.tsx';
import { Grid } from '../src/components/Grid.tsx';
import { ItemTray } from '../src/components/ItemTray.tsx';
import { Cell } from '../src/components/Cell.tsx';
import { Item } from '../src/components/Item.tsx';
import { useGridForge } from '../src/hooks/useGridForge.ts';
import type { Coordinates, ItemState } from '../src/core/types.ts';

// ---------------------------------------------------------------------------
// Token data
// ---------------------------------------------------------------------------

interface Token {
  id: string;
  label: string;
  abbreviation: string;
  color: string;
  gridId: string;
  position: Coordinates;
}

const TOKENS: Token[] = [
  // On the grid
  { id: 'token-fighter', label: 'Fighter', abbreviation: 'FI', color: '#c0392b', gridId: 'battle-grid', position: { column: 2, row: 3 } },
  { id: 'token-wizard', label: 'Wizard', abbreviation: 'WZ', color: '#2980b9', gridId: 'battle-grid', position: { column: 5, row: 2 } },
  { id: 'token-rogue', label: 'Rogue', abbreviation: 'RG', color: '#27ae60', gridId: 'battle-grid', position: { column: 3, row: 5 } },
  { id: 'token-cleric', label: 'Cleric', abbreviation: 'CL', color: '#f39c12', gridId: 'battle-grid', position: { column: 7, row: 4 } },
  { id: 'token-goblin1', label: 'Goblin 1', abbreviation: 'G1', color: '#8e44ad', gridId: 'battle-grid', position: { column: 6, row: 1 } },
  { id: 'token-goblin2', label: 'Goblin 2', abbreviation: 'G2', color: '#8e44ad', gridId: 'battle-grid', position: { column: 7, row: 6 } },
  // In reserve tray
  { id: 'token-ranger', label: 'Ranger', abbreviation: 'RA', color: '#16a085', gridId: 'reserve-tray', position: { column: 1, row: 1 } },
  { id: 'token-bard', label: 'Bard', abbreviation: 'BD', color: '#e74c3c', gridId: 'reserve-tray', position: { column: 2, row: 1 } },
];

const GRID_COLUMNS = 8;
const GRID_ROWS = 6;
const RESERVE_COUNT = 4;

// ---------------------------------------------------------------------------
// Token visual
// ---------------------------------------------------------------------------

function TokenCircle({ id }: { id: string }) {
  const token = TOKENS.find((t) => t.id === id);
  if (!token) return null;

  return (
    <Item id={id} label={token.label} canTap={false}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: token.color,
          border: '3px solid rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: 14,
          fontFamily: 'system-ui',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        {token.abbreviation}
      </div>
    </Item>
  );
}

// ---------------------------------------------------------------------------
// Inner component
// ---------------------------------------------------------------------------

function BattleMapInner() {
  const { engine, state } = useGridForge();

  useEffect(() => {
    TOKENS.forEach((token) => {
      engine.addItem(
        {
          id: token.id,
          label: token.label,
          canMove: true,
          canRemove: true,
          canTap: false,
          metadata: { abbreviation: token.abbreviation, color: token.color },
        },
        token.gridId,
        token.position,
      );
    });
  }, [engine]);

  return (
    <div style={{ padding: 32, fontFamily: '"Palatino Linotype", Palatino, Georgia, serif' }}>
      <h2 style={{ color: '#4a3520', marginBottom: 8 }}>
        Battle Map
      </h2>
      <p style={{ color: '#7a5a3a', marginBottom: 24, fontSize: 14 }}>
        Move tokens on the 8x6 grid. Grab with Space/Enter, move with arrows, drop with Space/Enter.
        Tokens swap when colliding. Click a token to grab it, then click any cell to drop it there.
        Use Tab while grabbing to move tokens between the grid and reserve.
      </p>

      <Grid
        id="battle-grid"
        columns={GRID_COLUMNS}
        rows={GRID_ROWS}
        label="Battle map grid"
        description="An 8 by 6 battle map for placing miniature tokens"
        renderCell={(coords: Coordinates, items: ItemState[]) => (
          <Cell
            gridId="battle-grid"
            coordinates={coords}
            style={{ width: 64, height: 64 }}
          >
            {items.map((item) => (
              <TokenCircle key={item.id} id={item.id} />
            ))}
          </Cell>
        )}
        style={{ marginBottom: 24 }}
      />

      <h3 style={{ color: '#4a3520', marginBottom: 8, fontSize: 16 }}>
        Reserve
      </h3>
      <ItemTray id="reserve-tray" label="Reserve tokens">
        {Array.from({ length: RESERVE_COUNT }, (_, i) => {
          const coords: Coordinates = { column: i + 1, row: 1 };
          const items = engine.getItemsAt('reserve-tray', coords);
          return (
            <Cell
              key={i}
              gridId="reserve-tray"
              coordinates={coords}
              style={{ width: 64, height: 64 }}
            >
              {items.map((item) => (
                <TokenCircle key={item.id} id={item.id} />
              ))}
            </Cell>
          );
        })}
      </ItemTray>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

function BattleMapStory() {
  return (
    <GridForgeProvider conflictStrategy="swap">
      <BattleMapInner />
    </GridForgeProvider>
  );
}

// ---------------------------------------------------------------------------
// Meta & Story
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'Demos/Battle Map',
  component: BattleMapStory,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'light' },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <BattleMapStory />,
};
