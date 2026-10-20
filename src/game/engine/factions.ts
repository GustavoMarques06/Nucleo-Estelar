import type { Amounts, FactionQuest, GameState } from '../types';
import { ALLIANCE_AT, BOND_AT, FACTIONS, FACTION_BY_ID, GIFT_COOLDOWN, QUEST_DURATION, QUEST_GAP, QUEST_RELATION, RIVAL_DRIFT, RIVAL_FLOOR, RIVAL_PENALTY, giftAmount, tierOf } from '../data/factions';
import { grant } from './stock';
import { challengeBlocks } from './challenges';
import { cloneState } from './state';
import { canAfford, payCost } from './costs';

export const diplomacyUnlocked = (s: GameState) => !!s.upgrades.diplomacy && !challengeBlocks(s, 'diplomacy');

export const giftCost = (s: GameState, id: string): Amounts => giftAmount(FACTION_BY_ID[id], s.stats.earned);

/** Quanto a relação sobe com um presente: rende menos conforme a relação já é alta. */
export const giftGain = (relation: number) => Math.max(2, Math.round(10 * (1 - relation / 150)));

export function canGift(s: GameState, id: string): { ok: boolean; reason?: string } {
  if (!diplomacyUnlocked(s)) return { ok: false, reason: 'Pesquise Diplomacia estelar.' };
  const f = s.factions[id];
  if (!f) return { ok: false };
  if (f.relation >= 100) return { ok: false, reason: 'Relação máxima.' };
  if (f.cooldown > 0) return { ok: false, reason: 'Aguarde para enviar outro presente.' };
  if (!canAfford(s, giftCost(s, id))) return { ok: false, reason: 'Faltam materiais.' };
  return { ok: true };
}

export function giveGift(prev: GameState, id: string): GameState | null {
  if (!canGift(prev, id).ok) return null;
  const s = cloneState(prev);
  payCost(s, giftCost(prev, id));
  const f = s.factions[id];
  f.relation = Math.min(100, f.relation + giftGain(f.relation));
  f.cooldown = GIFT_COOLDOWN;
  // Agradar uma facção esfria a rival dela.
  const rival = s.factions[FACTION_BY_ID[id].rival];
  if (rival) rival.relation = Math.max(0, rival.relation - RIVAL_PENALTY);
  return s;
}

/** Campanha diplomática: a influência compra relação sem presentes (e sem esfriar a rival). */
export const lobbyCost = (s: GameState, id: string): Amounts => ({ influence: Math.ceil(100 + (s.factions[id]?.relation ?? 0) * 4) });
export const LOBBY_GAIN = 5;

export function canLobby(s: GameState, id: string): { ok: boolean; reason?: string } {
  if (!diplomacyUnlocked(s)) return { ok: false, reason: 'Pesquise Diplomacia estelar.' };
  const f = s.factions[id];
  if (!f) return { ok: false };
  if (f.relation >= 100) return { ok: false, reason: 'Relação máxima.' };
  if (!canAfford(s, lobbyCost(s, id))) return { ok: false, reason: 'Falta influência.' };
  return { ok: true };
}

export function lobbyFaction(prev: GameState, id: string): GameState | null {
  if (!canLobby(prev, id).ok) return null;
  const s = cloneState(prev);
  payCost(s, lobbyCost(prev, id));
  s.factions[id].relation = Math.min(100, s.factions[id].relation + LOBBY_GAIN);
  return s;
}

/** Variações vindas de eventos (limitadas a 0–100). */
export function shiftRelations(s: GameState, delta: Record<string, number>) {
  for (const [id, d] of Object.entries(delta)) {
    const f = s.factions[id];
    if (f) f.relation = Math.max(0, Math.min(100, f.relation + d));
  }
}

/** Escala da economia usada nas quantidades dos pedidos (a mesma dos presentes e dos eventos). */
const questScale = (s: GameState) => Math.max(1, Math.sqrt(Math.max(0, s.stats.earned)) / 20);

export const questAmount = (s: GameState, id: string) => {
  const f = FACTION_BY_ID[id];
  return Math.ceil(f.quest.base * questScale(s) * 3 * (1 + 0.15 * tierOf(s.factions[id]?.relation ?? 0)));
};

/** Prêmio exclusivo das missões de honra: cada facção paga com o que só ela tem. */
const HONOR_EXTRA: Record<string, (k: number) => Amounts> = {
  helix: k => ({ exotic: 2 + Math.ceil(k / 3) }),
  ferrum: k => ({ modules: 5 + Math.ceil(k / 10) }),
  vesper: k => ({ titanium: 5 * Math.ceil(k), ships: 3 }),
};
export const HONOR_EVERY = 3;                     // a cada 3 pedidos cumpridos (de aliados em diante), o seguinte é uma missão de honra
export const HONOR_DURATION = 1800;
export const HONOR_RELATION = 5;                  // relação extra por cumprir uma missão de honra

