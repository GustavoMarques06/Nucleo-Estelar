// Abreviações legíveis em português: 1,2 mil · 3,4 mi · 5 bi · 6 tri · depois notação científica.
const UNITS: [number, string][] = [[1e12, 'tri'], [1e9, 'bi'], [1e6, 'mi'], [1e3, 'mil']];
const nf1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const sign = n < 0 ? '−' : '';
  n = Math.abs(n);
  if (n >= 1e15) return sign + n.toExponential(2).replace('.', ',');
  for (const [v, u] of UNITS) if (n >= v) return `${sign}${nf1.format(Math.floor((n / v) * 10) / 10)} ${u}`;
  if (n > 0 && n < 0.1) return sign + nf2.format(Math.floor(n * 100) / 100 || 0.01);
  if (n < 10 && n % 1 !== 0) return sign + nf1.format(Math.floor(n * 10) / 10);
  return sign + Math.floor(n).toString();
}

export function fmtRate(n: number): string {
  return (n >= 0 ? '+' : '−') + fmt(Math.abs(n)) + '/s';
}

export function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = Math.floor(seconds % 60);
  if (h) return `${h} h ${m} min`;
  if (m) return `${m} min`;
  return `${s} s`;
}
