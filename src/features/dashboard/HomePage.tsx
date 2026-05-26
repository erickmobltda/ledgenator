import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { usePortfolio } from '@/hooks/usePortfolio';
import { formatCurrency, formatPercent } from '@/lib/currency';
import { AllocationDonut } from '@/components/charts/AllocationDonut';
import { PerformanceArea } from '@/components/charts/PerformanceArea';
import { BrokerBars } from '@/components/charts/BrokerBars';
import { CurrencyDonut } from '@/components/charts/CurrencyDonut';
import { PositionsTable } from './PositionsTable';
import { RefreshCw, TrendingUp, TrendingDown, Wallet, Coins } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/toast';

function KpiCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  tone?: 'pos' | 'neg';
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span className={tone === 'pos' ? 'text-success' : tone === 'neg' ? 'text-destructive' : ''}>{icon}</span>
        </div>
        <div className={'mt-2 text-xl font-bold tracking-tight ' + (tone === 'pos' ? 'text-success' : tone === 'neg' ? 'text-destructive' : '')}>
          {value}
        </div>
        {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}

export function HomePage() {
  const { t, i18n } = useTranslation();
  const p = usePortfolio();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);

  const pnlBRL = p.marketTotalBRL - p.investedTotalBRL;
  const pnlPctBRL = p.investedTotalBRL ? pnlBRL / p.investedTotalBRL : 0;
  const pnlUSD = p.marketTotalUSD - p.investedTotalUSD;
  const pnlPctUSD = p.investedTotalUSD ? pnlUSD / p.investedTotalUSD : 0;

  async function refreshPrices() {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('refresh-prices', { body: {} });
      if (error) throw error;
      toast.success(t('dashboard.refreshPrices'), data?.message);
      void qc.invalidateQueries({ queryKey: ['price_cache'] });
    } catch (e) {
      toast.error(t('common.error'), (e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }

  if (!p.isLoading && p.positions.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        <Empty title={t('dashboard.empty')} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshPrices} disabled={refreshing}>
          <RefreshCw className={'size-4 ' + (refreshing ? 'animate-spin' : '')} />
          <span className="hidden sm:inline">{refreshing ? t('dashboard.refreshing') : t('dashboard.refreshPrices')}</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={t('dashboard.totalInvested')}
          value={formatCurrency(p.investedTotalBRL, 'BRL', i18n.language)}
          icon={<Wallet className="size-4" />}
        />
        <KpiCard
          label={t('dashboard.currentValue')}
          value={formatCurrency(p.marketTotalBRL, 'BRL', i18n.language)}
          icon={<Coins className="size-4" />}
        />
        <KpiCard
          label={t('dashboard.pnl')}
          value={formatCurrency(pnlBRL, 'BRL', i18n.language)}
          icon={pnlBRL >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
          tone={pnlBRL >= 0 ? 'pos' : 'neg'}
        />
        <KpiCard
          label={t('dashboard.pnlPct')}
          value={formatPercent(pnlPctBRL, i18n.language)}
          icon={pnlPctBRL >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
          tone={pnlPctBRL >= 0 ? 'pos' : 'neg'}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={t('dashboard.totalInvested')}
          value={formatCurrency(p.investedTotalUSD, 'USD', i18n.language)}
          icon={<Wallet className="size-4" />}
        />
        <KpiCard
          label={t('dashboard.currentValue')}
          value={formatCurrency(p.marketTotalUSD, 'USD', i18n.language)}
          icon={<Coins className="size-4" />}
        />
        <KpiCard
          label={t('dashboard.pnl')}
          value={formatCurrency(pnlUSD, 'USD', i18n.language)}
          icon={pnlUSD >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
          tone={pnlUSD >= 0 ? 'pos' : 'neg'}
        />
        <KpiCard
          label={t('dashboard.pnlPct')}
          value={formatPercent(pnlPctUSD, i18n.language)}
          icon={pnlPctUSD >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
          tone={pnlPctUSD >= 0 ? 'pos' : 'neg'}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>{t('dashboard.positions')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <PositionsTable positions={p.positions} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('dashboard.byAssetType')}</CardTitle></CardHeader>
          <CardContent><AllocationDonut data={p.byAssetType} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('dashboard.performance')}</CardTitle></CardHeader>
          <CardContent><PerformanceArea data={p.timeline} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('dashboard.byBroker')}</CardTitle></CardHeader>
          <CardContent><BrokerBars data={p.byBroker} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('dashboard.byCurrency')}</CardTitle></CardHeader>
          <CardContent><CurrencyDonut data={p.byCurrency} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
