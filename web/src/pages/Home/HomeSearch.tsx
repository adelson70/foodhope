import { Search } from 'lucide-react';

type HomeSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function HomeSearch({ value, onChange }: HomeSearchProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-on-surface-variant">
        <Search size={20} strokeWidth={1.75} aria-hidden />
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="O que você está com vontade?"
        aria-label="Buscar produtos"
        className="h-12 w-full rounded-full bg-surface-container-low pl-12 pr-4 text-body-md text-on-surface shadow-card outline-none transition-all placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary/40"
      />
    </div>
  );
}
