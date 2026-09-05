import { Skeleton } from '../../../components/ui';

export function TelaPedidosCardSkeleton() {
  return (
    <article className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-lg bg-success/40 px-1 py-1">
      <Skeleton className="h-[26vh] w-[32vh] bg-surface-container-low/30" />
      <Skeleton className="mt-1 h-[6vh] w-3/4 bg-surface-container-low/30" />
    </article>
  );
}
