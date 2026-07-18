import { Search } from 'lucide-react';

import { Input } from '../../../components/ui';

type CardapioSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function CardapioSearch({ value, onChange }: CardapioSearchProps) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Buscar por nome ou descrição"
      leftIcon={<Search size={17} strokeWidth={1.75} />}
      aria-label="Buscar produtos"
    />
  );
}
