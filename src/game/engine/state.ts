import type { BuildingId, GameState, ResId } from '../types';
import { RES_IDS } from '../data/resources';
import { BALANCE } from '../data/balance';
import { BUILDING_IDS } from '../data/buildings';
import { FACTIONS } from '../data/factions';

export const SAVE_VERSION = 10;

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
    factions: Object.fromEntries(FACTIONS.map(f => [f.id, { relation: 0, cooldown: 0, questTimer: 240 }])),
    quests: [],
    crises: [],
    crisisTimer: BALANCE.crisisFirstDelay,
    routes: [],
    market: { clock: 0, sat: {} },
    autosellFloor: 0,
    keep: {},
    recipes: {},
    debt: 0,
    drones: { courier: 0, scout: 0, hauler: 0, mechanic: 0, terraformer: 0 },
    transcendence: { seeds: 0, total: 0, count: 0, perks: {}, unlocked: false },
    buffs: [],
    event: null,
    eventTimer: BALANCE.eventMinGap,
    ascension: { points: 0, total: 0, count: 0, perks: {} },
    stats: { totalMined: 0, produced: {}, earned: 0, lifetimeEarned: 0, playTime: 0, contractsDone: 0, eventsSeen: 0, crisesSolved: 0, highSales: 0, reputation: 0, questsDone: 0 },
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
    factions: Object.fromEntries(Object.entries(s.factions).map(([k, v]) => [k, { ...v }])),
    drones: { ...s.drones },
    quests: s.quests.map(q => ({ ...q, reward: { ...q.reward } })),
    crises: s.crises.map(c => ({ ...c })),
    routes: s.routes.map(r => ({ ...r })),
    market: { ...s.market, sat: { ...s.market.sat } },
    keep: { ...s.keep },
    recipes: { ...s.recipes },
    transcendence: { ...s.transcendence, perks: { ...s.transcendence.perks } },
    buffs: s.buffs.map(b => ({ ...b })),
    event: s.event && { ...s.event },
    ascension: { ...s.ascension, perks: { ...s.ascension.perks } },
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
