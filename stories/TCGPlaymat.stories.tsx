import React, { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import '../src/styles/gridforge.css';
import '../src/styles/themes/theme-felt.css';

import { GridForgeProvider } from '../src/components/GridForgeProvider.tsx';
import { Grid } from '../src/components/Grid.tsx';
import { ItemTray } from '../src/components/ItemTray.tsx';
import { Cell } from '../src/components/Cell.tsx';
import { Item } from '../src/components/Item.tsx';
import { useGridForge } from '../src/hooks/useGridForge.ts';
import type { Coordinates, ItemState } from '../src/core/types.ts';

// ---------------------------------------------------------------------------
// Card data
// ---------------------------------------------------------------------------

type CardType = 'creature' | 'instant' | 'sorcery' | 'land' | 'enchantment' | 'artifact';

interface CardDef {
  id: string;
  label: string;
  type: CardType;
  gridId: string;
  position: Coordinates;
  faceDown?: boolean;
}

const CARD_COLORS: Record<CardType, string> = {
  creature: '#d4a017',
  instant: '#c0392b',
  sorcery: '#8e44ad',
  land: '#27ae60',
  enchantment: '#f0f0f0',
  artifact: '#7f8c8d',
};

const CARD_BORDER_COLORS: Record<CardType, string> = {
  creature: '#b8860b',
  instant: '#e74c3c',
  sorcery: '#9b59b6',
  land: '#2ecc71',
  enchantment: '#bdc3c7',
  artifact: '#95a5a6',
};

const CARDS: CardDef[] = [
  // Library (face-down)
  { id: 'card-lib-1', label: 'Unknown card', type: 'creature', gridId: 'library', position: { column: 1, row: 1 }, faceDown: true },
  { id: 'card-lib-2', label: 'Unknown card', type: 'land', gridId: 'library', position: { column: 2, row: 1 }, faceDown: true },
  { id: 'card-lib-3', label: 'Unknown card', type: 'instant', gridId: 'library', position: { column: 3, row: 1 }, faceDown: true },

  // Hand
  { id: 'card-bolt', label: 'Lightning Bolt', type: 'instant', gridId: 'hand', position: { column: 1, row: 1 } },
  { id: 'card-forest1', label: 'Forest', type: 'land', gridId: 'hand', position: { column: 2, row: 1 } },
  { id: 'card-dragon', label: 'Shivan Dragon', type: 'creature', gridId: 'hand', position: { column: 3, row: 1 } },
  { id: 'card-giant', label: 'Giant Growth', type: 'instant', gridId: 'hand', position: { column: 4, row: 1 } },
  { id: 'card-forest2', label: 'Forest', type: 'land', gridId: 'hand', position: { column: 5, row: 1 } },
  { id: 'card-llanowar', label: 'Llanowar Elves', type: 'creature', gridId: 'hand', position: { column: 6, row: 1 } },
  { id: 'card-counter', label: 'Counterspell', type: 'instant', gridId: 'hand', position: { column: 7, row: 1 } },

  // Battlefield
  { id: 'card-bf-forest1', label: 'Forest', type: 'land', gridId: 'battlefield', position: { column: 1, row: 3 } },
  { id: 'card-bf-forest2', label: 'Forest', type: 'land', gridId: 'battlefield', position: { column: 2, row: 3 } },
  { id: 'card-bf-mountain', label: 'Mountain', type: 'land', gridId: 'battlefield', position: { column: 3, row: 3 } },
  { id: 'card-bf-elves', label: 'Elvish Mystic', type: 'creature', gridId: 'battlefield', position: { column: 1, row: 1 } },
  { id: 'card-bf-enchant', label: 'Rancor', type: 'enchantment', gridId: 'battlefield', position: { column: 2, row: 1 } },

  // Graveyard
  { id: 'card-gy-shock', label: 'Shock', type: 'instant', gridId: 'graveyard', position: { column: 1, row: 1 } },

  // Exile
  { id: 'card-ex-path', label: 'Path to Exile', type: 'sorcery', gridId: 'exile', position: { column: 1, row: 1 } },
];

// ---------------------------------------------------------------------------
// Card visual
// ---------------------------------------------------------------------------

function CardVisual({ id }: { id: string }) {
  const card = CARDS.find((c) => c.id === id);
  if (!card) return null;

  const borderColor = CARD_BORDER_COLORS[card.type];
  const bgColor = CARD_COLORS[card.type];

  return (
    <Item id={id} label={card.label} canTap={true}>
      <div
        className="gf-card"
        style={{
          width: 60,
          height: 84,
          aspectRatio: '5/7',
          border: `2px solid ${borderColor}`,
          borderRadius: 6,
          background: `linear-gradient(180deg, ${bgColor}22, ${bgColor}44)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 4,
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: '#e0e0e0',
            textAlign: 'center',
            lineHeight: 1.2,
            fontFamily: 'system-ui',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            wordBreak: 'break-word',
          }}
        >
          {card.label}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 7,
            color: borderColor,
            fontFamily: 'system-ui',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {card.type}
        </div>
      </div>
    </Item>
  );
}

// ---------------------------------------------------------------------------
// Zone label
// ---------------------------------------------------------------------------

function ZoneLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: '#a0c8a0',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 6,
        fontFamily: 'system-ui',
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner component
// ---------------------------------------------------------------------------

function TCGPlaymatInner() {
  const { engine } = useGridForge();

  useEffect(() => {
    CARDS.forEach((card) => {
      engine.addItem(
        {
          id: card.id,
          label: card.label,
          canMove: true,
          canRemove: true,
          canTap: true,
          isFaceDown: card.faceDown ?? false,
          metadata: { type: card.type },
        },
        card.gridId,
        card.position,
      );
    });
  }, [engine]);

  const cellStyle = { width: 68, height: 92 };

  const renderCardCell = (gridId: string) =>
    (coords: Coordinates, items: ItemState[]) => (
      <Cell gridId={gridId} coordinates={coords} style={cellStyle}>
        {items.map((item) => (
          <CardVisual key={item.id} id={item.id} />
        ))}
      </Cell>
    );

  return (
    <div style={{ padding: 32 }}>
      <h2
        style={{
          color: '#c0e0c0',
          marginBottom: 8,
          fontFamily: 'system-ui',
          fontWeight: 700,
        }}
      >
        MTG Playmat
      </h2>
      <p
        style={{
          color: '#80a880',
          marginBottom: 24,
          fontSize: 13,
          fontFamily: 'system-ui',
        }}
      >
        Navigate with arrow keys. Space/Enter to grab and drop cards.
        T to tap (rotate 90 degrees). Cards can be moved between any zone.
      </p>

      {/* Playmat layout using CSS Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gridTemplateRows: 'auto auto auto',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {/* Top-left: Library */}
        <div>
          <ZoneLabel>Library ({CARDS.filter((c) => c.gridId === 'library').length})</ZoneLabel>
          <Grid
            id="library"
            columns={3}
            rows={1}
            label="Library"
            description="Draw pile, cards face-down"
            allowStacking={true}
            renderCell={renderCardCell('library')}
          />
        </div>

        {/* Top-center: Battlefield */}
        <div style={{ gridRow: '1 / 3' }}>
          <ZoneLabel>Battlefield</ZoneLabel>
          <Grid
            id="battlefield"
            columns={4}
            rows={3}
            label="Battlefield"
            description="Main play area for permanents"
            allowStacking={true}
            renderCell={renderCardCell('battlefield')}
          />
        </div>

        {/* Top-right: Graveyard and Exile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <ZoneLabel>Graveyard</ZoneLabel>
            <ItemTray
              id="graveyard"
              label="Graveyard"
              orientation="vertical"
            >
              {Array.from({ length: 3 }, (_, i) => {
                const coords: Coordinates = { column: i + 1, row: 1 };
                const items = engine.getItemsAt('graveyard', coords);
                return (
                  <Cell
                    key={i}
                    gridId="graveyard"
                    coordinates={coords}
                    style={cellStyle}
                  >
                    {items.map((item) => (
                      <CardVisual key={item.id} id={item.id} />
                    ))}
                  </Cell>
                );
              })}
            </ItemTray>
          </div>

          <div>
            <ZoneLabel>Exile</ZoneLabel>
            <ItemTray
              id="exile"
              label="Exile"
              orientation="vertical"
            >
              {Array.from({ length: 3 }, (_, i) => {
                const coords: Coordinates = { column: i + 1, row: 1 };
                const items = engine.getItemsAt('exile', coords);
                return (
                  <Cell
                    key={i}
                    gridId="exile"
                    coordinates={coords}
                    style={cellStyle}
                  >
                    {items.map((item) => (
                      <CardVisual key={item.id} id={item.id} />
                    ))}
                  </Cell>
                );
              })}
            </ItemTray>
          </div>
        </div>

        {/* Bottom: Hand spanning full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <ZoneLabel>Hand</ZoneLabel>
          <ItemTray id="hand" label="Hand" orientation="horizontal">
            {Array.from({ length: 7 }, (_, i) => {
              const coords: Coordinates = { column: i + 1, row: 1 };
              const items = engine.getItemsAt('hand', coords);
              return (
                <Cell
                  key={i}
                  gridId="hand"
                  coordinates={coords}
                  style={cellStyle}
                >
                  {items.map((item) => (
                    <CardVisual key={item.id} id={item.id} />
                  ))}
                </Cell>
              );
            })}
          </ItemTray>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

function TCGPlaymatStory() {
  return (
    <GridForgeProvider conflictStrategy="stack">
      <TCGPlaymatInner />
    </GridForgeProvider>
  );
}

// ---------------------------------------------------------------------------
// Meta & Story
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'Demos/TCG Playmat (MTG)',
  component: TCGPlaymatStory,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <TCGPlaymatStory />,
};
