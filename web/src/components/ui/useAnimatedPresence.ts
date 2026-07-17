import { useEffect, useState, type AnimationEvent } from 'react';

export function useAnimatedPresence(open: boolean) {
  const [mounted, setMounted] = useState(open);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setExiting(false);
      return;
    }

    if (mounted) {
      setExiting(true);
    }
  }, [open, mounted]);

  function onExitAnimationEnd(event: AnimationEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return;
    if (!exiting) return;
    setMounted(false);
    setExiting(false);
  }

  return { mounted, exiting, onExitAnimationEnd };
}
