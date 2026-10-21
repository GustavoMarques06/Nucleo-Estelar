import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { newGame } from './state';
import { fissureFinale, fissureStrike, simulate } from './economy';
import { capsOf, getModifiers } from './modifiers';
import { ascend, buildMegaStage, pendingAscension, transcend } from './progression';
import { parseSave, serialize } from './save';
import { chooseDoctrine, doctrinePending } from './doctrines';
import { DIRECTIVE_MAX, addDirective, removeDirective, updateDirective } from './directives';
import { crewLevel, crewSeats, toggleCrew } from './crew';
import { CREW_MAX_LEVEL, crewXpFor } from '../data/crew';
import { canDig, digCost, hasAnomaly, startDig } from './digs';
import { DIG_STAGES, RELICS } from '../data/relics';
import { generateLocation } from './expansion';
import { recordTimeline } from './timeline';
import { SAMPLE_EVERY } from '../data/timeline';
import { canDelayRival, delayRival, rivalFor } from './race';
import { RACE_TIME } from '../data/race';
import { weekOf, weekStart, weeklyRule } from './weekly';
import { BANES, BOONS, WEEKLY_BONUS } from '../data/weekly';
import { veinsLeft } from './deposit';
import { planChain } from './planner';

const research = (s: GameState, ...ids: string[]) => { for (const id of ids) s.upgrades[id] = true; return s; };
const rich = (s: GameState) => {
  Object.assign(s.resources, { credits: 1e13, alloys: 1e9, components: 1e9, modules: 1e9, water: 1e9, fuel: 1e9, ships: 100, exotic: 1e6, science: 1e9, influence: 1e6 });
  return s;
};
/** Estado pronto para ascender. */
const ready = (s: GameState) => { research(s, 'ascensionProject'); s.stats.earned = 1e10; return s; };
/** Um local que tem sítio de anomalia (a semente decide). */
const anomalySite = () => { for (let seed = 1; ; seed++) { const l = generateLocation(seed); if (hasAnomaly(l)) return l; } };

describe('doutrinas', () => {
  it('cada eixo abre com a sua pesquisa e aceita uma escolha só', () => {
    let s = newGame(0);
    expect(chooseDoctrine(s, 'base', 'manufacture')).toBeNull();
    research(s, 'metallurgy');
    expect(doctrinePending(s)).toBe(true);
    s = chooseDoctrine(s, 'base', 'manufacture')!;
    expect(s.doctrines.base).toBe('manufacture');
    expect(doctrinePending(s)).toBe(false);
    expect(chooseDoctrine(s, 'base', 'extractive')).toBeNull();          // não troca antes da Ascensão
    expect(chooseDoctrine(research(s, 'habitats'), 'society', 'manufacture')).toBeNull();   // opção de outro eixo
  });

  it('os efeitos valem e a Ascensão libera a escolha de novo', () => {
    let s = research(newGame(0), 'metallurgy', 'habitats');
    const before = getModifiers(s);
    s = chooseDoctrine(chooseDoctrine(s, 'base', 'manufacture')!, 'society', 'technocracy')!;
    const m = getModifiers(s);
    expect(m.resource.alloys).toBeCloseTo((before.resource.alloys ?? 1) * 1.1);
    expect(m.resource.science).toBeCloseTo((before.resource.science ?? 1) * 1.1);
    expect(m.tax).toBeCloseTo(before.tax * 0.75);
    expect(m.upkeep).toBeCloseTo(before.upkeep * 1.2);
    expect(ascend(ready(s), 0)!.doctrines).toEqual({});
  });
});

