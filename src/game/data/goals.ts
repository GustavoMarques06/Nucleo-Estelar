import type { Amounts, GameState } from '../types';
import { colonyCount } from '../selectors';

export interface GoalDef {
  id: string;
  title: string;
  hint: string;              // como cumprir, em uma frase
  icon: string;
  progress: (s: GameState) => { cur: number; target: number };
  reward?: Amounts;          // só os primeiros objetivos pagam (empurrãozinho do começo)
}

const have = (n: number, target: number) => ({ cur: Math.min(n, target), target });

// Objetivos guiados (GDD, princípio 1: "sempre existe um próximo objetivo"). Aparecem um de cada vez, na ordem,
// e cobrem o jogo todo. São permanentes: depois da Ascensão não se repetem.
export const GOALS: GoalDef[] = [
  { id: 'click10', title: 'Extraia seus primeiros minérios', hint: 'Clique no asteroide ou em “Extrair minério”.', icon: 'nav-mining',
    progress: s => have(s.stats.totalMined, 10), reward: { credits: 8 } },
  { id: 'miner1', title: 'Compre a primeira mineradora', hint: 'Venda o ferro e construa uma mineradora na aba Mineração.', icon: 'building-miner',
    progress: s => have(s.buildings.miner, 1), reward: { credits: 15 } },
  { id: 'solar1', title: 'Instale um painel solar', hint: 'Máquinas consomem energia: o painel está na aba Energia.', icon: 'building-solar',
    progress: s => have(s.buildings.solar, 1), reward: { credits: 25 } },
  { id: 'miner5', title: 'Tenha 5 mineradoras', hint: 'Mais mineradoras, mais minério por segundo.', icon: 'building-miner-t2',
    progress: s => have(s.buildings.miner, 5), reward: { credits: 60 } },
  { id: 'drills', title: 'Pesquise Brocas reforçadas', hint: 'Aba Pesquisa: dobra a extração manual.', icon: 'nav-research',
    progress: s => have(s.upgrades.drills ? 1 : 0, 1), reward: { credits: 50 } },
  { id: 'refinery1', title: 'Construa uma refinaria', hint: 'Transforma 2 ferros em 1 liga, que vale mais.', icon: 'building-refinery',
    progress: s => have(s.buildings.refinery, 1), reward: { credits: 120 } },
  { id: 'alloys50', title: 'Produza 50 ligas', hint: 'Mantenha a refinaria com ferro e energia.', icon: 'item-alloy',
    progress: s => have(s.stats.produced.alloys ?? 0, 50), reward: { credits: 200 } },
  { id: 'lab', title: 'Pesquise Pesquisa científica', hint: 'Libera o Observatório, que gera ciência.', icon: 'nav-lab',
    progress: s => have(s.upgrades.lab ? 1 : 0, 1) },
  { id: 'observatory1', title: 'Construa um Observatório', hint: 'Aba Pesquisa: ciência paga as pesquisas avançadas.', icon: 'building-observatory',
    progress: s => have(s.buildings.observatory, 1) },
  { id: 'vein1', title: 'Prospecte um veio de minério', hint: 'Pesquise Geologia; na aba Mineração, “Prospectar veio” acha reservas que rendem mais que a crosta.', icon: 'ore-gold',
    progress: s => have(s.deposit.found, 1) },
  { id: 'factory1', title: 'Construa uma fábrica de componentes', hint: 'Combina ligas e cobre em componentes valiosos.', icon: 'building-factory',
    progress: s => have(s.buildings.factory, 1) },
  { id: 'habitats', title: 'Pesquise Habitats pressurizados', hint: 'Libera moradia e estufas: nasce a população.', icon: 'nav-civilization',
    progress: s => have(s.upgrades.habitats ? 1 : 0, 1) },
  { id: 'pop10', title: 'Alcance 10 colonos', hint: 'Moradia + alimento: habitats e estufas na aba Civilização.', icon: 'icon-astronaut',
    progress: s => have(s.resources.population, 10) },
  { id: 'commerce', title: 'Abra o mercado dinâmico', hint: 'Pesquise Entrepostos comerciais: preços oscilam e vender demais derruba a demanda.', icon: 'nav-market',
    progress: s => have(s.upgrades.commerce ? 1 : 0, 1) },
  { id: 'titanium1', title: 'Extraia titânio', hint: 'Pesquise Prospecção profunda e fure um veio de titânio: ele pede ligas leves e perfuratrizes.', icon: 'ingot-titanium',
    progress: s => have(s.stats.produced.titanium ?? 0, 1) },
  { id: 'exploration', title: 'Pesquise Exploração estelar', hint: 'Cadeia: gelo → química → construção naval → exploração.', icon: 'nav-expansion',
    progress: s => have(s.upgrades.exploration ? 1 : 0, 1) },
  { id: 'location1', title: 'Descubra um novo local', hint: 'Lance uma expedição na aba Expansão (nave + combustível).', icon: 'ship-explorer',
    progress: s => have(s.locations.length, 1) },
  { id: 'colony1', title: 'Funde sua primeira colônia', hint: 'Escolha o local no Mapa e uma especialização.', icon: 'planet-habitable',
    progress: s => have(colonyCount(s), 1) },
  { id: 'treaty', title: 'Faça um tratado com uma facção', hint: 'Pesquise Diplomacia e envie presentes (relação 25).', icon: 'region-system',
    progress: s => have(Math.max(0, ...Object.values(s.factions).map(f => f.relation)), 25) },
  { id: 'quest1', title: 'Cumpra um pedido de facção', hint: 'Na aba Diplomacia, cada facção pede um material e paga bem: relação, influência e mais.', icon: 'icon-check',
    progress: s => have(s.stats.questsDone, 1) },
  { id: 'chain1', title: 'Leve uma história de eventos até o fim', hint: 'Eventos aparecem de tempos em tempos sobre a cena. Alguns têm continuação: responda e acompanhe a história até o fim.', icon: 'event-comet',
    progress: s => have(s.stats.chains, 1) },
  { id: 'route1', title: 'Abra uma rota comercial', hint: 'No Mapa, ligue duas colônias: uma abastece a outra.', icon: 'icon-sell',
    progress: s => have(s.routes.length, 1) },
  { id: 'embassy1', title: 'Construa uma Embaixada', hint: 'Pesquise Corpo diplomático: a influência compra decretos e resolve disputas.', icon: 'building-embassy',
    progress: s => have(s.buildings.embassy, 1) },
  { id: 'crisis1', title: 'Resolva uma crise de colônia', hint: 'Quando surgir um “!” no Mapa: pague, peça ajuda ou espere.', icon: 'icon-warning',
    progress: s => have(s.stats.crisesSolved, 1) },
  { id: 'terra1', title: 'Conclua uma terraformação', hint: 'Mapa: escolha uma colônia e terraforme (exige Terraformação).', icon: 'planet-jungle',
    progress: s => have(s.locations.filter(l => (l.outpost?.terra ?? 0) >= 1).length, 1) },
  { id: 'modules1', title: 'Produza seus primeiros módulos', hint: 'Linha de módulos: componentes + ouro + combustível. Pesquise Produção modular.', icon: 'item-module',
    progress: s => have(s.stats.produced.modules ?? 0, 1) },
  { id: 'rep3', title: 'Alcance reputação comercial 3', hint: 'Cumpra contratos (os urgentes valem mais): reputação baixa o custo das rotas.', icon: 'icon-trophy',
    progress: s => have(Math.floor(Math.sqrt(s.stats.reputation / 6)), 3) },
  { id: 'drones10', title: 'Monte 10 drones', hint: 'Hangar de drones na aba Logística; depois designe funções.', icon: 'drone-transport',
    progress: s => have(s.resources.drones, 10) },
  { id: 'colony10', title: 'Tenha 10 colônias', hint: 'Explore, funde e amplie. Rotas e terraformação ajudam.', icon: 'nav-map',
    progress: s => have(colonyCount(s), 10) },
  { id: 'dyson1', title: 'Construa o primeiro estágio do Dyson', hint: 'Megaprojetos: entregue os materiais aos poucos.', icon: 'mega-dyson-1',
    progress: s => have(s.megaprojects.dyson ?? 0, 1) },
  { id: 'ascension1', title: 'Conclua o Projeto Ascensão', hint: 'Pesquise Projeto Ascensão e recomece com bônus permanentes.', icon: 'icon-star',
    progress: s => have(s.ascension.count, 1) },
  { id: 'challenge1', title: 'Conclua um desafio de Ascensão', hint: 'Ao ascender, escolha uma regra especial para a jornada seguinte; chegue à Ascensão com ela valendo.', icon: 'icon-trophy',
    progress: s => have(s.challenges.done.length, 1) },
  { id: 'singularity', title: 'Complete a Singularidade', hint: 'O desfecho da história: depois do Núcleo Estelar estágio 5.', icon: 'mega-sing-5',
    progress: s => have(s.megaprojects.singularity ?? 0, 5) },
];

export const GOAL_BY_ID = Object.fromEntries(GOALS.map(g => [g.id, g]));

/** Próximo objetivo ainda não concluído (ou null quando acabaram). */
export const currentGoal = (s: GameState): GoalDef | null => GOALS.find(g => !s.goals.includes(g.id)) ?? null;
