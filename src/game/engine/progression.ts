import type { Amounts, GameState, ResId } from '../types';
import { MEGA_BY_ID } from '../data/megaprojects';
import { PERK_BY_ID, ascensionGain, perkCost } from '../data/ascension';
import { EVENTS, EVENT_BY_ID, type ChainStep } from '../data/events';
import { rng } from './state';
import { UPGRADES } from '../data/upgrades';
import { BALANCE } from '../data/balance';
import { cloneState, newGame } from './state';
import { canAfford, payCost, scaleCost } from './costs';
import { getModifiers } from './modifiers';
import { shiftRelations } from './factions';
import { STAR_PERK_BY_ID, starPerkCost, transcendGain } from '../data/transcendence';
import { grant } from './stock';
import { REPEATABLE_BY_ID, repeatableCost } from '../data/repeatables';
import { ACHIEVEMENTS } from '../data/achievements';
import { GOALS } from '../data/goals';
import { STORY } from '../data/story';
import { LORE } from '../data/lore';
import { eraIndex } from './civilization';
import { challengeBlocks, challengeMet } from './challenges';
import { CHALLENGE_BY_ID } from '../data/challenges';
import { archiveJourney } from './timeline';
import { recordWeekly, weekOf } from './weekly';
import { WEEKLY_BONUS } from '../data/weekly';

// ---------- Megaprojetos ----------
export const megaprojectsUnlocked = (s: GameState) => !!s.upgrades.megaEngineering;

export const megaAvailable = (s: GameState, id: string) =>
  megaprojectsUnlocked(s) && !!MEGA_BY_ID[id] && (!MEGA_BY_ID[id].requires || MEGA_BY_ID[id].requires!(s));

export function nextMegaStage(s: GameState, id: string) {
  const def = MEGA_BY_ID[id];
  const done = s.megaprojects[id] ?? 0;
  const st = def.endless ? def.endless(done) : done < def.stages.length ? def.stages[done] : null;
  if (!st) return null;
  const k = getModifiers(s).megaCost;     // "Engenharia do vazio" (Transcendência) reduz o custo
  return k === 1 ? st : { ...st, cost: scaleCost(st.cost, k) };
}

/** Quanto ainda falta entregar para concluir o estágio atual. */
export function megaRemaining(s: GameState, id: string): Amounts {
  const stage = nextMegaStage(s, id);
  if (!stage) return {};
  const got = s.megaprogress[id] ?? {};
  const out: Amounts = {};
  for (const [r, v] of Object.entries(stage.cost)) {
    const left = (v ?? 0) - (got[r as ResId] ?? 0);
    if (left > 1e-6) out[r as ResId] = left;
  }
  return out;
}

/**
 * Entrega ao estágio atual tudo o que houver em estoque (até o necessário). Obras gigantes são feitas aos
 * poucos, então custos maiores que a capacidade do armazém continuam alcançáveis.
 */
export function buildMegaStage(prev: GameState, id: string): GameState | null {
  if (!megaAvailable(prev, id)) return null;
  const stage = nextMegaStage(prev, id);
  if (!stage) return null;
  const left = megaRemaining(prev, id);
  const give: Amounts = {};
  for (const [r, v] of Object.entries(left)) {
    const g = Math.min(v ?? 0, Math.floor(prev.resources[r as ResId]));
    if (g > 0) give[r as ResId] = g;
  }
  const done = Object.keys(left).length === 0;
  if (!done && Object.keys(give).length === 0) return null;
  const s = cloneState(prev);
  payCost(s, give);
  const prog = { ...(s.megaprogress[id] ?? {}) };
  for (const [r, v] of Object.entries(give)) prog[r as ResId] = (prog[r as ResId] ?? 0) + (v ?? 0);
  s.megaprogress[id] = prog;
  if (Object.keys(megaRemaining(s, id)).length === 0) {
    s.megaprojects[id] = (s.megaprojects[id] ?? 0) + 1;
    delete s.megaprogress[id];
    // Concluir a Singularidade encerra a história e libera a Transcendência.
    if (id === 'singularity' && s.megaprojects[id] >= MEGA_BY_ID[id].stages.length) s.transcendence.unlocked = true;
  }
  return s;
}

// ---------- Ascensão ----------
export const ascensionUnlocked = (s: GameState) => !!s.upgrades.ascensionProject || s.ascension.count > 0;
export const pendingAscension = (s: GameState) =>
  Math.floor(ascensionGain(s.stats.earned) * (1 + 0.3 * (s.transcendence.perks.seedAsc ?? 0)) * (s.weekly.active !== null ? WEEKLY_BONUS : 1));
