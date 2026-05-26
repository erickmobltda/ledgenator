import { useQuery } from '@tanstack/react-query';
import { useOperations } from '@/features/operations/useOperations';
import { supabase } from '@/lib/supabase';
import type { Asset, Currency, PriceCache } from '@/types/database';

export interface Position {
  asset: Asset;
  units: number;
  costBasis: number; // in operation currency
  currency: Currency;
  brokerIds: string[];
  marketPrice?: number;
  marketValue?: number; // current price × units, in asset currency
  pnl?: number;
  pnlPct?: number;
}

export interface TimelinePoint {
  date: string;
  investedBRL: number;
  marketBRL: number;
  investedUSD: number;
  marketUSD: number;
}

export interface PortfolioSummary {
  positions: Position[];
  invested: Record<Currency, number>;
  marketValue: Record<Currency, number>;
  investedTotalBRL: number; // sum of every op in BRL, using per-op fx_rate_brl
  investedTotalUSD: number; // sum of every op in USD, BRL ops divided by per-op fx
  marketTotalBRL: number;
  marketTotalUSD: number;
  byAssetType: Array<{ type: string; value: number }>;
  byBroker: Array<{ broker: string; invested: number; market: number }>;
  byCurrency: Array<{ currency: Currency; value: number }>;
  timeline: TimelinePoint[];
  fxNow: number;
}

