import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAssets, useSaveOperation, findOrCreateAsset, type OperationRow } from './useOperations';
import { useBrokers } from '@/features/brokers/useBrokers';
import { useQueryClient } from '@tanstack/react-query';
import type { Asset, AssetType, Currency, Market, Side } from '@/types/database';
import { formatCurrency } from '@/lib/currency';
import { toast } from '@/components/ui/toast';

const ASSET_TYPES: AssetType[] = ['STOCK', 'ETF', 'FII', 'REIT', 'CRYPTO', 'BOND', 'OTHER'];
const MARKETS: Market[] = ['B3', 'NASDAQ', 'NYSE', 'CRYPTO', 'OTHER'];
const SAME_AS_CURRENT = '__same__';

export function OperationForm({
  open, onOpenChange, operation,
}: { open: boolean; onOpenChange: (v: boolean) => void; operation?: OperationRow | null }) {
  const { t, i18n } = useTranslation();
  const { data: brokers } = useBrokers();
  const { data: assets } = useAssets();
  const save = useSaveOperation();
  const qc = useQueryClient();

  const [ticker, setTicker] = React.useState('');
  const [assetType, setAssetType] = React.useState<AssetType>('STOCK');
  const [market, setMarket] = React.useState<Market>('B3');
  const [currentBrokerId, setCurrentBrokerId] = React.useState<string>('');
  const [boughtBrokerId, setBoughtBrokerId] = React.useState<string>(SAME_AS_CURRENT);
  const [currency, setCurrency] = React.useState<Currency>('BRL');
  const [side, setSide] = React.useState<Side>('BUY');
  const [opDate, setOpDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [units, setUnits] = React.useState('');
  const [unitPrice, setUnitPrice] = React.useState('');
  const [fees, setFees] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    if (operation) {
      setTicker(operation.asset.ticker);
      setAssetType(operation.asset.asset_type);
      setMarket(operation.asset.market);
      setCurrentBrokerId(operation.current_broker_id);
      setBoughtBrokerId(
        operation.bought_broker_id && operation.bought_broker_id !== operation.current_broker_id
          ? operation.bought_broker_id
          : SAME_AS_CURRENT,
      );
      setCurrency(operation.currency);
      setSide(operation.side);
      setOpDate(operation.op_date);
      setUnits(String(operation.units));
      setUnitPrice(String(operation.unit_price));
      setFees(String(operation.fees));
    } else {
      setTicker('');
      setAssetType('STOCK');
      setMarket('B3');
      setCurrentBrokerId(brokers?.[0]?.id ?? '');
      setBoughtBrokerId(SAME_AS_CURRENT);
      setCurrency('BRL');
      setSide('BUY');
      setOpDate(new Date().toISOString().slice(0, 10));
      setUnits('');
      setUnitPrice('');
      setFees('');
    }
  }, [open, operation, brokers]);

  React.useEffect(() => {
    // sensible defaults: B3 → BRL, US markets → USD
    if (market === 'B3') setCurrency('BRL');
    else if (market === 'NASDAQ' || market === 'NYSE') setCurrency('USD');
  }, [market]);

  const unitsNum = parseFloat(units.replace(',', '.')) || 0;
  const priceNum = parseFloat(unitPrice.replace(',', '.')) || 0;
  const feesNum = parseFloat(fees.replace(',', '.')) || 0;
  const total = unitsNum * priceNum;

  const existingAsset: Asset | undefined = React.useMemo(
    () => assets?.find((a) => a.ticker.toLowerCase() === ticker.trim().toLowerCase() && a.market === market),
    [assets, ticker, market],
  );
  React.useEffect(() => {
    if (existingAsset) {
      setAssetType(existingAsset.asset_type);
      setCurrency(existingAsset.currency);
    }
  }, [existingAsset]);

  async function submit() {
    if (!currentBrokerId || !ticker.trim() || unitsNum <= 0 || priceNum < 0) return;
    try {
      const asset = await findOrCreateAsset({ ticker, asset_type: assetType, market, currency });
      const resolvedBoughtId = boughtBrokerId === SAME_AS_CURRENT ? currentBrokerId : boughtBrokerId;
      await save.mutateAsync({
        id: operation?.id,
        current_broker_id: currentBrokerId,
        bought_broker_id: resolvedBoughtId,
        asset_id: asset.id,
        side,
        op_date: opDate,
        units: unitsNum,
        unit_price: priceNum,
        fees: feesNum,
        currency,
      });
      void qc.invalidateQueries({ queryKey: ['assets'] });
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
          <DialogTitle>{operation ? t('operations.edit') : t('operations.new')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="op-ticker">{t('operations.asset')}</Label>
              <Input
                id="op-ticker"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder={t('operations.assetPlaceholder')}
                autoCapitalize="characters"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('operations.assetType')}</Label>
              <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((x) => <SelectItem key={x} value={x}>{t(`operations.assetTypes.${x}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('operations.market')}</Label>
              <Select value={market} onValueChange={(v) => setMarket(v as Market)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MARKETS.map((x) => <SelectItem key={x} value={x}>{t(`operations.markets.${x}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('operations.broker')}</Label>
              <Select value={currentBrokerId} onValueChange={setCurrentBrokerId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {brokers?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('operations.boughtAt', 'Originally bought at')}</Label>
              <Select value={boughtBrokerId} onValueChange={setBoughtBrokerId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SAME_AS_CURRENT}>{t('operations.sameAsBroker', 'Same as broker')}</SelectItem>
                  {brokers?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('operations.currency', 'Currency')}</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('operations.side')}</Label>
              <Select value={side} onValueChange={(v) => setSide(v as Side)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">{t('operations.buy')}</SelectItem>
                  <SelectItem value="SELL">{t('operations.sell')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="op-date">{t('operations.date')}</Label>
              <Input id="op-date" type="date" value={opDate} onChange={(e) => setOpDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="op-units">{t('operations.units')}</Label>
              <Input id="op-units" inputMode="decimal" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="op-price">{t('operations.unitPrice')}</Label>
              <Input id="op-price" inputMode="decimal" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="op-fees">{t('operations.fees')}</Label>
              <Input id="op-fees" inputMode="decimal" value={fees} onChange={(e) => setFees(e.target.value)} placeholder="0,00" />
            </div>
            <div className="rounded-lg border bg-muted/40 px-3 py-2 sm:col-span-2">
              <div className="text-xs text-muted-foreground">{t('operations.totalPrice')}</div>
              <div className="text-lg font-semibold">{formatCurrency(total, currency, i18n.language)}</div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={submit} disabled={!currentBrokerId || !ticker.trim() || unitsNum <= 0 || priceNum < 0 || save.isPending}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
