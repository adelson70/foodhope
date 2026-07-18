import { ShoppingBag, Users, Wallet } from 'lucide-react';

import { cn } from '../../../lib/cn';

type DashKpisProps = {
  faturamentoHoje: number;
  comprasHoje: number;
  leadsTotal: number;
};

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function DashKpis({
  faturamentoHoje,
  comprasHoje,
  leadsTotal,
}: DashKpisProps) {
  const cards = [
    {
      label: 'Faturamento do dia',
      value: moeda.format(faturamentoHoje),
      icon: Wallet,
      accent: 'text-primary-container',
    },
    {
      label: 'Compras do dia',
      value: String(comprasHoje),
      icon: ShoppingBag,
      accent: 'text-on-surface',
    },
    {
      label: 'Leads',
      value: String(leadsTotal),
      icon: Users,
      accent: 'text-on-surface',
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-3">
      {cards.map(({ label, value, icon: Icon, accent }) => (
        <article
          key={label}
          className="rounded-xl border border-operator-border bg-operator-card px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-operator-surface text-primary-container">
              <Icon size={17} strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-caption text-on-surface-variant">{label}</p>
              <p className={cn('text-title-md font-semibold truncate', accent)}>
                {value}
              </p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
