import { cn } from '../../lib/cn';

export const HOME_CATEGORIA_OUTROS = '__outros__';

export function homeCategoriaAnchorId(categoriaId: string) {
  return `home-categoria-${categoriaId}`;
}

export type HomeCategoriaPill = {
  id: string;
  nome: string;
};

type HomeCategoriaPillsProps = {
  pills: HomeCategoriaPill[];
  ativoId: string | null;
  onSelect: (categoriaId: string) => void;
};

export function HomeCategoriaPills({
  pills,
  ativoId,
  onSelect,
}: HomeCategoriaPillsProps) {
  if (pills.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label="Categorias"
      className="-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {pills.map((pill) => {
        const ativo = ativoId === pill.id;
        return (
          <button
            key={pill.id}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onSelect(pill.id)}
            className={cn(
              'h-9 shrink-0 rounded-full px-4 text-caption font-medium whitespace-nowrap transition-colors',
              ativo
                ? 'bg-primary text-on-primary shadow-card'
                : 'bg-surface-container-low text-on-surface-variant shadow-card',
            )}
          >
            {pill.nome}
          </button>
        );
      })}
    </div>
  );
}
