import type { Location } from '../types';

// Rede interplanetária: uma colônia ligada à rede da base rende mais, mas puxa energia do asteroide.

/** Rendimento extra de uma colônia ligada e alimentada (×1,25 com a rede em dia). */
export const LINK_BONUS = 0.25;

/** Energia por segundo que a linha de transmissão puxa da rede da base (cresce com o nível e com a distância). */
export const linkDemand = (loc: Location): number => (loc.outpost?.link ? 4 * loc.outpost.level * (1 + 0.1 * loc.distance) : 0);

/** Perda da transmissão (fração da energia que não chega): quanto mais longe, maior. Só informativa na interface. */
export const linkLoss = (loc: Location): number => Math.min(0.5, 0.04 * loc.distance);
