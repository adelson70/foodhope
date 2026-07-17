import { Skeleton } from '../../components/ui';

export function HomeProdutoCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-xl border border-operator-border bg-operator-card">
      <div className="flex gap-3 p-3">
        <Skeleton className="size-24 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2 py-0.5">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="mt-2 h-5 w-20" />
        </div>
      </div>
    </article>
  );
}
