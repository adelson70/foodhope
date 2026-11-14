import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

import { Drawer, Input } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import type { Categoria } from '../../../services/types';

const PAGINA = 30;

type CategoriaPickerFieldProps = {
  id?: string;
  value: string | null;
  categorias: Categoria[];
  onChange: (categoriaId: string | null) => void;
  disabled?: boolean;
};

type Opcao = { id: string | null; nome: string };

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Campo de categoria: mostra a escolhida e abre um drawer de baixo com busca e
 * lista carregada aos poucos conforme a rolagem. "Outros" = sem categoria.
 */
export function CategoriaPickerField({
  id,
  value,
  categorias,
  onChange,
  disabled = false,
}: CategoriaPickerFieldProps) {
  const [aberto, setAberto] = useState(false);
  const atual = categorias.find((item) => item.id === value);

  return (
    <>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setAberto(true)}
        className="input-focus-ring flex w-full items-center justify-between gap-2 rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-3 text-left text-body-md text-on-surface transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">{atual?.nome ?? 'Outros'}</span>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          className="shrink-0 text-on-surface-variant"
        />
      </button>

      {createPortal(
        <Drawer
          open={aberto}
          title="Categoria"
          onClose={() => setAberto(false)}
          variant="sheet"
        >
          <CategoriaLista
            value={value}
            categorias={categorias}
            onSelecionar={(proximo) => {
              onChange(proximo);
              setAberto(false);
            }}
          />
        </Drawer>,
        document.body,
      )}
    </>
  );
}

function CategoriaLista({
  value,
  categorias,
  onSelecionar,
}: {
  value: string | null;
  categorias: Categoria[];
  onSelecionar: (categoriaId: string | null) => void;
}) {
  const [busca, setBusca] = useState('');
  const [limite, setLimite] = useState(PAGINA);
  const fimRef = useRef<HTMLLIElement>(null);

  const termo = normalizar(busca);
  const opcoes: Opcao[] = [
    { id: null, nome: 'Outros' },
    ...categorias.map((item) => ({ id: item.id, nome: item.nome })),
  ].filter((item) => !termo || normalizar(item.nome).includes(termo));
  const visiveis = opcoes.slice(0, limite);
  const temMais = opcoes.length > visiveis.length;

  useEffect(() => {
    const fim = fimRef.current;
    if (!fim || !temMais) return;
    const observer = new IntersectionObserver((entradas) => {
      if (entradas.some((entrada) => entrada.isIntersecting)) {
        setLimite((atual) => atual + PAGINA);
      }
    });
    observer.observe(fim);
    return () => observer.disconnect();
  }, [temMais, limite]);

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        placeholder="Buscar categoria…"
        aria-label="Buscar categoria"
        leftIcon={<Search size={17} strokeWidth={1.75} />}
        value={busca}
        onChange={(event) => {
          setBusca(event.target.value);
          setLimite(PAGINA);
        }}
      />

      {opcoes.length === 0 ? (
        <p className="py-6 text-center text-caption text-on-surface-variant">
          Nenhuma categoria encontrada
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {visiveis.map((opcao) => {
            const selecionada = opcao.id === value;
            return (
              <li key={opcao.id ?? 'outros'}>
                <button
                  type="button"
                  onClick={() => onSelecionar(opcao.id)}
                  className={cn(
                    'flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-body-md transition-colors',
                    selecionada
                      ? 'bg-primary-container/20 text-on-surface'
                      : 'text-on-surface hover:bg-on-surface/5',
                  )}
                >
                  <span className="min-w-0 truncate">
                    {opcao.nome}
                    {opcao.id === null ? (
                      <span className="block text-caption text-on-surface-variant">
                        Sem categoria
                      </span>
                    ) : null}
                  </span>
                  {selecionada ? (
                    <Check
                      size={18}
                      strokeWidth={2}
                      className="shrink-0 text-primary"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
          {temMais ? <li ref={fimRef} aria-hidden className="h-6" /> : null}
        </ul>
      )}
    </div>
  );
}
