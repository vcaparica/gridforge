import {
  createContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { GridEngine } from '../core/GridEngine.ts';
import type {
  ConflictStrategy,
  EngineState,
  GridEvent,
  GridEventType,
} from '../core/types.ts';
import type { MessageCatalog } from '../accessibility/MessageCatalog.ts';
import { DEFAULT_MESSAGES } from '../accessibility/MessageCatalog.ts';
import { AnnouncementBuilder } from '../accessibility/AnnouncementBuilder.ts';
import type { Announcement } from '../accessibility/AnnouncementBuilder.ts';
import { AnnouncerProvider, useAnnounce } from '../accessibility/Announcer.tsx';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface GridForgeContextValue {
  engine: GridEngine;
  state: EngineState;
  announce: (announcement: Announcement) => void;
  messageCatalog: MessageCatalog;
}

export const GridForgeContext = createContext<GridForgeContextValue | null>(null);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GridForgeProviderProps {
  children: ReactNode;
  conflictStrategy?: ConflictStrategy;
  messages?: Partial<MessageCatalog>;
  announceDelay?: number;
  onItemMoved?: (event: GridEvent) => void;
  onItemDropped?: (event: GridEvent) => void;
  onItemRemoved?: (event: GridEvent) => void;
  onItemGrabbed?: (event: GridEvent) => void;
  onItemTapped?: (event: GridEvent) => void;
  onItemFlipped?: (event: GridEvent) => void;
  onItemTransferred?: (event: GridEvent) => void;
  onGrabCancelled?: (event: GridEvent) => void;
}

// ---------------------------------------------------------------------------
// Event types we subscribe to (all of them)
// ---------------------------------------------------------------------------

const ALL_EVENT_TYPES: GridEventType[] = [
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
  'stackSelectionChanged',
  'gridRegistered',
  'gridUnregistered',
  'gridRenderStateChanged',
];

// ---------------------------------------------------------------------------
// State reducer — a simple version counter to force re-renders
// ---------------------------------------------------------------------------

interface ReducerState {
  version: number;
  snapshot: EngineState;
}

type ReducerAction = { type: 'sync'; snapshot: EngineState };

function stateReducer(_prev: ReducerState, action: ReducerAction): ReducerState {
  switch (action.type) {
    case 'sync':
      return { version: _prev.version + 1, snapshot: action.snapshot };
    default:
      return _prev;
  }
}

// ---------------------------------------------------------------------------
// Snapshot builder
// ---------------------------------------------------------------------------

function takeSnapshot(engine: GridEngine): EngineState {
  const engineState = engine.getState();

  // Deep-copy item states so that React's referential equality checks
  // (e.g. useMemo deps in useItem) detect mutations like tapAngle changes.
  const itemsCopy = new Map<string, import('../core/types.ts').ItemState>();
  for (const [id, item] of engineState.items) {
    itemsCopy.set(id, {
      ...item,
      coordinates: { column: item.coordinates.column, row: item.coordinates.row },
      metadata: { ...item.metadata },
    });
  }

  // Deep-copy grid states so that cell mutations (itemIds changes, isBlocked
  // toggles) are detected by React's referential equality checks.
  const gridsCopy = new Map<string, import('../core/types.ts').GridState>();
  for (const [gridId, grid] of engineState.grids) {
    const cellsCopy = new Map<string, import('../core/types.ts').CellState>();
    for (const [cellKey, cell] of grid.cells) {
      cellsCopy.set(cellKey, {
        coordinates: { column: cell.coordinates.column, row: cell.coordinates.row },
        itemIds: [...cell.itemIds],
        isDropTarget: cell.isDropTarget,
        isBlocked: cell.isBlocked,
        metadata: { ...cell.metadata },
      });
    }
    gridsCopy.set(gridId, {
      config: { ...grid.config },
      cells: cellsCopy,
      itemIds: new Set(grid.itemIds),
      isRendered: grid.isRendered,
    });
  }

  return {
    grids: gridsCopy,
    items: itemsCopy,
    focusedGridId: engineState.focusedGridId,
    focusedCell: engineState.focusedCell
      ? { column: engineState.focusedCell.column, row: engineState.focusedCell.row }
      : null,
    grabbedItemId: engineState.grabbedItemId,
    grabbedFromGrid: engineState.grabbedFromGrid,
    grabbedFromCoords: engineState.grabbedFromCoords
      ? { column: engineState.grabbedFromCoords.column, row: engineState.grabbedFromCoords.row }
      : null,
    mode: engineState.mode,
    activeDropTargetGridId: engineState.activeDropTargetGridId,
    selectedStackIndex: engineState.selectedStackIndex,
  };
}

// ---------------------------------------------------------------------------
// Callback map — maps event types to prop callback names
// ---------------------------------------------------------------------------

const EVENT_TO_CALLBACK: Partial<Record<GridEventType, keyof GridForgeProviderProps>> = {
  itemMoved: 'onItemMoved',
  itemDropped: 'onItemDropped',
  itemRemoved: 'onItemRemoved',
  itemGrabbed: 'onItemGrabbed',
  itemTapped: 'onItemTapped',
  itemFlipped: 'onItemFlipped',
  itemTransferred: 'onItemTransferred',
  grabCancelled: 'onGrabCancelled',
};

// ---------------------------------------------------------------------------
// Outer component: wraps children in AnnouncerProvider
// ---------------------------------------------------------------------------

export const GridForgeProvider: React.FC<GridForgeProviderProps> = (props) => {
  return (
    <AnnouncerProvider debounceMs={props.announceDelay}>
      <GridForgeProviderInner {...props} />
    </AnnouncerProvider>
  );
};

// ---------------------------------------------------------------------------
// Inner component: has access to useAnnounce() and wires everything up
// ---------------------------------------------------------------------------

const GridForgeProviderInner: React.FC<GridForgeProviderProps> = ({
  children,
  conflictStrategy = 'block',
  messages,
  onItemMoved,
  onItemDropped,
  onItemRemoved,
  onItemGrabbed,
  onItemTapped,
  onItemFlipped,
  onItemTransferred,
  onGrabCancelled,
}) => {
  const announce = useAnnounce();

  // -- Engine (recreated only when conflictStrategy changes) ----------------
  const engine = useMemo(
    () => new GridEngine({ conflictStrategy }),
    [conflictStrategy],
  );

  // -- Message catalog (merged defaults + overrides) ------------------------
  const messageCatalog = useMemo<MessageCatalog>(
    () => ({ ...DEFAULT_MESSAGES, ...messages }),
    [messages],
  );

  // -- Announcement builder (recreated when catalog changes) ----------------
  const announcementBuilder = useMemo(
    () => new AnnouncementBuilder(messageCatalog),
    [messageCatalog],
  );

  // -- State reducer --------------------------------------------------------
  const [reducerState, dispatch] = useReducer(stateReducer, engine, (eng) => ({
    version: 0,
    snapshot: takeSnapshot(eng),
  }));

  // -- Stable ref for developer callbacks so subscription doesn't re-fire ---
  const callbacksRef = useRef({
    onItemMoved,
    onItemDropped,
    onItemRemoved,
    onItemGrabbed,
    onItemTapped,
    onItemFlipped,
    onItemTransferred,
    onGrabCancelled,
  });
  callbacksRef.current = {
    onItemMoved,
    onItemDropped,
    onItemRemoved,
    onItemGrabbed,
    onItemTapped,
    onItemFlipped,
    onItemTransferred,
    onGrabCancelled,
  };

  // -- Stable ref for announce and builder so we don't re-subscribe ---------
  const announceRef = useRef(announce);
  announceRef.current = announce;

  const builderRef = useRef(announcementBuilder);
  builderRef.current = announcementBuilder;

  // -- Subscribe to all engine events ---------------------------------------
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    for (const eventType of ALL_EVENT_TYPES) {
      const unsub = engine.on(eventType, (event: GridEvent) => {
        // 1. Sync React state with a fresh snapshot
        dispatch({ type: 'sync', snapshot: takeSnapshot(engine) });

        // 2. Build and fire a screen-reader announcement
        const announcement = builderRef.current.build(event, engine);
        if (announcement.text) {
          announceRef.current(announcement);
        }

        // 3. Fire the developer callback (if provided)
        const callbackKey = EVENT_TO_CALLBACK[event.type];
        if (callbackKey) {
          const cb = callbacksRef.current[callbackKey as keyof typeof callbacksRef.current];
          if (typeof cb === 'function') {
            (cb as (event: GridEvent) => void)(event);
          }
        }
      });

      unsubscribers.push(unsub);
    }

    // Cleanup: unsubscribe from all events on unmount
    return () => {
      for (const unsub of unsubscribers) {
        unsub();
      }
    };
  }, [engine]);

  // -- Context value (stable unless state version or engine changes) --------
  const contextValue = useMemo<GridForgeContextValue>(
    () => ({
      engine,
      state: reducerState.snapshot,
      announce,
      messageCatalog,
    }),
    [engine, reducerState.snapshot, announce, messageCatalog],
  );

  return (
    <GridForgeContext.Provider value={contextValue}>
      {children}
    </GridForgeContext.Provider>
  );
};
