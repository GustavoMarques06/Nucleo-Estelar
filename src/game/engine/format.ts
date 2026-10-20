import { getLang, locale } from '../../i18n';

// Abreviações legíveis: português "1,2 mil · 3,4 mi · 5 bi · 6 tri · 7 quatri…" e inglês "1.2K · 3.4M · 5B · 6T · 7Qa…" até 10^33; depois notação científica.
const UNITS_PT: [number, string][] = [[1e33, 'dec'], [1e30, 'non'], [1e27, 'oct'], [1e24, 'sept'], [1e21, 'sext'], [1e18, 'quint'], [1e15, 'quatri'], [1e12, 'tri'], [1e9, 'bi'], [1e6, 'mi'], [1e3, 'mil']];
const UNITS_EN: [number, string][] = [[1e33, 'Dc'], [1e30, 'No'], [1e27, 'Oc'], [1e24, 'Sp'], [1e21, 'Sx'], [1e18, 'Qi'], [1e15, 'Qa'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];

const cache = new Map<string, Intl.NumberFormat>();
const nf = (digits: number) => {
  const key = `${locale()}/${digits}`;
  let f = cache.get(key);
  if (!f) { f = new Intl.NumberFormat(locale(), { maximumFractionDigits: digits }); cache.set(key, f); }
  return f;
};

/** Número com separador decimal do idioma atual (para textos como "×1,5"). */
export const fmtNum = (n: number, digits = 2) => nf(digits).format(n);

export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const sign = n < 0 ? '−' : '';
  n = Math.abs(n);
  const en = getLang() === 'en';
  if (n >= 1e36) return sign + (en ? n.toExponential(2) : n.toExponential(2).replace('.', ','));
  for (const [v, u] of en ? UNITS_EN : UNITS_PT) if (n >= v) return `${sign}${nf(1).format(Math.floor((n / v) * 10) / 10)}${en ? '' : ' '}${u}`;
  if (n > 0 && n < 0.1) return sign + nf(2).format(Math.floor(n * 100) / 100 || 0.01);
  if (n < 10 && n % 1 !== 0) return sign + nf(1).format(Math.floor(n * 10) / 10);
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
