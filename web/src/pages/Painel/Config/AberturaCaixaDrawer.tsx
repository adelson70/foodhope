import { useState, type FormEvent } from 'react';

import {
  Button,
  CurrencyInput,
  Drawer,
  Label,
  Textarea,
} from '../../../components/ui';

const FORM_ID = 'abertura-caixa-form';

type AberturaCaixaDrawerProps = {
  open: boolean;
  busy: boolean;
  /** Último valor usado, para sugerir o mesmo troco. */
  sugestao?: number;
  onClose: () => void;
  onConfirmar: (dados: { fundo_troco: number; observacao?: string }) => void;
};

/** Pergunta o dinheiro no caixa antes de abrir a cozinha (sheet no celular, modal no desktop). */
export function AberturaCaixaDrawer({
  open,
  busy,
  sugestao,
  onClose,
  onConfirmar,
}: AberturaCaixaDrawerProps) {
  return (
    <Drawer
      open={open}
      title="Abrir caixa"
      variant="dialog"
      onClose={busy ? () => undefined : onClose}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button type="submit" form={FORM_ID} fullWidth disabled={busy}>
            {busy ? 'Abrindo…' : 'Abrir cozinha'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </Button>
        </div>
      }
    >
      <AberturaCaixaForm
        key={open ? 'aberto' : 'fechado'}
        busy={busy}
        sugestao={sugestao}
        onConfirmar={onConfirmar}
      />
    </Drawer>
  );
}

/** Remontado a cada abertura (via `key`), então começa com a sugestão e sem observação. */
function AberturaCaixaForm({
  busy,
  sugestao,
  onConfirmar,
}: Pick<AberturaCaixaDrawerProps, 'busy' | 'sugestao' | 'onConfirmar'>) {
  const [valor, setValor] = useState(sugestao ?? 0);
  const [observacao, setObservacao] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    onConfirmar({
      fundo_troco: valor,
      observacao: observacao.trim() || undefined,
    });
  }

  return (
    <form
      id={FORM_ID}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
      noValidate
    >
      <p className="text-body-md text-on-surface-variant">
        Quanto tem em dinheiro no caixa para troco? Se não tiver nada, deixe R$
        0,00.
      </p>

      <div className="space-y-2">
        <Label htmlFor="abertura-caixa-valor">Dinheiro no caixa</Label>
        <CurrencyInput
          id="abertura-caixa-valor"
          value={valor}
          onChange={setValor}
          disabled={busy}
          autoFocus
          aria-label="Dinheiro no caixa para troco"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="abertura-caixa-obs">Observação (opcional)</Label>
        <Textarea
          id="abertura-caixa-obs"
          value={observacao}
          maxLength={300}
          placeholder="Ex.: notas de 2 e 5, moedas de 1"
          disabled={busy}
          onChange={(event) => setObservacao(event.target.value)}
        />
      </div>
    </form>
  );
}
