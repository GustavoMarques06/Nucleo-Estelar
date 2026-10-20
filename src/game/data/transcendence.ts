import type { Effect } from '../types';
import { t } from '../../i18n';

export interface StarPerkDef {
  id: string;
  name: string;
  icon: string;
  baseCost: number;
  growth: number;
  max?: number;
  desc: (level: number) => string;
  effects: (level: number) => Effect[];
}

// Melhorias da Transcendência (segunda camada de recomeço). Sobrevivem a Ascensões e a novas Transcendências.
export const STAR_PERKS: StarPerkDef[] = [
  { id: 'seedProd', name: 'Ressonância estelar', icon: 'star-blue-giant', baseCost: 1, growth: 1.8,
    desc: l => t('Toda a produção +60% por nível (atual: +{n}%).', { n: l * 60 }),
    effects: l => [{ kind: 'outputAll', mult: 1 + 0.6 * l }] },
  { id: 'seedAsc', name: 'Eco dos dados', icon: 'icon-star', baseCost: 1, growth: 1.7,
    desc: l => t('Dados de Ascensão +30% por nível (atual: +{n}%).', { n: l * 30 }),
    effects: () => [] },
  { id: 'seedStart', name: 'Memória de era', icon: 'nav-research', baseCost: 2, growth: 2.2, max: 3,
    desc: l => (l === 0 ? t('Cada nível mantém mais uma fase de pesquisas ao recomeçar (nível 1: fases 1–3 … nível 3: fases 1–5).') : t('Cada recomeço mantém as pesquisas das fases 1 a {n}.', { n: 2 + l })),
    effects: () => [] },
  { id: 'seedCore', name: 'Engenharia do vazio', icon: 'mega-gate', baseCost: 2, growth: 1.9, max: 5,
    desc: l => t('Megaprojetos custam 10% menos por nível (atual: −{n}%).', { n: l * 10 }),
    effects: l => [{ kind: 'megaCost', mult: 1 - 0.1 * l }] },
  { id: 'seedDrones', name: 'Enxame autônomo', icon: 'drone-transport', baseCost: 2, growth: 1.8, max: 6,
    desc: l => t('Bônus dos drones +25% por nível e +20 drones no início de cada jornada (atual: +{a}% e {b} drones).', { a: l * 25, b: l * 20 }),
    effects: l => [{ kind: 'droneBoost', mult: 1 + 0.25 * l }] },
];

export const STAR_PERK_BY_ID = Object.fromEntries(STAR_PERKS.map(p => [p.id, p]));
export const starPerkCost = (p: StarPerkDef, level: number) => Math.ceil(p.baseCost * Math.pow(p.growth, level));

/** Sementes recebidas ao transcender: crescem com os dados de ascensão acumulados e com o Núcleo Estelar. */
export const transcendGain = (ascensionTotal: number, coreStages: number, singularityStages: number) =>
  Math.floor(Math.sqrt(Math.max(0, ascensionTotal) / 8) + coreStages / 5 + singularityStages * 2);