describe('diretivas', () => {
  it('só com a IA operacional e no máximo seis', () => {
    let s = newGame(0);
    expect(addDirective(s)).toBeNull();
    research(s, 'ai');
    for (let i = 0; i < DIRECTIVE_MAX; i++) s = addDirective(s)!;
    expect(s.directives).toHaveLength(DIRECTIVE_MAX);
    expect(addDirective(s)).toBeNull();
    s = removeDirective(s, s.directives[0].id)!;
    expect(s.directives).toHaveLength(DIRECTIVE_MAX - 1);
  });

  it('recusa regras inválidas', () => {
    const s = addDirective(research(newGame(0), 'ai'))!;
    const id = s.directives[0].id;
    expect(updateDirective(s, id, { when: { kind: 'above', res: 'credits', frac: 0.9 } })).toBeNull();   // créditos não vão para o armazém
    expect(updateDirective(s, id, { when: { kind: 'above', res: 'iron', frac: 0.33 } })).toBeNull();
    expect(updateDirective(s, id, { then: { kind: 'throttle', building: 'storage', value: 0.5 } })).toBeNull();
    expect(updateDirective(s, id, { then: { kind: 'sell', res: 'population' } })).toBeNull();
    expect(updateDirective(s, id, { then: { kind: 'throttle', building: 'refinery', value: 0.5 } })!.directives[0].then).toEqual({ kind: 'throttle', building: 'refinery', value: 0.5 });
  });

  it('vende o excedente quando o armazém passa do limite', () => {
    let s = addDirective(research(newGame(0), 'ai'))!;              // padrão: ferro acima de 90% → vender
    const cap = capsOf(s).iron;
    s.resources.iron = cap;
    const credits = s.resources.credits;
    s = simulate(s, 1).state;
    expect(s.resources.iron).toBeLessThanOrEqual(cap * 0.5 + 1);
    expect(s.resources.credits).toBeGreaterThan(credits);
    expect(s.directives[0].fired).toBe(1);
    // desligada não faz nada
    s = updateDirective(s, s.directives[0].id, { on: false })!;
    s.resources.iron = cap;
    expect(simulate(s, 1).state.resources.iron).toBeGreaterThan(cap * 0.9);
  });

  it('muda o ritmo quando falta energia', () => {
    let s = addDirective(research(newGame(0), 'ai'))!;
    s = updateDirective(s, s.directives[0].id, { when: { kind: 'energyShort' }, then: { kind: 'throttle', building: 'refinery', value: 0.25 } })!;
    s.buildings.refinery = 30;
    s = simulate(s, 1).state;
    expect(s.throttle.refinery).toBe(0.25);
  });

  it('não vende no desafio Sem comércio e sobrevive à Ascensão', () => {
    const s = addDirective(research(newGame(0), 'ai'))!;
    s.challenges.active = 'nocommerce';
    s.resources.iron = capsOf(s).iron;
    expect(simulate(s, 1).state.resources.iron).toBeGreaterThan(capsOf(s).iron * 0.9);
    const next = ascend(ready({ ...s, challenges: { active: null, done: [] } }), 0)!;
    expect(next.directives).toHaveLength(1);
    expect(next.directives[0].fired).toBe(0);
  });
});

describe('conselho', () => {
  it('só quem já chegou entra, e as vagas são poucas', () => {
    let s = newGame(0);
    expect(toggleCrew(s, 'eco')).toBeNull();
    s.story.push('tx-eco-1', 'tx-mira-1', 'tx-brokk-1');
    expect(crewSeats(s)).toBe(2);
    s = toggleCrew(toggleCrew(s, 'eco')!, 'mira')!;
    expect(toggleCrew(s, 'brokk')).toBeNull();
    s = toggleCrew(s, 'eco')!;                              // tira da ativa
    expect(s.crew.active).toEqual(['mira']);
    s.ascension.count = 1;
    expect(crewSeats(s)).toBe(3);
  });

  it('ganha experiência na ativa e o bônus só vale para quem está nela', () => {
    let s = newGame(0);
    s.story.push('tx-mira-1');
    s = toggleCrew(s, 'mira')!;
    s = simulate(s, crewXpFor(2)).state;
    expect(crewLevel(s.crew.xp.mira)).toBe(2);
    expect(getModifiers(s).resource.science).toBeCloseTo(1.05);
    s = toggleCrew(s, 'mira')!;
    expect(getModifiers(s).resource.science ?? 1).toBe(1);
    expect(crewLevel(1e12)).toBe(CREW_MAX_LEVEL);
  });

  it('o nível nunca se perde (Ascensão e Transcendência)', () => {
    let s = newGame(0);
    s.story.push('tx-eco-1');
    s = toggleCrew(s, 'eco')!;
    s.crew.xp.eco = crewXpFor(5);
    const asc = ascend(ready(s), 0)!;
    expect(crewLevel(asc.crew.xp.eco)).toBe(5);
    expect(asc.crew.active).toEqual(['eco']);
    const tr = transcend({ ...ready(s), transcendence: { ...s.transcendence, unlocked: true }, megaprojects: { singularity: 5 } }, 0)!;
    expect(crewLevel(tr.crew.xp.eco)).toBe(5);
  });
});

