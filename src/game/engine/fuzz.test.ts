// Teste de estresse dos pontos críticos: estados extremos e aleatórios, saves corrompidos e relógio alterado.
// Nada disso pode produzir NaN, infinito, recurso negativo ou exceção.
import { describe, expect, it } from 'vitest';
import type { GameState, LocationType, Specialization } from '../types';
import { newGame, rng } from './state';
import { simulate } from './economy';
import { parseSave, serialize } from './save';
import { applyOffline } from './offline';
import { generateLocation } from './expansion';
import { specOptions } from './aptitude';
import { BUILDING_IDS } from '../data/buildings';
import { UPGRADES } from '../data/upgrades';
import { RES_IDS } from '../data/resources';
import { LOCATION_TYPES } from '../data/locations';


/** Todo número do estado é finito; recursos e estruturas nunca ficam negativos. */
function check(s: GameState, where: string) {
  const bad: string[] = [];
  const walk = (v: unknown, path: string) => {
    if (typeof v === 'number') { if (!Number.isFinite(v)) bad.push(`${path}=${v}`); return; }
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  };
  walk(s, 's');
  for (const r of RES_IDS) if (s.resources[r] < -1e-6) bad.push(`recurso ${r}=${s.resources[r]}`);
  for (const b of BUILDING_IDS) if (s.buildings[b] < 0 || !Number.isInteger(s.buildings[b])) bad.push(`estrutura ${b}=${s.buildings[b]}`);
  expect(bad, where).toEqual([]);
}

/** Estado aleatório, de um começo vazio a um fim de jogo exagerado. */
function randomState(seed: number): GameState {
  const r = rng(seed);
  const big = (max: number) => Math.floor(Math.pow(10, r() * max)) - 1;   // espalhado em escala logarítmica
  const s = newGame(0);
  for (const b of BUILDING_IDS) if (r() < 0.6) s.buildings[b] = big(3);
  for (const u of UPGRADES) if (r() < 0.5) s.upgrades[u.id] = true;
  for (const res of RES_IDS) s.resources[res] = r() < 0.2 ? 0 : big(14);
  s.stats.totalMined = big(13);
  const types = LOCATION_TYPES.map(t => t.type) as LocationType[];
  const n = Math.floor(r() * 12);
  for (let i = 0; i < n; i++) {
    const loc = { ...generateLocation(seed * 100 + i), type: types[Math.floor(r() * types.length)] };
    const opts = specOptions(loc);
    if (r() < 0.7) loc.outpost = { level: 1 + big(2), spec: opts[Math.floor(r() * opts.length)] as Specialization, terra: Math.floor(r() * 6), terraRemaining: 0, terraTotal: 0 };
    s.locations.push(loc);
  }
  s.savedAt = 0;
  return s;
}

describe('estresse: simulação', () => {
  it('estados extremos aleatórios continuam válidos depois de simular (passos curtos e longos)', () => {
    for (let seed = 1; seed <= 120; seed++) {
      let s = randomState(seed);
      for (const dt of [0.001, 0.25, 1, 60, 3600]) {
        s = simulate(s, dt).state;
        check(s, `semente ${seed}, dt ${dt}`);
      }
    }
  });

  it('jogo novo parado por muito tempo não quebra', () => {
    let s = newGame(0);
    for (let i = 0; i < 50; i++) s = simulate(s, 3600).state;
    check(s, 'jogo novo');
  });
});

describe('estresse: save', () => {
  it('ida e volta preserva o estado de estados extremos', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const s = simulate(randomState(seed), 1).state;
      const back = parseSave(serialize(s));
      expect(back, `semente ${seed}`).not.toBeNull();
      check(back!, `save ${seed}`);
      for (const r of RES_IDS) expect(back!.resources[r], `${seed} ${r}`).toBeCloseTo(s.resources[r], 6);
      expect(back!.buildings).toEqual(s.buildings);
    }
  });

  it('save corrompido campo a campo nunca lança exceção nem gera número inválido', () => {
    const base = JSON.parse(serialize(simulate(randomState(7), 1).state));
    const junk: unknown[] = [null, 'abc', -1, -1e308, 1e308, 'NaN', [], {}, true, '1e999', 0.5];
    const paths: string[][] = [];
    const collect = (v: unknown, path: string[]) => {
      paths.push(path);
      if (v && typeof v === 'object' && path.length < 4) for (const k of Object.keys(v).slice(0, 40)) collect((v as Record<string, unknown>)[k], [...path, k]);
    };
    collect(base, []);
    const r = rng(99);
    for (const path of paths.slice(1)) {
      const d = structuredClone(base);
      let o = d;
      for (const k of path.slice(0, -1)) o = o[k];
      o[path[path.length - 1]] = junk[Math.floor(r() * junk.length)];
      let s: GameState | null = null;
      expect(() => { s = parseSave(JSON.stringify(d)); }, path.join('.')).not.toThrow();
      if (s) {
        check(s, `campo ${path.join('.')}`);
        expect(() => simulate(s!, 1), path.join('.')).not.toThrow();
      }
    }
  });

  it('textos que não são save viram null, sem exceção', () => {
    for (const t of ['', '{', 'null', '[]', '"x"', '123', '{"version":"a"}', '{"version":1e9}', JSON.stringify({ version: 1, resources: 5 })]) {
      expect(() => parseSave(t), t).not.toThrow();
    }
  });
});

describe('estresse: progresso offline', () => {
  it('relógio adiantado, atrasado ou absurdo não quebra nem dá produção a mais', () => {
    const s = simulate(randomState(3), 1).state;
    for (const savedAt of [-1e15, -1, 0, 1e12, Date.now() + 1e10, NaN]) {
      const r = applyOffline({ ...s, savedAt }, Date.now());
      check(r.state, `savedAt ${savedAt}`);
      if (r.summary) expect(r.summary.seconds).toBeLessThanOrEqual(8 * 3600 + 1e9);
    }
  });

  it('volta no tempo (relógio atrasado) não rende nada', () => {
    const s = simulate(randomState(4), 1).state;
    const now = 1e12;
    const r = applyOffline({ ...s, savedAt: now + 3600_000 }, now);
    expect(r.summary).toBeNull();
    for (const res of RES_IDS) expect(r.state.resources[res]).toBe(s.resources[res]);
  });
});
