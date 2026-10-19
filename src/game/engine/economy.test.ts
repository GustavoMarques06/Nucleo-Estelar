import { describe, expect, it } from 'vitest';
import { newGame } from './state';
import { buyBuilding, buyUpgrade, mineClick, sell, simulate } from './economy';
import { energyBalance, storageCap } from './modifiers';
import { applyOffline } from './offline';
import { parseSave, serialize } from './save';
import { fmt } from './format';

const withRes = (patch: Partial<ReturnType<typeof newGame>['resources']>) => {
  const s = newGame(0);
  Object.assign(s.resources, patch);
  return s;
};

describe('economia', () => {
  it('clique divide o minério pela composição da jazida', () => {
    const { state, gained } = mineClick(newGame(0), 1);
    expect((gained.iron ?? 0) + (gained.copper ?? 0) + (gained.gold ?? 0)).toBeCloseTo(1);
    expect(state.stats.totalMined).toBeCloseTo(1);
  });

  it('compra com custo crescente e recusa sem saldo', () => {
    let s = withRes({ credits: 15 });
    s = buyBuilding(s, 'miner', 1)!;
    expect(s.buildings.miner).toBe(1);
    expect(s.resources.credits).toBe(0);
    expect(buyBuilding(s, 'miner', 1)).toBeNull();
  });

  it('mineradora produz com energia suficiente e reduz sem energia', () => {
    const s = newGame(0);
    s.buildings.miner = 2; // demanda 2 = gerador de emergência
    const ok = simulate(s, 1);
    expect(ok.report.status.miner?.kind).toBe('ok');
    s.buildings.miner = 4; // demanda 4 > 2
    const low = simulate(s, 1);
    expect(low.report.status.miner).toEqual({ kind: 'power', ratio: 0.5 });
    expect(low.report.delta.iron + low.report.delta.copper + low.report.delta.gold).toBeCloseTo(2);
  });

  it('refinaria para sem ferro e explica o motivo', () => {
    const s = newGame(0);
    s.buildings.refinery = 1; s.buildings.solar = 1;
    const r = simulate(s, 1);
    expect(r.report.status.refinery).toEqual({ kind: 'input', res: 'iron' });
  });

  it('refinaria converte 2 ferro em 1 liga', () => {
    const s = withRes({ iron: 50 });
    s.buildings.refinery = 1; s.buildings.solar = 1;
    const { state } = simulate(s, 1);
    expect(state.resources.iron).toBeCloseTo(48);
    expect(state.resources.alloys).toBeCloseTo(1);
  });

  it('indústrias deixam 10% do armazém de reserva para construção', () => {
    const s = withRes({ iron: 11 });                       // capacidade 100 → reserva 10
    s.buildings.refinery = 1; s.buildings.solar = 1;
    const r = simulate(s, 1);
    expect(r.state.resources.iron).toBeCloseTo(10);
    expect(r.report.status.refinery).toEqual({ kind: 'input', res: 'iron' });
  });

  it('respeita a capacidade do armazém', () => {
    const s = withRes({ iron: storageCap(newGame(0)) });
    s.buildings.miner = 1;
    const r = simulate(s, 1);
    expect(r.state.resources.iron).toBe(storageCap(s));
    expect(r.report.status.miner?.kind).toBe('full');
  });

  it('venda e melhorias de preço', () => {
    let s = withRes({ alloys: 10, credits: 600 });
    s = buyUpgrade({ ...s, stats: { ...s.stats, produced: { alloys: 50 } } }, 'alloyPrice')!;
    const { earned } = sell(s, 'alloys');
    expect(earned).toBe(10 * 5 * 1.5);
  });

  it('energia: painel solar soma ao gerador de emergência', () => {
    const s = newGame(0); s.buildings.solar = 2;
    expect(energyBalance(s).supply).toBe(12);
  });

  it('nunca gera NaN ou valores negativos', () => {
    const s = withRes({ iron: 1e308, credits: 1e308 });
    s.buildings.miner = 1e6; s.buildings.refinery = 1e6; s.buildings.factory = 1e6;
    const { state } = simulate(s, 1000);
    for (const v of Object.values(state.resources)) expect(Number.isFinite(v) && v >= 0).toBe(true);
  });
});

describe('offline e salvamento', () => {
  it('aplica produção offline com limite de 8 h', () => {
    const s = newGame(0); s.buildings.miner = 1;
    const { summary } = applyOffline(s, 100 * 3600 * 1000);
    expect(summary?.capped).toBe(true);
    expect(summary?.seconds).toBe(8 * 3600);
  });

  it('ignora relógio no futuro', () => {
    const s = newGame(10_000); s.buildings.miner = 1;
    expect(applyOffline(s, 0).summary).toBeNull();
  });

  it('salva e carrega, rejeitando dados inválidos', () => {
    const s = newGame(0); s.resources.credits = 42; s.buildings.miner = 3; s.upgrades.drills = true;
    const back = parseSave(serialize(s))!;
    expect(back.resources.credits).toBe(42);
    expect(back.buildings.miner).toBe(3);
    expect(back.upgrades.drills).toBe(true);
    expect(parseSave('{lixo')).toBeNull();
    const evil = parseSave(JSON.stringify({ version: 1, resources: { credits: 'NaN', iron: -5 }, buildings: { miner: 1e99 } }))!;
    expect(evil.resources.credits).toBe(0);
    expect(evil.resources.iron).toBe(0);
    expect(evil.buildings.miner).toBe(1e6);
  });
});

describe('formatação', () => {
  it('abrevia em português', () => {
    expect(fmt(999)).toBe('999');
    expect(fmt(1234)).toBe('1,2 mil');
    expect(fmt(3_400_000)).toBe('3,4 mi');
    expect(fmt(2.55)).toBe('2,5');
    expect(fmt(0.02)).toBe('0,02');
    expect(fmt(0)).toBe('0');
  });
});
