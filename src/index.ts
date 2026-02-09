// Components
export { GridForgeProvider } from './components/GridForgeProvider.tsx';
export { GridForgeContext } from './components/GridForgeProvider.tsx';
export type { GridForgeContextValue } from './components/GridForgeProvider.tsx';
export { Grid } from './components/Grid.tsx';
export type { GridProps } from './components/Grid.tsx';
export { Cell } from './components/Cell.tsx';
export type { CellProps } from './components/Cell.tsx';
export { Item } from './components/Item.tsx';
export type { ItemProps } from './components/Item.tsx';
export { ItemTray } from './components/ItemTray.tsx';
export type { ItemTrayProps, ElasticMode } from './components/ItemTray.tsx';
export { HelpDialog } from './components/HelpDialog.tsx';
export type { HelpDialogProps } from './components/HelpDialog.tsx';
export { ContextMenu } from './components/ContextMenu.tsx';
export type { ContextMenuAction, ContextMenuProps } from './components/ContextMenu.tsx';

// Hooks
export { useGridForge } from './hooks/useGridForge.ts';
export { useGrid } from './hooks/useGrid.ts';
export { useCell } from './hooks/useCell.ts';
export { useItem } from './hooks/useItem.ts';
export { useDragState } from './hooks/useDragState.ts';
export { useAnnounce } from './hooks/useAnnounce.ts';
export { useGridKeyboard } from './hooks/useGridKeyboard.ts';

// Visual
export { DragOverlay } from './visual/DragOverlay.tsx';
export { DropIndicator } from './visual/DropIndicator.tsx';
export { GridLines } from './visual/GridLines.tsx';

// Core (for advanced usage)
export { GridEngine } from './core/GridEngine.ts';
export { TapSystem } from './core/TapSystem.ts';
export { CoordinateSystem } from './core/CoordinateSystem.ts';

// Accessibility (for advanced usage)
export { AnnouncementBuilder } from './accessibility/AnnouncementBuilder.ts';
export type { Announcement } from './accessibility/AnnouncementBuilder.ts';
export { AriaPropsBuilder } from './accessibility/AriaPropsBuilder.ts';
export { resolveKeyAction } from './accessibility/KeyboardHandler.ts';
export type { KeyAction } from './accessibility/KeyboardHandler.ts';
export { DEFAULT_MESSAGES, interpolate } from './accessibility/MessageCatalog.ts';
export type { MessageCatalog } from './accessibility/MessageCatalog.ts';
export { AnnouncerProvider } from './accessibility/Announcer.tsx';

// Types
export type {
  Coordinates,
  TapAngle,
  TapState,
  ItemState,
  CellState,
  GridType,
  GridConfig,
  GridState,
  InteractionMode,
  EngineState,
  ConflictStrategy,
  ConflictResolver,
  ConflictResolution,
  GridEventType,
  GridEvent,
  Direction,
  Result,
  MoveResult,
  GridEngineReadonly,
  StackDisplay,
} from './core/types.ts';

// Styles: import directly from 'gridforge/styles/gridforge.css'
// Themes: import from 'gridforge/styles/themes/theme-felt.css' etc.
