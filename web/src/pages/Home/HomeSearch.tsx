import { Search } from 'lucide-react';

import { Input } from '../../components/ui';

type HomeSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function HomeSearch({ value, onChange }: HomeSearchProps) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Buscar no cardápio"
      leftIcon={<Search size={20} strokeWidth={1.75} />}
      aria-label="Buscar produtos"
    />
  );
}
