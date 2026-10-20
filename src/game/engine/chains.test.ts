import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { newGame } from './state';
import { simulate } from './economy';
import { ascend, chooseEvent, spawnEvent, surfaceChain } from './progression';
import { parseSave, serialize } from './save';
import { EVENTS, EVENT_BY_ID } from '../data/events';
import { CHAIN_EVENTS } from '../data/chains';

const rich = (s: GameState) => {
  Object.assign(s.resources, { credits: 1e9, science: 1e6, components: 1e6, alloys: 1e6, fuel: 1e6 });
  s.stats.earned = 1e6;
  return s;
};
const at = (id: string, seed = 1): GameState => { const s = rich(newGame(0)); s.event = { id, remaining: 60, seed }; return s; };

describe('cadeias de eventos', () => {
  it('toda continuação aponta para um evento que existe; continuações nunca são sorteadas sozinhas', () => {
    for (const e of EVENTS) for (const c of e.choices) for (const st of [c.chain ?? []].flat()) {
      expect(EVENT_BY_ID[st.event], `${e.id} → ${st.event}`).toBeDefined();
      expect(EVENT_BY_ID[st.event].followUp, st.event).toBe(true);
      expect(st.delay).toBeGreaterThan(0);
    }
    for (const e of CHAIN_EVENTS.filter(x => x.followUp)) expect(e.minPhase(rich(newGame(0))), e.id).toBe(false);
    const s = rich(newGame(0)); s.upgrades.lab = true; s.upgrades.commerce = true; s.resources.population = 100; s.routes = [{ id: 'r', a: 'x', b: 'y' }];
    s.stats.produced = { alloys: 999 };
    const seen = new Set<string>();
    for (let i = 1; i < 300; i++) seen.add(spawnEvent({ ...s, event: null }, (() => { let x = i; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })()).event?.id ?? '');
    for (const e of CHAIN_EVENTS.filter(x => x.followUp)) expect(seen.has(e.id), e.id).toBe(false);
    for (const start of ['signal', 'strike', 'shady', 'pirate']) expect(seen.has(start), start).toBe(true);
  });

  it('a escolha agenda a continuação; ela só surge depois do prazo e quando não há outro evento', () => {
    let s = chooseEvent(at('signal'), 0)!.state;                                   // decodificar
    expect(s.chain).toEqual([{ event: 'signalCoords', remaining: 150 }]);
    expect(s.event).toBeNull();
    expect(surfaceChain(s)).toBe(s);                                               // ainda não é hora
    s = simulate(s, 149).state;
    expect(surfaceChain(s).event).toBeNull();
    s = simulate(s, 2).state;
    const shown = surfaceChain(s);
    expect(shown.event!.id).toBe('signalCoords');
    expect(shown.chain).toHaveLength(0);
    expect(shown.event!.remaining).toBeGreaterThan(60);                            // continuações duram mais que um evento comum
    // com outro evento na tela, espera
    const busy = { ...s, event: { id: 'comet', remaining: 30, seed: 1 } };
    expect(surfaceChain(busy)).toBe(busy);
  });

  it('o sorteio entre continuações é determinístico pela semente e respeita as probabilidades', () => {
    const count: Record<string, number> = {};
    let none = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const s = chooseEvent(at('signal', seed), 1)!.state;                          // amplificar: 60% convidado, 40% coordenadas
      const again = chooseEvent(at('signal', seed), 1)!.state;
      expect(again.chain).toEqual(s.chain);
      if (!s.chain.length) none++; else count[s.chain[0].event] = (count[s.chain[0].event] ?? 0) + 1;
    }
    expect(none).toBe(0);
    expect(count.signalGuest / 400).toBeGreaterThan(0.5);
    expect(count.signalGuest / 400).toBeLessThan(0.7);
    // quando as probabilidades não somam 1, a sobra é "nada acontece"
    let silent = 0;
    for (let seed = 1; seed <= 400; seed++) if (!chooseEvent(at('strike', seed), 1)!.state.chain.length) silent++;      // 75% de tumulto
    expect(silent / 400).toBeGreaterThan(0.18);
    expect(silent / 400).toBeLessThan(0.32);
  });

  it('as escolhas ficam lembradas e mudam as continuações', () => {
    let s = chooseEvent(at('signal'), 1)!.state;                                    // amplificar, resposta
    expect(s.flags).toContain('chain-signal');
    const friend = chooseEvent({ ...at('signalGuest'), flags: s.flags }, 0)!.state;
    expect(friend.flags).toContain('signal-friend');
    const withFriend = chooseEvent({ ...at('signalCoords'), flags: friend.flags }, 1)!;       // vender as coordenadas
    const without = chooseEvent(at('signalCoords'), 1)!;
    expect(withFriend.reward.credits!).toBeGreaterThan(without.reward.credits!);
  });

  it('cada história começa uma vez por jornada (a flag impede de repetir)', () => {
    const s = rich(newGame(0)); s.upgrades.lab = true;
    expect(EVENT_BY_ID.signal.minPhase(s)).toBe(true);
    const after = chooseEvent({ ...s, event: { id: 'signal', remaining: 60, seed: 1 } }, 2)!.state;     // ignorar
    expect(EVENT_BY_ID.signal.minPhase(after)).toBe(false);
  });

  it('terminar uma história conta; ficar no meio não', () => {
    let s = chooseEvent(at('shady'), 0)!.state;                                     // comprar → 75% inspeção
    expect(s.stats.chains).toBe(0);
    const done = chooseEvent(at('inspection'), 0)!.state;                            // pagar a multa: fim
    expect(done.stats.chains).toBe(1);
    // continuação que leva a outra não conta ainda
    const mid = chooseEvent(at('strikeRiot'), 1)!.state;
    expect(mid.stats.chains).toBe(0);
    expect(mid.chain[0].event).toBe('strikeAccord');
  });

  it('não acumula mais de 4 continuações, e some ao ascender (mas o total de histórias fica)', () => {
    let s = at('signal');
    s.chain = Array.from({ length: 4 }, () => ({ event: 'signalCoords', remaining: 500 }));
    expect(chooseEvent(s, 0)!.state.chain).toHaveLength(4);
    const j = rich(newGame(0));
    j.chain = [{ event: 'signalCoords', remaining: 100 }]; j.flags = ['chain-signal']; j.stats.chains = 3;
    j.upgrades.ascensionProject = true; j.stats.earned = 5e9;
    const next = ascend(j, 0)!;
    expect(next.chain).toEqual([]);
    expect(next.flags).toEqual([]);
    expect(next.stats.chains).toBe(3);
  });

  it('salvamento: guarda continuações, lembranças e contagem; lixo é descartado', () => {
    const s = newGame(0);
    s.chain = [{ event: 'strikeRiot', remaining: 88 }];
    s.flags = ['chain-strike', 'workers-trust'];
    s.stats.chains = 2;
    const back = parseSave(serialize(s))!;
    expect(back.chain).toEqual(s.chain);
    expect(back.flags).toEqual(s.flags);
    expect(back.stats.chains).toBe(2);
    const raw = JSON.parse(serialize(s));
    raw.chain = [...raw.chain, { event: 'nao-existe', remaining: 5 }];
    raw.flags = ['a', 7, 'a', 'x'.repeat(100)];
    const clean = parseSave(JSON.stringify(raw))!;
    expect(clean.chain).toHaveLength(1);
    expect(clean.flags).toEqual(['a']);
    const old = JSON.parse(serialize(newGame(0)));
    old.version = 12; delete old.chain; delete old.flags;
    expect(parseSave(JSON.stringify(old))!.chain).toEqual([]);
  });
});
