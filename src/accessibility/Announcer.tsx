import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import type { Announcement } from './AnnouncementBuilder.ts';

export type AnnounceFn = (announcement: Announcement) => void;

const AnnounceContext = createContext<AnnounceFn | null>(null);

export function useAnnounce(): AnnounceFn {
  const ctx = useContext(AnnounceContext);
  if (!ctx) {
    throw new Error('useAnnounce must be used within an AnnouncerProvider');
  }
  return ctx;
}

interface AnnouncerProviderProps {
  children: ReactNode;
  debounceMs?: number;
}

export const AnnouncerProvider: React.FC<AnnouncerProviderProps> = ({
  children,
  debounceMs = 150,
}) => {
  const [assertiveText, setAssertiveText] = useState('');
  const [politeText, setPoliteText] = useState('');
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const clearTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const doAnnounce = useCallback((text: string, priority: 'assertive' | 'polite') => {
    const setter = priority === 'assertive' ? setAssertiveText : setPoliteText;
    const clearKey = `clear-${priority}`;

    // Clear any existing clear timer
    const existingClear = clearTimers.current.get(clearKey);
    if (existingClear) {
      clearTimeout(existingClear);
    }

    // Set the text (briefly clear then set to force re-announcement of same text)
    setter('');
    requestAnimationFrame(() => {
      setter(text);
    });

    // Clear after 3 seconds to prevent re-announcement on focus
    const timer = setTimeout(() => {
      setter('');
      clearTimers.current.delete(clearKey);
    }, 3000);
    clearTimers.current.set(clearKey, timer);
  }, []);

  const announce = useCallback((announcement: Announcement) => {
    const { text, priority, debounceKey } = announcement;
    if (!text) return;

    if (debounceKey) {
      // Debounce: cancel previous timer for this key, set new one
      const existing = debounceTimers.current.get(debounceKey);
      if (existing) {
        clearTimeout(existing);
      }
      const timer = setTimeout(() => {
        debounceTimers.current.delete(debounceKey);
        doAnnounce(text, priority);
      }, debounceMs);
      debounceTimers.current.set(debounceKey, timer);
    } else {
      // Assertive and non-debounced: fire immediately
      doAnnounce(text, priority);
    }
  }, [debounceMs, doAnnounce]);

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div
        className="gf-announcer"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        <div
          role="status"
          aria-live="assertive"
          aria-atomic="true"
          data-testid="gf-announcer-assertive"
        >
          {assertiveText}
        </div>
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="gf-announcer-polite"
        >
          {politeText}
        </div>
      </div>
    </AnnounceContext.Provider>
  );
};
