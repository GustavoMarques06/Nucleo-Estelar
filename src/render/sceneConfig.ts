import type { BuildingId } from '../game/types';
import { BUILDINGS } from '../game/data/buildings';

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
  habitat: { at: [[0.08, 0.09], [-0.06, 0.16]], thresholds: [1, 10], size: 0.15 },
  hydroponics: { at: [[0.26, 0.1]], thresholds: [1], size: 0.15 },
  university: { at: [[0.44, -0.18]], thresholds: [1], size: 0.15 },
  residential: { at: [[0.44, 0.04]], thresholds: [1], size: 0.16 },
  hospital: { at: [[0.18, 0.2]], thresholds: [1], size: 0.13 },
  comms: { at: [[0.18, -0.4]], thresholds: [1], size: 0.13 },
  shipyard: { at: [[-0.56, -0.02]], thresholds: [1], size: 0.18 },
  fusion: { at: [[-0.12, -0.42]], thresholds: [1], size: 0.17 },
  orbitalCollector: { at: [[0.56, -0.56]], thresholds: [1], size: 0.2 },
  embassy: { at: [[0.6, 0.12]], thresholds: [1], size: 0.16 },
  moduleLine: { at: [[-0.5, 0.2]], thresholds: [1], size: 0.17 },
  quantumLab: { at: [[-0.34, 0.24]], thresholds: [1], size: 0.15 },
  arcology: { at: [[0.34, 0.28]], thresholds: [1], size: 0.12 },
  // Estruturas que faltavam: bordas externas do asteroide
  battery: { at: [[0.02, 0.27]], thresholds: [1], size: 0.11 },
  industrialComplex: { at: [[-0.45, -0.38]], thresholds: [1], size: 0.15 },
  maintenance: { at: [[-0.64, 0.14]], thresholds: [1], size: 0.13 },
  cleanroom: { at: [[0.5, -0.38]], thresholds: [1], size: 0.14 },
  chemicalPlant: { at: [[-0.2, 0.36]], thresholds: [1], size: 0.14 },
  market: { at: [[0.52, 0.32]], thresholds: [1], size: 0.13 },
  spaceport: { at: [[0.68, -0.22]], thresholds: [1], size: 0.16 },
  refineryComplex: { at: [[-0.72, -0.3]], thresholds: [1], size: 0.17 },
  harbor: { at: [[0.7, 0.36]], thresholds: [1], size: 0.14 },
  deepDrill: { at: [[-0.38, -0.22]], thresholds: [1], size: 0.13 },
  titaniumForge: { at: [[0.38, -0.34]], thresholds: [1], size: 0.14 },
  crystalArray: { at: [[0.64, -0.04]], thresholds: [1], size: 0.13 },
};

/**
 * Animações em cima das estruturas em operação. `size` e `dx/dy` são frações da largura do asteroide, a partir do
 * primeiro ponto da estrutura; `speed` é a velocidade do quadro (AnimatedSprite).
 */
export interface Overlay { id: BuildingId; prefix: string; frames: number; size: number; dx: number; dy: number; speed: number; anchor?: [number, number] }
export const OVERLAYS: Overlay[] = [
  { id: 'deepDrill', prefix: 'anim-drill', frames: 8, size: 0.07, dx: 0.0, dy: 0.01, speed: 0.18 },
  { id: 'crusher', prefix: 'anim-beam', frames: 8, size: 0.08, dx: 0.03, dy: -0.01, speed: 0.15 },
  { id: 'foundry', prefix: 'anim-forge', frames: 4, size: 0.05, dx: 0, dy: 0.0, speed: 0.12 },
  { id: 'refineryComplex', prefix: 'anim-forge', frames: 4, size: 0.06, dx: 0, dy: 0.0, speed: 0.12 },
  { id: 'fission', prefix: 'anim-reactor', frames: 6, size: 0.03, dx: 0.02, dy: -0.02, speed: 0.1 },
  { id: 'fusion', prefix: 'anim-reactor', frames: 6, size: 0.035, dx: 0.02, dy: -0.02, speed: 0.12 },
  { id: 'industrialComplex', prefix: 'anim-smokeb', frames: 6, size: 0.05, dx: 0.02, dy: -0.08, speed: 0.09, anchor: [0.5, 1] },
  { id: 'chemicalPlant', prefix: 'anim-smokeb', frames: 6, size: 0.045, dx: 0.02, dy: -0.07, speed: 0.1, anchor: [0.5, 1] },
  { id: 'foundry', prefix: 'anim-smokeb', frames: 6, size: 0.04, dx: 0.0, dy: -0.07, speed: 0.08, anchor: [0.5, 1] },
];
/** Faíscas de rocha quando o jogador extrai na mão; andaime quando uma estrutura é construída. */
export const ROCKCHIP_FRAMES = Array.from({ length: 6 }, (_, i) => `anim-rockchip-${i + 1}`);
export const CONSTRUCT_FRAMES = Array.from({ length: 6 }, (_, i) => `anim-construct-${i + 1}`);
export const TRAFFIC_SHIPS = ['ship-freighter', 'ship-mining', 'ship-industrial'];

