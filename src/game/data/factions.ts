import type { Amounts, Effect, ResId } from '../types';

export interface FactionDef {
  id: string;
  name: string;
  tagline: string;
  desc: string;
  color: string;             // cor no mapa e na interface
  sprite: string;
  rival: string;             // presentear esta facção esfria a relação com a rival
  masc?: boolean;            // nome masculino (“do Conclave”, “pelo Conclave”); o padrão é feminino
  gift: ResId;               // o que ela aprecia
  giftBase: number;          // quantidade base do presente (escala com a economia)
  treaty: Effect[];          // relação ≥ 25
  alliance: Effect[];        // relação ≥ 60 (somado ao tratado)
  treatyText: string;
  allianceText: string;
  bond: Effect[];            // relação ≥ 90 (somado a tratado e aliança)
  bondText: string;
  quest: QuestTemplate;      // o que a facção pede em seus pedidos
}

/** Pedido típico de uma facção: pede o que ela mais valoriza e paga com o que ela tem de sobra. */
export interface QuestTemplate {
  res: ResId;
  base: number;                                       // quantidade-base (escala com a economia)
  title: string;
  reward: (amount: number, k: number) => Amounts;     // `k` = escala da economia
  rewardText: string;
}

export const TREATY_AT = 25;
export const ALLIANCE_AT = 60;
export const BOND_AT = 90;               // Irmandade: o laço mais forte com uma facção
export const GIFT_COOLDOWN = 90;
export const RIVAL_PENALTY = 3;

// Três facções com interesses diferentes. Nenhuma ameaça o progresso do jogador: elas competem por
// locais (reivindicações) e oferecem bônus em troca de boa relação.
export const FACTIONS: FactionDef[] = [
  {
    id: 'helix', name: 'Conclave Helix', tagline: 'Cientistas e arquivistas',
    desc: 'Uma rede de estações de pesquisa que troca conhecimento por materiais avançados.',
    color: '#b68cff', sprite: 'planet-alien', rival: 'vesper', masc: true, gift: 'components', giftBase: 30,
    treaty: [{ kind: 'resource', res: 'science', mult: 1.15 }],
    alliance: [{ kind: 'resource', res: 'science', mult: 1.15 }, { kind: 'outputAll', mult: 1.05 }],
    treatyText: 'Ciência +15%', allianceText: 'Ciência +15% extra e toda a produção +5%',
    bond: [{ kind: 'resource', res: 'science', mult: 1.25 }, { kind: 'offline', seconds: 7200 }],
    bondText: 'Ciência +25% extra e 2 h a mais de produção offline',
    quest: { res: 'components', base: 30, title: 'Pesquisa conjunta', reward: a => ({ science: Math.ceil(a * 2), influence: 10 }), rewardText: 'ciência e influência' },
  },
  {
    id: 'ferrum', name: 'Guilda Ferrum', tagline: 'Mercadores e construtores',
    desc: 'Um cartel de estaleiros e entrepostos. Paga bem quem fornece ligas.',
    color: '#ffb347', sprite: 'planet-desert', rival: 'vesper', gift: 'alloys', giftBase: 100,
    treaty: [{ kind: 'price', mult: 1.1 }],
    alliance: [{ kind: 'contract', mult: 1.25 }, { kind: 'cost', mult: 0.94 }],
    treatyText: 'Preço de venda +10%', allianceText: 'Contratos +25% e estruturas 6% mais baratas',
    bond: [{ kind: 'price', mult: 1.1 }, { kind: 'cost', mult: 0.94 }],
    bondText: 'Preço de venda +10% e estruturas mais 6% mais baratas',
    quest: { res: 'alloys', base: 100, title: 'Encomenda de ligas', reward: a => ({ credits: Math.ceil(a * 15), influence: 10 }), rewardText: 'créditos e influência' },
  },
  {
    id: 'vesper', name: 'Hegemonia Vesper', tagline: 'Exploradores e colonizadores',
    desc: 'Frotas de colonização em expansão constante. Respeitam quem tem combustível de sobra.',
    color: '#ff6b6b', sprite: 'planet-volcanic', rival: 'ferrum', gift: 'fuel', giftBase: 60,
    treaty: [{ kind: 'expedition', mult: 0.85 }],
    alliance: [{ kind: 'outpost', mult: 1.2 }, { kind: 'richness', mult: 1.15 }],
    treatyText: 'Expedições 15% mais baratas e rápidas', allianceText: 'Colônias +20% e novos locais 15% mais ricos',
    bond: [{ kind: 'expedition', mult: 0.8 }, { kind: 'outpost', mult: 1.15 }],
    bondText: 'Expedições mais 20% baratas e colônias +15%',
    quest: { res: 'fuel', base: 60, title: 'Frota sem combustível', reward: (_, k) => ({ ships: 2, exotic: Math.max(1, Math.ceil(k / 5)), influence: 10 }), rewardText: 'naves, materiais exóticos e influência' },
  },
];

/** “do”/“da” conforme o gênero do nome da facção. */
export const deFaction = (f: FactionDef) => (f.masc ? 'do' : 'da');

export const FACTION_BY_ID = Object.fromEntries(FACTIONS.map(f => [f.id, f]));

export const tierOf = (relation: number): 0 | 1 | 2 | 3 => (relation >= BOND_AT ? 3 : relation >= ALLIANCE_AT ? 2 : relation >= TREATY_AT ? 1 : 0);
export const TIER_NAME = ['Contato', 'Tratado comercial', 'Aliança', 'Irmandade'] as const;

// Pedidos e rivalidade
export const QUEST_DURATION = 900;       // segundos para cumprir um pedido
export const QUEST_GAP = 420;             // segundos entre um pedido e o seguinte da mesma facção
export const QUEST_RELATION = 10;         // relação ganha ao cumprir
export const RIVAL_DRIFT = 1 / 300;       // relação que a rival de uma aliada perde por segundo (1 a cada 5 min)
export const RIVAL_FLOOR = 40;            // até onde a rival esfria com uma aliança (25 com Irmandade)

/** Presente: quantidade acompanha o tamanho da economia (como as recompensas de eventos). */
export function giftAmount(f: FactionDef, earned: number): Amounts {
  const k = Math.max(1, Math.sqrt(Math.max(0, earned)) / 20);
  return { [f.gift]: Math.ceil(f.giftBase * k) };
}
