import type { BuildingId, GameState } from '../game/types';
import { BUILDINGS } from '../game/data/buildings';
import { LAYERS } from '../game/data/layers';
import { ASTEROID_PADS } from './asteroidPads';

// Configuração da cena do asteroide (posições, aparências por progresso e lista de imagens a carregar).
// Fica separada de GameScene para que ajustar a arte não exija mexer na lógica de desenho.

// Posições na superfície do asteroide, em frações da largura exibida do asteroide
// (origem no centro). Cada estrutura ganha mais instâncias visuais conforme a quantidade.
export const SLOTS: Partial<Record<BuildingId, { at: [number, number][]; thresholds: number[]; size: number }>> = {
  miner: { at: [[-0.16, -0.13], [-0.3, -0.06], [-0.05, -0.05]], thresholds: [1, 5, 15], size: 0.2 },
  refinery: { at: [[0.0, -0.3]], thresholds: [1], size: 0.22 },
  factory: { at: [[0.2, -0.19]], thresholds: [1], size: 0.23 },
  storage: { at: [[0.08, -0.07], [-0.02, 0.0]], thresholds: [1, 8], size: 0.19 },
  solar: { at: [[0.3, -0.12], [0.2, -0.04], [0.33, -0.02]], thresholds: [1, 4, 10], size: 0.19 },
  fission: { at: [[-0.33, -0.3]], thresholds: [1], size: 0.2 },
  // Fases 3–5: terraços e bordas do asteroide
  observatory: { at: [[-0.42, 0.02]], thresholds: [1], size: 0.15 },
  iceExtractor: { at: [[-0.24, 0.07]], thresholds: [1], size: 0.15 },
  crusher: { at: [[-0.46, -0.16]], thresholds: [1], size: 0.17 },
  foundry: { at: [[0.11, -0.3]], thresholds: [1], size: 0.15 },
  comms: { at: [[0.18, -0.4]], thresholds: [1], size: 0.13 },
  shipyard: { at: [[-0.56, -0.02]], thresholds: [1], size: 0.18 },
  fusion: { at: [[-0.12, -0.42]], thresholds: [1], size: 0.17 },
  orbitalCollector: { at: [[0.56, -0.56]], thresholds: [1], size: 0.2 },
  moduleLine: { at: [[-0.5, 0.2]], thresholds: [1], size: 0.17 },
  quantumLab: { at: [[-0.34, 0.24]], thresholds: [1], size: 0.15 },
  // Estruturas que faltavam: bordas externas do asteroide
  battery: { at: [[0.02, 0.27]], thresholds: [1], size: 0.11 },
  industrialComplex: { at: [[-0.45, -0.38]], thresholds: [1], size: 0.15 },
  maintenance: { at: [[-0.64, 0.14]], thresholds: [1], size: 0.13 },
  cleanroom: { at: [[0.5, -0.38]], thresholds: [1], size: 0.14 },
  chemicalPlant: { at: [[-0.2, 0.36]], thresholds: [1], size: 0.14 },
  spaceport: { at: [[0.68, -0.22]], thresholds: [1], size: 0.16 },
  refineryComplex: { at: [[-0.72, -0.3]], thresholds: [1], size: 0.17 },
  harbor: { at: [[0.7, 0.36]], thresholds: [1], size: 0.14 },
  deepDrill: { at: [[-0.38, -0.22]], thresholds: [1], size: 0.13 },
  titaniumForge: { at: [[0.38, -0.34]], thresholds: [1], size: 0.14 },
  crystalArray: { at: [[0.64, -0.04]], thresholds: [1], size: 0.13 },
  // Energia excedente, reciclagem e armazéns especializados
  converter: { at: [[-0.3, -0.5]], thresholds: [1], size: 0.1 },
  recycler: { at: [[-0.4, 0.38]], thresholds: [1], size: 0.1 },
  silo: { at: [[0.18, 0.36]], thresholds: [1], size: 0.12 },
  tank: { at: [[-0.68, -0.1]], thresholds: [1], size: 0.11 },
  depot: { at: [[0.68, 0.22]], thresholds: [1], size: 0.12 },
  geothermal: { at: [[-0.1, 0.3]], thresholds: [1], size: 0.11 },
  flowBattery: { at: [[0.1, 0.42]], thresholds: [1], size: 0.11 },
  antimatter: { at: [[-0.24, -0.58]], thresholds: [1], size: 0.15 },
};

