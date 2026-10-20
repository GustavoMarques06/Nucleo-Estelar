import type { Buff, Category, Effect, GameState, Location, LocationType, ResId, Specialization } from '../types';
import { RES_IDS, RESOURCES } from '../data/resources';
import { BUILDINGS, BUILDING_IDS } from '../data/buildings';
import { UPGRADES } from '../data/upgrades';
import { MINERAL_BY_ID } from '../data/minerals';
import { LOCATION_BY_TYPE, SPECIALIZATIONS } from '../data/locations';
import { MEGA_BY_ID } from '../data/megaprojects';
import { PERK_BY_ID } from '../data/ascension';
import { EVENT_BY_ID } from '../data/events';
import { REPEATABLE_BY_ID } from '../data/repeatables';
import { ACHIEVEMENT_BY_ID } from '../data/achievements';
import { TIPS } from '../data/tips';
import { GOALS } from '../data/goals';
import { STORY } from '../data/story';
import { LORE } from '../data/lore';
import { CHALLENGE_BY_ID } from '../data/challenges';
import { VEIN_KIND_BY_ID } from '../data/deposit';
import { FACTIONS, FACTION_BY_ID } from '../data/factions';
import { DRONE_ROLES } from '../data/drones';
import { STAR_PERK_BY_ID } from '../data/transcendence';
import { CRISIS_BY_KIND } from '../data/crises';
import { KEEP_STEPS, SELL_FLOORS } from '../data/market';
import { BALANCE } from '../data/balance';
import { newGame, SAVE_VERSION } from './state';
import { PROTECTABLE, THROTTLE_STEPS, prioritizable, throttleable } from './energy';

const KEY = 'nucleo-estelar/save';
const BACKUP_KEY = KEY + '.bak';            // cópia de segurança (a cada ~10 min)
const BACKUP_AT_KEY = KEY + '.bak-at';
const CORRUPT_KEY = KEY + '.corrupt';       // save ilegível: guardado para nunca ser perdido
const BACKUP_EVERY_MS = 10 * 60 * 1000;

const num = (x: unknown, lo = 0, hi = 1e300): number =>
  typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo;
const obj = (x: unknown): Record<string, unknown> => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {});
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const str = (x: unknown, fallback = ''): string => (typeof x === 'string' ? x.slice(0, 80) : fallback);

const SPEC_IDS = new Set(SPECIALIZATIONS.map(s => s.id));
const EFFECT_KINDS = new Set(['click', 'output', 'outputAll', 'resource', 'energyOut', 'energyUse', 'storage', 'price', 'deposit',
  'popGrowth', 'popCap', 'tax', 'outpost', 'expedition', 'richness', 'cost', 'contract', 'megaCost', 'droneBoost', 'depth', 'upkeep', 'offline', 'autosell']);

function parseLocation(x: unknown): Location | null {
  const d = obj(x);
  const type = str(d.type) as LocationType;
  if (!LOCATION_BY_TYPE[type]) return null;
  const op = obj(d.outpost);
  const spec = str(op.spec) as Specialization;
  return {
    id: str(d.id) || `loc-${num(d.seed)}`,
    seed: Math.floor(num(d.seed, 0, 1e9)),
    name: str(d.name, 'Local desconhecido'),
    type,
    sprite: LOCATION_BY_TYPE[type].sprites.includes(str(d.sprite)) ? str(d.sprite) : LOCATION_BY_TYPE[type].sprites[0],
    richness: num(d.richness, 0.1, 1e9),            // cresce com a profundidade do espaço explorado
    distance: Math.floor(num(d.distance, 1, 1e6)),         // cresce com o número de locais descobertos: não pode ser cortado
    mineral: str(d.mineral) in MINERAL_BY_ID ? str(d.mineral) : 'iron',
    claimedBy: str(d.claimedBy) in FACTION_BY_ID ? str(d.claimedBy) : null,
    outpost: d.outpost && SPEC_IDS.has(spec) ? {
      level: Math.floor(num(op.level, 1, 1e6)), spec,
      terra: Math.floor(num(op.terra, 0, 5)),
      terraRemaining: num(op.terraRemaining, 0, 1e7),
      terraTotal: num(op.terraTotal, 0, 1e7),
      ...(op.link === true ? { link: true } : {}),
    } : null,
  };
}

function parseBuff(x: unknown): Buff | null {
  const d = obj(x);
  const effects = arr(d.effects).filter(e => EFFECT_KINDS.has(str(obj(e).kind))) as Effect[];
  const remaining = num(d.remaining, 0, 3600);
  if (!effects.length || remaining <= 0) return null;
  return { id: str(d.id, 'buff'), name: str(d.name, 'Efeito'), effects, remaining };
}

