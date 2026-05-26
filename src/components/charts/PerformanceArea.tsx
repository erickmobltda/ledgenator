import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/currency';
import type { TimelinePoint } from '@/hooks/usePortfolio';

const BRL_AXIS = 'brl';
const USD_AXIS = 'usd';

const SERIES_CURRENCY: Record<string, 'BRL' | 'USD'> = {
  investedBRL: 'BRL',
  marketBRL: 'BRL',
  investedUSD: 'USD',
  marketUSD: 'USD',
};

export function PerformanceArea({ data }: { data: TimelinePoint[] }) {
  const { t, i18n } = useTranslation();
  if (!data.length) return null;

  const labels: Record<string, string> = {
    investedBRL: `${t('dashboard.totalInvested')} (BRL)`,
    marketBRL: `${t('dashboard.currentValue')} (BRL)`,
    investedUSD: `${t('dashboard.totalInvested')} (USD)`,
    marketUSD: `${t('dashboard.currentValue')} (USD)`,
  };

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 4, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="g-invested-brl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="g-market-brl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis
            yAxisId={BRL_AXIS}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            width={56}
            tickFormatter={(v) => new Intl.NumberFormat(i18n.language, { notation: 'compact' }).format(v as number)}
          />
          <YAxis
            yAxisId={USD_AXIS}
            orientation="right"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            width={56}
            tickFormatter={(v) => new Intl.NumberFormat(i18n.language, { notation: 'compact' }).format(v as number)}
          />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
            formatter={(value: number, name: string) => [
              formatCurrency(value, SERIES_CURRENCY[name] ?? 'BRL', i18n.language),
              labels[name] ?? name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value: string) => labels[value] ?? value}
          />
          <Area
            yAxisId={BRL_AXIS}
            type="monotone"
            dataKey="investedBRL"
            stroke="#3b82f6"
            fill="url(#g-invested-brl)"
            strokeWidth={2}
            isAnimationActive
            animationDuration={900}
          />
          <Area
            yAxisId={BRL_AXIS}
            type="monotone"
            dataKey="marketBRL"
            stroke="#10b981"
            fill="url(#g-market-brl)"
            strokeWidth={2}
            isAnimationActive
            animationDuration={1100}
          />
          <Area
            yAxisId={USD_AXIS}
            type="monotone"
            dataKey="investedUSD"
            stroke="#3b82f6"
            strokeDasharray="4 3"
            fill="none"
            strokeWidth={2}
            isAnimationActive
            animationDuration={900}
          />
          <Area
            yAxisId={USD_AXIS}
            type="monotone"
            dataKey="marketUSD"
            stroke="#10b981"
            strokeDasharray="4 3"
            fill="none"
            strokeWidth={2}
            isAnimationActive
            animationDuration={1100}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