/** Face de cima do asteroide (onde fica a base), em frações da largura do sprite a partir do centro. */
export const TOP_FACE = { cx: 0, cy: -0.14, rx: 0.42, ry: 0.25 };
/**
 * Quem ocupa as plataformas desenhadas na rocha (a primeira unidade de cada), na ordem das plataformas de cima para
 * baixo. Plataforma de estrutura ainda não construída fica vazia, esperando.
 */
export const PAD_ORDER: BuildingId[] = ['miner', 'refinery', 'solar', 'storage', 'factory', 'crusher', 'fission', 'deepDrill'];
/** Tamanho na plataforma: o de projeto da estrutura, dentro de um limite (o reator de fissão não pode engolir a base). */
const padSize = (size: number) => Math.max(0.12, Math.min(0.16, size));
const inFace = ([u, v]: [number, number], k = 1) => ((u - TOP_FACE.cx) / (TOP_FACE.rx * k)) ** 2 + ((v - TOP_FACE.cy) / (TOP_FACE.ry * k)) ** 2 <= 1;
const FACE_GRID: [number, number][] = [];
for (let u = -TOP_FACE.rx; u <= TOP_FACE.rx; u += 0.025) for (let v = TOP_FACE.cy - TOP_FACE.ry; v <= TOP_FACE.cy + TOP_FACE.ry; v += 0.025) if (inFace([u, v], 0.94)) FACE_GRID.push([u, v]);

export interface SlotPos { at: [number, number]; size: number }
const layoutCache = new Map<number, Partial<Record<BuildingId, SlotPos[]>>>();
/**
 * Onde cada estrutura fica em cada camada: as principais nas plataformas (que mudam um pouco de lugar a cada camada);
 * as outras espalhadas pela face de cima, perto da posição de projeto (SLOTS, comprimida para a face) e longe umas das
 * outras. Calculado uma vez por camada.
 */
export function slotLayout(layer: number): Partial<Record<BuildingId, SlotPos[]>> {
  const pads = ASTEROID_PADS[Math.max(0, Math.min(ASTEROID_PADS.length - 1, layer))];
  const cached = layoutCache.get(layer);
  if (cached) return cached;
  const out: Partial<Record<BuildingId, SlotPos[]>> = {};
  const placed: [number, number][] = [...pads];
  const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], (a[1] - b[1]) * 1.6);   // a face é achatada
  for (const [id, slot] of Object.entries(SLOTS) as [BuildingId, NonNullable<(typeof SLOTS)[BuildingId]>][]) {
    const padIdx = PAD_ORDER.indexOf(id);
    out[id] = slot.at.map(([u, v], idx) => {
      if (idx === 0 && padIdx >= 0 && padIdx < pads.length) return { at: pads[padIdx], size: padSize(slot.size) };
      const want: [number, number] = [TOP_FACE.cx + (u / 0.5) * TOP_FACE.rx, TOP_FACE.cy + (v / 0.5) * TOP_FACE.ry];
      let best = FACE_GRID[0], score = -Infinity;
      for (const g of FACE_GRID) {
        const free = Math.min(0.1, ...placed.map(q => dist(g, q)));
        const sc = free - 0.3 * dist(g, want);
        if (sc > score) { score = sc; best = g; }
      }
      placed.push(best);
      return { at: [Math.round(best[0] * 1000) / 1000, Math.round(best[1] * 1000) / 1000], size: slot.size * 0.75 };
    });
  }
  layoutCache.set(layer, out);
  return out;
}

/**
 * Peças de infraestrutura e de mineração sobre a rocha (Assets/asteroide-infra.jpg e asteroide-efeitos.jpg): aparecem
 * conforme a base cresce. Posições em frações da largura do asteroide, a partir do centro; v > 0.1 é a encosta da frente.
 */
