import { EN } from './en';

// Idiomas: o texto-fonte do jogo é o português; o inglês é um dicionário indexado pelo texto em português.
// `t('Texto em português {n}', { n: 3 })` devolve o texto no idioma atual (ou o próprio texto, se não houver tradução).
export type Lang = 'pt' | 'en';
export type LangPref = 'auto' | Lang;

let current: Lang = 'pt';
export const getLang = (): Lang => current;
export const setLang = (l: Lang) => { current = l; };
/** Locale de números e datas do idioma atual. */
export const locale = () => (current === 'en' ? 'en-US' : 'pt-BR');

/** Idioma efetivo para a preferência do jogador (automático = idioma do navegador). */
export function resolveLang(pref: LangPref, navLang = typeof navigator !== 'undefined' ? navigator.language : 'pt-BR'): Lang {
  if (pref !== 'auto') return pref;
  return navLang.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

export type Vars = Record<string, string | number>;

/** Textos pedidos em inglês que ainda não têm tradução (usado pelos testes e para achar lacunas jogando). */
export const missingKeys = new Set<string>();
if (typeof window !== 'undefined') (window as unknown as { __i18nMissing?: Set<string> }).__i18nMissing = missingKeys;

const looksPortuguese = (s: string) => /[áàâãéêíóôõúç]|\b(de|do|da|dos|das|para|com|uma?|que|não|por|em|no|na|os|as|ao|mais|ou|se|já)\b/i.test(s);
let translated: Set<string> | null = null;
/** Texto que já está em inglês (traduzido antes e passado de novo ao t()): não conta como lacuna. */
const isTranslated = (s: string) => (translated ??= new Set(Object.values(EN))).has(s);

/** Traduz `pt` e troca os \`{nome}\` pelos valores de `vars`. */
export function t(pt: string, vars?: Vars): string {
  let base = pt;
  if (current === 'en') {
    const en = EN[pt];
    if (en === undefined) { if (looksPortuguese(pt) && !isTranslated(pt)) missingKeys.add(pt); } else base = en;
  }
  return vars ? base.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : base;
}

/** Traduz sem registrar lacunas: para textos que podem já vir montados (avisos compostos). */
export const tStatic = (pt: string): string => (current === 'en' ? EN[pt] ?? pt : pt);

/** Nomes gerados com número no fim ("Veio ferroso 3"): traduz só a parte do nome. */
export const tName = (s: string): string => s.replace(/^(.*?)( \d+)?$/, (_, a: string, n?: string) => t(a) + (n ?? ''));

/** Plural simples: \`tp(n, 'um local', '{n} locais')\`. */
export function tp(n: number, one: string, many: string, vars?: Vars): string {
  return t(n === 1 ? one : many, { n, ...vars });
}
