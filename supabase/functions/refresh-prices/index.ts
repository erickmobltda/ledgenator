// Supabase Edge Function: refresh-prices
// Reads all assets, queries the appropriate market data API in parallel,
// upserts price_cache.
//
// Primary provider for US tickers (NASDAQ/NYSE/ETFs/FX) is Yahoo Finance's
// public chart endpoint — free, no key required, supports stocks + ETFs + FX.
// Alpha Vantage is kept as fallback. B3 → brapi.dev. CRYPTO → CoinGecko.
//
// USDBRL: assets table contains a synthetic row (ticker='USDBRL', market='OTHER')
// so the live USD→BRL rate is cached alongside regular prices.
//
// Deploy: supabase functions deploy refresh-prices --no-verify-jwt

import { createClient } from 'jsr:@supabase/supabase-js@2';

interface Asset {
  id: string;
  ticker: string;
  asset_type: string;
  market: string;
  currency: string;
}

const ALPHA = Deno.env.get('ALPHAVANTAGE_API_KEY') ?? 'demo';
const BRAPI = Deno.env.get('BRAPI_TOKEN');
const CG = Deno.env.get('COINGECKO_DEMO_API_KEY');

const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  XRP: 'ripple',
  BNB: 'binancecoin',
  USDT: 'tether',
  USDC: 'usd-coin',
};

const YAHOO_HEADERS = {
  // Yahoo blocks empty / generic UAs from edge runtimes.
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
};

async function fetchYahoo(symbol: string): Promise<number | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  try {
    const r = await fetch(url, { headers: YAHOO_HEADERS });
    if (!r.ok) return null;
    const j = await r.json();
    const price = j?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === 'number' && isFinite(price) ? price : null;
  } catch (_) {
    return null;
  }
}

async function fetchBrapi(ticker: string): Promise<number | null> {
  const url = new URL(`https://brapi.dev/api/quote/${encodeURIComponent(ticker)}`);
  if (BRAPI) url.searchParams.set('token', BRAPI);
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    const price = j?.results?.[0]?.regularMarketPrice;
    return typeof price === 'number' ? price : null;
  } catch (_) {
    return null;
  }
}

async function fetchCoingecko(ticker: string): Promise<number | null> {
  const id = CRYPTO_IDS[ticker.toUpperCase()];
  if (!id) return null;
  const url = new URL('https://api.coingecko.com/api/v3/simple/price');
  url.searchParams.set('ids', id);
  url.searchParams.set('vs_currencies', 'usd');
  try {
    const r = await fetch(url, { headers: CG ? { 'x-cg-demo-api-key': CG } : undefined });
    if (!r.ok) return null;
    const j = await r.json();
    const price = j?.[id]?.usd;
    return typeof price === 'number' ? price : null;
  } catch (_) {
    return null;
  }
}

async function fetchAlphaVantage(ticker: string): Promise<number | null> {
  const url = new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function', 'GLOBAL_QUOTE');
  url.searchParams.set('symbol', ticker);
  url.searchParams.set('apikey', ALPHA);
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    const price = parseFloat(j?.['Global Quote']?.['05. price']);
    return isFinite(price) ? price : null;
  } catch (_) {
    return null;
  }
}

async function priceFor(a: Asset): Promise<{ price: number; currency: 'BRL' | 'USD' } | null> {
  // Synthetic FX row: ticker='USDBRL', stored as BRL.
  if (a.ticker === 'USDBRL') {
    const p = await fetchYahoo('USDBRL=X');
    return p != null ? { price: p, currency: 'BRL' } : null;
  }
  if (a.market === 'B3') {
    const p = await fetchBrapi(a.ticker);
    return p != null ? { price: p, currency: 'BRL' } : null;
  }
  if (a.market === 'CRYPTO' || a.asset_type === 'CRYPTO') {
    const p = await fetchCoingecko(a.ticker);
    return p != null ? { price: p, currency: 'USD' } : null;
  }
  if (a.market === 'NASDAQ' || a.market === 'NYSE') {
    const yahoo = await fetchYahoo(a.ticker);
    if (yahoo != null) return { price: yahoo, currency: 'USD' };
    const av = await fetchAlphaVantage(a.ticker);
    return av != null ? { price: av, currency: 'USD' } : null;
  }
  return null;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: assets, error } = await supabase
      .from('assets')
      .select('id,ticker,asset_type,market,currency');
    if (error) return json({ error: error.message }, 500);

    const list = (assets ?? []) as Asset[];
    const results = await Promise.allSettled(list.map((a) => priceFor(a)));

    const fetchedAt = new Date().toISOString();
    const rows: Array<{ asset_id: string; price: number; currency: string; fetched_at: string }> = [];
    const failures: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled' && r.value) {
        rows.push({ asset_id: list[i].id, price: r.value.price, currency: r.value.currency, fetched_at: fetchedAt });
      } else {
        failures.push(list[i].ticker);
      }
    }

    if (rows.length > 0) {
      const { error: upErr } = await supabase.from('price_cache').upsert(rows);
      if (upErr) return json({ error: upErr.message }, 500);
    }
    return json({
      message: `Updated ${rows.length} of ${list.length} assets`,
      updated: rows.length,
      failures,
    });
  } catch (e) {
    return json({ error: (e as Error).message ?? String(e) }, 500);
  }
});
