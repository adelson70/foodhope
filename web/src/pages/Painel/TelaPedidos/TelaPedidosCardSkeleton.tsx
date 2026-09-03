import { Skeleton } from '../../../components/ui';

export function TelaPedidosCardSkeleton() {
  return (
    <article className="flex flex-col items-center rounded-xl border border-operator-border bg-operator-card px-2 py-2">
      <Skeleton className="h-[8vh] w-[12vh]" />
      <Skeleton className="mt-1 h-[3vh] w-3/4" />
    </article>
  );
}
