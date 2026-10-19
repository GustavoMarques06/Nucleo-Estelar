import type { Amounts, Effect, GameState } from '../types';
import { BALANCE } from './balance';

export interface MegaStage { cost: Amounts; effects: Effect[]; desc: string; sprite: string }
export interface MegaprojectDef {
  id: string; name: string; desc: string; stages: MegaStage[];
  /** Megaprojeto sem fim: gera o estágio n (0, 1, 2, …) sob demanda. */
  endless?: (n: number) => MegaStage;
  requires?: (s: GameState) => boolean;
}

// Projetos gigantes de fim de jogo (GDD, fase 6). Cada estágio é comprado inteiro e dá um bônus permanente
// nesta jornada.
export const MEGAPROJECTS: MegaprojectDef[] = [
  {
    id: 'dyson', name: 'Enxame de Dyson', desc: 'Coletores ao redor da estrela do sistema.',
    stages: [
      { sprite: 'mega-dyson-1', desc: 'Primeiros coletores: toda a energia ×1,5.',
        cost: { credits: 2e6, alloys: 20000, components: 4000, exotic: 80 }, effects: [{ kind: 'energyOut', mult: 1.5 }] },
      { sprite: 'mega-dyson-2', desc: 'Anéis de coletores: toda a energia ×1,5.',
        cost: { credits: 8e6, alloys: 60000, components: 12000, exotic: 200, modules: 60 }, effects: [{ kind: 'energyOut', mult: 1.5 }] },
      { sprite: 'mega-dyson-3', desc: 'Casca parcial: toda a energia ×2.',
        cost: { credits: 3e7, alloys: 150000, components: 30000, exotic: 500, modules: 150 }, effects: [{ kind: 'energyOut', mult: 2 }] },
      { sprite: 'mega-dyson-4', desc: 'Esfera completa: energia ×2 e toda a produção ×1,5.',
        cost: { credits: 1e8, alloys: 400000, components: 80000, exotic: 1200, modules: 400 },
        effects: [{ kind: 'energyOut', mult: 2 }, { kind: 'outputAll', mult: 1.5 }] },
    ],
  },
  {
    id: 'ring', name: 'Anel orbital', desc: 'Uma cidade em anel ao redor do planeta natal.',
    stages: [
      { sprite: 'mega-orbital-ring', desc: 'Moradia ×2 e impostos ×1,5.',
        cost: { credits: 5e6, alloys: 50000, components: 10000, exotic: 150, modules: 80 },
        effects: [{ kind: 'popCap', mult: 2 }, { kind: 'tax', mult: 1.5 }] },
    ],
  },
  {
    id: 'gate', name: 'Portal estelar', desc: 'Atalho entre sistemas distantes.',
    stages: [
      { sprite: 'mega-gate', desc: 'Expedições custam e duram 75% menos; colônias produzem ×1,5.',
        cost: { credits: 1e7, alloys: 80000, components: 20000, exotic: 300, modules: 120 },
        effects: [{ kind: 'expedition', mult: 0.25 }, { kind: 'outpost', mult: 1.5 }] },
    ],
  },
  {
    id: 'shipyard', name: 'Estaleiro de grande escala', desc: 'Frotas inteiras de uma vez.',
    stages: [
      { sprite: 'mega-shipyard', desc: 'Produção de naves ×4.',
        cost: { credits: 4e6, alloys: 40000, components: 8000, exotic: 100 }, effects: [{ kind: 'resource', res: 'ships', mult: 4 }] },
    ],
  },
  {
    id: 'engine', name: 'Propulsor de nave-mundo', desc: 'Leva expedições a regiões nunca vistas.',
    stages: [
      { sprite: 'mega-engine', desc: 'Novos locais são 60% mais ricos.',
        cost: { credits: 6e6, alloys: 60000, components: 12000, exotic: 200 }, effects: [{ kind: 'richness', mult: 1.6 }] },
    ],
  },
];

// O Núcleo Estelar: o projeto que dá nome ao jogo. Não tem fim — cada estágio custa ~2,4× o anterior
// e multiplica toda a produção. É o que mantém a jornada infinita depois do resto concluído.
MEGAPROJECTS.push({
  id: 'core', name: 'Núcleo Estelar', desc: 'Uma estrela artificial no centro do império. Sempre pode crescer mais.',
  stages: [],
  requires: s => (s.megaprojects.dyson ?? 0) >= 4,
  endless: n => {
    const k = Math.pow(2.4, n);
    return {
      sprite: n < 3 ? 'star-orange' : n < 8 ? 'star-yellow' : n < 15 ? 'star-blue-giant' : 'star-white-dwarf',
      desc: `Estágio ${n + 1}: toda a produção ×1,2 e energia ×1,2.`,
      cost: Object.fromEntries(Object.entries({ credits: 2e9, alloys: 2e6, components: 4e5, exotic: 5000, science: 5e7, modules: 2e4 }).map(([r, v]) => [r, Math.round(v * k)])),
      effects: [{ kind: 'outputAll', mult: 1.2 }, { kind: 'energyOut', mult: 1.2 }],
    };
  },
});

// Escala geral dos custos (calibrada pelo teste de progressão). Os materiais são entregues aos poucos.
const COST_SCALE = BALANCE.megaCostScale;
for (const mp of MEGAPROJECTS) for (const st of mp.stages) {
  st.cost = Object.fromEntries(Object.entries(st.cost).map(([r, v]) => [r, Math.round((v ?? 0) * COST_SCALE)]));
}

// A Singularidade: o desfecho. Cinco estágios enormes (já em escala final, fora do COST_SCALE acima),
// liberados depois do estágio 5 do Núcleo Estelar. Concluí-la encerra a história e libera a Transcendência.
const SING_BASE = { credits: 5e11, alloys: 5e8, components: 1e8, exotic: 3e5, science: 5e9, modules: 2e7 };
const singStage = (n: number, sprite: string, desc: string, effects: Effect[]): MegaStage => ({
  sprite, desc, effects,
  cost: Object.fromEntries(Object.entries(SING_BASE).map(([r, v]) => [r, Math.round(v * Math.pow(3, n))])),
});
MEGAPROJECTS.push({
  id: 'singularity', name: 'Singularidade', desc: 'O ponto final: curvar o espaço-tempo em torno do império.',
  requires: s => (s.megaprojects.core ?? 0) >= 5,
  stages: [
    singStage(0, 'mega-gate', 'Anel de contenção: energia ×1,5.', [{ kind: 'energyOut', mult: 1.5 }]),
    singStage(1, 'mega-engine', 'Motor de curvatura: toda a produção ×1,3.', [{ kind: 'outputAll', mult: 1.3 }]),
    singStage(2, 'mega-orbital-ring', 'Cidade-anel: moradia ×2 e impostos ×2.', [{ kind: 'popCap', mult: 2 }, { kind: 'tax', mult: 2 }]),
    singStage(3, 'star-neutron', 'Núcleo de nêutrons: energia ×2 e toda a produção ×1,3.', [{ kind: 'energyOut', mult: 2 }, { kind: 'outputAll', mult: 1.3 }]),
    singStage(4, 'mega-dyson-4', 'Singularidade estável: toda a produção ×2. Encerra a história.', [{ kind: 'outputAll', mult: 2 }]),
  ],
});

export const MEGA_BY_ID = Object.fromEntries(MEGAPROJECTS.map(m => [m.id, m]));
