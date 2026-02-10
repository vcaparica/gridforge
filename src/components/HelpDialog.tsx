import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function HelpDialog({
  isOpen,
  onClose,
  returnFocusRef,
}: HelpDialogProps): ReactNode {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<Element | null>(null);

  // Capture the element that had focus before the dialog opened
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement;
    }
  }, [isOpen]);

  // Focus the close button on open; restore focus on close
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    } else {
      // Return focus when dialog closes
      const returnTarget = returnFocusRef?.current ?? previouslyFocusedRef.current;
      if (returnTarget && returnTarget instanceof HTMLElement) {
        returnTarget.focus();
      }
    }
  }, [isOpen, returnFocusRef]);

  // Block body scrolling while the dialog is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Focus trap and Escape handling
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="gf-help-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      ref={dialogRef}
    >
      <button
        ref={closeButtonRef}
        className="gf-help-dialog__close"
        aria-label="Close"
        onClick={onClose}
        type="button"
      >
        &times;
      </button>

      <h2>Keyboard Shortcuts</h2>

      <section>
        <h3>Navigation Mode</h3>
        <dl>
          <dt>Arrow Keys</dt>
          <dd>Move focus between cells</dd>

          <dt>Enter / Space</dt>
          <dd>Grab the item in the focused cell</dd>

          <dt>Delete</dt>
          <dd>Remove the item in the focused cell</dd>

          <dt>Home</dt>
          <dd>Move focus to the first cell in the current row</dd>

          <dt>End</dt>
          <dd>Move focus to the last cell in the current row</dd>

          <dt>Ctrl+Home</dt>
          <dd>Move focus to the first cell in the grid</dd>

          <dt>Ctrl+End</dt>
          <dd>Move focus to the last cell in the grid</dd>

          <dt>?</dt>
          <dd>Open this help dialog</dd>

          <dt>F10</dt>
          <dd>Open context menu for the focused item</dd>
        </dl>
      </section>

      <section>
        <h3>Grab Mode</h3>
        <dl>
          <dt>Arrow Keys</dt>
          <dd>Move the grabbed item to an adjacent cell</dd>

          <dt>Enter</dt>
          <dd>Drop the item in the current cell</dd>

          <dt>Escape</dt>
          <dd>Cancel the move and return the item</dd>

          <dt>Tab / Shift+Tab</dt>
          <dd>Cycle the target grid (for cross-grid transfers)</dd>

          <dt>Home</dt>
          <dd>Move the grabbed item to the first cell in the row</dd>

          <dt>End</dt>
          <dd>Move the grabbed item to the last cell in the row</dd>
        </dl>
      </section>

      <section>
        <h3>Card Actions</h3>
        <dl>
          <dt>T</dt>
          <dd>Tap (rotate) the focused item clockwise</dd>

          <dt>Shift+T</dt>
          <dd>Tap (rotate) the focused item counterclockwise</dd>

          <dt>F</dt>
          <dd>Flip the focused item (toggle face up / face down)</dd>
        </dl>
      </section>
    </div>,
    document.body,
  );
}
