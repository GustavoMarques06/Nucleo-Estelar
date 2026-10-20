import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EN } from './en';
import { EXTRA_KEYS } from './extra';
import * as dataModules from './dataModules';

// Cobertura da tradução: todo texto que o jogador pode ver precisa ter versão em inglês.
// Com I18N_DUMP=arquivo.json, grava os textos que faltam (agrupados) para facilitar a escrita do dicionário.

const ROOT = join(__dirname, '..');
const walk = (dir: string, out: string[] = []): string[] => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== 'i18n') walk(p, out); }
    else if (/\.(ts|tsx)$/.test(n) && !/\.test\./.test(n)) out.push(p);
  }
  return out;
};

const unesc = (s: string) => s.replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n');

// Um literal entre aspas simples, duplas ou crase (sem interpolação), com escapes.
const LIT = (n: number) => `(['"\`])((?:\\\\.|(?!\\${n})[^\\\\])*)\\${n}`;

/** Literais passados a t(), tp(), <Tx k=…>, toast(…) e `reason:` no código. */
function sourceKeys(): Map<string, string> {
  const found = new Map<string, string>();
  const patterns = [
    new RegExp(`\\bt\\(\\s*${LIT(1)}`, 'g'),
    new RegExp(`\\btp\\(\\s*[^,]+,\\s*${LIT(1)}\\s*,\\s*${LIT(3)}`, 'g'),
    new RegExp(`\\bk=${LIT(1)}`, 'g'),
    new RegExp(`\\btoast\\(\\s*${LIT(1)}`, 'g'),
    new RegExp(`\\breason:\\s*${LIT(1)}`, 'g'),
  ];
  for (const file of walk(ROOT)) {
    const src = readFileSync(file, 'utf8');
    for (const re of patterns) {
      for (const m of src.matchAll(re)) {
        const rel = file.slice(ROOT.length + 1).split('\\').join('/');
        found.set(unesc(m[2]), rel);
        if (m[4] !== undefined) found.set(unesc(m[4]), rel);
      }
    }
  }
  return found;
}

const TEXT_KEYS = new Set([
  'name', 'desc', 'text', 'title', 'label', 'hint', 'tagline', 'treatyText', 'allianceText', 'bondText', 'rewardText', 'requiresText',
  'fixLabel', 'short', 'use', 'rarity', 'auto', 'bonus', 'sub', 'lines',
]);

/** Textos dos dados do jogo (nomes, descrições, histórias…). Funções (descrições por nível) usam t() por dentro. */
function dataKeys(): Map<string, string> {
  const found = new Map<string, string>();
  const seen = new WeakSet<object>();
  const visit = (v: unknown, key: string, from: string) => {
    if (typeof v === 'string') { if (TEXT_KEYS.has(key) && /[A-Za-zÀ-ÿ]{2,}/.test(v)) found.set(v, from); return; }
    if (!v || typeof v !== 'object') return;
    if (seen.has(v as object)) return;
    seen.add(v as object);
    if (Array.isArray(v)) { v.forEach(x => visit(x, key, from)); return; }
    for (const [k, x] of Object.entries(v)) visit(x, k, from);
  };
  for (const [name, mod] of Object.entries(dataModules)) {
    if (/_BY_|_ID$/.test(name)) continue;
    visit(mod, name === 'TIER_NAME' ? 'text' : '', name);
  }
  return found;
}

function allKeys(): Map<string, string> {
  const all = new Map<string, string>();
  for (const [k, v] of dataKeys()) all.set(k, `data:${v}`);
  for (const [k, v] of sourceKeys()) all.set(k, v);
  for (const k of EXTRA_KEYS) all.set(k, 'extra');
  return all;
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');

describe('tradução para o inglês', () => {
  const keys = allKeys();
  const missing = [...keys].filter(([k]) => EN[k] === undefined);

  it('todo texto do jogo tem versão em inglês', () => {
    if (process.env.I18N_DUMP) {
      const grouped: Record<string, string[]> = {};
      for (const [k, where] of missing) (grouped[where] ??= []).push(k);
      writeFileSync(process.env.I18N_DUMP, JSON.stringify(grouped, null, 1));
    }
    expect(missing.slice(0, 15).map(([k, w]) => `${w}: ${k}`)).toEqual([]);
  });

  it('as traduções mantêm os mesmos {marcadores}', () => {
    const bad = Object.entries(EN).filter(([pt, en]) => placeholders(pt) !== placeholders(en)).map(([pt]) => pt);
    expect(bad).toEqual([]);
  });

  it('não sobram traduções órfãs (chaves que o jogo não usa)', () => {
    const orphans = Object.keys(EN).filter(k => !keys.has(k));
    // Tolerância: textos montados por código (ex.: eventos de tensão entre facções) entram pelo conteúdo, não pelo varredor.
    expect(orphans.length).toBeLessThan(40);
  });
});
