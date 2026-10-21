import type { Effect } from '../types';

export interface Mutator { id: string; name: string; desc: string; effects: Effect[] }

// Desafio da semana: toda segunda-feira a semana sorteia uma vantagem e um revés (iguais para todo mundo,
// pela data). Quem ascende com a regra da semana valendo ganha 25% a mais de Dados de Ascensão e guarda o tempo.
export const BOONS: Mutator[] = [
  { id: 'richVein', name: 'Veio generoso', desc: 'Mineradoras e britadores +50%.',
    effects: [{ kind: 'output', building: 'miner', mult: 1.5 }, { kind: 'output', building: 'crusher', mult: 1.5 }] },
  { id: 'brightSun', name: 'Sol forte', desc: 'Painéis solares geram +60%.', effects: [{ kind: 'energyOut', building: 'solar', mult: 1.6 }] },
  { id: 'boom', name: 'Mercado em alta', desc: 'Preço de venda +20%.', effects: [{ kind: 'price', mult: 1.2 }] },
  { id: 'genius', name: 'Mentes brilhantes', desc: 'Ciência +35%.', effects: [{ kind: 'resource', res: 'science', mult: 1.35 }] },
  { id: 'tailwind', name: 'Vento a favor', desc: 'Expedições 30% mais baratas e rápidas.', effects: [{ kind: 'expedition', mult: 0.7 }] },
  { id: 'plenty', name: 'Fartura', desc: 'Comida +50% e crescimento da população +30%.',
    effects: [{ kind: 'resource', res: 'food', mult: 1.5 }, { kind: 'popGrowth', mult: 1.3 }] },
];

export const BANES: Mutator[] = [
  { id: 'cramped', name: 'Armazém curto', desc: 'Armazenamento −30%.', effects: [{ kind: 'storage', mult: 0.7 }] },
  { id: 'weakGrid', name: 'Rede fraca', desc: 'Toda a energia −20%.', effects: [{ kind: 'energyOut', mult: 0.8 }] },
  { id: 'pricey', name: 'Material caro', desc: 'Estruturas 20% mais caras.', effects: [{ kind: 'cost', mult: 1.2 }] },
  { id: 'redTape', name: 'Burocracia', desc: 'Manutenção +30%.', effects: [{ kind: 'upkeep', mult: 1.3 }] },
  { id: 'slump', name: 'Mercado frio', desc: 'Preço de venda −15%.', effects: [{ kind: 'price', mult: 0.85 }] },
  { id: 'distracted', name: 'Dispersão', desc: 'Ciência −20%.', effects: [{ kind: 'resource', res: 'science', mult: 0.8 }] },
];

/** Bônus de Dados de Ascensão por concluir a jornada da semana. */
export const WEEKLY_BONUS = 1.25;
/** Melhores tempos guardados (um por semana). */
export const WEEKLY_RECORDS_MAX = 12;
