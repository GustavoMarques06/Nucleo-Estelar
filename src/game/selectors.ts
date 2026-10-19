import type { GameState } from './types';

// Perguntas simples sobre o estado, usadas por dados, motor e interface (um só lugar, sem repetir a conta).

/** Quantas colônias foram fundadas. */
export const colonyCount = (s: Pick<GameState, 'locations'>) => s.locations.filter(l => l.outpost).length;

/** Total de estruturas construídas (todas as categorias). */
export const buildingCount = (s: Pick<GameState, 'buildings'>) => Object.values(s.buildings).reduce((a, b) => a + b, 0);
