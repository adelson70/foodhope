import { Skeleton } from '../../components/ui';

export function HomeProdutoCardSkeleton() {
  return (
    <article className="flex items-center gap-3 rounded-xl bg-surface-container-low p-2">
      <Skeleton className="size-20 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-36 max-w-[60%]" />
          <Skeleton className="h-5 w-16 shrink-0" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
    </article>
  );
}
