import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/currency';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

export function AllocationDonut({ data }: { data: Array<{ type: string; value: number }> }) {
  const { t, i18n } = useTranslation();
  if (!data.length) return null;
  const total = data.reduce((a, b) => a + b.value, 0);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="type"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={2}
            isAnimationActive
            animationDuration={900}
          >
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
            formatter={(value: number, _name, item) => {
              const pct = total ? ((value / total) * 100).toFixed(1) : '0';
              return [`${formatCurrency(value, 'BRL', i18n.language)} (${pct}%)`, t(`operations.assetTypes.${item.payload.type}`)];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
        {data.map((d, i) => (
          <div key={d.type} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span>{t(`operations.assetTypes.${d.type}`)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