export function usePriceCache() {
  return useQuery({
    queryKey: ['price_cache'],
    queryFn: async (): Promise<PriceCache[]> => {
      const { data, error } = await supabase.from('price_cache').select('*');
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useUsdbrlAsset() {
  return useQuery({
    queryKey: ['asset', 'USDBRL'],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('assets')
        .select('id')
        .eq('ticker', 'USDBRL')
        .maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
  });
}

const FX_FALLBACK = 5.0;

export function usePortfolio(): PortfolioSummary & { isLoading: boolean } {
  const { data: ops, isLoading } = useOperations();
  const { data: prices } = usePriceCache();
  const { data: usdbrlAssetId } = useUsdbrlAsset();

  const priceByAsset = new Map((prices ?? []).map((p) => [p.asset_id, p]));
  const fxNow =
    (usdbrlAssetId ? Number(priceByAsset.get(usdbrlAssetId)?.price) : NaN) || FX_FALLBACK;

  // group by (asset_id) → position.
  // Operations come back in DESC date order; we must process ASC so the
  // weighted-average cost basis evolves chronologically.
  const opsAsc = [...(ops ?? [])].sort((a, b) => a.op_date.localeCompare(b.op_date));
  const map = new Map<string, Position>();
  for (const op of opsAsc) {
    if (op.asset.ticker === 'USDBRL') continue; // synthetic FX row, not a real holding
    const k = op.asset_id;
    const cur: Position = map.get(k) ?? {
      asset: op.asset,
      units: 0,
      costBasis: 0,
      currency: op.currency,
      brokerIds: [],
    };
    const units = Number(op.units);
    const total = Number(op.total_price);
    const fees = Number(op.fees);
    if (op.side === 'BUY') {
      cur.units += units;
      cur.costBasis += total + fees;
    } else {
      // SELL: reduce cost basis by units_sold × current avg cost.
      // Fees on a sell reduce realized proceeds — they do not change remaining basis.
      const avg = cur.units > 0 ? cur.costBasis / cur.units : 0;
      cur.units -= units;
      cur.costBasis -= units * avg;
      if (Math.abs(cur.units) < 1e-12) {
        cur.units = 0;
        cur.costBasis = 0;
      }
    }
    if (!cur.brokerIds.includes(op.current_broker_id)) cur.brokerIds.push(op.current_broker_id);
    map.set(k, cur);
  }

  const positions: Position[] = [];
  for (const p of map.values()) {
    if (Math.abs(p.units) < 1e-12) continue;
    const pc = priceByAsset.get(p.asset.id);
    if (pc) {
      p.marketPrice = Number(pc.price);
      p.marketValue = p.marketPrice * p.units;
      p.pnl = p.marketValue - p.costBasis;
      p.pnlPct = p.costBasis !== 0 ? p.pnl / p.costBasis : 0;
    }
    positions.push(p);
  }

  // Invested in native currency (BRL ops → BRL, USD ops → USD).
  const invested: Record<Currency, number> = { BRL: 0, USD: 0 };
  const marketValue: Record<Currency, number> = { BRL: 0, USD: 0 };
  for (const p of positions) {
    invested[p.currency] += p.costBasis;
    marketValue[p.currency] += p.marketValue ?? p.costBasis;
  }

  // Aggregations in BRL using current FX (good enough for the donut/bars).
  const byTypeMap = new Map<string, number>();
  for (const p of positions) {
    const v = (p.marketValue ?? p.costBasis) * (p.currency === 'USD' ? fxNow : 1);
    byTypeMap.set(p.asset.asset_type, (byTypeMap.get(p.asset.asset_type) ?? 0) + v);
  }
  const byAssetType = Array.from(byTypeMap.entries()).map(([type, value]) => ({ type, value }));

  const byBrokerMap = new Map<string, { broker: string; invested: number; market: number }>();
  for (const op of ops ?? []) {
    if (op.asset.ticker === 'USDBRL') continue;
    const k = op.current_broker_id;
    const e = byBrokerMap.get(k) ?? { broker: op.current_broker.name, invested: 0, market: 0 };
    const sign = op.side === 'BUY' ? 1 : -1;
    const fxMult = op.currency === 'USD' ? Number(op.fx_rate_brl ?? fxNow) : 1;
    e.invested += sign * Number(op.total_price) * fxMult;
    byBrokerMap.set(k, e);
  }
  for (const p of positions) {
    const fxMult = p.currency === 'USD' ? fxNow : 1;
    for (const bid of p.brokerIds) {
      const e = byBrokerMap.get(bid);
      if (e) e.market += ((p.marketValue ?? p.costBasis) / p.brokerIds.length) * fxMult;
    }
  }
  const byBroker = Array.from(byBrokerMap.values());

  const byCurrency: Array<{ currency: Currency; value: number }> = (
    [
      { currency: 'BRL' as Currency, value: marketValue.BRL },
      { currency: 'USD' as Currency, value: marketValue.USD * fxNow },
    ] satisfies Array<{ currency: Currency; value: number }>
  ).filter((x) => x.value > 0);

  // Cumulative invested timeline, one running total per currency.
  // BRL ops use op.fx_rate_brl when present (their date's PTAX); else fxNow.
  // For the USD curve, BRL ops are converted to USD using the same per-op fx.
  const sortedOps = [...(ops ?? [])]
    .filter((op) => op.asset.ticker !== 'USDBRL')
    .sort((a, b) => a.op_date.localeCompare(b.op_date));
  const tl = new Map<string, { investedBRL: number; investedUSD: number }>();
  let accBRL = 0;
  let accUSD = 0;
  for (const op of sortedOps) {
    const sign = op.side === 'BUY' ? 1 : -1;
    const fxAtDate = Number(op.fx_rate_brl ?? fxNow);
    const totalNative = Number(op.total_price);
    if (op.currency === 'USD') {
      accUSD += sign * totalNative;
      accBRL += sign * totalNative * fxAtDate;
    } else {
      accBRL += sign * totalNative;
      accUSD += sign * (fxAtDate > 0 ? totalNative / fxAtDate : 0);
    }
    tl.set(op.op_date, { investedBRL: accBRL, investedUSD: accUSD });
  }

  const totalMarketBRL = marketValue.BRL + marketValue.USD * fxNow;
  const totalMarketUSD = marketValue.USD + (fxNow > 0 ? marketValue.BRL / fxNow : 0);

  const timeline: TimelinePoint[] = Array.from(tl.entries()).map(([date, v]) => ({
    date,
    investedBRL: v.investedBRL,
    marketBRL: v.investedBRL,
    investedUSD: v.investedUSD,
    marketUSD: v.investedUSD,
  }));
  if (timeline.length > 0) {
    const last = timeline[timeline.length - 1];
    last.marketBRL = totalMarketBRL;
    last.marketUSD = totalMarketUSD;
  }

  return {
    positions,
    invested,
    marketValue,
    investedTotalBRL: accBRL,
    investedTotalUSD: accUSD,
    marketTotalBRL: totalMarketBRL,
    marketTotalUSD: totalMarketUSD,
    byAssetType,
    byBroker,
    byCurrency,
    timeline,
    fxNow,
    isLoading,
  };
}
