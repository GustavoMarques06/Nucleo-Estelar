import type { Effect } from '../types';

export interface PerkDef {
  id: string;
  name: string;
  desc: (level: number) => string;
  icon: string;
  baseCost: number;
  growth: number;
  max?: number;
  effects: (level: number) => Effect[];
}

// Melhorias permanentes compradas com Dados de Ascensão. Ficam entre jornadas.
export const PERKS: PerkDef[] = [
  { id: 'production', name: 'Herança industrial', icon: 'nav-industry', baseCost: 1, growth: 1.6,
    desc: l => t('Toda a produção +25% por nível (atual: +{n}%).', { n: l * 25 }),
    effects: l => [{ kind: 'outputAll', mult: 1 + 0.25 * l }] },
  { id: 'click', name: 'Mãos de veterano', icon: 'nav-mining', baseCost: 1, growth: 1.5,
    desc: l => t('Extração manual ×{n} no próximo nível.', { n: 2 ** (l + 1) }),
    effects: l => [{ kind: 'click', mult: 2 ** l }] },
  { id: 'start', name: 'Capital inicial', icon: 'icon-credits', baseCost: 1, growth: 2,
    desc: l => t('Começa cada jornada com {n} créditos.', { n: fmtNum(500 * 4 ** l) }),
    effects: () => [] },
  { id: 'cheap', name: 'Projetos otimizados', icon: 'icon-tool', baseCost: 2, growth: 1.8, max: 10,
    desc: l => t('Estruturas custam 6% menos por nível (atual: −{n}%).', { n: l * 6 }),
    effects: l => [{ kind: 'cost', mult: 1 - 0.06 * l }] },
  { id: 'science', name: 'Memória científica', icon: 'nav-research', baseCost: 2, growth: 1.6,
    desc: l => t('Ciência +30% por nível (atual: +{n}%).', { n: l * 30 }),
    effects: l => [{ kind: 'resource', res: 'science', mult: 1 + 0.3 * l }] },
  { id: 'offline', name: 'Turnos autônomos', icon: 'icon-clock', baseCost: 2, growth: 2, max: 8,
    desc: l => t('Produção offline por mais 2 h por nível (atual: +{n} h).', { n: l * 2 }),
    effects: l => [{ kind: 'offline', seconds: l * 7200 }] },
  { id: 'explorer', name: 'Cartografia estelar', icon: 'nav-map', baseCost: 3, growth: 1.8, max: 5,
    desc: l => t('Novos locais 15% mais ricos por nível (atual: +{n}%).', { n: l * 15 }),
    effects: l => [{ kind: 'richness', mult: 1 + 0.15 * l }] },
  { id: 'research', name: 'Arquivo do Núcleo', icon: 'nav-catalog', baseCost: 5, growth: 1, max: 1,
    desc: () => t('Mantém as pesquisas das fases 1 e 2 ao ascender.'),
    effects: () => [] },
];

import { fmtNum } from '../engine/format';
import { t } from '../../i18n';
export const PERK_BY_ID = Object.fromEntries(PERKS.map(p => [p.id, p]));
export const perkCost = (p: PerkDef, level: number) => Math.ceil(p.baseCost * Math.pow(p.growth, level));

/** Dados recebidos ao ascender agora: cresce com a raiz dos créditos ganhos na jornada (1 bi ≈ 4 dados). */
export const ascensionGain = (earned: number) => Math.floor(Math.sqrt(Math.max(0, earned) / 1e9) * 4);
