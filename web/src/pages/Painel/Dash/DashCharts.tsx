import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { DashItemRank } from '../../../services/types';

type DashChartsProps = {
  topProdutos: DashItemRank[];
  topAdicionais: DashItemRank[];
};

const chartTokens = {
  grid: 'var(--color-operator-border)',
  tick: 'var(--color-on-surface-variant)',
  cursor: 'var(--color-operator-border)',
  tooltipBg: 'var(--color-operator-card)',
  tooltipBorder: 'var(--color-operator-border)',
  tooltipText: 'var(--color-on-surface)',
  tooltipLabel: 'var(--color-on-surface-variant)',
  bar: 'var(--color-primary-container)',
} as const;

function ChartCard({
  titulo,
  data,
  emptyLabel,
}: {
  titulo: string;
  data: { nome: string; quantidade: number }[];
  emptyLabel: string;
}) {
  return (
    <article className="rounded-xl border border-operator-border bg-operator-card px-4 py-4">
      <h2 className="mb-3 text-subtitle-md font-semibold text-on-surface">
        {titulo}
      </h2>
      {data.length === 0 ? (
        <p className="py-8 text-center text-caption text-on-surface-variant">
          {emptyLabel}
        </p>
      ) : (
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            >
              <CartesianGrid
                stroke={chartTokens.grid}
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: chartTokens.tick, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="nome"
                width={88}
                tick={{ fill: chartTokens.tick, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: chartTokens.cursor }}
                contentStyle={{
                  background: chartTokens.tooltipBg,
                  border: `1px solid ${chartTokens.tooltipBorder}`,
                  borderRadius: 12,
                  color: chartTokens.tooltipText,
                  fontSize: 12,
                }}
                labelStyle={{ color: chartTokens.tooltipLabel }}
              />
              <Bar
                dataKey="quantidade"
                name="Quantidade"
                fill={chartTokens.bar}
                radius={[0, 8, 8, 0]}
                barSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}

export function DashCharts({ topProdutos, topAdicionais }: DashChartsProps) {
  return (
    <section className="grid grid-cols-1 gap-3">
      <ChartCard
        titulo="Top produtos do dia"
        data={topProdutos.map((item) => ({
          nome: item.nome,
          quantidade: item.quantidade,
        }))}
        emptyLabel="Nenhum produto vendido hoje"
      />
      <ChartCard
        titulo="Top adicionais do dia"
        data={topAdicionais.map((item) => ({
          nome: item.nome,
          quantidade: item.quantidade,
        }))}
        emptyLabel="Nenhum adicional vendido hoje"
      />
    </section>
  );
}
