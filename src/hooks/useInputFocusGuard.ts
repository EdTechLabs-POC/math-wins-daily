import { useCallback, useRef, useEffect } from 'react';

/**
 * Hook to prevent accidental inputs from children
 * - Captures input focus to designated areas
 * - Prevents rapid double-clicks
 * - Debounces touch events
 * - Auto-scrolls to active input area
 */

interface UseInputFocusGuardOptions {
  debounceMs?: number;
  preventDoubleTap?: boolean;
  autoScroll?: boolean;
}

export function useInputFocusGuard(options: UseInputFocusGuardOptions = {}) {
  const { 
    debounceMs = 300, 
    preventDoubleTap = true,
    autoScroll = true 
  } = options;

  const lastInteractionTime = useRef<number>(0);
  const focusedElementRef = useRef<HTMLElement | null>(null);
  const isInteractionLockedRef = useRef(false);

  // Check if interaction should be allowed
  const shouldAllowInteraction = useCallback((): boolean => {
    if (!preventDoubleTap) return true;
    
    const now = Date.now();
    if (now - lastInteractionTime.current < debounceMs) {
      return false;
    }
    lastInteractionTime.current = now;
    return true;
  }, [debounceMs, preventDoubleTap]);

  // Wrap an event handler with debounce protection
  const guardedHandler = useCallback(<T extends (...args: any[]) => void>(
    handler: T
  ): T => {
    return ((...args: Parameters<T>) => {
      if (shouldAllowInteraction()) {
        handler(...args);
      }
    }) as T;
  }, [shouldAllowInteraction]);

  // Lock all interactions temporarily (e.g., during animations)
  const lockInteractions = useCallback((durationMs: number) => {
    isInteractionLockedRef.current = true;
    setTimeout(() => {
      isInteractionLockedRef.current = false;
    }, durationMs);
  }, []);

  // Focus on a specific element
  const focusOn = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    
    focusedElementRef.current = element;
    
    // Auto-scroll into view
    if (autoScroll) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
    
    // Focus the element if it's focusable
    if (element.tabIndex >= 0 || element.tagName === 'INPUT' || element.tagName === 'BUTTON') {
      element.focus({ preventScroll: !autoScroll });
    }
  }, [autoScroll]);

  // Create a focus trap within a container
  const createFocusTrap = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const trapHandler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    container.addEventListener('keydown', trapHandler);
    firstElement?.focus();
    
    return () => {
      container.removeEventListener('keydown', trapHandler);
    };
  }, []);

  // Prevent context menu (right-click menu on desktop, long-press on mobile)
  useEffect(() => {
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };
    
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Prevent text selection during interactions
  const preventSelection = useCallback(() => {
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    
    return () => {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, []);

  return {
    shouldAllowInteraction,
    guardedHandler,
    lockInteractions,
    focusOn,
    createFocusTrap,
    preventSelection,
    isLocked: isInteractionLockedRef.current
  };
}
