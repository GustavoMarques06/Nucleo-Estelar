import type { Amounts, FactionQuest, GameState } from '../types';
import { ALLIANCE_AT, BOND_AT, FACTIONS, FACTION_BY_ID, GIFT_COOLDOWN, QUEST_DURATION, QUEST_GAP, QUEST_RELATION, RIVAL_DRIFT, RIVAL_FLOOR, RIVAL_PENALTY, giftAmount, tierOf } from '../data/factions';
import { grant } from './stock';
import { cloneState } from './state';
import { canAfford, payCost } from './costs';

export const diplomacyUnlocked = (s: GameState) => !!s.upgrades.diplomacy;

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

function makeQuest(s: GameState, id: string): FactionQuest {
  const f = FACTION_BY_ID[id];
  const amount = questAmount(s, id);
  return { id: `q-${s.nextSeed++}`, faction: id, res: f.quest.res, amount, reward: f.quest.reward(amount, questScale(s)), remaining: QUEST_DURATION, total: QUEST_DURATION };
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
  if (!s.upgrades.diplomacy) return;
  driftRivals(s, dt);
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
  f.relation = Math.min(100, f.relation + QUEST_RELATION);
  f.questTimer = QUEST_GAP;
  s.quests = s.quests.filter(x => x.id !== id);
  s.stats.questsDone++;
  return { state: s, quest: q };
}
