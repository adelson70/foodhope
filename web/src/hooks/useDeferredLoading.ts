import { useEffect, useRef, useState } from 'react';

type UseDeferredLoadingOptions = {
  delayMs?: number;
  minDurationMs?: number;
};

export function useDeferredLoading(
  pending: boolean,
  options: UseDeferredLoadingOptions = {},
) {
  const delayMs = options.delayMs ?? 200;
  const minDurationMs = options.minDurationMs ?? 350;
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    let delayTimer: number | undefined;
    let hideTimer: number | undefined;

    if (pending) {
      if (visibleRef.current) return;

      delayTimer = window.setTimeout(() => {
        visibleRef.current = true;
        shownAtRef.current = Date.now();
        setVisible(true);
      }, delayMs);
    } else if (visibleRef.current) {
      const elapsed = Date.now() - (shownAtRef.current ?? Date.now());
      const remaining = Math.max(0, minDurationMs - elapsed);

      hideTimer = window.setTimeout(() => {
        visibleRef.current = false;
        shownAtRef.current = null;
        setVisible(false);
      }, remaining);
    }

    return () => {
      if (delayTimer !== undefined) window.clearTimeout(delayTimer);
      if (hideTimer !== undefined) window.clearTimeout(hideTimer);
    };
  }, [pending, delayMs, minDurationMs]);

  return visible;
}
