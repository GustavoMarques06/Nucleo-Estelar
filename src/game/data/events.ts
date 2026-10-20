import type { Amounts, Effect, GameState } from '../types';
import { FACTIONS, FACTION_BY_ID, deFaction } from './factions';
import { CHAIN_EVENTS } from './chains';

export interface ChainStep { event: string; delay: number; p?: number }

export interface EventChoice {
  label: string;
  /** Recompensa imediata (já escalada) e/ou efeito temporário. */
  reward?: (s: GameState, scale: number) => Amounts;
  /** Recursos pagos para escolher esta opção. */
  pay?: (s: GameState, scale: number) => Amounts;
  buff?: { name: string; effects: Effect[]; duration: number };
  /** Variação de relação com facções (0–100). */
  relation?: Record<string, number>;
  /** Reputação comercial ganha. */
  reputation?: number;
  /** Lembra desta escolha: as continuações da história podem reagir a ela. */
  flag?: string;
  /** O que acontece depois: uma continuação (ou várias, sorteadas por `p`; a sobra de probabilidade = nada). */
  chain?: ChainStep | ChainStep[];
}

export interface EventDef {
  id: string;
  name: string;
  text: string;
  sprite: string;
  minPhase: (s: GameState) => boolean;
  choices: EventChoice[];
  /** Continuação de uma história: nunca é sorteada sozinha. `part` = [parte atual, total] para a interface. */
  followUp?: boolean;
  part?: [number, number];
  /** História principal: entra no sorteio com preferência sobre os eventos comuns. */
  priority?: boolean;
}