describe('escavações e relíquias', () => {
  it('o sítio de anomalia é decidido pela semente', () => {
    const l = anomalySite();
    expect(hasAnomaly(l)).toBe(true);
    expect(hasAnomaly(generateLocation(l.seed))).toBe(true);
    const share = Array.from({ length: 2000 }, (_, i) => hasAnomaly(generateLocation(i + 1))).filter(Boolean).length / 2000;
    expect(share).toBeGreaterThan(0.15);
    expect(share).toBeLessThan(0.3);
  });

  it('três etapas pagas até a relíquia, que fica para sempre', () => {
    let s = rich(research(newGame(0), 'exploration'));
    s.stats.earned = 1e9;
    const loc = anomalySite();
    s.locations.push(loc);
    const credits = s.resources.credits;
    s = startDig(s, loc.id)!;
    expect(s.resources.credits).toBe(credits - digCost({ ...s, stats: { ...s.stats } }, 0).credits!);
    expect(canDig(s, loc.id).ok).toBe(false);                      // etapa em andamento
    for (let stage = 0; stage < DIG_STAGES.length; stage++) {
      if (stage > 0) s = startDig(s, loc.id)!;
      s = simulate(s, DIG_STAGES[stage].time + 1).state;
    }
    expect(s.relics).toHaveLength(1);
    expect(s.dug).toEqual([loc.id]);
    expect(s.digs).toEqual([]);
    expect(canDig(s, loc.id).ok).toBe(false);
    const asc = ascend(ready(s), 0)!;
    expect(asc.relics).toEqual(s.relics);
    expect(asc.dug).toEqual([]);
  });

  it('com todas as relíquias, o sítio rende material', () => {
    let s = rich(research(newGame(0), 'exploration'));
    s.relics = RELICS.map(r => r.id);
    const loc = anomalySite();
    s.locations.push(loc);
    s = startDig(s, loc.id)!;
    for (let stage = 0; stage < DIG_STAGES.length; stage++) {
      if (stage > 0) s = startDig(s, loc.id)!;
      s = simulate(s, DIG_STAGES[stage].time + 1).state;
    }
    expect(s.relics).toHaveLength(RELICS.length);
    expect(s.dug).toEqual([loc.id]);
  });

  it('local sem anomalia não pode ser escavado', () => {
    const s = rich(research(newGame(0), 'exploration'));
    let seed = 1;
    while (hasAnomaly(generateLocation(seed))) seed++;
    s.locations.push(generateLocation(seed));
    expect(startDig(s, s.locations[0].id)).toBeNull();
  });
});

describe('linha do tempo', () => {
  it('guarda os marcos e a curva, e arquiva a jornada na Ascensão', () => {
    let s = newGame(0);
    s = recordTimeline(s);
    expect(s.timeline.samples).toHaveLength(1);
    expect(recordTimeline(s)).toBe(s);                             // nada novo: mesmo estado
    s.stats.playTime = SAMPLE_EVERY * 3 + 5;
    s.stats.earned = 1e6;
    s.buildings.refinery = 1;
    s = recordTimeline(s);
    expect(s.timeline.samples).toHaveLength(4);
    expect(s.timeline.marks.refinery).toBe(SAMPLE_EVERY * 3 + 5);
    const asc = ascend(ready(s), 0)!;
    expect(asc.timeline.samples).toEqual([]);
    expect(asc.timeline.past).toHaveLength(1);
    expect(asc.timeline.past[0].marks.refinery).toBe(SAMPLE_EVERY * 3 + 5);
    expect(asc.timeline.past[0].n).toBe(1);
  });
});

describe('corrida pelo Portal', () => {
  const racing = () => {
    const s = rich(research(newGame(0), 'diplomacy', 'megaEngineering'));
    s.factions.helix.relation = 30; s.factions.ferrum.relation = 10; s.factions.vesper.relation = 50;
    return s;
  };

  it('começa com a facção mais fria e termina em derrota se ela chegar antes', () => {
    let s = racing();
    expect(rivalFor(s)).toBe('ferrum');
    s = simulate(s, 1).state;
    expect(s.race?.faction).toBe('ferrum');
    const before = getModifiers(s).expedition;
    const r = simulate(s, RACE_TIME + 10);
    expect(r.report.race).toBe('lost');
    expect(r.state.race!.result).toBe('lost');
    expect(getModifiers(r.state).expedition).toBeCloseTo(before * 1.15);
  });

  it('o Portal pronto antes vence, e a influência atrasa a rival', () => {
    let s = simulate(racing(), 1).state;
    s.race!.progress = 0.5;
    const rel = s.factions.ferrum.relation;
    s = delayRival(s)!;
    expect(s.race!.progress).toBeCloseTo(0.4);
    expect(s.factions.ferrum.relation).toBe(rel - 4);
    s = buildMegaStage(s, 'gate')!;
    const r = simulate(s, 1);
    expect(r.report.race).toBe('won');
    expect(canDelayRival(r.state).ok).toBe(false);
    expect(getModifiers(r.state).outpost).toBeGreaterThan(getModifiers(s).outpost);
  });

  it('sem diplomacia não há corrida', () => {
    const s = rich(research(newGame(0), 'megaEngineering'));
    expect(simulate(s, 10).state.race).toBeNull();
  });
});

