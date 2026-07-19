import { useCallback, useEffect, useRef, useState } from 'react';

type UseInfiniteScrollOptions = {
  enabled: boolean;
  onLoadMore: () => void | Promise<void>;
  rootMargin?: string;
};

function findScrollRoot(node: Element | null): Element | null {
  let current = node?.parentElement ?? null;
  while (current) {
    if (current.hasAttribute('data-scroll-root')) return current;
    current = current.parentElement;
  }
  return null;
}

export function useInfiniteScroll({
  enabled,
  onLoadMore,
  rootMargin = '240px',
}: UseInfiniteScrollOptions) {
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    setSentinel(node);
  }, []);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;
  const busyRef = useRef(false);

  useEffect(() => {
    if (!enabled || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || busyRef.current) return;

        busyRef.current = true;
        Promise.resolve(onLoadMoreRef.current()).finally(() => {
          busyRef.current = false;
        });
      },
      { root: findScrollRoot(sentinel), rootMargin },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, sentinel, rootMargin]);

  return sentinelRef;
}
