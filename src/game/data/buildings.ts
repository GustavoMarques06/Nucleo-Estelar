import type { BuildingDef, BuildingId } from '../types';
import { BALANCE } from './balance';

// Valores iniciais — calibrados pelo teste de progressão (engine/progression.test.ts).
// A ordem importa: extratores rodam antes dos conversores na simulação.
export const BUILDINGS: BuildingDef[] = [
  // ---------- Fase 1–2: mineração, energia e indústria básica ----------
  {
    id: 'miner', name: 'Mineradora', category: 'mining', sprite: 'building-miner',
    desc: 'Extrai minério da jazida do asteroide.',
    cost: { credits: 15 }, growth: 1.15, energyUse: 1, extract: 1,
    unlock: () => true,
  },
  {
    id: 'crusher', name: 'Britador de asteroide', category: 'mining', sprite: 'building-asteroid-crusher',
    desc: 'Tritura blocos inteiros do asteroide: extração pesada.',
    cost: { credits: 2500, alloys: 120 }, growth: 1.2, energyUse: 8, workers: 3, extract: 12,
    requires: 'metallurgy',
  },
  {
    id: 'deepDrill', name: 'Perfuratriz profunda', category: 'mining', sprite: 'building-deep-drill',
    desc: 'Perfura fundo no asteroide: extração pesada, ótima para esvaziar veios rápido. Exige titânio para construir.',
    cost: { credits: 90000, alloys: 1500, titanium: 120 }, growth: 1.22, energyUse: 18, workers: 4, extract: 40,
    requires: 'deepDrilling',
  },
  {
    id: 'iceExtractor', name: 'Extrator de gelo', category: 'mining', sprite: 'building-ice-extractor',
    desc: 'Derrete gelo do subsolo em água.',
    cost: { credits: 900, alloys: 30 }, growth: 1.16, energyUse: 3, outputs: { water: 2 },
    requires: 'iceMining',
  },
  {
    id: 'solar', name: 'Painel solar', category: 'energy', sprite: 'building-solar',
    desc: 'Gera energia limpa para as máquinas.',
    cost: { credits: 40 }, growth: 1.15, energyOut: 5,
    unlock: s => s.buildings.miner > 0 || s.stats.totalMined >= 20,
  },
  {
    id: 'battery', name: 'Banco de baterias', category: 'energy', sprite: 'building-battery',
    desc: 'Armazena os picos de geração e devolve na demanda: +6% de toda a energia por unidade.',
    cost: { credits: 1500, components: 10 }, growth: 1.3, boost: { kind: 'energyAll', per: 0.06 },
    requires: 'energyStorage',
  },
  {
    id: 'fission', name: 'Reator de fissão', category: 'energy', sprite: 'building-fission',
    desc: 'Grande fonte de energia para operações industriais.',
    cost: { credits: 6000, alloys: 150, components: 20 }, growth: 1.25, energyOut: 60,
    unlock: s => s.buildings.factory >= 1 || s.buildings.fission > 0,
  },
  {
    id: 'orbitalCollector', name: 'Coletor solar orbital', category: 'energy', sprite: 'building-orbital-collector',
    desc: 'Painel em órbita que transmite energia por feixe.',
    cost: { credits: 60000, alloys: 800, components: 150 }, growth: 1.22, energyOut: 220,
    requires: 'orbitalSolar',
  },
  {
    id: 'fusion', name: 'Reator de fusão', category: 'energy', sprite: 'building-fusion-ring',
    desc: 'Funde água pesada em energia imensa. Sem água, não gera.',
    cost: { credits: 400000, alloys: 4000, components: 900, exotic: 5 }, growth: 1.3,
    energyOut: 1500, inputs: { water: 3 }, workers: 10,
    requires: 'fusion',
  },
  {
    id: 'refinery', name: 'Refinaria', category: 'industry', sprite: 'building-refinery',
    desc: 'Funde ferro em ligas, que valem mais que o minério bruto.',
    cost: { credits: 120 }, growth: 1.15, energyUse: 3,
    inputs: { iron: 2 }, outputs: { alloys: 1 },
    unlock: s => s.stats.totalMined >= 40 || s.buildings.refinery > 0,
    alt: { name: 'Refino com cobre', desc: 'Mistura cobre ao ferro: mais liga por ferro, mas gasta cobre e mais energia.', inputs: { iron: 1, copper: 1 }, outputs: { alloys: 1.5 }, energy: 1.3 },
  },
  {
    id: 'foundry', name: 'Fundição de ligas', category: 'industry', sprite: 'building-foundry',
    desc: 'Mistura ferro e cobre em ligas com o dobro do rendimento.',
    cost: { credits: 3000, alloys: 80 }, growth: 1.18, energyUse: 6, workers: 2,
    inputs: { iron: 4, copper: 2 }, outputs: { alloys: 5 },
    requires: 'metallurgy',
    alt: { name: 'Reciclagem de sucata', desc: 'Reaproveita sucata: rende menos liga, mas gasta metade da energia.', inputs: { iron: 2, copper: 1 }, outputs: { alloys: 2.4 }, energy: 0.5 },
  },
  {
    id: 'titaniumForge', name: 'Forja de titânio', category: 'industry', sprite: 'building-titanium-forge',
    desc: 'Funde ferro com titânio em ligas leves: quase o triplo do rendimento da fundição.',
    cost: { credits: 60000, alloys: 600, titanium: 80 }, growth: 1.2, energyUse: 12, workers: 3,
    inputs: { iron: 3, titanium: 0.5 }, outputs: { alloys: 14 },
    requires: 'lightAlloys',
  },
  {
    id: 'refineryComplex', name: 'Complexo de refino', category: 'industry', sprite: 'building-refinery-complex',
    desc: 'Refino em escala industrial.',
    cost: { credits: 250000, alloys: 3000, components: 500 }, growth: 1.22, energyUse: 30, workers: 8,
    inputs: { iron: 30, copper: 10 }, outputs: { alloys: 40 },
    requires: 'heavyIndustry',
  },
  {
    id: 'factory', name: 'Fábrica de componentes', category: 'industry', sprite: 'building-factory',
    desc: 'Combina ligas e cobre em componentes de alto valor.',
    cost: { credits: 1500, alloys: 50 }, growth: 1.18, energyUse: 6,
    inputs: { alloys: 1, copper: 1 }, outputs: { components: 0.5 },
    unlock: s => s.buildings.refinery >= 2 || s.buildings.factory > 0,
    alt: { name: 'Montagem de precisão', desc: 'Adiciona ouro ao processo: dobra os componentes, com mais energia.', inputs: { alloys: 1, copper: 1, gold: 0.1 }, outputs: { components: 1 }, energy: 1.5 },
  },
  {
    id: 'industrialComplex', name: 'Complexo industrial', category: 'industry', sprite: 'building-industrial-complex',
    desc: 'Linha robotizada de componentes.',
    cost: { credits: 30000, alloys: 600, components: 120 }, growth: 1.2, energyUse: 20, workers: 6,
    inputs: { alloys: 6, copper: 4 }, outputs: { components: 5 },
    requires: 'automation',
  },
  {
    id: 'maintenance', name: 'Hangar de drones', category: 'logistics', sprite: 'building-maintenance',
    desc: 'Monta drones autônomos. Depois designe-os a funções na aba Logística.',
    cost: { credits: 20000, components: 100 }, growth: 1.3, energyUse: 5, workers: 1,
    inputs: { alloys: 6, components: 2 }, outputs: { drones: 0.004 },
    requires: 'droneLogistics',
  },
  {
    id: 'observatory', name: 'Observatório', category: 'science', sprite: 'building-observatory',
    desc: 'Laboratório automatizado: gera ciência.',
    cost: { credits: 400, alloys: 10 }, growth: 1.24, energyUse: 4, outputs: { science: 0.4 },
    requires: 'lab',
  },
  {
    id: 'cleanroom', name: 'Sala limpa', category: 'science', sprite: 'building-cleanroom',
    desc: 'Pesquisa de ponta com componentes e ouro.',
    cost: { credits: 120000, alloys: 1500, components: 400 }, growth: 1.22, energyUse: 25, workers: 8,
    inputs: { components: 1, gold: 0.3 }, outputs: { science: 25 },
    requires: 'nanotech',
  },
  {
    id: 'crystalArray', name: 'Matriz de cristais', category: 'science', sprite: 'building-crystal-array',
    desc: 'Cristais amplificam os sensores: ciência em escala. Consome cristais de veios.',
    cost: { credits: 150000, components: 300, crystals: 40 }, growth: 1.22, energyUse: 20, workers: 5,
    inputs: { crystals: 0.4 }, outputs: { science: 60 },
    requires: 'crystallography',
  },
  {
    id: 'chemicalPlant', name: 'Usina química', category: 'industry', sprite: 'building-chemical-plant',
    desc: 'Processa água em combustível para naves.',
    cost: { credits: 15000, alloys: 300, components: 40 }, growth: 1.18, energyUse: 8, workers: 2,
    inputs: { water: 3 }, outputs: { fuel: 1 },
    requires: 'chemistry',
    alt: { name: 'Fracionamento intensivo', desc: 'Destilação a alta pressão: mais combustível por água, com mais energia.', inputs: { water: 4 }, outputs: { fuel: 2.2 }, energy: 1.8 },
  },

  {
    id: 'moduleLine', name: 'Linha de módulos', category: 'industry', sprite: 'building-module-line',
    desc: 'Terceiro nível da cadeia: transforma componentes, ouro e combustível em módulos avançados.',
    cost: { credits: 180000, alloys: 2500, components: 600 }, growth: 1.22, energyUse: 30, workers: 8,
    inputs: { components: 3, gold: 0.4, fuel: 0.5 }, outputs: { modules: 0.5 },
    requires: 'modularProduction',
  },
  {
    id: 'quantumLab', name: 'Laboratório quântico', category: 'science', sprite: 'building-quantum-lab',
    desc: 'Computadores quânticos alimentados por módulos: a maior fonte de ciência.',
    cost: { credits: 900000, alloys: 8000, components: 1500, modules: 30 }, growth: 1.25, energyUse: 80, workers: 12,
    inputs: { modules: 0.4, components: 1 }, outputs: { science: 220 },
    requires: 'quantumComputing',
  },

  // ---------- Fase 4: civilização ----------
  {
    id: 'habitat', name: 'Habitat pressurizado', category: 'civilization', sprite: 'building-research-dome',
    desc: 'Moradia para colonos.',
    cost: { credits: 3000, alloys: 100 }, growth: 1.18, energyUse: 2, housing: 10,
    requires: 'habitats',
  },
  {
    id: 'hydroponics', name: 'Estufa hidropônica', category: 'civilization', sprite: 'building-hydroponics',
    desc: 'Cultiva alimentos com água. Automatizada: não precisa de trabalhadores.',
    cost: { credits: 2500, alloys: 60 }, growth: 1.16, energyUse: 2,
    inputs: { water: 1 }, outputs: { food: 3 },
    requires: 'habitats',
    alt: { name: 'Cultivo intensivo', desc: 'Luz e nutrientes em excesso: mais que o dobro de comida, mas energia pesada.', inputs: { water: 2 }, outputs: { food: 7 }, energy: 2.5 },
  },
  {
    id: 'hospital', name: 'Centro médico', category: 'civilization', sprite: 'building-hospital',
    desc: 'Saúde em dia: +20% de crescimento populacional por unidade.',
    cost: { credits: 8000, alloys: 150, components: 20 }, growth: 1.3, energyUse: 3, workers: 3,
    boost: { kind: 'popGrowth', per: 0.2 },
    requires: 'medicine',
  },
  {
    id: 'university', name: 'Universidade', category: 'science', sprite: 'building-university',
    desc: 'Cientistas formados geram muita ciência.',
    cost: { credits: 12000, alloys: 200, components: 40 }, growth: 1.2, energyUse: 4, workers: 5,
    outputs: { science: 4 },
    requires: 'education',
  },
  {
    id: 'residential', name: 'Torre residencial', category: 'civilization', sprite: 'building-hq-tower',
    desc: 'Distrito vertical: muita moradia e +5% de impostos por unidade.',
    cost: { credits: 40000, alloys: 900, components: 120 }, growth: 1.2, energyUse: 6, housing: 60,
    boost: { kind: 'tax', per: 0.05 },
    requires: 'urbanism',
  },
  {
    id: 'market', name: 'Entreposto comercial', category: 'commerce', sprite: 'building-market',
    desc: 'Comércio direto: +4% no preço de venda de tudo por unidade.',
    cost: { credits: 10000, alloys: 150 }, growth: 1.35, energyUse: 2, workers: 2,
    boost: { kind: 'priceAll', per: 0.04 },
    requires: 'commerce',
  },
  {
    id: 'spaceport', name: 'Porto espacial', category: 'commerce', sprite: 'building-spaceport-hub',
    desc: 'Comércio interplanetário: gera créditos de taxas portuárias.',
    cost: { credits: 300000, alloys: 3000, components: 600 }, growth: 1.25, energyUse: 20, workers: 10,
    outputs: { credits: 400 },
    requires: 'interstellarTrade',
  },

  {
    id: 'arcology', name: 'Arcologia', category: 'civilization', sprite: 'building-arcology',
    desc: 'Cidade-torre autossuficiente: moradia enorme e +10% de impostos por unidade.',
    cost: { credits: 1200000, alloys: 12000, components: 2500, modules: 60 }, growth: 1.25, energyUse: 40, housing: 400,
    boost: { kind: 'tax', per: 0.1 },
    requires: 'arcologies',
  },
  {
    id: 'embassy', name: 'Embaixada', category: 'diplomacy', sprite: 'building-embassy',
    desc: 'Corpo diplomático permanente: gera influência, que compra decretos e abre disputas.',
    cost: { credits: 60000, alloys: 800, components: 100 }, growth: 1.3, energyUse: 4, workers: 3,
    outputs: { influence: 0.05 },
    requires: 'embassies',
  },

  // ---------- Logística ----------
  {
    id: 'storage', name: 'Armazém', category: 'logistics', sprite: 'building-storage',
    desc: 'Aumenta a capacidade de todos os materiais. Cada armazém novo é maior que o anterior.',
    cost: { credits: 60 }, growth: 1.2, storage: 150, storageGrowth: 1.12,
    unlock: s => s.stats.totalMined >= 80 || s.buildings.storage > 0,
  },

  // ---------- Fase 5: expansão ----------
  {
    id: 'shipyard', name: 'Estaleiro', category: 'expansion', sprite: 'building-shipyard',
    desc: 'Monta naves para expedições e colônias.',
    cost: { credits: 25000, alloys: 500, components: 100 }, growth: 1.25, energyUse: 12, workers: 5,
    inputs: { alloys: 4, components: 1 }, outputs: { ships: 0.02 },
    requires: 'shipbuilding',
  },
  {
    id: 'comms', name: 'Centro de comunicação', category: 'expansion', sprite: 'building-comms',
    desc: 'Rastreia rotas: expedições 15% mais rápidas por unidade.',
    cost: { credits: 20000, alloys: 300, components: 60 }, growth: 1.4, energyUse: 5,
    boost: { kind: 'expeditionSpeed', per: 0.15 },
    requires: 'exploration',
  },
  {
    id: 'harbor', name: 'Porto de carga', category: 'expansion', sprite: 'building-harbor',
    desc: 'Rotas de transporte com as colônias: +12% na produção dos postos por unidade.',
    cost: { credits: 80000, alloys: 1000, components: 200 }, growth: 1.3, energyUse: 8, workers: 4,
    boost: { kind: 'outpost', per: 0.12 },
    requires: 'logisticsNet',
  },
];

// Manutenção: estruturas grandes cobram créditos por segundo, proporcional ao custo-base.
for (const b of BUILDINGS) {
  const credits = b.cost.credits ?? 0;
  if (credits >= BALANCE.upkeepMinCost) b.upkeep = Math.round(credits * BALANCE.upkeepRate * 100) / 100;
}

// Ritmo: aplica o acréscimo global de crescimento de custo.
for (const b of BUILDINGS) b.growth = Math.round((b.growth + BALANCE.buildingGrowthAdd) * 1000) / 1000;

export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b])) as Record<BuildingId, BuildingDef>;
export const BUILDING_IDS = BUILDINGS.map(b => b.id);
