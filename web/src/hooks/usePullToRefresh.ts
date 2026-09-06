import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

const THRESHOLD_PX = 72;
const MAX_PULL_PX = 96;
const ACTIVATE_PX = 14;
const HORIZONTAL_LOCK_PX = 10;

type UsePullToRefreshOptions = {
  onRefresh: () => void | Promise<void>;
  enabled?: boolean;
};

export type PullToRefreshState = {
  pullDistance: number;
  refreshing: boolean;
  armed: boolean;
};

export const PULL_REFRESH_EVENT = 'foodhope:pull-refresh';

export function emitPullRefresh() {
  window.dispatchEvent(new CustomEvent(PULL_REFRESH_EVENT));
}

type GestureMode = 'idle' | 'pending' | 'pulling' | 'scrolling';

export function usePullToRefresh(
  scrollRef: RefObject<HTMLElement | null>,
  options: UsePullToRefreshOptions,
): PullToRefreshState {
  const { onRefresh, enabled = true } = options;
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const modeRef = useRef<GestureMode>('idle');
  const pullDistanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const rafRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const setPullVisual = useCallback((distance: number) => {
    pullDistanceRef.current = distance;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      setPullDistance(pullDistanceRef.current);
    });
  }, []);

  const resetPull = useCallback(() => {
    modeRef.current = 'idle';
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    pullDistanceRef.current = 0;
    setPullDistance(0);
  }, []);

  const runRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    modeRef.current = 'idle';
    setRefreshing(true);
    setPullDistance(THRESHOLD_PX * 0.55);
    pullDistanceRef.current = THRESHOLD_PX * 0.55;
    try {
      await onRefreshRef.current();
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
      resetPull();
    }
  }, [resetPull]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled) return;

    function onTouchStart(event: TouchEvent) {
      if (refreshingRef.current || event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (!touch) return;

      if (el.scrollTop > 1) {
        modeRef.current = 'scrolling';
        return;
      }

      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      modeRef.current = 'pending';
    }

    function onTouchMove(event: TouchEvent) {
      if (refreshingRef.current || event.touches.length !== 1) return;
      const mode = modeRef.current;
      if (mode === 'idle' || mode === 'scrolling') return;

      const touch = event.touches[0];
      if (!touch) return;

      if (el.scrollTop > 1) {
        modeRef.current = 'scrolling';
        if (pullDistanceRef.current > 0) resetPull();
        return;
      }

      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;

      if (mode === 'pending') {
        if (
          Math.abs(deltaX) > HORIZONTAL_LOCK_PX &&
          Math.abs(deltaX) > Math.abs(deltaY)
        ) {
          modeRef.current = 'scrolling';
          return;
        }

        if (deltaY < -HORIZONTAL_LOCK_PX) {
          modeRef.current = 'scrolling';
          return;
        }

        if (deltaY < ACTIVATE_PX) return;

        modeRef.current = 'pulling';
      }

      if (modeRef.current !== 'pulling') return;

      if (deltaY <= 0) {
        resetPull();
        modeRef.current = 'pending';
        return;
      }

      const dampened = Math.min(MAX_PULL_PX, (deltaY - ACTIVATE_PX) * 0.38);
      setPullVisual(dampened);

      if (event.cancelable) {
        event.preventDefault();
      }
    }

    function onTouchEnd() {
      if (refreshingRef.current) return;
      const distance = pullDistanceRef.current;
      const wasPulling = modeRef.current === 'pulling';
      modeRef.current = 'idle';

      if (wasPulling && distance >= THRESHOLD_PX) {
        void runRefresh();
        return;
      }

      if (distance > 0) resetPull();
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [scrollRef, enabled, resetPull, runRefresh, setPullVisual]);

  return {
    pullDistance,
    refreshing,
    armed: pullDistance >= THRESHOLD_PX || refreshing,
  };
}
