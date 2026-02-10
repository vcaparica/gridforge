import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import '../src/styles/gridforge.css';

import { GridForgeProvider } from '../src/components/GridForgeProvider.tsx';
import { Grid } from '../src/components/Grid.tsx';
import { Cell } from '../src/components/Cell.tsx';
import { Item } from '../src/components/Item.tsx';
import { useGridForge } from '../src/hooks/useGridForge.ts';
import type { Coordinates, ItemState, GridEvent, GridEventType } from '../src/core/types.ts';

// ---------------------------------------------------------------------------
// Item data
// ---------------------------------------------------------------------------

interface DemoItem {
  id: string;
  label: string;
  color: string;
  position: Coordinates;
}

const DEMO_ITEMS: DemoItem[] = [
  { id: 'a11y-sword', label: 'Sword', color: '#718096', position: { column: 1, row: 1 } },
  { id: 'a11y-shield', label: 'Shield', color: '#4299e1', position: { column: 3, row: 1 } },
  { id: 'a11y-potion', label: 'Potion', color: '#e53e3e', position: { column: 2, row: 2 } },
  { id: 'a11y-gem', label: 'Gem', color: '#9f7aea', position: { column: 1, row: 3 } },
  { id: 'a11y-scroll', label: 'Scroll', color: '#d69e2e', position: { column: 3, row: 3 } },
];

// ---------------------------------------------------------------------------
// Log entry type
// ---------------------------------------------------------------------------

interface LogEntry {
  id: number;
  timestamp: string;
  eventType: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Item visual
// ---------------------------------------------------------------------------

function DemoItemVisual({ id }: { id: string }) {
  const item = DEMO_ITEMS.find((i) => i.id === id);
  if (!item) return null;

  return (
    <Item id={id} label={item.label} canTap={false}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 8,
          background: item.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: 12,
          fontFamily: 'system-ui',
        }}
      >
        {item.label}
      </div>
    </Item>
  );
}

// ---------------------------------------------------------------------------
// Announcement observer: watches the live region DOM for mutations
// ---------------------------------------------------------------------------

function useAnnouncementObserver(onAnnouncement: (text: string) => void) {
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    // The GridForge announcer uses a div with role="status" or role="log"
    // and the class "gf-announcer". We observe all such elements.
    const findAnnouncers = () => {
      return document.querySelectorAll('[aria-live], [role="status"], [role="log"], .gf-announcer');
    };

    const handleMutation = (mutations: MutationRecord[]) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          const target = mutation.target as HTMLElement;
          const text = target.textContent?.trim();
          if (text) {
            onAnnouncement(text);
          }
        }
      }
    };

    observerRef.current = new MutationObserver(handleMutation);

    // Observe announcer elements and the whole document body for newly added ones
    const observe = () => {
      const announcers = findAnnouncers();
      announcers.forEach((el) => {
        observerRef.current?.observe(el, {
          childList: true,
          characterData: true,
          subtree: true,
        });
      });
    };

    // Initial observation
    observe();

    // Also observe body for newly added announcers
    const bodyObserver = new MutationObserver(() => {
      observe();
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observerRef.current?.disconnect();
      bodyObserver.disconnect();
    };
  }, [onAnnouncement]);
}

// ---------------------------------------------------------------------------
// Inner component
// ---------------------------------------------------------------------------

