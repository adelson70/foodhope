import { Skeleton } from '../../../components/ui';

function KpiSkeleton() {
  return (
    <article className="rounded-xl border border-operator-border bg-operator-card px-4 py-3">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
    </article>
  );
}

function DestaqueSkeleton() {
  return (
    <article className="rounded-xl border border-operator-border bg-operator-card px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Skeleton className="size-4 shrink-0 rounded-full" />
        <Skeleton className="h-3 w-36" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-20" />
      </div>
    </article>
  );
}

function ChartSkeleton() {
  return (
    <article className="rounded-xl border border-operator-border bg-operator-card px-4 py-4">
      <Skeleton className="mb-3 h-5 w-40" />
      <Skeleton className="h-52 w-full rounded-lg" />
    </article>
  );
}

export function DashSkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      aria-busy="true"
      aria-label="Carregando dashboard"
    >
      <div>
        <h1 className="text-title-md font-semibold text-on-surface">
          Dashboard
        </h1>
        <p className="text-caption text-on-surface-variant">
          Resumo do dia com base nos pedidos e leads
        </p>
      </div>

      <section className="grid grid-cols-1 gap-3">
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DestaqueSkeleton />
        <DestaqueSkeleton />
      </section>

      <section className="grid grid-cols-1 gap-3">
        <ChartSkeleton />
        <ChartSkeleton />
      </section>
    </div>
  );
}
