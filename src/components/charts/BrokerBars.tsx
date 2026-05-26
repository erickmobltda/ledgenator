import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/currency';

export function BrokerBars({ data }: { data: Array<{ broker: string; invested: number; market: number }> }) {
  const { t, i18n } = useTranslation();
  if (!data.length) return null;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 4, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="broker" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={56}
            tickFormatter={(v) => new Intl.NumberFormat(i18n.language, { notation: 'compact' }).format(v as number)} />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
            formatter={(value: number, name) => [formatCurrency(value, 'BRL', i18n.language), name === 'invested' ? t('dashboard.totalInvested') : t('dashboard.currentValue')]}
          />
          <Bar dataKey="invested" fill="#3b82f6" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={900} />
          <Bar dataKey="market" fill="#10b981" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={1100} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
