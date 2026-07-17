import { type RefObject, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const THRESHOLD = 6;
const TOP_EDGE = 8;

export function useHideOnScrollDown(
  scrollRef: RefObject<HTMLElement | null>,
): boolean {
  const { pathname } = useLocation();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const hiddenRef = useRef(false);

  useEffect(() => {
    hiddenRef.current = false;
    setHidden(false);
    lastY.current = scrollRef.current?.scrollTop ?? 0;
  }, [pathname, scrollRef]);

  useEffect(() => {
    const onScroll = (event: Event) => {
      const el = scrollRef.current;
      if (!el || event.target !== el) return;

      const y = el.scrollTop;
      const delta = y - lastY.current;
      lastY.current = y;

      let next = hiddenRef.current;
      if (y < TOP_EDGE) {
        next = false;
      } else if (delta > THRESHOLD) {
        next = true;
      } else if (delta < -THRESHOLD) {
        next = false;
      }

      if (next === hiddenRef.current) return;
      hiddenRef.current = next;
      setHidden(next);
    };

    lastY.current = scrollRef.current?.scrollTop ?? 0;
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [scrollRef]);

  return hidden;
}
