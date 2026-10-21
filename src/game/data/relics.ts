import type { Effect } from '../types';

export interface RelicDef { id: string; name: string; icon: string; desc: string; text: string; effects: Effect[] }

// Relíquias dos Acendedores: saem das escavações em sítios de anomalia. São permanentes (sobrevivem à Ascensão
// e à Transcendência) e cada uma vale um bônus pequeno. Quando todas forem achadas, as escavações rendem material.
export const RELICS: RelicDef[] = [
  { id: 'lens', name: 'Lente dos dezessete', icon: 'crystal-cyan', desc: 'Ciência +5%.',
    text: 'Um disco de vidro com dezessete facetas. Olhando por ele, as estrelas parecem mais próximas.',
    effects: [{ kind: 'resource', res: 'science', mult: 1.05 }] },
  { id: 'drill', name: 'Broca do Guardião 16', icon: 'drone-drill', desc: 'Extração manual ×1,5 e mineradoras +5%.',
    text: 'A ponta ainda corta. No cabo, gasto pelo uso, o número 16.',
    effects: [{ kind: 'click', mult: 1.5 }, { kind: 'output', building: 'miner', mult: 1.05 }] },
  { id: 'seeds', name: 'Cofre de sementes', icon: 'icon-sprout', desc: 'Comida +10% e crescimento da população +10%.',
    text: 'Sementes num cofre frio, com uma etiqueta: “para quando o céu voltar a ter cor”.',
    effects: [{ kind: 'resource', res: 'food', mult: 1.1 }, { kind: 'popGrowth', mult: 1.1 }] },
  { id: 'compass', name: 'Bússola de faróis', icon: 'icon-radar', desc: 'Expedições 8% mais baratas e rápidas.',
    text: 'A agulha não aponta para o norte: aponta para o farol aceso mais próximo.',
    effects: [{ kind: 'expedition', mult: 0.92 }] },
  { id: 'ledger', name: 'Livro-razão dos Acendedores', icon: 'nav-catalog', desc: 'Preço de venda +4%.',
    text: 'Contas de mil mundos, todas fechadas. Ninguém devia nada a ninguém.',
    effects: [{ kind: 'price', mult: 1.04 }] },
  { id: 'coil', name: 'Bobina de fusão antiga', icon: 'icon-power-plug', desc: 'Energia +5%.',
    text: 'Fria há milênios, ela esquenta na sua mão. Os engenheiros não sabem explicar.',
    effects: [{ kind: 'energyOut', mult: 1.05 }] },
  { id: 'mold', name: 'Molde de liga', icon: 'item-alloy', desc: 'Ligas +6%.',
    text: 'Um molde para uma liga que ninguém mais sabe fazer. A sua sai quase igual.',
    effects: [{ kind: 'resource', res: 'alloys', mult: 1.06 }] },
  { id: 'chip', name: 'Chip do silêncio', icon: 'icon-chip', desc: 'Componentes +6%.',
    text: 'Um circuito sem nenhuma corrente. Ligado à fábrica, ela erra menos.',
    effects: [{ kind: 'resource', res: 'components', mult: 1.06 }] },
  { id: 'banner', name: 'Estandarte da primeira colônia', icon: 'icon-trophy', desc: 'Colônias +6%.',
    text: 'Tecido que não desbota. O símbolo é uma chama dentro de um círculo.',
    effects: [{ kind: 'outpost', mult: 1.06 }] },
  { id: 'hourglass', name: 'Ampulheta de cristal', icon: 'icon-clock', desc: 'Produção offline por mais 1 h.',
    text: 'A areia cai devagar demais. Quando você não olha, ela para.',
    effects: [{ kind: 'offline', seconds: 3600 }] },
  { id: 'crate', name: 'Caixa sem fundo', icon: 'icon-crate', desc: 'Armazenamento +8%.',
    text: 'Por fora, uma caixa comum. Por dentro, mais espaço do que devia caber.',
    effects: [{ kind: 'storage', mult: 1.08 }] },
  { id: 'ember', name: 'Brasa do Núcleo', icon: 'star-orange', desc: 'Toda a produção +3%.',
    text: 'Uma brasa que nunca apaga, guardada numa redoma. Ela pulsa dezessete vezes e para.',
    effects: [{ kind: 'outputAll', mult: 1.03 }] },
];

export const RELIC_BY_ID = Object.fromEntries(RELICS.map(r => [r.id, r]));

/** Etapas de uma escavação: cada uma é paga ao começar e leva o seu tempo (segundos de jogo). */
export const DIG_STAGES = [
  { name: 'Sondagem', time: 600 },
  { name: 'Escavação', time: 1200 },
  { name: 'Câmara selada', time: 1800 },
];
export const DIG_MAX = 2;                    // escavações ao mesmo tempo
export const ANOMALY_CHANCE = 0.22;          // fração dos locais com um sítio de anomalia
/** Nomes dos sítios (escolhidos pela semente do local). */
export const ANOMALY_NAMES = ['Ruínas dos Acendedores', 'Câmara de cristal', 'Destroço antigo', 'Farol apagado'];
