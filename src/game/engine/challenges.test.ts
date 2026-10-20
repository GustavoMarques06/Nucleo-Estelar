import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { newGame } from './state';
import { ascend, canTranscend, transcend } from './progression';
import { activeChallenge, challengeBlocks, challengeMet, challengesUnlocked, deadlineLeft } from './challenges';
import { getModifiers } from './modifiers';
import { sell, simulate } from './economy';
import { establishOutpost, generateLocation } from './expansion';
import { diplomacyUnlocked } from './factions';
import { parseSave, serialize } from './save';
import { CHALLENGES, CHALLENGE_BY_ID } from '../data/challenges';

const ready = (): GameState => {
  const s = newGame(0);
  s.upgrades.ascensionProject = true;
  s.stats.earned = 5e9;
  return s;
};

describe('desafios de Ascensão', () => {
  it('ids únicos, regras e recompensas definidas', () => {
    expect(new Set(CHALLENGES.map(c => c.id)).size).toBe(CHALLENGES.length);
    for (const c of CHALLENGES) {
      expect(c.reward.length, c.id).toBeGreaterThan(0);
      expect(c.effects.length > 0 || c.block || c.deadline, `${c.id} sem regra`).toBeTruthy();
    }
  });

  it('só aparecem depois da primeira Ascensão', () => {
    expect(challengesUnlocked(newGame(0))).toBe(false);
    const s = ascend(ready(), 0)!;
    expect(challengesUnlocked(s)).toBe(true);
  });

  it('ascender escolhendo um desafio o deixa ativo; sem escolha, a jornada é normal; ids inválidos são ignorados', () => {
    expect(ascend(ready(), 0, 'nocommerce')!.challenges.active).toBe('nocommerce');
    expect(ascend(ready(), 0)!.challenges.active).toBeNull();
    expect(ascend(ready(), 0, 'inventado')!.challenges.active).toBeNull();
  });

  it('cumprir o desafio (ascender com ele ativo) concede a recompensa uma única vez', () => {
    let s = ascend(ready(), 0, 'rationed')!;
    expect(getModifiers(s).energyAll).toBeCloseTo(0.6);                             // a regra vale na jornada do desafio
    expect(activeChallenge(s)!.id).toBe('rationed');
    s.upgrades.ascensionProject = true; s.stats.earned = 5e9;
    s = ascend(s, 0)!;
    expect(s.challenges.done).toEqual(['rationed']);
    expect(s.challenges.active).toBeNull();
    expect(getModifiers(s).energyAll).toBeCloseTo(1.15);                            // a recompensa (×1,15) é permanente
    // um desafio já concluído não pode ser escolhido de novo
    s.upgrades.ascensionProject = true; s.stats.earned = 5e9;
    expect(ascend(s, 0, 'rationed')!.challenges.active).toBeNull();
  });

  it('as regras de energia, custo, ciência e armazém alteram a produção enquanto o desafio está ativo', () => {
    const base = newGame(0);
    const mk = (id: string) => ({ ...newGame(0), challenges: { active: id, done: [] as string[] } });
    expect(getModifiers(mk('rationed')).energyAll).toBeCloseTo(0.6);
    expect(getModifiers(mk('poverty')).cost).toBeCloseTo(getModifiers(base).cost * 1.5);
    expect(getModifiers(mk('scarce')).resource.science).toBe(0.5);
    expect(getModifiers(mk('tight')).storage).toBe(0.5);
  });

  it('sem comércio: nada se vende, nem à mão nem automaticamente', () => {
    const s = { ...newGame(0), challenges: { active: 'nocommerce', done: [] as string[] } };
    s.resources.iron = 50;
    expect(challengeBlocks(s, 'sell')).toBe(true);
    expect(sell(s, 'iron').earned).toBe(0);
    s.upgrades.logistics = true; s.autosell.iron = true;
    expect(simulate(s, 5).state.resources.iron).toBe(50);
  });

  it('eremita: não funda colônias; sem aliados: diplomacia fechada', () => {
    const base = { ...newGame(0), challenges: { active: 'hermit', done: [] as string[] } };
    Object.assign(base.resources, { credits: 1e12, alloys: 1e9, components: 1e9, ships: 10 });
    const loc = generateLocation(7);
    base.locations.push(loc);
    expect(establishOutpost(base, loc.id, 'mining')).toBeNull();
    expect(establishOutpost({ ...base, challenges: { active: null, done: [] } }, loc.id, 'mining')).not.toBeNull();
    const iso = { ...newGame(0), challenges: { active: 'isolation', done: [] as string[] } };
    iso.upgrades.diplomacy = true;
    expect(diplomacyUnlocked(iso)).toBe(false);
    expect(diplomacyUnlocked({ ...iso, challenges: { active: null, done: [] } })).toBe(true);
  });

  it('corrida: vale só se a Ascensão chegar no prazo', () => {
    const s = { ...ready(), challenges: { active: 'sprint', done: [] as string[] } };
    s.stats.playTime = 3600;
    expect(deadlineLeft(s)).toBe(CHALLENGE_BY_ID.sprint.deadline! - 3600);
    expect(challengeMet(s)).toBe(true);
    expect(ascend(s, 0)!.challenges.done).toEqual(['sprint']);
    const late = { ...s, stats: { ...s.stats, playTime: 20 * 3600 } };
    expect(challengeMet(late)).toBe(false);
    expect(deadlineLeft(late)).toBe(0);
    expect(ascend(late, 0)!.challenges.done).toEqual([]);
  });

  it('a Transcendência mantém os desafios concluídos e encerra o ativo', () => {
    const s = ready();
    s.challenges = { active: 'tight', done: ['poverty'] };
    s.transcendence.unlocked = true; s.megaprojects.core = 5; s.megaprojects.singularity = 5; s.ascension.total = 100;
    expect(canTranscend(s)).toBe(true);
    const t = transcend(s, 0)!;
    expect(t.challenges).toEqual({ active: null, done: ['poverty'] });
  });

  it('salvamento: guarda o desafio ativo e os concluídos; lixo é descartado', () => {
    const s = newGame(0);
    s.challenges = { active: 'tight', done: ['poverty', 'sprint'] };
    const back = parseSave(serialize(s))!;
    expect(back.challenges).toEqual(s.challenges);
    const raw = JSON.parse(serialize(s));
    raw.challenges = { active: 'poverty', done: ['poverty', 'nao-existe', 4, 'poverty'] };
    const clean = parseSave(JSON.stringify(raw))!;
    expect(clean.challenges).toEqual({ active: null, done: ['poverty'] });      // o ativo já concluído é descartado
    const old = JSON.parse(serialize(newGame(0)));
    old.version = 11; delete old.challenges;
    expect(parseSave(JSON.stringify(old))!.challenges).toEqual({ active: null, done: [] });
  });
});