/** Valida e normaliza dados vindos do armazenamento — nunca confia no conteúdo salvo. */
export function parseSave(raw: string): GameState | null {
  let d: Record<string, unknown>;
  try { d = obj(JSON.parse(raw)); } catch { return null; }
  if (typeof d.version !== 'number' || d.version > SAVE_VERSION) return null;
  // Versão 1 → 2: os campos novos simplesmente começam com os valores padrão.

  const s = newGame();
  const res = obj(d.resources), bld = obj(d.buildings), upg = obj(d.upgrades), auto = obj(d.autosell);
  const stats = obj(d.stats), produced = obj(stats.produced), settings = obj(d.settings);
  for (const r of RES_IDS) s.resources[r] = num(res[r]);
  for (const b of BUILDING_IDS) s.buildings[b] = Math.floor(num(bld[b], 0, 1e6));
  for (const u of UPGRADES) if (upg[u.id] === true) s.upgrades[u.id] = true;
  for (const r of RES_IDS) if (auto[r] === true && RESOURCES[r].sellPrice) s.autosell[r as ResId] = true;      // só o que tem preço de venda
  s.discovered = [...new Set([...s.discovered, ...arr(d.discovered).filter((x): x is string => typeof x === 'string' && x in MINERAL_BY_ID)])];

  s.locations = arr(d.locations).slice(0, 5000).map(parseLocation).filter((l): l is Location => !!l);
  const dep = obj(d.deposit);
  s.deposit.veins = arr(dep.veins).slice(0, 20).flatMap(x => {
    const v = obj(x), mix = obj(v.mix);
    const kind = str(v.kind);
    if (!(kind in VEIN_KIND_BY_ID)) return [];
    const shares: Record<string, number> = {};
    for (const r of RES_IDS) if (num(mix[r]) > 0) shares[r] = num(mix[r], 0, 1);
    if (!Object.keys(shares).length) return [];
    const total = num(v.total, 1, 1e300);
    return [{ id: str(v.id, 'v'), kind, name: str(v.name, 'Veio'), mix: shares, yield: num(v.yield, 0.1, 20), reserve: num(v.reserve, 0, total), total }];
  });
  s.deposit.found = Math.floor(num(dep.found, 0, 1e9));
  s.deposit.auto = dep.auto === true;
  s.deposit.focus = s.deposit.veins.some(v => v.id === str(dep.focus) && v.reserve > 0) ? str(dep.focus) : 'crust';
  s.expeditions = arr(d.expeditions).slice(0, 10).map(x => {
    const e = obj(x);
    const total = num(e.total, 1, 1e6);
    return { id: str(e.id, 'exp'), seed: Math.floor(num(e.seed, 0, 1e9)), remaining: num(e.remaining, 0, total), total };
  });
  s.nextSeed = Math.max(Math.floor(num(d.nextSeed, 1, 1e9)), ...s.locations.map(l => l.seed + 1), ...s.expeditions.map(e => e.seed + 1), 1);
  const mega = obj(d.megaprojects);
  for (const id of Object.keys(MEGA_BY_ID)) {
    const v = Math.floor(num(mega[id], 0, MEGA_BY_ID[id].endless ? 10000 : MEGA_BY_ID[id].stages.length));
    if (v > 0) s.megaprojects[id] = v;
  }
  const mprog = obj(d.megaprogress);
  for (const id of Object.keys(MEGA_BY_ID)) {
    const p = obj(mprog[id]);
    const amounts: Record<string, number> = {};
    for (const r of RES_IDS) if (p[r] !== undefined && num(p[r]) > 0) amounts[r] = num(p[r]);
    if (Object.keys(amounts).length) s.megaprogress[id] = amounts;
  }
  const rep = obj(d.repeatables);
  for (const id of Object.keys(REPEATABLE_BY_ID)) { const v = Math.floor(num(rep[id], 0, 10000)); if (v > 0) s.repeatables[id] = v; }
  s.contracts = arr(d.contracts).slice(0, 10).flatMap(x => {
    const c = obj(x), res = str(c.res) as ResId, reward = obj(c.reward);
    if (!RES_IDS.includes(res)) return [];
    const rw: Record<string, number> = {};
    for (const r of RES_IDS) if (reward[r] !== undefined && num(reward[r]) > 0) rw[r] = num(reward[r]);
    return [{ id: str(c.id, 'c'), res, amount: num(c.amount, 1, 1e300), reward: rw, remaining: num(c.remaining, 0, 3600), ...(c.risk === true ? { risk: true } : {}) }];
  });
  if (typeof d.contractTimer === 'number' && Number.isFinite(d.contractTimer)) s.contractTimer = Math.min(1e5, Math.max(-1e5, d.contractTimer));
  s.achievements = [...new Set(arr(d.achievements).filter((x): x is string => typeof x === 'string' && x in ACHIEVEMENT_BY_ID))];
  const colonyIds = new Set(s.locations.filter(l => l.outpost).map(l => l.id));
  s.crises = arr(d.crises).slice(0, 10).flatMap(x => {
    const c = obj(x), kind = str(c.kind) as keyof typeof CRISIS_BY_KIND;
    if (!CRISIS_BY_KIND[kind] || !colonyIds.has(str(c.locId))) return [];
    const total = num(c.total, 1, 1e5);
    return [{ id: str(c.id, 'cr'), locId: str(c.locId), kind, remaining: num(c.remaining, 0, total), total }];
  }).filter(c => c.remaining > 0);
  // no máximo uma crise por colônia
  s.crises = s.crises.filter((c, i) => s.crises.findIndex(o => o.locId === c.locId) === i);
  if (typeof d.claimTimer === 'number' && Number.isFinite(d.claimTimer)) s.claimTimer = Math.min(1e5, Math.max(-1e5, d.claimTimer));
  if (typeof d.crisisTimer === 'number' && Number.isFinite(d.crisisTimer)) s.crisisTimer = Math.min(1e5, Math.max(-1e5, d.crisisTimer));
  s.routes = arr(d.routes).slice(0, 2000).flatMap(x => {
    const r = obj(x), a = str(r.a), b = str(r.b);
    return a !== b && colonyIds.has(a) && colonyIds.has(b) ? [{ id: str(r.id, 'rt'), a, b, ...(r.insured === true ? { insured: true } : {}) }] : [];
  });
  const mk = obj(d.market), sat = obj(mk.sat);
  s.market = { clock: num(mk.clock, 0, 1e12), sat: {} };
  for (const r of RES_IDS) if (num(sat[r]) > 0.002) s.market.sat[r] = num(sat[r], 0, 1e6);
  const keep = obj(d.keep);
  for (const r of RES_IDS) if ((KEEP_STEPS as readonly number[]).includes(keep[r] as number) && (keep[r] as number) > 0) s.keep[r] = keep[r] as number;
  const rec = obj(d.recipes);
  for (const b of BUILDINGS) if (b.alt && rec[b.id] === true) s.recipes[b.id] = true;
  // Ritmo, prioridade, sobrecarga e baterias (versão 11): só valores válidos; o padrão não é guardado.
  const thr = obj(d.throttle), pri = obj(d.priority), ocs = obj(d.overclock);
  for (const b of BUILDINGS) {
    const v = thr[b.id];
    if (throttleable(b.id) && typeof v === 'number' && (THROTTLE_STEPS as readonly number[]).includes(v) && v < 1) s.throttle[b.id] = v;
    const p = pri[b.id];
    if (prioritizable(b.id) && (p === 1 || p === -1)) s.priority[b.id] = p;
    if (b.overclock && ocs[b.id]) {
      const x = obj(ocs[b.id]);
      const left = num(x.left, 0, BALANCE.overclockTime), fault = left <= 0 && x.fault === true;
      const cool = left > 0 ? 0 : num(x.cool, 0, BALANCE.overclockCooldown * (fault ? BALANCE.overclockFaultCool : 1));
      if (left > 0 || cool > 0) s.overclock[b.id] = fault ? { left, cool, fault } : { left, cool };
    }
  }
  s.protect = [...new Set(arr(d.protect).map(c => str(c) as Category))].filter(c => PROTECTABLE.includes(c));
  s.energyCharge = num(d.energyCharge, 0, 1e15);
  s.debt = num(d.debt, 0, 1e15);
  const floor = num(d.autosellFloor, 0, 5);
  s.autosellFloor = (SELL_FLOORS as readonly number[]).includes(floor) ? floor : 0;
  const fac = obj(d.factions);
  for (const f of FACTIONS) {
    const x = obj(fac[f.id]);
    s.factions[f.id] = { relation: num(x.relation, 0, 100), cooldown: num(x.cooldown, 0, 3600), questTimer: typeof x.questTimer === 'number' ? num(x.questTimer, 0, 1e5) : 240, ...(num(x.done) > 0 ? { done: Math.floor(num(x.done, 0, 1e9)) } : {}) };
  }
  s.quests = arr(d.quests).slice(0, 10).flatMap(x => {
    const q = obj(x), res = str(q.res) as ResId, fid = str(q.faction), reward = obj(q.reward);
    if (!RES_IDS.includes(res) || !(fid in FACTION_BY_ID)) return [];
    const rw: Record<string, number> = {};
    for (const r of RES_IDS) if (reward[r] !== undefined && num(reward[r]) > 0) rw[r] = num(reward[r]);
    const total = num(q.total, 1, 1e5);
    return [{ id: str(q.id, 'q'), faction: fid, res, amount: num(q.amount, 1, 1e300), reward: rw, remaining: num(q.remaining, 0, total), total, ...(q.honor === true ? { honor: true } : {}) }];
  }).filter((q, i, all) => q.remaining > 0 && all.findIndex(o => o.faction === q.faction) === i);
  const dr = obj(d.drones);
  for (const r of DRONE_ROLES) s.drones[r.id] = Math.floor(num(dr[r.id], 0, 1e9));
  // Nunca há mais drones designados do que drones existentes.
  let assigned = DRONE_ROLES.reduce((a, r) => a + s.drones[r.id], 0);
  for (const r of DRONE_ROLES) { if (assigned <= Math.floor(s.resources.drones)) break; const cut = Math.min(s.drones[r.id], assigned - Math.floor(s.resources.drones)); s.drones[r.id] -= cut; assigned -= cut; }
  const tr = obj(d.transcendence), trPerks = obj(tr.perks);
  s.transcendence.seeds = Math.floor(num(tr.seeds, 0, 1e12));
  s.transcendence.total = Math.floor(num(tr.total, 0, 1e12));
  s.transcendence.count = Math.floor(num(tr.count, 0, 1e6));
  s.transcendence.unlocked = tr.unlocked === true || (s.megaprojects.singularity ?? 0) >= 5;
  for (const id of Object.keys(STAR_PERK_BY_ID)) {
    const v = Math.floor(num(trPerks[id], 0, STAR_PERK_BY_ID[id].max ?? 1000));
    if (v > 0) s.transcendence.perks[id] = v;
  }
  const goalIds = new Set(GOALS.map(g => g.id));
  s.goals = [...new Set(arr(d.goals).filter((x): x is string => typeof x === 'string' && goalIds.has(x)))];
  const storyIds = new Set([...STORY, ...LORE].map(e => e.id));
  s.story = [...new Set(arr(d.story).filter((x): x is string => typeof x === 'string' && storyIds.has(x)))];
  const tipIds = new Set(TIPS.map(t => t.id));
  s.tips = [...new Set(arr(d.tips).filter((x): x is string => typeof x === 'string' && tipIds.has(x)))];
  // Jogadores de versões anteriores já conhecem o começo: não mostra a dica inicial de novo.
  if (typeof d.version === 'number' && d.version < 3 && !s.tips.includes('start')) s.tips.push('start');
  s.buffs = arr(d.buffs).slice(0, 10).map(parseBuff).filter((b): b is Buff => !!b);
  const ev = obj(d.event);
  s.event = EVENT_BY_ID[str(ev.id)] ? { id: str(ev.id), remaining: num(ev.remaining, 0, 600), seed: Math.floor(num(ev.seed, 0, 1e9)) } : null;
  s.chain = arr(d.chain).slice(0, 6).flatMap(x => { const c = obj(x); return str(c.event) in EVENT_BY_ID ? [{ event: str(c.event), remaining: num(c.remaining, 0, 1e6) }] : []; });
  s.flags = [...new Set(arr(d.flags).filter((x): x is string => typeof x === 'string' && x.length <= 40))].slice(0, 60);
  if (typeof d.eventTimer === 'number' && Number.isFinite(d.eventTimer)) s.eventTimer = Math.min(1e6, Math.max(-1e6, d.eventTimer));

  const ch = obj(d.challenges);
  s.challenges.done = [...new Set(arr(ch.done).filter((x): x is string => typeof x === 'string' && x in CHALLENGE_BY_ID))];
  s.challenges.active = typeof ch.active === 'string' && ch.active in CHALLENGE_BY_ID && !s.challenges.done.includes(ch.active) ? ch.active : null;
  const asc = obj(d.ascension), perks = obj(asc.perks);
  s.ascension.points = Math.floor(num(asc.points, 0, 1e12));
  s.ascension.total = Math.floor(num(asc.total, 0, 1e12));
  s.ascension.count = Math.floor(num(asc.count, 0, 1e6));
  for (const id of Object.keys(PERK_BY_ID)) {
    const v = Math.floor(num(perks[id], 0, PERK_BY_ID[id].max ?? 1000));
    if (v > 0) s.ascension.perks[id] = v;
  }

  s.stats.totalMined = num(stats.totalMined);
  s.stats.earned = num(stats.earned);
  s.stats.lifetimeEarned = num(stats.lifetimeEarned);
  s.stats.playTime = num(stats.playTime);
  s.stats.contractsDone = Math.floor(num(stats.contractsDone, 0, 1e9));
  s.stats.eventsSeen = Math.floor(num(stats.eventsSeen, 0, 1e9));
  s.stats.crisesSolved = Math.floor(num(stats.crisesSolved, 0, 1e9));
  s.stats.highSales = Math.floor(num(stats.highSales, 0, 1e9));
  s.stats.reputation = num(stats.reputation, 0, 1e9);
  s.stats.questsDone = Math.floor(num(stats.questsDone, 0, 1e9));
  s.stats.chains = Math.floor(num(stats.chains, 0, 1e9));
  for (const r of RES_IDS) if (produced[r] !== undefined) s.stats.produced[r] = num(produced[r]);
  s.settings.reduceMotion = settings.reduceMotion === true;
  s.settings.sound = settings.sound !== false;
  s.settings.music = settings.music !== false;
  s.settings.volume = typeof settings.volume === 'number' && Number.isFinite(settings.volume) ? Math.min(1, Math.max(0, settings.volume)) : 0.6;
  s.settings.focus = settings.focus === true;
  // Quem já jogava antes dos objetivos não precisa do tutorial: marca como feitos os que a partida já cumpre.
  if (d.version < 7) s.goals = [...new Set([...s.goals, ...GOALS.filter(g => { const p = g.progress(s); return p.cur >= p.target; }).map(g => g.id)])];
  // Quem já jogava antes do diário não recebe a história inteira de uma vez: o que a partida já cumpre vira "lido".
  if (d.version < 14) s.story = [...new Set([...s.story, ...STORY.filter(e => e.when(s)).map(e => e.id)])];
  s.savedAt = num(d.savedAt, 0, 8.64e15) || Date.now();
  return s;
}

