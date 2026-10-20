import { t } from '../i18n';
// Posição dos locais no mapa. Cada setor mostra até 24 locais numa espiral de ângulo áureo: a posição de
// um local depende só do seu índice, então nunca muda quando novos locais são descobertos.
export const SECTOR_SIZE = 24;
const GOLDEN = 2.399963;

export const sectorOf = (index: number) => Math.floor(index / SECTOR_SIZE);
export const sectorCount = (n: number) => Math.max(1, Math.ceil(n / SECTOR_SIZE));

/** Coordenadas em % (0–100) dentro do mapa; (50, 50) é a base. */
export function nodePosition(index: number): { x: number; y: number } {
  const j = index % SECTOR_SIZE;
  const sector = sectorOf(index);
  const r = 0.17 + 0.28 * Math.sqrt((j + 0.5) / SECTOR_SIZE);
  const a = j * GOLDEN + sector * 0.9;
  return { x: 50 + Math.cos(a) * r * 100 * 0.92, y: 50 + Math.sin(a) * r * 100 * 0.8 };
}

// Cada setor usa um fundo diferente: o sistema natal, um sistema vizinho e depois a galáxia.
const SECTOR_BACKGROUNDS = ['scene-system-map', 'scene-system-map-b', 'scene-galaxy-map'];
export const sectorBackground = (sector: number) => SECTOR_BACKGROUNDS[Math.min(sector, SECTOR_BACKGROUNDS.length - 1)];
export const sectorName = (sector: number) =>
  sector === 0 ? t('Sistema natal') : sector === 1 ? t('Sistemas vizinhos') : t('Espaço profundo {n}', { n: sector - 1 });
