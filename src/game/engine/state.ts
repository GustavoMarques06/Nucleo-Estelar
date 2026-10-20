import type { BuildingId, GameState, ResId } from '../types';
import { RES_IDS } from '../data/resources';
import { BALANCE } from '../data/balance';
import { BUILDING_IDS } from '../data/buildings';
import { FACTIONS } from '../data/factions';

export const SAVE_VERSION = 15;
/** Primeira versão com save assinado: saves mais antigos sem assinatura são aceitos sem marca. */
export const SIGNED_SINCE = 15;

export function newGame(now = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    resources: Object.fromEntries(RES_IDS.map(r => [r, 0])) as Record<ResId, number>,
    buildings: Object.fromEntries(BUILDING_IDS.map(b => [b, 0])) as Record<BuildingId, number>,
    upgrades: {},
    autosell: {},
    discovered: ['iron', 'copper'],
    locations: [],
    deposit: { veins: [], focus: 'crust', auto: false, found: 0 },
    expeditions: [],
    nextSeed: 1,
    megaprojects: {},
    megaprogress: {},
    repeatables: {},
    contracts: [],
    contractTimer: 60,
    achievements: [],
    tips: [],
    goals: [],
    story: [],
    civ: { best: 0 },
    integrity: { tampered: false, since: 0 },
    factions: Object.fromEntries(FACTIONS.map(f => [f.id, { relation: 0, cooldown: 0, questTimer: 240 }])),
    quests: [],
    claimTimer: 600,
    crises: [],
    crisisTimer: BALANCE.crisisFirstDelay,
    routes: [],
    market: { clock: 0, sat: {} },
    autosellFloor: 0,
    keep: {},
    recipes: {},
    throttle: {},
    priority: {},
    overclock: {},
    protect: [],
    energyCharge: 0,
    debt: 0,
    drones: { courier: 0, scout: 0, hauler: 0, mechanic: 0, terraformer: 0, loader: 0 },
    transcendence: { seeds: 0, total: 0, count: 0, perks: {}, unlocked: false },
    buffs: [],
    event: null,
    chain: [],
    flags: [],
    eventTimer: BALANCE.eventMinGap,
    ascension: { points: 0, total: 0, count: 0, perks: {} },
    challenges: { active: null, done: [] },
    stats: { totalMined: 0, produced: {}, earned: 0, lifetimeEarned: 0, playTime: 0, contractsDone: 0, eventsSeen: 0, crisesSolved: 0, highSales: 0, reputation: 0, questsDone: 0, chains: 0 },
    settings: { reduceMotion: false, sound: true, music: true, volume: 0.6, focus: false },
    savedAt: now,
  };
}

/** Cópia suficiente para atualizações imutáveis do estado. */
export function cloneState(s: GameState): GameState {
  return {
    ...s,
    resources: { ...s.resources },
    buildings: { ...s.buildings },
    upgrades: { ...s.upgrades },
    autosell: { ...s.autosell },
    discovered: [...s.discovered],
    locations: s.locations.map(l => ({ ...l, outpost: l.outpost && { ...l.outpost } })),
    deposit: { ...s.deposit, veins: s.deposit.veins.map(v => ({ ...v, mix: { ...v.mix } })) },
    expeditions: s.expeditions.map(e => ({ ...e })),
    megaprojects: { ...s.megaprojects },
    megaprogress: Object.fromEntries(Object.entries(s.megaprogress).map(([k, v]) => [k, { ...v }])),
    repeatables: { ...s.repeatables },
    contracts: s.contracts.map(c => ({ ...c, reward: { ...c.reward } })),
    achievements: [...s.achievements],
    tips: [...s.tips],
    goals: [...s.goals],
    story: [...s.story],
    civ: { ...s.civ },
    integrity: { ...s.integrity },
    factions: Object.fromEntries(Object.entries(s.factions).map(([k, v]) => [k, { ...v }])),
    drones: { ...s.drones },
    quests: s.quests.map(q => ({ ...q, reward: { ...q.reward } })),
    crises: s.crises.map(c => ({ ...c })),
    routes: s.routes.map(r => ({ ...r })),
    market: { ...s.market, sat: { ...s.market.sat } },
    keep: { ...s.keep },
    recipes: { ...s.recipes },
    throttle: { ...s.throttle },
    priority: { ...s.priority },
    protect: [...s.protect],
    overclock: Object.fromEntries(Object.entries(s.overclock).map(([k, v]) => [k, { ...v! }])),
    transcendence: { ...s.transcendence, perks: { ...s.transcendence.perks } },
    buffs: s.buffs.map(b => ({ ...b })),
    event: s.event && { ...s.event },
    chain: s.chain.map(c => ({ ...c })),
    flags: [...s.flags],
    ascension: { ...s.ascension, perks: { ...s.ascension.perks } },
    challenges: { active: s.challenges.active, done: [...s.challenges.done] },
    stats: { ...s.stats, produced: { ...s.stats.produced } },
    settings: { ...s.settings },
  };
}

/** Gerador pseudoaleatório determinístico (mulberry32): mesma semente, mesmo resultado. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