export function serialize(s: GameState, now = Date.now()): string {
  return JSON.stringify({ ...s, version: SAVE_VERSION, savedAt: now });
}

export interface Loaded { state: GameState; recovered: boolean }

/** Carrega o save principal; se estiver corrompido ou for de uma versão futura, guarda a cópia e tenta o backup. */
export function loadGame(): Loaded | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = parseSave(raw);
      if (s) return { state: s, recovered: false };
      try { localStorage.setItem(CORRUPT_KEY, raw); } catch { /* sem espaço */ }
    }
    const bak = localStorage.getItem(BACKUP_KEY);
    const s = bak ? parseSave(bak) : null;
    return s ? { state: s, recovered: true } : null;
  } catch { return null; }
}

/** Salva e, a cada ~10 minutos, guarda a versão anterior como backup. Devolve false se o navegador recusar. */
export function saveGame(s: GameState): boolean {
  try {
    const text = serialize(s);
    const prev = localStorage.getItem(KEY);
    localStorage.setItem(KEY, text);
    const at = Number(localStorage.getItem(BACKUP_AT_KEY) ?? 0);
    if (prev && Date.now() - at >= BACKUP_EVERY_MS) {
      try { localStorage.setItem(BACKUP_KEY, prev); localStorage.setItem(BACKUP_AT_KEY, String(Date.now())); } catch { /* o save principal já foi */ }
    }
    return true;
  } catch { return false; }
}

/** Quando foi feito o backup (ms) ou null se não existe um backup legível. */
export function backupInfo(): number | null {
  try {
    const bak = localStorage.getItem(BACKUP_KEY);
    return bak && parseSave(bak) ? Number(localStorage.getItem(BACKUP_AT_KEY) ?? 0) || null : null;
  } catch { return null; }
}

export function loadBackup(): GameState | null {
  try { const bak = localStorage.getItem(BACKUP_KEY); return bak ? parseSave(bak) : null; } catch { return null; }
}

export function clearSave() {
  try { for (const k of [KEY, BACKUP_KEY, BACKUP_AT_KEY, CORRUPT_KEY]) localStorage.removeItem(k); } catch { /* indisponível */ }
}
