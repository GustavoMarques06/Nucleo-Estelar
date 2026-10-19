import type { Effect, GameState } from '../types';
import { BALANCE } from './balance';

export interface RepeatableDef {
  id: string;
  name: string;
  icon: string;
  desc: (level: number) => string;
  baseCost: number;          // ciência no nível 0
  growth: number;            // multiplicador de custo por nível
  unlock: (s: GameState) => boolean;
  effects: (level: number) => Effect[];
}

const pct = (base: number, l: number) => `${Math.round((Math.pow(base, l) - 1) * 100)}%`;

// Pesquisas contínuas: sem nível máximo, custo exponencial. Garantem que sempre exista algo a pesquisar
// (GDD: "sempre existe um próximo objetivo"). Reiniciam na Ascensão.
export const REPEATABLES: RepeatableDef[] = [
  { id: 'rProduction', name: 'Otimização de processos', icon: 'nav-industry', baseCost: 5000, growth: 1.75,
    desc: l => `Toda a produção +10% por nível (composto). Atual: +${pct(1.1, l)}.`,
    unlock: s => !!s.upgrades.ai, effects: l => [{ kind: 'outputAll', mult: Math.pow(1.1, l) }] },
  { id: 'rEnergy', name: 'Eficiência de reatores', icon: 'nav-energy', baseCost: 4000, growth: 1.7,
    desc: l => `Toda a energia +12% por nível. Atual: +${pct(1.12, l)}.`,
    unlock: s => !!s.upgrades.superconductors, effects: l => [{ kind: 'energyOut', mult: Math.pow(1.12, l) }] },
  { id: 'rStorage', name: 'Compressão de carga', icon: 'icon-crate', baseCost: 3000, growth: 1.8,
    desc: l => `Capacidade de armazenamento +30% por nível. Atual: +${pct(1.3, l)}.`,
    unlock: s => !!s.upgrades.automation, effects: l => [{ kind: 'storage', mult: Math.pow(1.3, l) }] },
  { id: 'rScience', name: 'Método científico', icon: 'nav-research', baseCost: 6000, growth: 1.8,
    desc: l => `Ciência +12% por nível. Atual: +${pct(1.12, l)}.`,
    unlock: s => !!s.upgrades.education, effects: l => [{ kind: 'resource', res: 'science', mult: Math.pow(1.12, l) }] },
  { id: 'rTrade', name: 'Diplomacia comercial', icon: 'icon-check', baseCost: 5000, growth: 1.75,
    desc: l => `Recompensa dos contratos +15% por nível. Atual: +${pct(1.15, l)}.`,
    unlock: s => !!s.upgrades.commerce, effects: l => [{ kind: 'contract', mult: Math.pow(1.15, l) }] },
  { id: 'rDeepSpace', name: 'Cartografia profunda', icon: 'nav-map', baseCost: 40000, growth: 1.9,
    desc: l => `Novos locais +10% mais ricos e colônias +10% por nível. Atual: +${pct(1.1, l)}.`,
    unlock: s => !!s.upgrades.exploration, effects: l => [{ kind: 'richness', mult: Math.pow(1.1, l) }, { kind: 'outpost', mult: Math.pow(1.1, l) }] },
];

export const REPEATABLE_BY_ID = Object.fromEntries(REPEATABLES.map(r => [r.id, r]));
export const repeatableCost = (r: RepeatableDef, level: number) => Math.ceil(r.baseCost * BALANCE.repeatableCostScale * Math.pow(r.growth, level));
