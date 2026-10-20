import { t } from '../i18n';
// Posição dos locais no mapa: cada setor mostra até 18 locais em três órbitas ao redor da base (4, 6 e 8 lugares).
// Depois de postos nas órbitas, os locais se afastam uns dos outros (e da base) até ficarem a uma distância mínima,
// medida em pixels de um mapa típico (largo e baixo), para nenhum planeta ou nome ficar em cima de outro.
// A posição depende só do índice, então nunca muda quando novos locais são descobertos.
const RINGS = [
  { slots: 4, rx: 19, ry: 24, offset: Math.PI / 4 },
  { slots: 6, rx: 32, ry: 34, offset: Math.PI / 6 },
  { slots: 8, rx: 44, ry: 34, offset: 0 },
];
export const SECTOR_SIZE = RINGS.reduce((a, r) => a + r.slots, 0);

export const sectorOf = (index: number) => Math.floor(index / SECTOR_SIZE);
export const sectorCount = (n: number) => Math.max(1, Math.ceil(n / SECTOR_SIZE));

// Mapa típico em pixels (a cena tem ~940 × 430) e as distâncias mínimas.
const W = 940, H = 430;
const MIN_GAP = 122;        // entre dois locais (planeta + nome embaixo)
const MIN_BASE = 135;       // entre um local e a base no centro
const MARGIN_X = 6, MARGIN_TOP = 22, MARGIN_BOTTOM = 80;   // em %, longe das bordas, do seletor de setor e da legenda

function layoutSector(sector: number): { x: number; y: number }[] {
  // 1) Órbitas (cada setor gira um pouco, para os setores não parecerem cópias)
  const pts: { x: number; y: number }[] = [];
  for (const r of RINGS) for (let j = 0; j < r.slots; j++) {
    const a = r.offset + (j / r.slots) * 2 * Math.PI + sector * 0.5;
    pts.push({ x: (50 + Math.cos(a) * r.rx) / 100 * W, y: (50 + Math.sin(a) * r.ry) / 100 * H });
  }
  // 2) Afasta quem está perto demais (relaxamento determinístico)
  const cx = W / 2, cy = H / 2;
  for (let it = 0; it < 300; it++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < MIN_GAP) {
          const push = (MIN_GAP - d) / 2, ux = dx / d, uy = dy / d;
          pts[i].x -= ux * push; pts[i].y -= uy * push; pts[j].x += ux * push; pts[j].y += uy * push;
          moved = true;
        }
      }
      const bx = pts[i].x - cx, by = pts[i].y - cy, bd = Math.hypot(bx, by) || 0.01;
      if (bd < MIN_BASE) { pts[i].x = cx + (bx / bd) * MIN_BASE; pts[i].y = cy + (by / bd) * MIN_BASE; moved = true; }
      pts[i].x = Math.min(W * (1 - MARGIN_X / 100), Math.max(W * MARGIN_X / 100, pts[i].x));
      pts[i].y = Math.min(H * MARGIN_BOTTOM / 100, Math.max(H * MARGIN_TOP / 100, pts[i].y));
    }
    if (!moved) break;
  }
  return pts.map(p => ({ x: (p.x / W) * 100, y: (p.y / H) * 100 }));
}

const cache = new Map<number, { x: number; y: number }[]>();

/** Coordenadas em % (0–100) dentro do mapa; (50, 50) é a base. */
export function nodePosition(index: number): { x: number; y: number } {
  const sector = sectorOf(index);
  let pts = cache.get(sector);
  if (!pts) { pts = layoutSector(sector); cache.set(sector, pts); }
  return pts[index % SECTOR_SIZE];
}

/** Menor distância (em pixels do mapa típico) entre dois locais de um setor: usada pelo teste de espaçamento. */
export function minSpacing(sector: number): number {
  const pts = layoutSector(sector).map(p => ({ x: p.x / 100 * W, y: p.y / 100 * H }));
  let min = Infinity;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) min = Math.min(min, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
  return min;
}

// Cada setor usa um fundo diferente: o sistema natal, um sistema vizinho e depois a galáxia.
const SECTOR_BACKGROUNDS = ['scene-system-map', 'scene-system-map-b', 'scene-galaxy-map'];
export const sectorBackground = (sector: number) => SECTOR_BACKGROUNDS[Math.min(sector, SECTOR_BACKGROUNDS.length - 1)];
export const sectorName = (sector: number) =>
  sector === 0 ? t('Sistema natal') : sector === 1 ? t('Sistemas vizinhos') : t('Espaço profundo {n}', { n: sector - 1 });
