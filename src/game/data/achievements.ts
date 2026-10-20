import type { GameState } from '../types';
import { buildingCount, colonyCount } from '../selectors';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  check: (s: GameState) => boolean;
}

/** Cada conquista dá +2% em toda a produção, para sempre (inclusive depois da Ascensão). */
export const ACHIEVEMENT_BONUS = 0.02;


export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'firstMiner', name: 'Primeira broca', desc: 'Construa uma mineradora.', icon: 'building-miner', check: s => s.buildings.miner >= 1 },
  { id: 'miner50', name: 'Cinturão de brocas', desc: 'Tenha 50 mineradoras.', icon: 'building-miner-t2', check: s => s.buildings.miner >= 50 },
  { id: 'miner200', name: 'Asteroide perfurado', desc: 'Tenha 200 mineradoras.', icon: 'building-miner-t3', check: s => s.buildings.miner >= 200 },
  { id: 'mined1m', name: 'Montanha de minério', desc: 'Extraia 1 milhão de minério.', icon: 'ore-iron', check: s => s.stats.totalMined >= 1e6 },
  { id: 'build100', name: 'Canteiro de obras', desc: 'Tenha 100 estruturas.', icon: 'nav-industry', check: s => buildingCount(s) >= 100 },
  { id: 'build1000', name: 'Megacidade industrial', desc: 'Tenha 1.000 estruturas.', icon: 'building-industrial-complex', check: s => buildingCount(s) >= 1000 },
  { id: 'rich1m', name: 'Primeiro milhão', desc: 'Ganhe 1 milhão de créditos numa jornada.', icon: 'icon-credits', check: s => s.stats.earned >= 1e6 },
  { id: 'rich1b', name: 'Bilionário estelar', desc: 'Ganhe 1 bilhão de créditos numa jornada.', icon: 'icon-trophy', check: s => s.stats.earned >= 1e9 },
  { id: 'rich1t', name: 'Economia planetária', desc: 'Ganhe 1 trilhão de créditos numa jornada.', icon: 'icon-star', check: s => s.stats.earned >= 1e12 },
  { id: 'fission10', name: 'Reatores em série', desc: 'Tenha 10 reatores de fissão.', icon: 'building-fission', check: s => s.buildings.fission >= 10 },
  { id: 'pop100', name: 'Vila espacial', desc: 'Alcance 100 habitantes.', icon: 'char-colonist', check: s => s.resources.population >= 100 },
  { id: 'pop1k', name: 'Cidade em órbita', desc: 'Alcance 1.000 habitantes.', icon: 'nav-civilization', check: s => s.resources.population >= 1000 },
  { id: 'pop10k', name: 'Civilização', desc: 'Alcance 10.000 habitantes.', icon: 'building-hq-tower', check: s => s.resources.population >= 10000 },
  { id: 'research20', name: 'Academia', desc: 'Conclua 20 pesquisas.', icon: 'nav-research', check: s => Object.keys(s.upgrades).length >= 20 },
  { id: 'researchAll', name: 'Conhecimento total', desc: 'Conclua 40 pesquisas.', icon: 'nav-lab', check: s => Object.keys(s.upgrades).length >= 40 },
  { id: 'colony1', name: 'Além do asteroide', desc: 'Funde a primeira colônia.', icon: 'nav-expansion', check: s => colonyCount(s) >= 1 },
  { id: 'colony10', name: 'Império nascente', desc: 'Tenha 10 colônias.', icon: 'planet-ringed', check: s => colonyCount(s) >= 10 },
  { id: 'colony50', name: 'Império galáctico', desc: 'Tenha 50 colônias.', icon: 'region-system', check: s => colonyCount(s) >= 50 },
  { id: 'catalog', name: 'Colecionador', desc: 'Descubra 10 minerais do catálogo.', icon: 'nav-catalog', check: s => s.discovered.length >= 10 },
  { id: 'contracts10', name: 'Fornecedor confiável', desc: 'Cumpra 10 contratos.', icon: 'icon-check', check: s => s.stats.contractsDone >= 10 },
  { id: 'contracts100', name: 'Conglomerado', desc: 'Cumpra 100 contratos.', icon: 'nav-market', check: s => s.stats.contractsDone >= 100 },
  { id: 'events20', name: 'Olhos no céu', desc: 'Responda a 20 eventos espaciais.', icon: 'event-comet', check: s => s.stats.eventsSeen >= 20 },
  { id: 'dyson', name: 'Domador de estrelas', desc: 'Complete o Enxame de Dyson.', icon: 'mega-dyson-4', check: s => (s.megaprojects.dyson ?? 0) >= 4 },
  { id: 'core5', name: 'Coração estelar', desc: 'Leve o Núcleo Estelar ao estágio 5.', icon: 'star-blue-giant', check: s => (s.megaprojects.core ?? 0) >= 5 },
  { id: 'ally', name: 'Aliado das estrelas', desc: 'Alcance a aliança com uma facção.', icon: 'region-system', check: s => Object.values(s.factions).some(f => f.relation >= 60) },
  { id: 'allAllies', name: 'Diplomata supremo', desc: 'Alcance tratado com as três facções.', icon: 'icon-check', check: s => Object.values(s.factions).every(f => f.relation >= 25) },
  { id: 'terra1', name: 'Jardineiro de mundos', desc: 'Conclua a primeira terraformação.', icon: 'planet-jungle', check: s => s.locations.some(l => (l.outpost?.terra ?? 0) >= 1) },
  { id: 'terra5', name: 'Mundo-jardim', desc: 'Leve um mundo ao nível máximo de terraformação.', icon: 'planet-habitable', check: s => s.locations.some(l => (l.outpost?.terra ?? 0) >= 5) },
  { id: 'drones50', name: 'Enxame', desc: 'Tenha 50 drones.', icon: 'drone-transport', check: s => s.resources.drones >= 50 },
  { id: 'singularity', name: 'Fim da história', desc: 'Conclua a Singularidade.', icon: 'star-neutron', check: s => s.transcendence.unlocked },
  { id: 'transcend1', name: 'Além do fim', desc: 'Transcenda pela primeira vez.', icon: 'star-white-dwarf', check: s => s.transcendence.count >= 1 },
  { id: 'crisis5', name: 'Gestor de crises', desc: 'Resolva 5 crises de colônia.', icon: 'icon-warning', check: s => s.stats.crisesSolved >= 5 },
  { id: 'crisis30', name: 'Bombeiro estelar', desc: 'Resolva 30 crises de colônia.', icon: 'icon-tool', check: s => s.stats.crisesSolved >= 30 },
  { id: 'routes1', name: 'Primeira rota', desc: 'Abra uma rota comercial.', icon: 'icon-sell', check: s => s.routes.length >= 1 },
  { id: 'routes6', name: 'Rede comercial', desc: 'Tenha 6 rotas abertas ao mesmo tempo.', icon: 'region-belt', check: s => s.routes.length >= 6 },
  { id: 'supplied', name: 'Cadeia de abastecimento', desc: 'Tenha 5 colônias recebendo o que precisam por rota.', icon: 'icon-check', check: s => s.locations.filter(l => l.outpost && s.routes.some(r => (r.a === l.id || r.b === l.id))).length >= 5 },
  { id: 'high10', name: 'Olho no mercado', desc: 'Faça 10 vendas com preço 25% acima da base.', icon: 'icon-arrow-up', check: s => s.stats.highSales >= 10 },
  { id: 'rep5', name: 'Nome de confiança', desc: 'Alcance reputação comercial nível 5.', icon: 'icon-trophy', check: s => Math.floor(Math.sqrt(s.stats.reputation / 6)) >= 5 },
  { id: 'embassy10', name: 'Corpo diplomático', desc: 'Tenha 10 embaixadas.', icon: 'icon-influence', check: s => s.buildings.embassy >= 10 },
  { id: 'modules1k', name: 'Terceiro nível', desc: 'Produza 1.000 módulos avançados.', icon: 'item-module', check: s => (s.stats.produced.modules ?? 0) >= 1000 },
  { id: 'quests10', name: 'Homem de confiança', desc: 'Cumpra 10 pedidos de facção.', icon: 'icon-check', check: s => s.stats.questsDone >= 10 },
  { id: 'bond1', name: 'Irmandade', desc: 'Alcance relação 90 com uma facção.', icon: 'region-system', check: s => Object.values(s.factions).some(f => f.relation >= 90) },
  { id: 'veins8', name: 'Geólogo', desc: 'Prospecte 8 veios numa só jornada.', icon: 'ore-gold', check: s => s.deposit.found >= 8 },
  { id: 'titanium1k', name: 'Metal leve', desc: 'Extraia 1.000 de titânio.', icon: 'ingot-titanium', check: s => (s.stats.produced.titanium ?? 0) >= 1000 },
  { id: 'challenge3', name: 'Sem rede de proteção', desc: 'Conclua 3 desafios de Ascensão.', icon: 'icon-trophy', check: s => s.challenges.done.length >= 3 },
  { id: 'challengeAll', name: 'Mestre dos desafios', desc: 'Conclua todos os desafios de Ascensão.', icon: 'star-blue-giant', check: s => s.challenges.done.length >= 8 },
  { id: 'chain1', name: 'Contador de histórias', desc: 'Leve uma história de eventos até o fim.', icon: 'event-comet', check: s => s.stats.chains >= 1 },
  { id: 'chain6', name: 'Cronista do espaço', desc: 'Leve 6 histórias de eventos até o fim.', icon: 'event-trader', check: s => s.stats.chains >= 6 },
  { id: 'honor3', name: 'Homem de honra', desc: 'Cumpra 3 missões de honra de facções.', icon: 'icon-check', check: s => Object.values(s.factions).reduce((a, f) => a + Math.floor((f.done ?? 0) / 3), 0) >= 3 },
  { id: 'ascend1', name: 'Renascimento', desc: 'Complete o Projeto Ascensão.', icon: 'icon-star', check: s => s.ascension.count >= 1 },
  { id: 'ascend5', name: 'Ciclo eterno', desc: 'Ascenda 5 vezes.', icon: 'icon-trophy', check: s => s.ascension.count >= 5 },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));
