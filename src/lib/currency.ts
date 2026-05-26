export type Currency = 'BRL' | 'USD';

export function formatCurrency(value: number, currency: Currency, locale = 'pt-BR') {
  if (!isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, locale = 'pt-BR', maximumFractionDigits = 8) {
  if (!isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

export function formatPercent(value: number, locale = 'pt-BR') {
  if (!isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
