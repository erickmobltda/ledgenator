import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/currency';
import type { Currency } from '@/types/database';

const COLORS: Record<Currency, string> = { BRL: '#10b981', USD: '#3b82f6' };

export function CurrencyDonut({ data }: { data: Array<{ currency: Currency; value: number }> }) {
  const { i18n } = useTranslation();
  if (!data.length) return null;
  const total = data.reduce((a, b) => a + b.value, 0);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="currency" innerRadius="55%" outerRadius="85%" paddingAngle={3} isAnimationActive animationDuration={900}>
            {data.map((d) => <Cell key={d.currency} fill={COLORS[d.currency]} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
            formatter={(value: number, _n, item) => {
              const pct = total ? ((value / total) * 100).toFixed(1) : '0';
              return [`${formatCurrency(value, 'BRL', i18n.language)} (${pct}%)`, item.payload.currency];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
