import type { Effect, GameState } from '../types';

export interface DoctrineDef { id: string; name: string; icon: string; desc: string; effects: Effect[] }
export interface DoctrineAxis {
  id: string;
  name: string;
  desc: string;
  requiresText: string;               // o que falta para liberar o eixo
  unlock: (s: GameState) => boolean;
  options: DoctrineDef[];
}

// Doutrinas: em três pontos da jornada o jogador escolhe um rumo entre três. Cada um tem um ganho e um preço,
// vale até a próxima Ascensão e não pode ser trocado antes dela. Assim cada jornada pode ser jogada de um jeito.
export const DOCTRINE_AXES: DoctrineAxis[] = [
  {
    id: 'base', name: 'Rumo da base', desc: 'O que a base faz melhor que as outras.',
    requiresText: 'Pesquise Metalurgia avançada.', unlock: s => !!s.upgrades.metallurgy,
    options: [
      { id: 'extractive', name: 'Extrativismo', icon: 'nav-mining',
        desc: 'Mineradoras, britadores e perfuratrizes +25%; as máquinas gastam 15% mais energia.',
        effects: [{ kind: 'output', building: 'miner', mult: 1.25 }, { kind: 'output', building: 'crusher', mult: 1.25 }, { kind: 'output', building: 'deepDrill', mult: 1.25 }, { kind: 'energyUse', mult: 1.15 }] },
      { id: 'manufacture', name: 'Manufatura', icon: 'nav-industry',
        desc: 'Ligas e componentes +10%; manutenção +20%.',
        effects: [{ kind: 'resource', res: 'alloys', mult: 1.1 }, { kind: 'resource', res: 'components', mult: 1.1 }, { kind: 'upkeep', mult: 1.2 }] },
      { id: 'mercantile', name: 'Mercantilismo', icon: 'nav-market',
        desc: 'Preço de venda +10% e o mercado aguenta 25% mais vendas; estruturas 8% mais caras.',
        effects: [{ kind: 'price', mult: 1.1 }, { kind: 'depth', mult: 1.25 }, { kind: 'cost', mult: 1.08 }] },
    ],
  },
  {
    id: 'society', name: 'Contrato social', desc: 'O que a base promete a quem vive nela.',
    requiresText: 'Pesquise Habitats pressurizados.', unlock: s => !!s.upgrades.habitats,
    options: [
      { id: 'technocracy', name: 'Tecnocracia', icon: 'nav-research',
        desc: 'Ciência +10%; impostos −25%.',
        effects: [{ kind: 'resource', res: 'science', mult: 1.1 }, { kind: 'tax', mult: 0.75 }] },
      { id: 'welfare', name: 'Bem-estar', icon: 'icon-happiness',
        desc: 'Crescimento da população +40% e moradia +10%; manutenção +15%.',
        effects: [{ kind: 'popGrowth', mult: 1.4 }, { kind: 'popCap', mult: 1.1 }, { kind: 'upkeep', mult: 1.15 }] },
      { id: 'corporate', name: 'Corporativismo', icon: 'icon-credits',
        desc: 'Impostos +30% e contratos +15%; crescimento da população −25%.',
        effects: [{ kind: 'tax', mult: 1.3 }, { kind: 'contract', mult: 1.15 }, { kind: 'popGrowth', mult: 0.75 }] },
    ],
  },
  {
    id: 'destiny', name: 'Destino', desc: 'Para onde o império olha quando sai do asteroide.',
    requiresText: 'Pesquise Exploração estelar.', unlock: s => !!s.upgrades.exploration,
    options: [
      { id: 'pathfinder', name: 'Desbravadores', icon: 'nav-expansion',
        desc: 'Expedições 20% mais baratas e rápidas e novos locais 15% mais ricos; colônias −10%.',
        effects: [{ kind: 'expedition', mult: 0.8 }, { kind: 'richness', mult: 1.15 }, { kind: 'outpost', mult: 0.9 }] },
      { id: 'colonial', name: 'Colonização', icon: 'planet-habitable',
        desc: 'Colônias +25%; manutenção +15%.',
        effects: [{ kind: 'outpost', mult: 1.25 }, { kind: 'upkeep', mult: 1.15 }] },
      { id: 'architects', name: 'Arquitetos', icon: 'mega-dyson-1',
        desc: 'Megaprojetos 12% mais baratos; estruturas 8% mais caras.',
        effects: [{ kind: 'megaCost', mult: 0.88 }, { kind: 'cost', mult: 1.08 }] },
    ],
  },
];

export const AXIS_BY_ID = Object.fromEntries(DOCTRINE_AXES.map(a => [a.id, a]));
export const DOCTRINE_BY_ID = Object.fromEntries(DOCTRINE_AXES.flatMap(a => a.options.map(o => [o.id, o])));