export const DECOR: { sprite: string; at: [number, number]; size: number; when: (s: GameState, layer: number) => boolean }[] = [
  { sprite: 'base-flag', at: [-0.4, -0.2], size: 0.06, when: s => s.buildings.miner > 0 },
  { sprite: 'base-lamp', at: [-0.1, 0.07], size: 0.045, when: s => s.buildings.storage > 0 },
  { sprite: 'base-lamp', at: [0.31, -0.03], size: 0.045, when: s => s.buildings.storage > 0 },
  { sprite: 'base-crates', at: [0.36, 0.06], size: 0.08, when: s => s.buildings.storage >= 5 },
  { sprite: 'base-ore', at: [-0.31, 0.05], size: 0.08, when: s => s.buildings.miner >= 5 },
  { sprite: 'base-ore-gold', at: [-0.21, 0.1], size: 0.07, when: s => (s.stats.produced.gold ?? 0) > 0 },
  { sprite: 'base-cables', at: [-0.3, -0.29], size: 0.08, when: s => s.buildings.fission > 0 },
  { sprite: 'base-dish', at: [-0.17, -0.37], size: 0.06, when: s => s.buildings.observatory > 0 },
  { sprite: 'base-beacon', at: [0.3, -0.33], size: 0.05, when: s => s.buildings.comms > 0 },
  { sprite: 'base-well', at: [0.15, -0.36], size: 0.07, when: s => s.buildings.iceExtractor > 0 },
  { sprite: 'base-pipe', at: [0.4, -0.2], size: 0.06, when: s => s.buildings.chemicalPlant > 0 },
  { sprite: 'base-landing', at: [0.33, 0.12], size: 0.12, when: s => s.buildings.shipyard > 0 },
  // Encosta da frente: túneis e escadas abrem conforme a mineração desce de camada.
  { sprite: 'base-tunnel', at: [-0.17, 0.25], size: 0.09, when: (_, l) => l >= 1 },
  { sprite: 'base-stairs', at: [0.2, 0.22], size: 0.09, when: (_, l) => l >= 2 },
  { sprite: 'base-lift', at: [0.02, 0.3], size: 0.08, when: s => s.buildings.deepDrill > 0 },
];
/** Esteiras entre as plataformas, quando as duas pontas existem. */
export const CONVEYORS: [BuildingId, BuildingId][] = [['miner', 'refinery'], ['refinery', 'factory'], ['crusher', 'storage']];
/** Veio em foco aparecendo na encosta, conforme o minério que mais rende nele. */
export const VEIN_FX: Partial<Record<string, string>> = {
  iron: 'fx-vein-iron', copper: 'fx-vein-copper', gold: 'fx-vein-gold', titanium: 'fx-vein-titanium', crystals: 'fx-crystal-cyan',
};
export const VEIN_FX_AT: [number, number] = [0.07, 0.2];
/** Crateras dos veios já esgotados (uma por veio, até três). */
export const CRATERS_AT: [number, number][] = [[-0.32, 0.17], [0.34, 0.2], [-0.04, 0.33]];
export const FX_SPRITES = ['fx-crack', 'fx-dust', 'fx-sparks', 'fx-crater', 'fx-crystal-violet', 'fx-sparkle', ...Object.values(VEIN_FX) as string[]];

// ---------- Planeta dos colonos (Aurora) ----------
/** Estruturas da civilização: ficam no planeta, não no asteroide (que é só mineração e indústria). */
export const CIV_BUILDINGS: BuildingId[] = ['habitat', 'residential', 'hydroponics', 'hospital', 'university', 'arcology', 'market', 'embassy'];
/** Posições sobre o disco do planeta, em frações do diâmetro, a partir do centro (como os SLOTS do asteroide). */
export const CIV_SLOTS: Partial<Record<BuildingId, { at: [number, number][]; thresholds: number[]; size: number }>> = {
  // Limites calibrados para uma jornada completa (antes, o 5º habitat e a 2ª/3ª arcologia quase nunca apareciam).
  habitat: { at: [[-0.12, 0.06], [0.1, 0.14], [-0.26, 0.2], [0.22, -0.02], [-0.04, -0.16]], thresholds: [1, 5, 12, 25, 45], size: 0.13 },
  residential: { at: [[0.29, 0.14], [-0.3, 0.02], [0.02, 0.3]], thresholds: [1, 10, 30], size: 0.13 },
  hydroponics: { at: [[-0.32, 0.25], [0.15, 0.32]], thresholds: [1, 12], size: 0.12 },
  hospital: { at: [[0.18, -0.2]], thresholds: [1], size: 0.11 },
  university: { at: [[-0.2, -0.12]], thresholds: [1], size: 0.12 },
  arcology: { at: [[0.0, -0.02], [0.3, -0.2], [-0.33, -0.18]], thresholds: [1, 2, 4], size: 0.08 },
  market: { at: [[0.02, 0.16]], thresholds: [1], size: 0.11 },
  // A embaixada também tem prédio no planeta (além da estação em órbita), com as versões maiores conforme a quantidade.
  embassy: { at: [[-0.14, 0.33]], thresholds: [1], size: 0.11 },
};
/** Aparência do planeta conforme a era (índice = era − 1; sem colonos ainda usa a primeira). Arte: Assets/planeta-fases*.jpg. */
export const CIV_PLANETS = ['aurora-1', 'aurora-2', 'aurora-3', 'aurora-4', 'aurora-5', 'aurora-6', 'aurora-7'];
/** Fração da largura da imagem ocupada pelo globo (as fases com anel são mais largas que o planeta). */
export const PLANET_GLOBE: Record<string, number> = { 'aurora-6': 0.79, 'aurora-7': 0.89 };
/** Distritos flutuantes por era (Assets/planeta-distritos.jpg); a metrópole tem duas versões. */
export const DISTRICT_SPRITES = ['district-1', 'district-2', 'district-3', 'district-4', 'district-5', 'district-6', 'district-7'];
export const DISTRICT_ALT: Record<string, string> = { 'district-4': 'district-4b' };
/**
 * Estruturas em órbita de Aurora (Assets/planeta-orbita.jpg), presas a posições fixas em volta do planeta (frações do
 * diâmetro, a partir do centro), longe da faixa por onde os distritos passam. Aparecem quando a condição vale.
 */
