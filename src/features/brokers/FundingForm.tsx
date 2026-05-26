import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAddFunding } from './useBrokers';
import type { Broker, Currency } from '@/types/database';
import { formatCurrency } from '@/lib/currency';
import { toast } from '@/components/ui/toast';

export function FundingForm({ open, onOpenChange, broker }: { open: boolean; onOpenChange: (v: boolean) => void; broker: Broker }) {
  const { t, i18n } = useTranslation();
  const add = useAddFunding();
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = React.useState<Currency>('BRL');
  const [amount, setAmount] = React.useState('');
  const [sourceBrl, setSourceBrl] = React.useState('');
  const [rate, setRate] = React.useState('');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setDate(new Date().toISOString().slice(0, 10));
      setCurrency('BRL');
      setAmount('');
      setSourceBrl('');
      setRate('');
      setNote('');
    }
  }, [open]);

  const isUSD = currency === 'USD';
  const amountNum = parseFloat(amount.replace(',', '.')) || 0;
  const rateNum = parseFloat(rate.replace(',', '.')) || 0;
  const sourceNum = parseFloat(sourceBrl.replace(',', '.')) || 0;

  function onRateChange(v: string) {
    setRate(v);
    const r = parseFloat(v.replace(',', '.'));
    if (isFinite(r) && amountNum > 0) setSourceBrl((amountNum * r).toFixed(2));
  }
  function onSourceBrlChange(v: string) {
    setSourceBrl(v);
    const s = parseFloat(v.replace(',', '.'));
    if (isFinite(s) && amountNum > 0) setRate((s / amountNum).toFixed(4));
  }
  function onAmountChange(v: string) {
    setAmount(v);
    const a = parseFloat(v.replace(',', '.'));
    if (isFinite(a) && a > 0) {
      if (rateNum > 0) setSourceBrl((a * rateNum).toFixed(2));
      else if (sourceNum > 0) setRate((sourceNum / a).toFixed(4));
    }
  }

  async function submit() {
    try {
      await add.mutateAsync({
        broker_id: broker.id,
        event_date: date,
        currency,
        amount: amountNum,
        source_amount_brl: isUSD && sourceNum > 0 ? sourceNum : null,
        exchange_rate: isUSD && rateNum > 0 ? rateNum : null,
        note: note.trim() || null,
      });
      onOpenChange(false);
      toast.success(t('common.save'));
    } catch (e) {
      toast.error(t('common.error'), (e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('brokers.funding.new')} — {broker.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="f-date">{t('brokers.funding.date')}</Label>
              <Input id="f-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('brokers.currency')}</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL (R$)</SelectItem>
                  <SelectItem value="USD">USD (US$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-amount">{t('brokers.funding.amount')} ({currency})</Label>
            <Input id="f-amount" inputMode="decimal" value={amount} onChange={(e) => onAmountChange(e.target.value)} placeholder="0,00" />
          </div>
          {isUSD ? (
            <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="f-rate">{t('brokers.funding.exchangeRate')}</Label>
                <Input id="f-rate" inputMode="decimal" value={rate} onChange={(e) => onRateChange(e.target.value)} placeholder="5,20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-brl">{t('brokers.funding.sourceBrl')}</Label>
                <Input id="f-brl" inputMode="decimal" value={sourceBrl} onChange={(e) => onSourceBrlChange(e.target.value)} placeholder="0,00" />
              </div>
              {amountNum > 0 && sourceNum > 0 ? (
                <div className="text-xs text-muted-foreground sm:col-span-2">
                  {formatCurrency(amountNum, 'USD', i18n.language)} ≙ {formatCurrency(sourceNum, 'BRL', i18n.language)}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="f-note">{t('brokers.funding.note')}</Label>
            <Input id="f-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={submit} disabled={amountNum <= 0 || (isUSD && rateNum <= 0 && sourceNum <= 0) || add.isPending}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
