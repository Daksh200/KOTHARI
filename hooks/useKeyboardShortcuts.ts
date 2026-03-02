'use client';

import { useEffect } from 'react';

interface Shortcut {
  /** examples: 'f', 'Enter', 'Escape', 'Control+1', 'Meta+P', 'Shift+F1' */
  key: string;
  handler: (e: KeyboardEvent) => void;
}

function matchCombo(e: KeyboardEvent, combo: string) {
  const parts = combo.split('+').map((s) => s.trim());
  const hasControl = parts.includes('Control');
  const hasShift = parts.includes('Shift');
  const hasAlt = parts.includes('Alt');
  const hasMeta = parts.includes('Meta');

  if (hasControl && !e.ctrlKey) return false;
  if (!hasControl && e.ctrlKey && parts.some((p) => p === 'Control') === false && false) {
    // noop - kept for readability
  }
  if (hasShift && !e.shiftKey) return false;
  if (hasAlt && !e.altKey) return false;
  if (hasMeta && !e.metaKey) return false;

  // find the non-modifier token
  const keyToken = parts.slice().reverse().find((p) => !['Control', 'Shift', 'Alt', 'Meta'].includes(p));
  if (!keyToken) return false;

  if (keyToken.length === 1) {
    return e.key.toLowerCase() === keyToken.toLowerCase();
  }
  return e.key === keyToken;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.repeat) return;
      for (const s of shortcuts) {
        try {
          if (matchCombo(e, s.key)) {
            e.preventDefault();
            s.handler(e);
            break;
          }
        } catch (_) {
          // ignore malformed combos
        }
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [shortcuts]);
}