export const ORBITALS: { sprite: string; at: [number, number]; size: number; when: (s: GameState) => boolean }[] = [
  { sprite: 'orbit-comms', at: [-0.56, -0.5], size: 0.15, when: s => s.buildings.comms > 0 },
  { sprite: 'orbit-solar', at: [0.52, -0.55], size: 0.15, when: s => s.buildings.orbitalCollector > 0 },
  { sprite: 'orbit-elevator', at: [-0.03, -0.47], size: 0.04, when: s => s.buildings.harbor > 0 },
  { sprite: 'orbit-port', at: [0.8, -0.32], size: 0.17, when: s => s.buildings.spaceport > 0 },
  { sprite: 'orbit-shipyard', at: [-0.8, 0.36], size: 0.15, when: s => s.buildings.shipyard > 0 },
  { sprite: 'orbit-habitat', at: [-0.3, 0.52], size: 0.12, when: s => s.buildings.residential >= 10 },
  { sprite: 'orbit-farm', at: [0.28, 0.54], size: 0.15, when: s => s.buildings.hydroponics >= 10 },
  { sprite: 'orbit-embassy', at: [0.78, 0.36], size: 0.11, when: s => s.buildings.embassy > 0 },
];
export const CIV_SHIP = 'ship-freighter';

/** Indústrias entre as quais os drones Carregadores voam (as que estiverem construídas). */
export const LOADER_STOPS: BuildingId[] = ['refinery', 'foundry', 'factory', 'industrialComplex', 'refineryComplex', 'titaniumForge', 'recycler', 'chemicalPlant', 'moduleLine', 'storage', 'silo', 'depot'];
export const GOLDEN_SPRITE = 'fx-sparkle';
export const LOADER_SPRITE = 'drone-transport';

/**
 * Animações em cima das estruturas em operação. `size` e `dx/dy` são frações da largura do asteroide, a partir do
 * primeiro ponto da estrutura; `speed` é a velocidade do quadro (AnimatedSprite).
 */
export interface Overlay { id: BuildingId; prefix: string; frames: number; size: number; dx: number; dy: number; speed: number; anchor?: [number, number] }
export const OVERLAYS: Overlay[] = [
  { id: 'deepDrill', prefix: 'anim-drill', frames: 8, size: 0.07, dx: 0.0, dy: 0.01, speed: 0.18 },
  // O raio bate no canto inferior esquerdo do quadro: a âncora fica no ponto de impacto.
  { id: 'crusher', prefix: 'anim-beam', frames: 8, size: 0.08, dx: 0.03, dy: -0.01, speed: 0.15, anchor: [0.1, 0.9] },
  // Forja e fumaça são jatos verticais (quadro alto e estreito): saem da base do quadro.
  { id: 'foundry', prefix: 'anim-forge', frames: 4, size: 0.035, dx: 0, dy: 0.0, speed: 0.12, anchor: [0.5, 1] },
  { id: 'refineryComplex', prefix: 'anim-forge', frames: 4, size: 0.04, dx: 0, dy: 0.0, speed: 0.12, anchor: [0.5, 1] },
  { id: 'fission', prefix: 'anim-reactor', frames: 6, size: 0.03, dx: 0.02, dy: -0.02, speed: 0.1 },
  { id: 'fusion', prefix: 'anim-reactor', frames: 6, size: 0.035, dx: 0.02, dy: -0.02, speed: 0.12 },
  { id: 'industrialComplex', prefix: 'anim-smokeb', frames: 6, size: 0.04, dx: 0.02, dy: -0.08, speed: 0.09, anchor: [0.5, 1] },
  { id: 'chemicalPlant', prefix: 'anim-smokeb', frames: 6, size: 0.036, dx: 0.02, dy: -0.07, speed: 0.1, anchor: [0.5, 1] },
  { id: 'foundry', prefix: 'anim-smokeb', frames: 6, size: 0.032, dx: 0.0, dy: -0.07, speed: 0.08, anchor: [0.5, 1] },
];
/** Faíscas de rocha quando o jogador extrai na mão; andaime quando uma estrutura é construída. */
export const ROCKCHIP_FRAMES = Array.from({ length: 6 }, (_, i) => `anim-rockchip-${i + 1}`);
export const CONSTRUCT_FRAMES = Array.from({ length: 6 }, (_, i) => `anim-construct-${i + 1}`);
export const TRAFFIC_SHIPS = ['ship-freighter', 'ship-mining', 'ship-industrial'];

