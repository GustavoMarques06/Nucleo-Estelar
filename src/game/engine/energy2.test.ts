import { describe, expect, it } from 'vitest';
import { newGame } from './state';
import { simulate } from './economy';
import { parseSave, serialize } from './save';
import { energyBalance, getModifiers } from './modifiers';
import { BALANCE } from '../data/balance';
import { faultChance, overclockPhase, overclockReactor, toggleProtect } from './energy';
import { generateLocation, linkColony, linkCost, linkDemand, outpostYield } from './expansion';
import { spawnCrisis } from './crises';

const base = () => { const s = newGame(0); s.resources.credits = 1e12; return s; };

describe('sobrecarga com risco de pane', () => {
  it('sem pane: sobrecarga normal; com pane: gera metade e esfria mais tempo', () => {
    const s = base(); s.buildings.fission = 1;
    const ok = overclockReactor(s, 'fission', () => 1)!;
    expect(ok.overclock.fission).toEqual({ left: BALANCE.overclockTime, cool: 0 });
    const bad = overclockReactor(s, 'fission', () => 0)!;
    expect(bad.overclock.fission?.fault).toBe(true);
    expect(overclockPhase(bad, 'fission').kind).toBe('cooling');
    const normal = energyBalance(s).supply - BALANCE.baseEnergy;
    expect(energyBalance(bad).supply - BALANCE.baseEnergy).toBeCloseTo(normal * BALANCE.overclockFaultOutput);
    const later = simulate(bad, BALANCE.overclockCooldown * BALANCE.overclockFaultCool + 1).state;
    expect(later.overclock.fission).toBeUndefined();
    expect(energyBalance(later).supply).toBeCloseTo(energyBalance(s).supply);
  });
  it('a fusão e a antimatéria arriscam mais que a fissão', () => {
    expect(faultChance('fusion')).toBeGreaterThan(faultChance('fission'));
    expect(faultChance('antimatter')).toBeGreaterThan(faultChance('fusion'));
  });
  it('a pane sobrevive ao salvar e abrir', () => {
    const s = base(); s.buildings.fission = 1;
    const back = parseSave(serialize(overclockReactor(s, 'fission', () => 0)!))!;
    expect(back.overclock.fission?.fault).toBe(true);
  });
});

describe('racionamento', () => {
  it('categoria protegida é atendida primeiro quando falta energia', () => {
    const s = base();
    Object.assign(s.buildings, { solar: 1, miner: 6, refinery: 6 });
    s.resources.iron = 1000;
    const plain = simulate(s, 1).report;
    expect(plain.energy.ratio).toBeLessThan(1);
    const prot = toggleProtect(s, 'industry')!;
    const r = simulate(prot, 1).report;
    const ratio = (id: 'refinery' | 'miner') => { const st = r.status[id]; return st?.kind === 'power' ? st.ratio : 1; };
    expect(ratio('refinery')).toBeGreaterThan(ratio('miner'));  // a indústria protegida recebe energia antes das mineradoras
    expect(toggleProtect(prot, 'industry')!.protect).toEqual([]);
    expect(toggleProtect(s, 'energy')).toBeNull();
  });
  it('ida e volta preserva a proteção e ignora categorias inválidas', () => {
    const s = toggleProtect(base(), 'science')!;
    expect(parseSave(serialize(s))!.protect).toEqual(['science']);
    const raw = JSON.parse(serialize(s)); raw.protect = ['science', 'lixo', 'energy'];
    expect(parseSave(JSON.stringify(raw))!.protect).toEqual(['science']);
  });
});

describe('rede por colônia', () => {
  const withColony = () => {
    const s = base();
    const loc = generateLocation(5);
    loc.outpost = { level: 2, spec: 'mining', terra: 0, terraRemaining: 0, terraTotal: 0 };
    s.locations = [loc];
    s.upgrades.powerGrid = true;
    s.resources.alloys = 1e9; s.resources.components = 1e9;
    return s;
  };
  it('ligar custa recursos, aumenta o rendimento e puxa energia da base', () => {
    const s = withColony();
    const loc = s.locations[0], m = getModifiers(s);
    const before = outpostYield(loc, m, s);
    const demand0 = energyBalance(s).demand;
    const linked = linkColony(s, loc.id)!;
    expect(linked.resources.credits).toBeLessThan(s.resources.credits);
    expect(linkCost(loc).credits).toBeGreaterThan(0);
    const after = outpostYield(linked.locations[0], m, linked);
    const r = Object.keys(before)[0] as keyof typeof before;
    expect(after[r]! / before[r]!).toBeCloseTo(1.25);
    expect(energyBalance(linked).demand - demand0).toBeCloseTo(linkDemand(linked.locations[0]));
    expect(linkColony(linked, loc.id)).toBeNull();                // já ligada
  });
  it('exige a rede energética planetária', () => {
    const s = withColony(); delete s.upgrades.powerGrid;
    expect(linkColony(s, s.locations[0].id)).toBeNull();
  });
  it('sem energia a colônia ligada perde o bônus', () => {
    const s = withColony();
    const loc = s.locations[0], m = getModifiers(s);
    const linked = linkColony(s, loc.id)!;
    const dark = outpostYield(linked.locations[0], m, linked, 0), plain = outpostYield(loc, m, s);
    const r = Object.keys(plain)[0] as keyof typeof plain;
    expect(dark[r]).toBeCloseTo(plain[r]!);
  });
  it('o apagão só atinge colônias ligadas e a ligação sobrevive ao salvamento', () => {
    const s = withColony();
    for (let i = 0; i < 30; i++) expect(spawnCrisis(s, () => (i + 0.5) / 30).crises.every(c => c.kind !== 'blackout')).toBe(true);
    const linked = linkColony(s, s.locations[0].id)!;
    expect(parseSave(serialize(linked))!.locations[0].outpost?.link).toBe(true);
    expect(parseSave(serialize(s))!.locations[0].outpost?.link).toBeUndefined();
    const kinds = new Set<string>();
    for (let i = 0; i < 60; i++) for (const c of spawnCrisis(linked, () => (i + 0.5) / 60).crises) kinds.add(c.kind);
    expect(kinds.has('blackout')).toBe(true);
  });
});