describe('desafio da semana', () => {
  it('a semana começa na segunda e a regra é sempre a mesma para a mesma semana', () => {
    const w = weekOf(Date.UTC(2026, 9, 20, 12));          // terça, 20/10/2026
    expect(weekStart(w).getUTCDay()).toBe(1);
    expect(weekOf(weekStart(w).getTime())).toBe(w);
    expect(weekOf(weekStart(w).getTime() - 1)).toBe(w - 1);
    expect(weeklyRule(w)).toEqual(weeklyRule(w));
    for (let k = 0; k < 200; k++) {
      const { boon, bane } = weeklyRule(w + k);
      expect(BOONS).toContain(boon);
      expect(BANES).toContain(bane);
      expect(boon.effects.some(e => e.kind === 'price') && bane.effects.some(e => e.kind === 'price')).toBe(false);
    }
  });

  it('ascender com a semana ativa dá mais dados e guarda o tempo', () => {
    const now = Date.UTC(2026, 9, 20);
    const s = ascend(ready(newGame(0)), now, 'weekly')!;
    expect(s.weekly.active).toBe(weekOf(now));
    expect(s.challenges.active).toBeNull();
    ready(s);
    s.stats.playTime = 3600;
    const normal = pendingAscension({ ...s, weekly: { ...s.weekly, active: null } });
    expect(normal).toBeGreaterThan(0);
    expect(pendingAscension(s)).toBe(Math.floor(normal * WEEKLY_BONUS));
    const next = ascend(s, now)!;
    expect(next.weekly).toEqual({ active: null, records: [{ week: weekOf(now), time: 3600 }] });
    // o melhor tempo da semana fica
    const again = ascend({ ...ready(next), weekly: { ...next.weekly, active: weekOf(now) }, stats: { ...next.stats, playTime: 7200, earned: 1e10 } }, now)!;
    expect(again.weekly.records).toEqual([{ week: weekOf(now), time: 3600 }]);
  });

  it('a regra da semana muda os modificadores', () => {
    const s = newGame(0);
    s.weekly.active = 3000;
    const { boon, bane } = weeklyRule(3000);
    expect(getModifiers(s)).not.toEqual(getModifiers(newGame(0)));
    expect(boon.id).not.toBe(bane.id);
  });
});

describe('fissuras', () => {
  it('cada rachadura rende mais que a anterior', () => {
    const s = newGame(0);
    const total = (step: number) => Object.values(fissureStrike(s, step).gained).reduce((a, b) => a + (b ?? 0), 0);
    expect(total(1)).toBeGreaterThan(total(0));
    expect(total(2)).toBeGreaterThan(total(1));
    expect(fissureStrike(s, 3).gained).toEqual({});
  });

  it('a fissura completa revela um veio de graça com Geologia', () => {
    const s = research(newGame(0), 'geology');
    const credits = s.resources.credits;
    const r = fissureFinale(s);
    expect(r.vein).toBe(true);
    expect(veinsLeft(r.state)).toHaveLength(1);
    expect(r.state.resources.credits).toBe(credits);
    const noGeo = fissureFinale(newGame(0));
    expect(noGeo.vein).toBe(false);
    expect(Object.keys(noGeo.gained).length).toBeGreaterThan(0);
  });
});