export function makeQuest(s: GameState, id: string): FactionQuest {
  const f = FACTION_BY_ID[id];
  const st = s.factions[id];
  const tier = tierOf(st?.relation ?? 0);
  const honor = tier >= 2 && ((st?.done ?? 0) + 1) % HONOR_EVERY === 0;
  const k = questScale(s);
  const amount = questAmount(s, id) * (honor ? 3 : 1);
  // As recompensas crescem com o laço (+30% por nível); a missão de honra paga o quádruplo e traz o prêmio exclusivo da facção.
  const mult = (1 + 0.3 * tier) * (honor ? 4 : 1);
  const reward: Amounts = {};
  for (const [r, v] of Object.entries(f.quest.reward(amount / (honor ? 3 : 1), k))) reward[r as keyof Amounts] = Math.ceil((v ?? 0) * mult);
  if (honor) for (const [r, v] of Object.entries(HONOR_EXTRA[id]?.(k) ?? {})) reward[r as keyof Amounts] = (reward[r as keyof Amounts] ?? 0) + (v ?? 0);
  const total = honor ? HONOR_DURATION : QUEST_DURATION;
  return { id: `q-${s.nextSeed++}`, faction: id, res: f.quest.res, amount, reward, remaining: total, total, ...(honor ? { honor: true } : {}) };
}

/** Quem é aliada de uma facção esfria a rival dela aos poucos (a Irmandade esfria mais). Nunca zera o contato. */
function driftRivals(s: GameState, dt: number) {
  for (const f of FACTIONS) {
    const rel = s.factions[f.id]?.relation ?? 0;
    if (rel < ALLIANCE_AT) continue;
    const rival = s.factions[f.rival];
    const floor = rel >= BOND_AT ? 25 : RIVAL_FLOOR;
    if (rival && rival.relation > floor) rival.relation = Math.max(floor, rival.relation - RIVAL_DRIFT * dt);
  }
}

export function advanceFactions(s: GameState, dt: number) {
  for (const f of Object.values(s.factions)) if (f.cooldown > 0) f.cooldown = Math.max(0, f.cooldown - dt);
  if (!diplomacyUnlocked(s)) return;
  driftRivals(s, dt);
  s.claimTimer = Math.max(0, s.claimTimer - dt);
  for (const q of s.quests) q.remaining -= dt;
  s.quests = s.quests.filter(q => q.remaining > 0);
  for (const f of FACTIONS) {
    const st = s.factions[f.id];
    if (!st) continue;
    st.questTimer = Math.max(0, (st.questTimer ?? 0) - dt);
    if (st.questTimer <= 0 && !s.quests.some(q => q.faction === f.id)) {
      s.quests.push(makeQuest(s, f.id));
      st.questTimer = QUEST_GAP;
    }
  }
}

export function canFulfillQuest(s: GameState, id: string): boolean {
  const q = s.quests.find(x => x.id === id);
  return !!q && s.resources[q.res] >= q.amount;
}

/** Cumpre um pedido: paga o material, recebe a recompensa e ganha relação (a rival não se importa). */
export function fulfillQuest(prev: GameState, id: string): { state: GameState; quest: FactionQuest } | null {
  const q = prev.quests.find(x => x.id === id);
  if (!q || !canFulfillQuest(prev, id)) return null;
  const s = cloneState(prev);
  payCost(s, { [q.res]: q.amount });
  grant(s, q.reward);
  const f = s.factions[q.faction];
  f.relation = Math.min(100, f.relation + QUEST_RELATION + (q.honor ? HONOR_RELATION : 0));
  f.questTimer = QUEST_GAP;
  f.done = (f.done ?? 0) + 1;
  if (q.honor) s.stats.reputation += 3;
  s.quests = s.quests.filter(x => x.id !== id);
  s.stats.questsDone++;
  return { state: s, quest: q };
}

// ---------- Territórios ----------
export const CLAIM_MAX_SHARE = 0.45;               // no máximo essa fração dos locais ainda livres fica reivindicada
export interface TerritoryNote { kind: 'claim' | 'cede'; faction: string; location: string }

/**
 * Movimentação de território: uma facção reivindica um local ainda livre (as de relação mais baixa avançam mais) ou uma aliada
 * libera uma reivindicação antiga. Só roda com o jogo aberto (como crises e eventos) e reagenda o próximo sorteio.
 */
export function territoryTick(prev: GameState, random: () => number = Math.random): { state: GameState; note: TerritoryNote | null } {
  const s = cloneState(prev);
  s.claimTimer = 420 + random() * 420;
  if (!diplomacyUnlocked(s)) return { state: s, note: null };
  const free = s.locations.filter(l => !l.outpost);
  // 1) Aliadas liberam uma reivindicação (50% das vezes que têm alguma).
  const ceders = FACTIONS.filter(f => (s.factions[f.id]?.relation ?? 0) >= ALLIANCE_AT && free.some(l => l.claimedBy === f.id));
  if (ceders.length && random() < 0.5) {
    const f = ceders[Math.floor(random() * ceders.length)];
    const loc = free.filter(l => l.claimedBy === f.id)[Math.floor(random() * free.filter(l => l.claimedBy === f.id).length)];
    loc.claimedBy = null;
    return { state: s, note: { kind: 'cede', faction: f.id, location: loc.name } };
  }
  // 2) Alguma facção reivindica um local livre.
  const open = free.filter(l => !l.claimedBy);
  if (!open.length || (free.length - open.length) / Math.max(1, free.length) >= CLAIM_MAX_SHARE) return { state: s, note: null };
  const weight = (id: string) => 110 - (s.factions[id]?.relation ?? 0);
  let x = random() * FACTIONS.reduce((a, f) => a + weight(f.id), 0);
  let pick = FACTIONS[0];
  for (const f of FACTIONS) { x -= weight(f.id); if (x <= 0) { pick = f; break; } }
  const loc = open[Math.floor(random() * open.length)];
  loc.claimedBy = pick.id;
  return { state: s, note: { kind: 'claim', faction: pick.id, location: loc.name } };
}
