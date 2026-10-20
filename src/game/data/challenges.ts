import type { Effect } from '../types';

export type Block = 'sell' | 'outpost' | 'diplomacy';

export interface ChallengeDef {
  id: string;
  name: string;
  icon: string;
  desc: string;              // a regra, em uma frase
  effects: Effect[];         // vale só enquanto o desafio está ativo
  block?: Block;             // uma mecânica inteira fica bloqueada
  deadline?: number;         // segundos de jogo para concluir (a Ascensão tem de estar disponível até lá)
  reward: Effect[];          // permanente depois de concluído
  rewardText: string;
}

// Desafios de Ascensão: regras especiais para uma jornada. Concluir é chegar de novo à Ascensão com a regra valendo;
// a recompensa é uma melhoria permanente (uma vez por desafio). Abandonar não custa nada.
export const CHALLENGES: ChallengeDef[] = [
  { id: 'nocommerce', name: 'Sem comércio', icon: 'nav-market',
    desc: 'Nada pode ser vendido (nem à mão, nem pela venda automática). Só contratos, impostos, colônias e taxas portuárias rendem créditos.', effects: [], block: 'sell',
    reward: [{ kind: 'price', mult: 1.15 }], rewardText: 'Preço de venda +15% para sempre' },
  { id: 'hermit', name: 'Eremita', icon: 'planet-grey',
    desc: 'Não é possível fundar colônias. Expedições e terraformação de mundos já seus não existem: tudo sai do asteroide e do que você importa.', effects: [], block: 'outpost',
    reward: [{ kind: 'outpost', mult: 1.25 }], rewardText: 'Colônias produzem +25% para sempre' },
  { id: 'isolation', name: 'Sem aliados', icon: 'region-system',
    desc: 'A diplomacia está fechada: sem facções, pedidos, tratados nem influência de tratados.', effects: [], block: 'diplomacy',
    reward: [{ kind: 'expedition', mult: 0.85 }], rewardText: 'Expedições 15% mais baratas e rápidas para sempre' },
  { id: 'rationed', name: 'Energia racionada', icon: 'nav-energy',
    desc: 'Toda a energia gerada rende só 60%.', effects: [{ kind: 'energyOut', mult: 0.6 }],
    reward: [{ kind: 'energyOut', mult: 1.15 }], rewardText: 'Energia +15% para sempre' },
  { id: 'poverty', name: 'Voto de pobreza', icon: 'icon-credits',
    desc: 'Todas as estruturas custam 50% a mais.', effects: [{ kind: 'cost', mult: 1.5 }],
    reward: [{ kind: 'cost', mult: 0.93 }], rewardText: 'Estruturas 7% mais baratas para sempre' },
  { id: 'scarce', name: 'Ciência escassa', icon: 'icon-science',
    desc: 'Toda a ciência produzida rende só a metade.', effects: [{ kind: 'resource', res: 'science', mult: 0.5 }],
    reward: [{ kind: 'resource', res: 'science', mult: 1.3 }], rewardText: 'Ciência +30% para sempre' },
  { id: 'tight', name: 'Armazém apertado', icon: 'icon-crate',
    desc: 'A capacidade de armazenamento cai pela metade.', effects: [{ kind: 'storage', mult: 0.5 }],
    reward: [{ kind: 'storage', mult: 1.25 }], rewardText: 'Armazenamento +25% para sempre' },
  { id: 'sprint', name: 'Corrida', icon: 'icon-clock',
    desc: 'Chegue à Ascensão em até 12 horas de jogo.', effects: [], deadline: 12 * 3600,
    reward: [{ kind: 'outputAll', mult: 1.1 }], rewardText: 'Toda a produção +10% para sempre' },
];

export const CHALLENGE_BY_ID = Object.fromEntries(CHALLENGES.map(c => [c.id, c]));
