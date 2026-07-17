import { Skeleton } from '../../../components/ui';

export function ConfigSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Carregando configurações"
    >
      <div>
        <h1 className="text-title-md font-semibold text-on-surface">
          Configurações
        </h1>
        <p className="text-caption text-on-surface-variant">
          Redefina seu nome e senha
        </p>
      </div>

      <div className="flex w-full flex-col gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <Skeleton className="mt-2 h-14 w-full rounded-xl" />
      </div>

      <div className="border-t border-operator-border pt-4">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
