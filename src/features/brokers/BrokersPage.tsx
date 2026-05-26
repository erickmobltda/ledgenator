import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useBrokers, useDeleteBroker, useDeleteFunding, useFundingEvents } from './useBrokers';
import { BrokerForm } from './BrokerForm';
import { FundingForm } from './FundingForm';
import type { Broker, Currency, FundingEvent } from '@/types/database';
import { formatCurrency } from '@/lib/currency';

export function BrokersPage() {
  const { t, i18n } = useTranslation();
  const { data: brokers, isLoading } = useBrokers();
  const { data: funding } = useFundingEvents();
  const deleteBroker = useDeleteBroker();
  const deleteFunding = useDeleteFunding();

  const [brokerOpen, setBrokerOpen] = React.useState(false);
  const [editingBroker, setEditingBroker] = React.useState<Broker | null>(null);
  const [fundingBroker, setFundingBroker] = React.useState<Broker | null>(null);

  function eventsFor(broker: Broker): FundingEvent[] {
    return funding?.filter((f) => f.broker_id === broker.id) ?? [];
  }
  function totalsByCurrency(items: FundingEvent[]): Partial<Record<Currency, number>> {
    const out: Partial<Record<Currency, number>> = {};
    for (const f of items) {
      out[f.currency] = (out[f.currency] ?? 0) + Number(f.amount);
    }
    return out;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('brokers.title')}</h1>
        </div>
        <Button onClick={() => { setEditingBroker(null); setBrokerOpen(true); }}>
          <Plus className="size-4" />{t('brokers.new')}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !brokers?.length ? (
        <Empty
          title={t('brokers.noBrokers')}
          action={<Button onClick={() => { setEditingBroker(null); setBrokerOpen(true); }}><Plus className="size-4" />{t('brokers.new')}</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {brokers.map((b) => {
            const items = eventsFor(b);
            const totals = totalsByCurrency(items);
            const currencies = (Object.keys(totals) as Currency[]).sort();
            return (
              <Card key={b.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-base font-semibold">{b.name}</div>
                      {b.notes ? <div className="text-xs text-muted-foreground">{b.notes}</div> : null}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditingBroker(b); setBrokerOpen(true); }}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { if (confirm(t('brokers.confirmDelete'))) deleteBroker.mutate(b.id); }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/40 px-3 py-2">
                    <div className="text-xs text-muted-foreground">{t('brokers.funding.totalFunded')}</div>
                    {currencies.length === 0 ? (
                      <div className="text-lg font-semibold">{formatCurrency(0, 'BRL', i18n.language)}</div>
                    ) : (
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        {currencies.map((c) => (
                          <div key={c} className="text-lg font-semibold">
                            {formatCurrency(totals[c]!, c, i18n.language)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    {items.length === 0 ? (
                      <div className="text-xs text-muted-foreground">{t('brokers.funding.noFunding')}</div>
                    ) : (
                      items.slice(0, 3).map((f) => (
                        <div key={f.id} className="flex items-center justify-between text-sm">
                          <div className="text-muted-foreground">{f.event_date}</div>
                          <div className="flex items-center gap-2">
                            <span>{formatCurrency(Number(f.amount), f.currency, i18n.language)}</span>
                            {f.source_amount_brl ? (
                              <span className="text-xs text-muted-foreground">
                                ({formatCurrency(Number(f.source_amount_brl), 'BRL', i18n.language)})
                              </span>
                            ) : null}
                            <button
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => deleteFunding.mutate(f.id)}
                              aria-label={t('common.delete')}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <Button variant="outline" size="sm" className="w-full" onClick={() => setFundingBroker(b)}>
                    <Banknote className="size-4" />{t('brokers.funding.new')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BrokerForm open={brokerOpen} onOpenChange={setBrokerOpen} broker={editingBroker} />
      {fundingBroker ? (
        <FundingForm open={!!fundingBroker} onOpenChange={(v) => !v && setFundingBroker(null)} broker={fundingBroker} />
      ) : null}
    </div>
  );
}