function AccessibilityShowcaseInner() {
  const { engine, state } = useGridForge();
  const [log, setLog] = useState<LogEntry[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const entryIdRef = useRef(0);

  // Add items on mount
  useEffect(() => {
    DEMO_ITEMS.forEach((item) => {
      engine.addItem(
        {
          id: item.id,
          label: item.label,
          canMove: true,
          canRemove: true,
          canTap: true,
          metadata: { color: item.color },
        },
        'a11y-grid',
        item.position,
      );
    });
  }, [engine]);

  // Subscribe to engine events for the event log
  useEffect(() => {
    const eventTypes: GridEventType[] = [
      'itemPlaced',
      'itemGrabbed',
      'itemMoved',
      'itemDropped',
      'itemRemoved',
      'itemTapped',
      'itemFlipped',
      'itemTransferred',
      'grabCancelled',
      'moveBlocked',
      'focusMoved',
    ];

    const unsubscribers = eventTypes.map((eventType) =>
      engine.on(eventType, (event: GridEvent) => {
        const now = new Date();
        const timestamp = now.toLocaleTimeString('en-US', { hour12: false });

        let message = `[${eventType}]`;
        if (event.itemId) {
          const item = engine.getItem(event.itemId);
          message += ` ${item?.label ?? event.itemId}`;
        }
        if (event.fromCoords) {
          message += ` from (${event.fromCoords.column},${event.fromCoords.row})`;
        }
        if (event.toCoords) {
          message += ` to (${event.toCoords.column},${event.toCoords.row})`;
        }
        if (event.fromGrid && event.toGrid && event.fromGrid !== event.toGrid) {
          message += ` (${event.fromGrid} -> ${event.toGrid})`;
        }
        if (event.reason) {
          message += ` -- ${event.reason}`;
        }

        entryIdRef.current += 1;
        setLog((prev) => [
          ...prev.slice(-99), // keep last 100 entries
          {
            id: entryIdRef.current,
            timestamp,
            eventType,
            message,
          },
        ]);
      }),
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [engine]);

  // Watch for screen reader announcements in the live region
  const handleAnnouncement = useCallback((text: string) => {
    entryIdRef.current += 1;
    setLog((prev) => [
      ...prev.slice(-99),
      {
        id: entryIdRef.current,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        eventType: 'announcement',
        message: `[SR] "${text}"`,
      },
    ]);
  }, []);

  useAnnouncementObserver(handleAnnouncement);

  // Auto-scroll the log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log]);

  // Current state info
  const focusedGridId = state.focusedGridId;
  const focusedCell = state.focusedCell;
  const mode = state.mode;
  const grabbedItemId = state.grabbedItemId;
  const grabbedItem = grabbedItemId ? state.items.get(grabbedItemId) : undefined;

  return (
    <div style={{ padding: 32, fontFamily: 'system-ui', display: 'flex', gap: 32, minHeight: '80vh' }}>
      {/* Left: grid and status */}
      <div style={{ flex: '0 0 auto' }}>
        <h2 style={{ color: '#e2e8f0', marginBottom: 8 }}>
          Accessibility Showcase
        </h2>
        <p style={{ color: '#a0aec0', marginBottom: 24, fontSize: 13, maxWidth: 360 }}>
          Interact with the 3x3 grid below. All screen reader announcements and
          engine events are logged in the panel on the right, helping sighted
          developers verify accessible behavior.
        </p>

        <Grid
          id="a11y-grid"
          columns={3}
          rows={3}
          label="Accessibility demo grid"
          description="A 3 by 3 grid with items for testing accessibility"
          renderCell={(coords: Coordinates, items: ItemState[]) => (
            <Cell
              gridId="a11y-grid"
              coordinates={coords}
              style={{ width: 72, height: 72 }}
            >
              {items.map((item) => (
                <DemoItemVisual key={item.id} id={item.id} />
              ))}
            </Cell>
          )}
        />

        {/* Status panel */}
        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: 13,
            color: '#cbd5e0',
            lineHeight: 1.8,
          }}
        >
          <div>
            <strong>Mode:</strong>{' '}
            <span
              style={{
                color: mode === 'grabbing' ? '#fbd38d' : '#68d391',
                fontWeight: 600,
              }}
            >
              {mode}
            </span>
          </div>
          <div>
            <strong>Focus:</strong>{' '}
            {focusedGridId && focusedCell
              ? `Grid "${focusedGridId}" at (${focusedCell.column}, ${focusedCell.row})`
              : 'None'}
          </div>
          <div>
            <strong>Grabbed:</strong>{' '}
            {grabbedItem
              ? `"${grabbedItem.label}" (${grabbedItem.id})`
              : 'None'}
          </div>
        </div>

        {/* Keyboard reference */}
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.06)',
            fontSize: 11,
            color: '#718096',
            lineHeight: 1.8,
          }}
        >
          <div><strong style={{ color: '#a0aec0' }}>Keyboard Controls:</strong></div>
          <div>Arrow keys = Navigate cells</div>
          <div>Space / Enter = Grab / Drop item</div>
          <div>Escape = Cancel grab</div>
          <div>T = Tap (rotate) item</div>
          <div>F = Flip item face-down/up</div>
          <div>Delete = Remove item</div>
        </div>
      </div>

      {/* Right: transcript panel */}
      <div
        style={{
          flex: '1 1 0',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 300,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <h3 style={{ color: '#e2e8f0', margin: 0, fontSize: 16 }}>
            Event &amp; Announcement Log
          </h3>
          <button
            onClick={() => setLog([])}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              color: '#a0aec0',
              cursor: 'pointer',
              fontFamily: 'system-ui',
            }}
          >
            Clear
          </button>
        </div>

        <div
          ref={logContainerRef}
          style={{
            flex: 1,
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: 12,
            overflowY: 'auto',
            fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
            fontSize: 11,
            lineHeight: 1.7,
            minHeight: 400,
          }}
        >
          {log.length === 0 && (
            <div style={{ color: '#4a5568', fontStyle: 'italic' }}>
              Interact with the grid to see events and announcements here...
            </div>
          )}
          {log.map((entry) => {
            let color = '#a0aec0';
            if (entry.eventType === 'announcement') color = '#68d391';
            else if (entry.eventType === 'itemGrabbed') color = '#fbd38d';
            else if (entry.eventType === 'itemDropped') color = '#63b3ed';
            else if (entry.eventType === 'moveBlocked') color = '#fc8181';
            else if (entry.eventType === 'focusMoved') color = '#718096';
            else if (entry.eventType === 'itemTapped') color = '#b794f4';

            return (
              <div key={entry.id} style={{ color }}>
                <span style={{ color: '#4a5568' }}>{entry.timestamp}</span>{' '}
                {entry.message}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

function AccessibilityShowcaseStory() {
  return (
    <GridForgeProvider conflictStrategy="swap">
      <AccessibilityShowcaseInner />
    </GridForgeProvider>
  );
}

// ---------------------------------------------------------------------------
// Meta & Story
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'Demos/Accessibility Showcase',
  component: AccessibilityShowcaseStory,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <AccessibilityShowcaseStory />,
};
