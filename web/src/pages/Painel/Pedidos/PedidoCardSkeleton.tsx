import { Skeleton } from '../../../components/ui';

export function PedidoCardSkeleton() {
  return (
    <article className="rounded-xl border border-operator-border bg-operator-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="mt-2 h-5 w-20" />
        </div>
        <Skeleton className="size-10 shrink-0 rounded-lg" />
      </div>
    </article>
  );
}