export const canAscend = (s: GameState) => !!s.upgrades.ascensionProject && pendingAscension(s) > 0;

/** Recomeça a jornada mantendo Dados de Ascensão, melhorias permanentes, catálogo e opções. */
/**
 * `next`: desafio escolhido para a próxima jornada (null/omitido = jornada normal; 'weekly' = desafio da semana de `now`).
 * Ascender com um desafio cumprido o conclui.
 */
export function ascend(prev: GameState, now = Date.now(), next: string | null = null): GameState | null {
  if (!canAscend(prev)) return null;
  const gainPts = pendingAscension(prev);
  const s = newGame(now);
  s.ascension = {
    points: prev.ascension.points + gainPts,
    total: prev.ascension.total + gainPts,
    count: prev.ascension.count + 1,
    perks: { ...prev.ascension.perks },
  };
  s.discovered = [...prev.discovered];
  s.settings = { ...prev.settings };
  s.autosell = { ...prev.autosell };
  s.stats.lifetimeEarned = prev.stats.lifetimeEarned + prev.stats.earned;
  s.stats.contractsDone = prev.stats.contractsDone;
  s.stats.eventsSeen = prev.stats.eventsSeen;
  s.stats.crisesSolved = prev.stats.crisesSolved;
  s.stats.highSales = prev.stats.highSales;
  s.stats.reputation = prev.stats.reputation;
  s.stats.questsDone = prev.stats.questsDone;
  s.stats.chains = prev.stats.chains;
  s.autosellFloor = prev.autosellFloor;
  s.keep = { ...prev.keep };
  s.throttle = { ...prev.throttle };
  s.priority = { ...prev.priority };
  s.achievements = [...prev.achievements];
  s.tips = [...prev.tips];
  s.goals = [...prev.goals];
  s.story = [...prev.story];
  s.civ = { best: Math.max(prev.civ.best, eraIndex(prev)) };      // a civilização lembra: o legado vale para sempre
  s.integrity = { ...prev.integrity };                             // a marca de save modificado também
  s.flags = prev.flags.filter(f => f.startsWith('ending-'));      // a escolha final vale para sempre
  s.transcendence = { ...prev.transcendence, perks: { ...prev.transcendence.perks } };
  const done = [...prev.challenges.done];
  if (prev.challenges.active && challengeMet(prev) && !done.includes(prev.challenges.active)) done.push(prev.challenges.active);
  s.challenges = { active: next && CHALLENGE_BY_ID[next] && !done.includes(next) ? next : null, done };
  keepLegacy(prev, s);
  s.weekly = {
    active: next === 'weekly' ? weekOf(now) : null,
    records: prev.weekly.active !== null ? recordWeekly(prev.weekly.records, prev.weekly.active, Math.round(prev.stats.playTime)) : prev.weekly.records.map(r => ({ ...r })),
  };
  applyStartBonuses(s);
  return s;
}

/** O que atravessa qualquer recomeço: conselho, relíquias, diretivas e a linha do tempo das jornadas. */
function keepLegacy(prev: GameState, s: GameState) {
  s.crew = { xp: { ...prev.crew.xp }, active: [...prev.crew.active] };
  s.relics = [...prev.relics];
  s.directives = prev.directives.map(d => ({ ...d, when: { ...d.when }, then: { ...d.then }, fired: 0 }));
  s.timeline = archiveJourney(prev);
}

/** Bônus de início de jornada vindos das melhorias permanentes. */
function applyStartBonuses(s: GameState) {
  const start = s.ascension.perks.start ?? 0;
  if (start > 0) s.resources.credits += 500 * Math.pow(4, start);
  const keep = Math.max(s.ascension.perks.research ? 2 : 0, s.transcendence.perks.seedStart ? 2 + s.transcendence.perks.seedStart : 0);
  if (keep > 0) for (const u of UPGRADES) if (u.phase <= keep) s.upgrades[u.id] = true;
  s.resources.drones += 20 * (s.transcendence.perks.seedDrones ?? 0);
}

export function buyPerk(prev: GameState, id: string): GameState | null {
  const def = PERK_BY_ID[id];
  if (!def) return null;
  const level = prev.ascension.perks[id] ?? 0;
  if (def.max !== undefined && level >= def.max) return null;
  const cost = perkCost(def, level);
  if (prev.ascension.points < cost) return null;
  const s = cloneState(prev);
  s.ascension.points -= cost;
  s.ascension.perks[id] = level + 1;
  // Melhorias que valem para a jornada atual também (ex.: pesquisas mantidas).
  if (id === 'research') for (const u of UPGRADES) if (u.phase <= 2) s.upgrades[u.id] = true;
  return s;
}

