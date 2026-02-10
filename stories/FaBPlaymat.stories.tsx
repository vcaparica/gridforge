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

type FaBCardType = 'hero' | 'weapon' | 'equipment' | 'action' | 'attack' | 'defense';

interface FaBCardDef {
  id: string;
  label: string;
  type: FaBCardType;
  gridId: string;
  position: Coordinates;
  pitch?: number; // 1 = red, 2 = yellow, 3 = blue
}

const FAB_TYPE_COLORS: Record<FaBCardType, string> = {
  hero: '#c0392b',
  weapon: '#7f8c8d',
  equipment: '#8e44ad',
  action: '#d35400',
  attack: '#e74c3c',
  defense: '#2980b9',
};

const PITCH_COLORS: Record<number, string> = {
  1: '#e74c3c', // red
  2: '#f1c40f', // yellow
  3: '#3498db', // blue
};

const FAB_CARDS: FaBCardDef[] = [
  // Hero zone
  { id: 'fab-hero', label: 'Dorinthea Ironsong', type: 'hero', gridId: 'hero-zone', position: { column: 1, row: 1 } },

  // Weapon zones (2 slots each, L and R)
  { id: 'fab-weapon-l', label: 'Dawnblade', type: 'weapon', gridId: 'weapon-left', position: { column: 1, row: 1 } },
  { id: 'fab-weapon-r', label: 'Refraction Bolters', type: 'weapon', gridId: 'weapon-right', position: { column: 1, row: 1 } },

  // Equipment (head, chest, arms, legs)
  { id: 'fab-helm', label: 'Helm of Isen\'s Peak', type: 'equipment', gridId: 'equipment', position: { column: 1, row: 1 } },
  { id: 'fab-chest', label: 'Braveforge Bracers', type: 'equipment', gridId: 'equipment', position: { column: 2, row: 1 } },
  { id: 'fab-arms', label: 'Courage of Bladehold', type: 'equipment', gridId: 'equipment', position: { column: 3, row: 1 } },
  { id: 'fab-legs', label: 'Ironrot Legs', type: 'equipment', gridId: 'equipment', position: { column: 4, row: 1 } },

  // Arsenal
  { id: 'fab-arsenal', label: 'Steelblade Shunt', type: 'defense', gridId: 'arsenal', position: { column: 1, row: 1 }, pitch: 1 },

  // Pitch zone
  { id: 'fab-pitch-1', label: 'Driving Blade', type: 'attack', gridId: 'pitch-zone', position: { column: 1, row: 1 }, pitch: 1 },
  { id: 'fab-pitch-2', label: 'Overpower', type: 'attack', gridId: 'pitch-zone', position: { column: 2, row: 1 }, pitch: 2 },

  // Combat chain
  { id: 'fab-chain-1', label: 'Ironsong Response', type: 'attack', gridId: 'combat-chain', position: { column: 1, row: 1 }, pitch: 1 },

  // Hand
  { id: 'fab-hand-1', label: 'Singing Steelblade', type: 'attack', gridId: 'hand', position: { column: 1, row: 1 }, pitch: 1 },
  { id: 'fab-hand-2', label: 'Glint the Quicksilver', type: 'action', gridId: 'hand', position: { column: 2, row: 1 }, pitch: 3 },
  { id: 'fab-hand-3', label: 'Razor Reflex', type: 'defense', gridId: 'hand', position: { column: 3, row: 1 }, pitch: 2 },
  { id: 'fab-hand-4', label: 'Warrior\'s Valor', type: 'action', gridId: 'hand', position: { column: 4, row: 1 }, pitch: 1 },
];

// ---------------------------------------------------------------------------
// Card visual
// ---------------------------------------------------------------------------

