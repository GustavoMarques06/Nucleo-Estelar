import type { Effect } from '../types';

// Corrida pelo Portal estelar (ver engine/race.ts): números e efeitos do resultado.

/** Segundos de jogo que a rival leva para terminar o portal dela. */
export const RACE_TIME = 5 * 3600;
export const RACE_DELAY = 0.1;            // quanto uma campanha de atraso tira do progresso da rival
export const RACE_DELAY_MAX = 5;
export const RACE_DELAY_RELATION = 4;     // a rival não gosta de ser atrasada
export const RACE_WIN_INFLUENCE = 250;

export const RACE_WIN: Effect[] = [{ kind: 'outpost', mult: 1.15 }, { kind: 'price', mult: 1.05 }];
export const RACE_LOSE: Effect[] = [{ kind: 'expedition', mult: 1.15 }];
export const RACE_WIN_TEXT = 'Colônias +15% e preço de venda +5% até a Ascensão, e +250 de influência.';
export const RACE_LOSE_TEXT = 'Pedágio no portal da rival: expedições 15% mais caras e lentas até a Ascensão.';