// ---------- Eventos ----------
/** Escala das recompensas: acompanha o tamanho da economia. */
const eventScale = (s: GameState) => Math.max(1, Math.sqrt(s.stats.earned) / 20);

export function spawnEvent(prev: GameState, random: () => number = Math.random): GameState {
  const s = cloneState(prev);
  const eligible = EVENTS.filter(e => !e.followUp && e.minPhase(s) && !(challengeBlocks(s, 'diplomacy') && /^(envoy|tribute)/.test(e.id)));
  s.eventTimer = BALANCE.eventMinGap + random() * (BALANCE.eventMaxGap - BALANCE.eventMinGap);
  if (!eligible.length || s.event) return s;
  // Eventos de história principal (priority) têm preferência: o jogador não os perde no meio de 30 outros.
  const def = eligible.find(e => e.priority) ?? eligible[Math.floor(random() * eligible.length)];
  s.event = { id: def.id, remaining: BALANCE.eventDuration, seed: Math.floor(random() * 1e9) };
  return s;
}

/** Se não há evento na tela, traz a primeira continuação cujo tempo chegou (dura mais que um evento comum). */
export function surfaceChain(prev: GameState): GameState {
  if (prev.event || !prev.chain.some(c => c.remaining <= 0 && EVENT_BY_ID[c.event])) return prev;
  const s = cloneState(prev);
  const i = s.chain.findIndex(c => c.remaining <= 0 && EVENT_BY_ID[c.event]);
  const next = s.chain.splice(i, 1)[0];
  s.event = { id: next.event, remaining: BALANCE.eventDuration * 3, seed: s.nextSeed++ };
  return s;
}

export function eventChoiceCost(s: GameState, choice: number): Amounts {
  const def = s.event && EVENT_BY_ID[s.event.id];
  const c = def?.choices[choice];
  return c?.pay ? c.pay(s, eventScale(s)) : {};
}

export function chooseEvent(prev: GameState, choice: number): { state: GameState; reward: Amounts } | null {
  const def = prev.event && EVENT_BY_ID[prev.event.id];
  const c = def?.choices[choice];
  if (!c) return null;
  const k = eventScale(prev);
  const pay = c.pay ? c.pay(prev, k) : {};
  if (!canAfford(prev, pay)) return null;
  const reward = c.reward ? c.reward(prev, k) : {};
  const s = cloneState(prev);
  payCost(s, pay);
  grant(s, reward);
  if (c.relation) shiftRelations(s, c.relation);
  if (c.reputation) s.stats.reputation += c.reputation;
  if (c.buff) {
    s.buffs = s.buffs.filter(b => b.name !== c.buff!.name);
    s.buffs.push({ id: `${def.id}-${s.event!.seed}`, name: c.buff.name, effects: c.buff.effects, remaining: c.buff.duration });
  }
  if (c.flag && !s.flags.includes(c.flag)) s.flags.push(c.flag);
  // Continuação: sorteada pela semente do evento (mesma escolha, mesmo desfecho).
  const steps: ChainStep[] = c.chain ? [c.chain].flat() : [];
  let scheduled = false;
  if (steps.length && s.chain.length < 4) {
    const roll = rng(s.event!.seed * 31 + 7)();
    let acc = 0;
    for (const st of steps) { acc += st.p ?? 1; if (roll < acc) { s.chain.push({ event: st.event, remaining: st.delay }); scheduled = true; break; } }
  }
  if (def.followUp && !scheduled) s.stats.chains++;       // a história terminou
  s.event = null;
  s.stats.eventsSeen++;
  return { state: s, reward };
}

export const dismissEvent = (prev: GameState): GameState => ({ ...cloneState(prev), event: null });


// ---------- Pesquisas contínuas ----------
export function buyRepeatable(prev: GameState, id: string): GameState | null {
  const def = REPEATABLE_BY_ID[id];
  if (!def || !def.unlock(prev)) return null;
  const cost = { science: repeatableCost(def, prev.repeatables[id] ?? 0) };
  if (!canAfford(prev, cost)) return null;
  const s = cloneState(prev);
  payCost(s, cost);
  s.repeatables[id] = (s.repeatables[id] ?? 0) + 1;
  return s;
}

// ---------- Conquistas ----------
/** Devolve o estado com as conquistas novas e a lista delas (vazia se nada mudou). */
export function checkAchievements(prev: GameState): { state: GameState; unlocked: string[] } {
  const unlocked = ACHIEVEMENTS.filter(a => !prev.achievements.includes(a.id) && a.check(prev)).map(a => a.id);
  if (!unlocked.length) return { state: prev, unlocked };
  const s = cloneState(prev);
  s.achievements.push(...unlocked);
  return { state: s, unlocked };
}

