import type { Amounts, Contract, GameState, ResId } from '../types';
import { RESOURCES } from '../data/resources';
import { BALANCE } from '../data/balance';
import { cloneState, rng } from './state';
import { capFor, getModifiers, sellPrice } from './modifiers';
import { grant } from './stock';
import { payCost } from './costs';

// Contratos comerciais (GDD, ideias futuras): pedidos com prazo que pagam bem acima do mercado.
// Dão um motivo para estocar e diversificar a produção em vez de só vender.

const reputationFor = (c: Contract) => (c.risk ? BALANCE.repRiskContract : BALANCE.repContract);

export const contractsUnlocked = (s: GameState) => s.stats.earned >= 300 && s.buildings.refinery > 0;

/** Recursos que já fazem parte da economia do jogador (e cabem no armazém). */
function candidates(s: GameState): ResId[] {
  return (Object.keys(RESOURCES) as ResId[]).filter(r =>
    RESOURCES[r].sellPrice && RESOURCES[r].stored && r !== 'exotic' && r !== 'slag' && (s.stats.produced[r] ?? 0) > 50);
}

function makeContract(s: GameState, seed: number): Contract | null {
  const list = candidates(s);
  if (!list.length) return null;
  const r = rng(seed * 31 + 7);
  const res = list[Math.floor(r() * list.length)];
  const m = getModifiers(s);
  const cap = capFor(s, res, m);
  // Pede algo entre 25% e 70% da capacidade: exige planejar, mas sempre cabe no armazém.
  const amount = Math.max(10, Math.floor(cap * (0.25 + r() * 0.45)));
  // Contratos urgentes (depois de alguns cumpridos): pagam bem mais, mas falhar custa reputação.
  const risk = s.stats.contractsDone >= BALANCE.contractRiskAfter && r() < BALANCE.contractRiskChance;
  const value = amount * sellPrice(res, m) * BALANCE.contractPayMult * m.contract * (risk ? BALANCE.contractRiskMult : 1);
  const reward: Amounts = { credits: Math.round(value) };
  // Alguns contratos pagam também em ciência ou materiais exóticos, que não se compram no mercado.
  const bonus = r();
  if (bonus < 0.3 && s.upgrades.lab) reward.science = Math.round(value / 40);
  else if (bonus < 0.4 && s.upgrades.exploration) reward.exotic = Math.max(1, Math.round(value / 4e5));
  const remaining = risk ? BALANCE.contractRiskDuration : BALANCE.contractDuration;
  return { id: `c-${seed}`, res, amount, reward, remaining, ...(risk ? { risk } : {}) };
}

/** Avança prazos e gera novas ofertas. Chamado dentro da simulação (funciona offline). */
export function advanceContracts(s: GameState, dt: number) {
  if (!contractsUnlocked(s)) return;
  for (const c of s.contracts) c.remaining -= dt;
  for (const c of s.contracts) if (c.remaining <= 0 && c.risk) s.stats.reputation = Math.max(0, s.stats.reputation - BALANCE.repRiskFail);
  s.contracts = s.contracts.filter(c => c.remaining > 0);
  s.contractTimer -= dt;
  while (s.contractTimer <= 0) {
    s.contractTimer += BALANCE.contractGap;
    if (s.contracts.length >= BALANCE.contractMax) continue;
    const c = makeContract(s, s.nextSeed++);
    if (c) s.contracts.push(c);
  }
}

/** Entregadores (drones) cumprem contratos sozinhos, mas deixam 30% do armazém para as indústrias. */
export function autoFulfill(s: GameState) {
  if ((s.drones.courier ?? 0) < 1) return;
  const m = getModifiers(s);
  for (const c of [...s.contracts]) {
    if (s.resources[c.res] - c.amount < capFor(s, c.res, m) * 0.3) continue;
    payCost(s, { [c.res]: c.amount });
    grant(s, c.reward);
    s.contracts = s.contracts.filter(x => x.id !== c.id);
    s.stats.contractsDone++;
    s.stats.reputation += reputationFor(c);
  }
}

export function fulfillContract(prev: GameState, id: string): { state: GameState; reward: Amounts } | null {
  const c = prev.contracts.find(x => x.id === id);
  if (!c || prev.resources[c.res] < c.amount) return null;
  const s = cloneState(prev);
  payCost(s, { [c.res]: c.amount });
  grant(s, c.reward);
  s.contracts = s.contracts.filter(x => x.id !== id);
  s.stats.contractsDone++;
  s.stats.reputation += reputationFor(c);
  return { state: s, reward: c.reward };
}
