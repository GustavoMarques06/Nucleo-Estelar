import type { Effect } from '../types';

export interface DecreeDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  cost: number;              // influência
  duration: number;          // segundos
  effects: Effect[];
}

// Decretos: a influência compra efeitos temporários fortes. Não acumulam: reeditar renova a duração.
export const DECREES: DecreeDef[] = [
  { id: 'hotMarket', name: 'Mercado aquecido', icon: 'nav-market', cost: 200, duration: 600,
    desc: 'Preços de venda +15% e o mercado absorve 30% mais vendas por 10 min.',
    effects: [{ kind: 'price', mult: 1.15 }, { kind: 'depth', mult: 1.3 }] },
  { id: 'mobilization', name: 'Mobilização industrial', icon: 'nav-industry', cost: 400, duration: 600,
    desc: 'Toda a produção +20% por 10 min.',
    effects: [{ kind: 'outputAll', mult: 1.2 }] },
  { id: 'austerity', name: 'Austeridade', icon: 'icon-tool', cost: 150, duration: 900,
    desc: 'Manutenção −60% e estruturas 10% mais baratas por 15 min.',
    effects: [{ kind: 'upkeep', mult: 0.4 }, { kind: 'cost', mult: 0.9 }] },
  { id: 'frontier', name: 'Fronteira aberta', icon: 'nav-expansion', cost: 250, duration: 900,
    desc: 'Expedições 30% mais baratas e rápidas e colônias +15% por 15 min.',
    effects: [{ kind: 'expedition', mult: 0.7 }, { kind: 'outpost', mult: 1.15 }] },
];

export const DECREE_BY_ID = Object.fromEntries(DECREES.map(d => [d.id, d]));
export const DECREE_BUFF_PREFIX = 'decree-';
