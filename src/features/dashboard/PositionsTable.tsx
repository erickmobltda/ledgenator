import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/currency';
import { cn } from '@/lib/utils';
import type { Position } from '@/hooks/usePortfolio';

type SortKey = 'ticker' | 'type' | 'units' | 'avgPrice' | 'currentPrice' | 'marketValue' | 'pnl' | 'pnlPct';
type SortDir = 'asc' | 'desc';

function compare(a: Position, b: Position, key: SortKey): number {
  switch (key) {
    case 'ticker':
      return a.asset.ticker.localeCompare(b.asset.ticker);
    case 'type':
      return a.asset.asset_type.localeCompare(b.asset.asset_type);
    case 'units':
      return a.units - b.units;
    case 'avgPrice':
      return (a.costBasis / (a.units || 1)) - (b.costBasis / (b.units || 1));
    case 'currentPrice':
      return (a.marketPrice ?? -Infinity) - (b.marketPrice ?? -Infinity);
    case 'marketValue':
      return (a.marketValue ?? -Infinity) - (b.marketValue ?? -Infinity);
    case 'pnl':
      return (a.pnl ?? -Infinity) - (b.pnl ?? -Infinity);
    case 'pnlPct':
      return (a.pnlPct ?? -Infinity) - (b.pnlPct ?? -Infinity);
  }
}

export function PositionsTable({ positions }: { positions: Position[] }) {
  const { t, i18n } = useTranslation();
  const [sortKey, setSortKey] = React.useState<SortKey>('marketValue');
  const [sortDir, setSortDir] = React.useState<SortDir>('desc');

  const sorted = React.useMemo(() => {
    const arr = [...positions];
    arr.sort((a, b) => {
      const c = compare(a, b, sortKey);
      return sortDir === 'asc' ? c : -c;
    });
    return arr;
  }, [positions, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(k);
      setSortDir(k === 'ticker' || k === 'type' ? 'asc' : 'desc');
    }
  }

  if (positions.length === 0) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">{t('dashboard.noPositions')}</div>;
  }

  const cols: Array<{ key: SortKey; label: string; align: 'left' | 'right' }> = [
    { key: 'ticker', label: t('dashboard.ticker'), align: 'left' },
    { key: 'type', label: t('dashboard.type'), align: 'left' },
    { key: 'units', label: t('dashboard.units'), align: 'right' },
    { key: 'avgPrice', label: t('dashboard.avgPrice'), align: 'right' },
    { key: 'currentPrice', label: t('dashboard.currentPrice'), align: 'right' },
    { key: 'marketValue', label: t('dashboard.marketValue'), align: 'right' },
    { key: 'pnl', label: t('dashboard.pnl'), align: 'right' },
    { key: 'pnlPct', label: t('dashboard.pnlPct'), align: 'right' },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            {cols.map((c) => {
              const active = sortKey === c.key;
              const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
              return (
                <th
                  key={c.key}
                  scope="col"
                  className={cn('px-3 py-2 font-medium', c.align === 'right' ? 'text-right' : 'text-left')}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className={cn(
                      'inline-flex items-center gap-1 transition-colors hover:text-foreground',
                      c.align === 'right' && 'flex-row-reverse',
                      active && 'text-foreground',
                    )}
                  >
                    <span>{c.label}</span>
                    <Icon className="size-3" />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const avg = p.units !== 0 ? p.costBasis / p.units : 0;
            const pnl = p.pnl;
            const pnlPct = p.pnlPct;
            const tone = pnl === undefined ? '' : pnl >= 0 ? 'text-success' : 'text-destructive';
            return (
              <tr key={p.asset.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                <td className="px-3 py-2 font-medium">{p.asset.ticker}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {t(`operations.assetTypes.${p.asset.asset_type}`, { defaultValue: p.asset.asset_type })}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumber(p.units, i18n.language, 8)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(avg, p.currency, i18n.language)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {p.marketPrice !== undefined ? formatCurrency(p.marketPrice, p.currency, i18n.language) : '—'}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {p.marketValue !== undefined ? formatCurrency(p.marketValue, p.currency, i18n.language) : '—'}
                </td>
                <td className={cn('px-3 py-2 text-right tabular-nums', tone)}>
                  {pnl !== undefined ? formatCurrency(pnl, p.currency, i18n.language) : '—'}
                </td>
                <td className={cn('px-3 py-2 text-right tabular-nums', tone)}>
                  {pnlPct !== undefined ? formatPercent(pnlPct, i18n.language) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