// O asteroide muda de aparência conforme a camada alcançada (princípio 5 do GDD: a progressão é visual).
export const ASTEROID_SPRITES = [...new Set(LAYERS.map(l => l.sprite))];

const frames = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}-${i + 1}`);
// Estruturas ganham versões maiores conforme a quantidade construída.
// `scale` compensa o fato de as versões de nível alto serem desenhadas maiores.
export const BUILDING_TIERS = [{ min: 30, suffix: '-t3', scale: 0.78 }, { min: 10, suffix: '-t2', scale: 0.88 }];
export const BUILDING_IDS_ART: BuildingId[] = ['miner', 'solar', 'refinery', 'storage', 'factory', 'fission', 'embassy', 'moduleLine', 'quantumLab', 'arcology', 'deepDrill', 'titaniumForge', 'crystalArray'];
const TIER_SPRITES = BUILDING_IDS_ART.flatMap(id => BUILDING_TIERS.map(t => `${BUILDINGS.find(b => b.id === id)!.sprite}${t.suffix}`));
export const BACKDROP = 'bg-nebula-blue';

export const SMOKE_FRAMES = frames('anim-smoke', 7);
export const FLASH_FRAMES = frames('anim-flash', 6);

export const COLONIST_FRAMES = ['char-colonist-walk-1', 'char-colonist-walk-2'];
/** Gente da base (sprites parados que "caminham" balançando): misturados ao colono animado. */
export const PEOPLE_SPRITES = ['colonist-miner', 'colonist-doctor', 'colonist-kid', 'colonist-engineer', 'colonist-elder', 'colonist-farmer'];
const overlayFrames = OVERLAYS.flatMap(o => Array.from({ length: o.frames }, (_, i) => `${o.prefix}-${i + 1}`));
export const SPRITES = [
  ...new Set([...overlayFrames, ...ROCKCHIP_FRAMES, ...CONSTRUCT_FRAMES, ...TRAFFIC_SHIPS, 'ship-colony']),
  ...BUILDINGS.map(b => b.sprite), ...COLONIST_FRAMES, ...PEOPLE_SPRITES, 'ship-explorer', 'mega-dyson-1', 'mega-dyson-2', 'mega-dyson-3', 'mega-dyson-4',
  ...ASTEROID_SPRITES, ...SMOKE_FRAMES, ...FLASH_FRAMES, ...TIER_SPRITES, 'planet-habitable', 'planet-ringed', 'moon-grey', 'drone-mining', 'ship-cargo',
  'ore-iron', 'ore-copper', 'ore-gold', 'icon-credits', 'item-alloy', 'item-advanced-component', GOLDEN_SPRITE, LOADER_SPRITE,
  'ingot-titanium', 'crystal-cyan', 'raw-brown-chunk', ...CIV_PLANETS, ...DISTRICT_SPRITES, ...Object.values(DISTRICT_ALT), ...ORBITALS.map(o => o.sprite), 'asteroid-main-big',
  ...new Set(DECOR.map(d => d.sprite)), 'base-conveyor', ...FX_SPRITES,
];
export const BUILDING_SPRITE = Object.fromEntries(BUILDINGS.map(b => [b.id, b.sprite])) as Record<BuildingId, string>;

export const TEXT_STYLE = { fontFamily: 'Mul, VT323, monospace', fontSize: 22, fill: 0xffffff, stroke: { color: 0x0b0f1a, width: 4 } };
