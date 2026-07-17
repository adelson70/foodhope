import { Search } from 'lucide-react';

import { Input } from '../../../components/ui';

type PedidosSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function PedidosSearch({ value, onChange }: PedidosSearchProps) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Buscar por nome, número ou produto"
      leftIcon={<Search size={20} strokeWidth={1.75} />}
      aria-label="Buscar pedidos"
    />
  );
}
