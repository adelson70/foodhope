import { useEffect, useRef } from 'react';

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
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;
  const busyRef = useRef(false);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!enabled || !node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || busyRef.current) return;

        busyRef.current = true;
        Promise.resolve(onLoadMoreRef.current()).finally(() => {
          busyRef.current = false;
        });
      },
      { root: findScrollRoot(node), rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return sentinelRef;
}
