import { Skeleton } from '../../components/ui';

export function PedidoLocalCardSkeleton() {
  return (
    <article className="rounded-xl border border-operator-border bg-operator-card p-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-2 h-3 w-24" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </article>
  );
}
