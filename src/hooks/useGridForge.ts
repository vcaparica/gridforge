import { useContext } from 'react';
import { GridForgeContext, type GridForgeContextValue } from '../components/GridForgeProvider.tsx';

export function useGridForge(): GridForgeContextValue {
  const ctx = useContext(GridForgeContext);
  if (!ctx) throw new Error('useGridForge must be used within a GridForgeProvider');
  return ctx;
}
