import { cn } from '../../lib/cn';

type IngredienteDisponivel = {
  id: string;
  nome: string;
};

type HomeProdutoRetirarProps = {
  disponiveis: IngredienteDisponivel[];
  selecionados: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
};

export function HomeProdutoRetirar({
  disponiveis,
  selecionados,
  onToggle,
  disabled = false,
}: HomeProdutoRetirarProps) {
  if (disponiveis.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <p className="text-subtitle-md text-on-surface">Retirar</p>
        <p className="text-caption text-on-surface-variant">
          Marque o que não quer no lanche
        </p>
      </div>

      <ul className="overflow-hidden rounded-xl border border-operator-border bg-operator-card">
        {disponiveis.map((ingrediente, index) => {
          const marcado = selecionados.includes(ingrediente.id);

          return (
            <li
              key={ingrediente.id}
              className={index > 0 ? 'border-t border-operator-border' : undefined}
            >
              <label
                className={cn(
                  'flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2.5',
                  disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                <input
                  type="checkbox"
                  className="size-5 shrink-0 accent-primary"
                  checked={marcado}
                  disabled={disabled}
                  onChange={() => onToggle(ingrediente.id)}
                />
                <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">
                  {ingrediente.nome}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