// ---------- Fim de jogo: Transcendência ----------
export const endingReached = (s: GameState) => s.transcendence.unlocked;

export const pendingSeeds = (s: GameState) =>
  transcendGain(s.ascension.total + pendingAscension(s), s.megaprojects.core ?? 0, s.megaprojects.singularity ?? 0);

export const canTranscend = (s: GameState) => s.transcendence.unlocked && pendingSeeds(s) > 0;

/**
 * Segunda camada de recomeço: reinicia a jornada E a Ascensão (dados e melhorias) em troca de
 * Sementes Estelares. Conquistas, catálogo, dicas, opções e as próprias melhorias da Transcendência ficam.
 */
export function transcend(prev: GameState, now = Date.now()): GameState | null {
  if (!canTranscend(prev)) return null;
  const gain = pendingSeeds(prev);
  const s = newGame(now);
  s.transcendence = {
    seeds: prev.transcendence.seeds + gain,
    total: prev.transcendence.total + gain,
    count: prev.transcendence.count + 1,
    perks: { ...prev.transcendence.perks },
    unlocked: true,
  };
  s.ascension = { points: 0, total: 0, count: prev.ascension.count, perks: {} };
  s.discovered = [...prev.discovered];
  s.settings = { ...prev.settings };
  s.autosell = { ...prev.autosell };
  s.achievements = [...prev.achievements];
  s.tips = [...prev.tips];
  s.goals = [...prev.goals];
  s.story = [...prev.story];
  s.civ = { best: Math.max(prev.civ.best, eraIndex(prev)) };      // a civilização lembra: o legado vale para sempre
  s.integrity = { ...prev.integrity };                             // a marca de save modificado também
  s.flags = prev.flags.filter(f => f.startsWith('ending-'));      // a escolha final vale para sempre
  s.challenges = { active: null, done: [...prev.challenges.done] };
  keepLegacy(prev, s);
  s.weekly = { active: null, records: prev.weekly.records.map(r => ({ ...r })) };
  s.stats.lifetimeEarned = prev.stats.lifetimeEarned + prev.stats.earned;
  s.stats.contractsDone = prev.stats.contractsDone;
  s.stats.eventsSeen = prev.stats.eventsSeen;
  s.stats.crisesSolved = prev.stats.crisesSolved;
  s.stats.highSales = prev.stats.highSales;
  s.stats.reputation = prev.stats.reputation;
  s.stats.questsDone = prev.stats.questsDone;
  s.stats.chains = prev.stats.chains;
  s.autosellFloor = prev.autosellFloor;
  s.keep = { ...prev.keep };
  s.throttle = { ...prev.throttle };
  s.priority = { ...prev.priority };
  applyStartBonuses(s);
  return s;
}

export function buyStarPerk(prev: GameState, id: string): GameState | null {
  const def = STAR_PERK_BY_ID[id];
  if (!def) return null;
  const level = prev.transcendence.perks[id] ?? 0;
  if (def.max !== undefined && level >= def.max) return null;
  const cost = starPerkCost(def, level);
  if (prev.transcendence.seeds < cost) return null;
  const s = cloneState(prev);
  s.transcendence.seeds -= cost;
  s.transcendence.perks[id] = level + 1;
  return s;
}

// ---------- Objetivos guiados ----------
/** Conclui todos os objetivos cujas condições já valem (mesmo fora de ordem) e paga as recompensas. */
export function checkGoals(prev: GameState): { state: GameState; done: string[] } {
  const done = GOALS.filter(g => !prev.goals.includes(g.id) && (() => { const p = g.progress(prev); return p.cur >= p.target; })()).map(g => g.id);
  if (!done.length) return { state: prev, done };
  const s = cloneState(prev);
  for (const id of done) {
    const g = GOALS.find(x => x.id === id)!;
    s.goals.push(id);
    if (g.reward) grant(s, g.reward);
  }
  return { state: s, done };
}

// ---------- Diário de bordo ----------
/** Registros do diário cujas condições acabaram de valer (devolve só os ids novos, na ordem da história). */
export function checkStory(prev: GameState): { state: GameState; fresh: string[]; lore: string[] } {
  const fresh = STORY.filter(e => !prev.story.includes(e.id) && e.when(prev)).map(e => e.id);
  // Arquivo (fragmentos e transmissões): chega em silêncio, só com um aviso; não interrompe o jogo.
  const lore = LORE.filter(e => !prev.story.includes(e.id) && e.when(prev)).map(e => e.id);
  if (!fresh.length && !lore.length) return { state: prev, fresh, lore };
  const s = cloneState(prev);
  s.story.push(...fresh, ...lore);
  return { state: s, fresh, lore };
}