// O asteroide muda de aparência conforme o minério extraído (princípio 5 do GDD: a progressão é visual).
export const ASTEROID_TIERS: { minMined: number; sprite: string }[] = [
  { minMined: 0, sprite: 'asteroid-main-big' },
  { minMined: 1500, sprite: 'asteroid-main-damaged-1' },
  { minMined: 12000, sprite: 'asteroid-main-damaged-2' },
  { minMined: 60000, sprite: 'asteroid-main-damaged-3' },
];

const frames = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}-${i + 1}`);
// Estruturas ganham versões maiores conforme a quantidade construída.
// `scale` compensa o fato de as versões de nível alto serem desenhadas maiores.
export const BUILDING_TIERS = [{ min: 30, suffix: '-t3', scale: 0.78 }, { min: 10, suffix: '-t2', scale: 0.88 }];
export const BUILDING_IDS_ART: BuildingId[] = ['miner', 'solar', 'refinery', 'storage', 'factory', 'fission', 'embassy', 'moduleLine', 'quantumLab', 'arcology', 'deepDrill', 'titaniumForge', 'crystalArray'];
const TIER_SPRITES = BUILDING_IDS_ART.flatMap(id => BUILDING_TIERS.map(t => `${BUILDINGS.find(b => b.id === id)!.sprite}${t.suffix}`));
export const BACKDROP = 'bg-nebula-blue';

export const SMOKE_FRAMES = frames('anim-smoke', 6);
export const FLASH_FRAMES = frames('anim-flash', 6);

export const COLONIST_FRAMES = ['char-colonist-walk-1', 'char-colonist-walk-2'];
const overlayFrames = OVERLAYS.flatMap(o => Array.from({ length: o.frames }, (_, i) => `${o.prefix}-${i + 1}`));
export const SPRITES = [
  ...new Set([...overlayFrames, ...ROCKCHIP_FRAMES, ...CONSTRUCT_FRAMES, ...TRAFFIC_SHIPS, 'ship-colony']),
  ...BUILDINGS.map(b => b.sprite), ...COLONIST_FRAMES, 'ship-explorer', 'mega-dyson-1', 'mega-dyson-2', 'mega-dyson-3', 'mega-dyson-4',
  ...ASTEROID_TIERS.map(t => t.sprite), ...SMOKE_FRAMES, ...FLASH_FRAMES, ...TIER_SPRITES, 'planet-habitable', 'planet-ringed', 'moon-grey', 'drone-mining', 'ship-cargo',
  'ore-iron', 'ore-copper', 'ore-gold', 'icon-credits', 'item-alloy', 'item-advanced-component',
];
export const BUILDING_SPRITE = Object.fromEntries(BUILDINGS.map(b => [b.id, b.sprite])) as Record<BuildingId, string>;

export const TEXT_STYLE = { fontFamily: 'Mul, VT323, monospace', fontSize: 22, fill: 0xffffff, stroke: { color: 0x0b0f1a, width: 4 } };