describe('salvamento dos sistemas novos', () => {
  it('salvar e abrir devolve tudo igual', () => {
    let s = rich(research(newGame(0), 'metallurgy', 'ai', 'exploration', 'diplomacy', 'megaEngineering'));
    s = chooseDoctrine(s, 'base', 'mercantile')!;
    s = addDirective(s)!;
    s = updateDirective(s, s.directives[0].id, { when: { kind: 'below', res: 'water', frac: 0.25 }, then: { kind: 'throttle', building: 'refinery', value: 0.5 } })!;
    s.story.push('tx-eco-1');
    s = toggleCrew(s, 'eco')!;
    const loc = anomalySite();
    s.locations.push(loc);
    s = startDig(s, loc.id)!;
    s.relics = ['lens', 'ember'];
    s = simulate(s, 30).state;
    s = recordTimeline(s);
    s.weekly = { active: 2900, records: [{ week: 2899, time: 1234 }] };
    s.timeline.past = [{ n: 1, time: 5000, earned: 1e9, marks: { lab: 100 }, samples: [1, 2, 3] }];
    const back = parseSave(serialize(s, 0))!;
    for (const k of ['doctrines', 'directives', 'crew', 'digs', 'dug', 'relics', 'timeline', 'race', 'weekly'] as const) expect(back[k], k).toEqual(s[k]);
    expect(s.race).not.toBeNull();
  });

  it('dados adulterados são descartados', () => {
    const s = newGame(0);
    const raw = JSON.parse(serialize(s, 0));
    Object.assign(raw, {
      doctrines: { base: 'technocracy', society: 'technocracy' },
      directives: [{ id: 'x', when: { kind: 'above', res: 'credits', frac: 0.9 }, then: { kind: 'sell', res: 'iron' }, on: true, fired: 3 }],
      crew: { xp: { eco: 1e30, ghost: 5 }, active: ['eco'] },
      relics: ['lens', 'lens', 'fake'],
      race: { faction: 'nobody', progress: 2 },
      weekly: { active: 'x', records: [{ week: 1, time: -5 }] },
    });
    delete raw.sig;
    const back = parseSave(JSON.stringify(raw))!;
    expect(back.doctrines).toEqual({ society: 'technocracy' });
    expect(back.directives).toEqual([]);
    expect(back.crew.xp).toEqual({ eco: crewXpFor(CREW_MAX_LEVEL) });
    expect(back.crew.active).toEqual([]);                          // ECO ainda não chegou nesta partida
    expect(back.relics).toEqual(['lens']);
    expect(back.race).toBeNull();
    expect(back.weekly).toEqual({ active: null, records: [{ week: 1, time: 0 }] });
  });
});

describe('planejador de cadeia', () => {
  it('dimensiona os elos do minério até a estrutura', () => {
    const s = newGame(0);
    const plan = planChain(s, 'refinery', 10);
    // 10 refinarias gastam 20 ferro/s; cada mineradora tira 1/s da crosta, ~68% ferro
    const miner = plan.rows.find(r => r.building === 'miner')!;
    expect(miner.feeds).toEqual(['iron']);
    expect(miner.units).toBeCloseTo(20 / (getModifiers(s).outputAll * 0.68), 0);
    expect(plan.energy).toBeGreaterThan(miner.units);            // as refinarias também gastam energia
  });

  it('um elo com dois minérios usa o mais exigente, e o que ninguém produz aparece como faltando', () => {
    const s = newGame(0);
    s.stats.totalMined = 100;                                 // libera a Refinaria
    const plan = planChain(s, 'factory', 4);                  // ligas (refinaria → ferro) + cobre direto
    const ids = plan.rows.map(r => r.building);
    expect(ids).toContain('refinery');
    expect(ids).toContain('miner');
    const miner = plan.rows.find(r => r.building === 'miner')!;
    expect(miner.feeds.sort()).toEqual(['copper', 'iron']);
    const noWater = planChain(newGame(0), 'chemicalPlant', 1);
    expect(noWater.missing).toContain('water');               // sem Extração de gelo, ninguém faz água
  });
});

describe('linha do tempo de saves antigos', () => {
  it('o que já tinha acontecido fica sem registro em vez de ganhar a hora de agora', () => {
    const s = newGame(0);
    s.buildings.refinery = 3;
    s.stats.playTime = 5 * SAMPLE_EVERY + 10;
    const raw = JSON.parse(serialize(s, 0));
    raw.version = 15;
    delete raw.timeline;
    const back = recordTimeline(parseSave(JSON.stringify(raw))!);
    expect(back.timeline.marks.refinery).toBe(-1);
    expect(back.timeline.samples.slice(0, 5)).toEqual([-1, -1, -1, -1, -1]);
    expect(back.timeline.samples).toHaveLength(6);
    expect(back.timeline.samples[5]).toBeGreaterThanOrEqual(0);
  });
});
