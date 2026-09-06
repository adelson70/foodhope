import { LoaderCircle } from 'lucide-react';

import { cn } from '../../lib/cn';

type PullToRefreshIndicatorProps = {
  pullDistance: number;
  refreshing: boolean;
  armed: boolean;
};

export function PullToRefreshIndicator({
  pullDistance,
  refreshing,
  armed,
}: PullToRefreshIndicatorProps) {
  const visible = pullDistance > 0 || refreshing;
  if (!visible) return null;

  const offset = refreshing
    ? 12
    : Math.max(-28, pullDistance - 36);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
      style={{ transform: `translate3d(0, ${offset}px, 0)` }}
      aria-hidden={!refreshing}
      aria-busy={refreshing}
    >
      <div
        className={cn(
          'mt-1 flex size-8 items-center justify-center rounded-full bg-surface-container-low shadow-card',
          armed ? 'text-primary' : 'text-on-surface-variant',
        )}
      >
        <LoaderCircle
          size={16}
          strokeWidth={1.75}
          className={cn(refreshing ? 'animate-spin' : null)}
          style={
            refreshing
              ? undefined
              : {
                  transform: `rotate(${Math.min(240, pullDistance * 2.2)}deg)`,
                }
          }
        />
      </div>
    </div>
  );
}