function FaBCard({ id }: { id: string }) {
  const card = FAB_CARDS.find((c) => c.id === id);
  if (!card) return null;

  const typeColor = FAB_TYPE_COLORS[card.type];
  const pitchColor = card.pitch ? PITCH_COLORS[card.pitch] : undefined;

  return (
    <Item id={id} label={card.label} canTap={false}>
      <div
        style={{
          width: 60,
          height: 84,
          borderRadius: 6,
          border: `2px solid ${typeColor}`,
          background: `linear-gradient(180deg, ${typeColor}18, ${typeColor}30)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 4px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Pitch indicator stripe */}
        {pitchColor && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: pitchColor,
            }}
          />
        )}
        <div
          style={{
            fontSize: 7,
            fontWeight: 700,
            color: '#e0e0e0',
            textAlign: 'center',
            lineHeight: 1.2,
            fontFamily: 'system-ui',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            wordBreak: 'break-word',
            marginTop: pitchColor ? 4 : 0,
          }}
        >
          {card.label}
        </div>
        <div
          style={{
            fontSize: 6,
            color: typeColor,
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
// Helper: render cells for a tray
// ---------------------------------------------------------------------------

function TrayCells({
  gridId,
  count,
}: {
  gridId: string;
  count: number;
}) {
  const { engine } = useGridForge();
  const cellStyle = { width: 68, height: 92 };

  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const coords: Coordinates = { column: i + 1, row: 1 };
        const items = engine.getItemsAt(gridId, coords);
        return (
          <Cell key={i} gridId={gridId} coordinates={coords} style={cellStyle}>
            {items.map((item) => (
              <FaBCard key={item.id} id={item.id} />
            ))}
          </Cell>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Inner component
// ---------------------------------------------------------------------------

function FaBPlaymatInner() {
  const { engine } = useGridForge();

  useEffect(() => {
    FAB_CARDS.forEach((card) => {
      engine.addItem(
        {
          id: card.id,
          label: card.label,
          canMove: true,
          canRemove: true,
          canTap: false,
          metadata: { type: card.type, pitch: card.pitch },
        },
        card.gridId,
        card.position,
      );
    });
  }, [engine]);

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <h2
        style={{
          color: '#c0e0c0',
          marginBottom: 8,
          fontFamily: 'system-ui',
          fontWeight: 700,
        }}
      >
        Flesh and Blood Playmat
      </h2>
      <p
        style={{
          color: '#80a880',
          marginBottom: 24,
          fontSize: 13,
          fontFamily: 'system-ui',
        }}
      >
        A simplified FaB play area. Navigate zones with Tab, cards with arrow keys.
        Space/Enter to grab and drop.
      </p>

      {/* Top row: Equipment */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 2fr 1fr 1fr',
          gap: 12,
          marginBottom: 16,
          alignItems: 'start',
        }}
      >
        {/* Weapon Left */}
        <div>
          <ZoneLabel>Weapon L</ZoneLabel>
          <ItemTray id="weapon-left" label="Left weapon zone">
            <TrayCells gridId="weapon-left" count={2} />
          </ItemTray>
        </div>

        {/* Hero */}
        <div>
          <ZoneLabel>Hero</ZoneLabel>
          <ItemTray id="hero-zone" label="Hero zone">
            <TrayCells gridId="hero-zone" count={1} />
          </ItemTray>
        </div>

        {/* Equipment */}
        <div>
          <ZoneLabel>Equipment</ZoneLabel>
          <ItemTray id="equipment" label="Equipment zone">
            <TrayCells gridId="equipment" count={4} />
          </ItemTray>
        </div>

        {/* Weapon Right */}
        <div>
          <ZoneLabel>Weapon R</ZoneLabel>
          <ItemTray id="weapon-right" label="Right weapon zone">
            <TrayCells gridId="weapon-right" count={2} />
          </ItemTray>
        </div>

        {/* Arsenal */}
        <div>
          <ZoneLabel>Arsenal</ZoneLabel>
          <ItemTray id="arsenal" label="Arsenal zone">
            <TrayCells gridId="arsenal" count={1} />
          </ItemTray>
        </div>
      </div>

      {/* Middle row: Combat chain and Pitch zone */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 12,
          marginBottom: 16,
          alignItems: 'start',
        }}
      >
        <div>
          <ZoneLabel>Combat Chain</ZoneLabel>
          <ItemTray id="combat-chain" label="Combat chain">
            <TrayCells gridId="combat-chain" count={5} />
          </ItemTray>
        </div>

        <div>
          <ZoneLabel>Pitch Zone</ZoneLabel>
          <ItemTray id="pitch-zone" label="Pitch zone">
            <TrayCells gridId="pitch-zone" count={3} />
          </ItemTray>
        </div>
      </div>

      {/* Bottom: Hand */}
      <div>
        <ZoneLabel>Hand</ZoneLabel>
        <ItemTray id="hand" label="Hand">
          <TrayCells gridId="hand" count={4} />
        </ItemTray>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

function FaBPlaymatStory() {
  return (
    <GridForgeProvider conflictStrategy="stack">
      <FaBPlaymatInner />
    </GridForgeProvider>
  );
}

// ---------------------------------------------------------------------------
// Meta & Story
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'Demos/FaB Playmat',
  component: FaBPlaymatStory,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <FaBPlaymatStory />,
};
