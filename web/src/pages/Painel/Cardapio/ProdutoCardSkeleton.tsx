import { Skeleton } from '../../../components/ui';

export function ProdutoCardSkeleton() {
  return (
    <article className="rounded-xl border border-operator-border bg-operator-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="mt-2 h-5 w-20" />
        </div>
        <div className="flex shrink-0 gap-1">
          <Skeleton className="size-10 rounded-lg" />
          <Skeleton className="size-10 rounded-lg" />
        </div>
      </div>
    </article>
  );
}
