import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useOperations, useDeleteOperation, type OperationRow } from './useOperations';
import { OperationForm } from './OperationForm';
import { formatCurrency, formatNumber } from '@/lib/currency';

export function OperationsPage() {
  const { t, i18n } = useTranslation();
  const { data: ops, isLoading } = useOperations();
  const del = useDeleteOperation();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<OperationRow | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('operations.title')}</h1>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="size-4" />{t('operations.new')}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !ops?.length ? (
        <Empty
          title={t('operations.noOperations')}
          action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-4" />{t('operations.new')}</Button>}
        />
      ) : (
        <div className="space-y-2">
          {ops.map((o) => (
            <Card key={o.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={
                  'flex size-9 shrink-0 items-center justify-center rounded-full ' +
                  (o.side === 'BUY' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive')
                }>
                  {o.side === 'BUY' ? <ArrowDownRight className="size-4" /> : <ArrowUpRight className="size-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="truncate text-sm font-semibold">{o.asset.ticker}</div>
                    <div className="text-sm font-semibold">{formatCurrency(Number(o.total_price), o.currency, i18n.language)}</div>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-muted-foreground">
                    <div className="truncate">
                      {t(`operations.assetTypes.${o.asset.asset_type}`)} · {
                        o.bought_broker && o.bought_broker.id !== o.current_broker.id
                          ? `${o.bought_broker.name} → ${o.current_broker.name}`
                          : o.current_broker.name
                      } · {o.op_date}
                    </div>
                    <div>
                      {formatNumber(Number(o.units), i18n.language, 8)} × {formatCurrency(Number(o.unit_price), o.currency, i18n.language)}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(o); setOpen(true); }}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { if (confirm(t('operations.confirmDelete'))) del.mutate(o.id); }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <OperationForm open={open} onOpenChange={setOpen} operation={editing} />
    </div>
  );
}
