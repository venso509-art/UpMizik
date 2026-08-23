import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for providing smooth entrance and fluid slide-out / exit animations for modals.
 * When close is requested, triggers exit animation before invoking the actual onClose callback.
 */
export function useModalCloseAnimation(onClose?: () => void, duration = 220) {
  const [isClosing, setIsClosing] = useState(false);
  const isClosingRef = useRef(false);

  const handleAnimatedClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);

    setTimeout(() => {
      if (onClose) {
        onClose();
      }
      setIsClosing(false);
      isClosingRef.current = false;
    }, duration);
  }, [onClose, duration]);

  // Handle ESC key to trigger animated close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isClosingRef.current) {
        handleAnimatedClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAnimatedClose]);

  return {
    isClosing,
    handleAnimatedClose
  };
}