// Eventos espaciais (GDD, seção 15): sempre oportunidades, nunca destroem progresso.
// `scale` acompanha o tamanho da economia, para as recompensas continuarem relevantes.
export const EVENTS: EventDef[] = [
  {
    id: 'comet', name: 'Cometa de passagem', sprite: 'event-comet',
    text: 'Um cometa cruza perto do asteroide, carregado de gelo e poeira rara.',
    minPhase: s => s.buildings.miner >= 5,
    choices: [
      { label: 'Capturar fragmentos', reward: (_, k) => ({ iron: 40 * k, copper: 20 * k, water: 30 * k }) },
      { label: 'Estudar a cauda', reward: (s, k) => (s.upgrades.lab ? { science: 4 * k } : { credits: 60 * k }) },
    ],
  },
  {
    id: 'meteorShower', name: 'Chuva de meteoros', sprite: 'event-meteor-shower',
    text: 'Fragmentos metálicos caem em volta da base. As mineradoras podem aproveitar.',
    minPhase: s => s.buildings.miner >= 3,
    choices: [
      { label: 'Redes de captura (extração ×3 por 60 s)',
        buff: { name: 'Chuva de meteoros', duration: 60, effects: [{ kind: 'output', building: 'miner', mult: 3 }, { kind: 'output', building: 'crusher', mult: 3 }] } },
      { label: 'Recolher o que cair', reward: (_, k) => ({ iron: 80 * k, gold: 1 * k }) },
    ],
  },
  {
    id: 'solarFlare', name: 'Explosão solar', sprite: 'event-solar-flare',
    text: 'A estrela libera uma labareda intensa. Dá para absorver a energia extra.',
    minPhase: s => s.buildings.solar >= 3,
    choices: [
      { label: 'Absorver (energia ×2 por 90 s)', buff: { name: 'Explosão solar', duration: 90, effects: [{ kind: 'energyOut', mult: 2 }] } },
      { label: 'Medir a labareda', reward: (s, k) => (s.upgrades.lab ? { science: 3 * k } : { credits: 50 * k }) },
    ],
  },
  {
    id: 'solarStorm', name: 'Tempestade solar', sprite: 'event-solar-flare',
    text: 'Uma tempestade de partículas carregadas varre o asteroide. Os painéis solares sofrem, mas há quem lucre com ela.',
    minPhase: s => s.buildings.solar >= 5,
    choices: [
      { label: 'Recolher as partículas (painéis ×0,3 por 60 s, mas +ciência)',
        buff: { name: 'Tempestade solar', duration: 60, effects: [{ kind: 'energyOut', building: 'solar', mult: 0.3 }] },
        reward: (s, k) => (s.upgrades.lab ? { science: 8 * k } : { credits: 100 * k }) },
      { label: 'Recolher os painéis (sem perda, sem ganho)', reward: (_, k) => ({ credits: 30 * k }) },
    ],
  },
  {
    id: 'reactorFault', name: 'Instabilidade no reator', sprite: 'event-solar-flare',
    text: 'Os sensores de um reator acusam oscilação. Dá para reduzir a carga e esperar, ou pagar uma equipe para estabilizá-lo.',
    minPhase: s => s.buildings.fission >= 1,
    choices: [
      { label: 'Reduzir a carga (fissão e fusão ×0,6 por 90 s)',
        buff: { name: 'Reator instável', duration: 90, effects: [{ kind: 'energyOut', building: 'fission', mult: 0.6 }, { kind: 'energyOut', building: 'fusion', mult: 0.6 }] } },
      { label: 'Equipe de estabilização', pay: (_, k) => ({ components: Math.max(1, Math.round(4 * k)) }), reward: (s, k) => (s.upgrades.lab ? { science: 10 * k } : { credits: 200 * k }) },
    ],
  },
  {
    id: 'derelict', name: 'Nave abandonada', sprite: 'event-derelict-ship',
    text: 'Os sensores encontram uma nave antiga à deriva.',
    minPhase: s => s.buildings.refinery >= 1,
    choices: [
      { label: 'Desmontar', reward: (_, k) => ({ alloys: 15 * k, components: 2 * k }) },
      { label: 'Investigar o computador de bordo', flag: 'derelict-log',
        reward: (s, k) => (s.upgrades.lab ? { science: 6 * k, exotic: s.upgrades.exploration ? Math.max(2, Math.round(Math.sqrt(k))) : 0 } : { credits: 120 * k }) },
    ],
  },
  {
    id: 'trader', name: 'Mercador itinerante', sprite: 'event-trader',
    text: 'Uma nave mercante pede para atracar e oferece bons negócios.',
    minPhase: s => s.stats.earned >= 1000,
    choices: [
      { label: 'Abrir o mercado (preços ×1,5 por 120 s)', buff: { name: 'Mercador itinerante', duration: 120, effects: [{ kind: 'price', mult: 1.5 }] } },
      { label: 'Trocar ferro por componentes',
        pay: s => ({ iron: Math.floor(s.resources.iron * 0.5) }),
        reward: s => ({ components: Math.floor(s.resources.iron * 0.5 / 20) }) },
    ],
  },
  {
    id: 'envoy', name: 'Enviado diplomático', sprite: 'event-trader',
    text: 'Emissários das três facções pedem audiência ao mesmo tempo. Você só tem tempo para um.',
    minPhase: s => !!s.upgrades.diplomacy,
    choices: [
      { label: 'Receber o Conclave Helix', relation: { helix: 12, vesper: -3 }, reward: (s, k) => (s.upgrades.lab ? { science: 3 * k } : {}) },
      { label: 'Receber a Guilda Ferrum', relation: { ferrum: 12, vesper: -3 }, reward: (_, k) => ({ credits: 80 * k }) },
      { label: 'Receber a Hegemonia Vesper', relation: { vesper: 12, ferrum: -3 }, reward: (_, k) => ({ fuel: 20 * k }) },
    ],
  },
  {
    id: 'fuelShortage', name: 'Escassez de combustível', sprite: 'event-trader',
    text: 'Uma frota inteira ficou sem combustível e paga qualquer preço para reabastecer.',
    minPhase: s => !!s.upgrades.commerce && (s.stats.produced.fuel ?? 0) > 0,
    choices: [
      { label: 'Vender a preço de escassez (combustível ×2,2 por 2 min)',
        buff: { name: 'Escassez de combustível', duration: 120, effects: [{ kind: 'price', res: 'fuel', mult: 2.2 }] } },
      { label: 'Doar parte do estoque (reputação +4)', reputation: 4, relation: { vesper: 4 },
        pay: s => ({ fuel: Math.floor(s.resources.fuel * 0.25) }) },
    ],
  },
  {
    id: 'famine', name: 'Fome em colônia vizinha', sprite: 'event-trader',
    text: 'Uma colônia vizinha perdeu a colheita e pede alimentos com urgência.',
    minPhase: s => !!s.upgrades.commerce && (s.stats.produced.food ?? 0) > 0,
    choices: [
      { label: 'Vender alimentos (×2 por 2 min)', buff: { name: 'Fome na vizinhança', duration: 120, effects: [{ kind: 'price', res: 'food', mult: 2 }] } },
      { label: 'Enviar ajuda (reputação +4)', reputation: 4, relation: { helix: 4 }, pay: s => ({ food: Math.floor(s.resources.food * 0.25) }) },
    ],
  },
  {
    id: 'techRush', name: 'Corrida tecnológica', sprite: 'event-trader',
    text: 'Um consórcio de estaleiros compra componentes e módulos sem olhar o preço.',
    minPhase: s => !!s.upgrades.commerce && (s.stats.produced.components ?? 0) > 100,
    choices: [
      { label: 'Atender o consórcio (componentes e módulos ×1,8 por 2 min)',
        buff: { name: 'Corrida tecnológica', duration: 120, effects: [{ kind: 'price', res: 'components', mult: 1.8 }, { kind: 'price', res: 'modules', mult: 1.8 }] } },
      { label: 'Fechar contrato de longo prazo (reputação +3)', reputation: 3, reward: (_, k) => ({ credits: 200 * k }) },
    ],
  },
];

// Tensão entre facções: quem é aliado de uma facção deixa a rival desconfiada e ela cobra uma prova de boa-fé.
for (const f of FACTIONS) {
  const rival = FACTION_BY_ID[f.rival];
  EVENTS.push({
    id: `tribute-${f.id}`, name: `${f.name} desconfia`, sprite: 'event-trader',
    text: `Você é aliado ${deFaction(rival)} ${rival.name}, rival ${deFaction(f)} ${f.name}. Os enviados pedem uma prova de boa-fé antes de continuar as conversas.`,
    minPhase: s => (s.factions[f.id]?.relation ?? 0) >= 25 && (s.factions[rival.id]?.relation ?? 0) >= 60,
    choices: [
      { label: 'Pagar o tributo (relação +8)', relation: { [f.id]: 8 }, pay: (_, k) => ({ [f.gift]: Math.ceil(f.giftBase * k * 2) }) },
      { label: 'Recusar com firmeza (relação −10)', relation: { [f.id]: -10, [rival.id]: 2 } },
      { label: 'Convidar para negociar (relação +3)', relation: { [f.id]: 3 } },
    ],
  });
}

EVENTS.push(...CHAIN_EVENTS);

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map(e => [e.id, e]));
