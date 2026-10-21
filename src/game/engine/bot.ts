// Jogador automático usado para calibrar e testar a progressão (não faz parte do jogo).
// Joga de forma razoável, não ótima: se ele avança, um jogador atento também avança.
import type { BuildingId, GameState, ResId, Specialization } from '../types';
import { BUILDINGS, BUILDING_BY_ID } from '../data/buildings';
import { UPGRADES } from '../data/upgrades';
import { LOCATION_BY_TYPE } from '../data/locations';
import { MEGAPROJECTS } from '../data/megaprojects';
import { RESOURCES, RES_IDS } from '../data/resources';
import { buyBuilding, buyUpgrade, mineClick, sell, simulate } from './economy';
import { canAfford, unitCost } from './costs';
import { capsOf, energyBalance, getModifiers, isBuildingUnlocked, isUpgradeVisible, upgradeRequirementsMet, workforce } from './modifiers';
import { canLaunch, canTerraform, establishOutpost, launchExpedition, outpostUpgradeCost, startTerraform, upgradeOutpost } from './expansion';
import { canFulfillQuest, canGift, canLobby, fulfillQuest, giveGift, lobbyFaction } from './factions';
import { activeDecree, canEnact, enactDecree } from './decrees';
import { canAskHelp, crisisCost, resolveCrisis, spawnCrisis } from './crises';
import { canOpenRoute, openRoute, routeScore } from './routes';
import { assignDrones, droneFree } from './drones';
import { canProspect, prospect, prospectCost, prospectingUnlocked, setAutoDeposit, setFocus, veinScore, veinsLeft, veinUsable } from './deposit';
import { FACTIONS, ALLIANCE_AT } from '../data/factions';
import { ascend, buildMegaStage, buyPerk, buyRepeatable, buyStarPerk, canAscend, canTranscend, checkAchievements, checkStory, transcend } from './progression';
import { PERKS, perkCost } from '../data/ascension';
import { STAR_PERKS, starPerkCost } from '../data/transcendence';
import { REPEATABLES, repeatableCost } from '../data/repeatables';
import { fulfillContract } from './contracts';
import type { TickReport } from '../types';
import { newGame } from './state';
import { chooseDoctrine } from './doctrines';
import { crewAvailable, toggleCrew } from './crew';

export interface Milestone { id: string; at: number }

const credCost = (s: GameState, id: BuildingId, costMult: number) => unitCost(BUILDING_BY_ID[id], s.buildings[id], costMult).credits ?? 0;
const unlocked = (s: GameState, id: BuildingId) => isBuildingUnlocked(BUILDING_BY_ID[id], s);

function tryBuy(s: GameState, id: BuildingId): GameState | null {
  return unlocked(s, id) ? buyBuilding(s, id, 1) : null;
}

const PRODUCERS: Partial<Record<ResId, BuildingId[]>> = {
  iron: ['crusher', 'miner'], copper: ['crusher', 'miner'], gold: ['crusher', 'miner'],
  alloys: ['refineryComplex', 'foundry', 'refinery'], components: ['industrialComplex', 'factory'],
  water: ['iceExtractor'], food: ['hydroponics'], fuel: ['chemicalPlant'], modules: ['moduleLine'],
};
const ENERGY: BuildingId[] = ['fusion', 'orbitalCollector', 'fission', 'solar'];

function specFor(type: keyof typeof LOCATION_BY_TYPE): Specialization {
  const y = LOCATION_BY_TYPE[type].yields;
  if (y.exotic) return 'mining';
  if (y.science) return 'science';
  return 'commerce';
}

/** Memória do bot entre rodadas: quantas vezes esperou juntar recursos para cada estrutura nova. */
type Waiting = Map<string, number>;

/** Uma rodada de decisões do jogador. */
function botAct(s: GameState, report: TickReport | null, waiting: Waiting, prospecting: boolean): GameState {
  const caps = capsOf(s);

  // No começo vende todo o ferro: é de onde vêm os primeiros créditos. (Os excedentes são vendidos no fim da rodada.)
  if (s.buildings.refinery === 0) s = sell(s, 'iron').state;

  // Pesquisas: qualquer uma ao alcance.
  for (const u of UPGRADES) {
    if (isUpgradeVisible(u, s) && canAfford(s, u.cost)) s = buyUpgrade(s, u.id) ?? s;
  }

  // Doutrinas: um rumo fixo (indústria, ciência e colônias); conselho: preenche as vagas na ordem de chegada.
  for (const [axis, opt] of [['base', 'manufacture'], ['society', 'technocracy'], ['destiny', 'colonial']]) s = chooseDoctrine(s, axis, opt) ?? s;
  s = checkStory(s).state;                                     // o Arquivo traz os conselheiros
  for (const c of crewAvailable(s)) if (!s.crew.active.includes(c.id)) s = toggleCrew(s, c.id) ?? s;

  // Jazida: prospecta quando não sobra veio e fura o mais útil (titânio e cristais enquanto faltam para construir).
  // Quem aparece raramente não compensa: o veio dura ~15 min e a prospecção custaria parte das economias a cada visita.
  if (prospecting && prospectingUnlocked(s)) {
    if (s.upgrades.autoProspect && !s.deposit.auto) s = setAutoDeposit(s, true) ?? s;
    if (!veinsLeft(s).length && canProspect(s).ok && s.resources.credits >= (prospectCost(s).credits ?? 0) * 3) s = prospect(s) ?? s;
    const wantTi = ((s.upgrades.deepDrilling && s.buildings.deepDrill === 0) || (s.upgrades.lightAlloys && s.buildings.titaniumForge === 0)) && s.resources.titanium < 300;
    const wantCr = !!s.upgrades.crystallography && s.buildings.crystalArray === 0 && s.resources.crystals < 100;
    const best = veinsLeft(s).filter(v => veinUsable(s, v)).sort((a, b) => (veinScore(b, s) + (wantTi ? (b.mix.titanium ?? 0) * 1e4 : 0) + (wantCr ? (b.mix.crystals ?? 0) * 1e4 : 0))
      - (veinScore(a, s) + (wantTi ? (a.mix.titanium ?? 0) * 1e4 : 0) + (wantCr ? (a.mix.crystals ?? 0) * 1e4 : 0)))[0];
    if (best && best.id !== s.deposit.focus) s = setFocus(s, best.id) ?? s;
  }
  // Expansão
  if (canLaunch(s).ok) s = launchExpedition(s) ?? s;
  for (const loc of s.locations) {
    if (!loc.outpost) s = establishOutpost(s, loc.id, specFor(loc.type)) ?? s;
    else if (canAfford(s, outpostUpgradeCost(loc)) && s.resources.credits > 3 * (outpostUpgradeCost(loc).credits ?? 0)) s = upgradeOutpost(s, loc.id) ?? s;
  }
  // O Núcleo Estelar (infinito) só depois de liberar a Ascensão: ele consome ciência sem limite.
  for (const mp of MEGAPROJECTS) if ((!mp.endless && mp.id !== 'singularity') || s.upgrades.ascensionProject) s = buildMegaStage(s, mp.id) ?? s;

  // Crises: paga se sobra folga no armazém; senão pede ajuda a uma facção com tratado.
  for (const c of s.crises) {
    const cost = crisisCost(s, c);
    const buffer = Object.entries(cost).every(([r, v]) => r === 'credits' || !RESOURCES[r as ResId].stored || s.resources[r as ResId] - (v ?? 0) >= caps[r as ResId] * 0.3);
    const next = (buffer && resolveCrisis(s, c.id, 'pay')) || (canAskHelp(s, c) ? resolveCrisis(s, c.id, 'help') : null);
    if (next) s = next;
  }
  // Rotas: só as que abastecem (score ≥ 2), da melhor para a pior, mantendo reserva de créditos e combustível.
  if (s.upgrades.logisticsNet) {
    const cols = s.locations.filter(l => l.outpost);
    const pairs = cols.flatMap((a, i) => cols.slice(i + 1).map(b => ({ a, b, sc: routeScore(a, b) + routeScore(b, a) })))
      .filter(p => p.sc >= 2).sort((x, y) => y.sc - x.sc);
    for (const p of pairs) {
      if (!canOpenRoute(s, p.a.id, p.b.id).ok) continue;
      const next = openRoute(s, p.a.id, p.b.id);
      if (next && next.resources.credits >= 5000 && next.resources.fuel >= caps.fuel * 0.3) { s = next; break; }
    }
  }

  // Diplomacia: presentes só com folga de estoque (mantém 30% do armazém), até a aliança.
  if (s.upgrades.diplomacy) {
    for (const fac of FACTIONS) {
      if (s.factions[fac.id].relation >= ALLIANCE_AT || !canGift(s, fac.id).ok) continue;
      const next = giveGift(s, fac.id);
      if (next && next.resources[fac.gift] >= caps[fac.gift] * 0.3) s = next;
    }
  }
  // Pedidos das facções: cumpre quando sobra material (mantém 30% do armazém), como faria um jogador atento.
  for (const q of s.quests) {
    if (!canFulfillQuest(s, q.id) || (RESOURCES[q.res].stored && s.resources[q.res] - q.amount < caps[q.res] * 0.3)) continue;
    s = fulfillQuest(s, q.id)?.state ?? s;
  }
  // Influência: decretos de produção e preço sempre que possível; o que sobra vira relação com as facções.
  if (s.upgrades.embassies) {
    for (const id of ['mobilization', 'hotMarket', 'frontier']) {
      if (!activeDecree(s, id) && canEnact(s, id).ok) s = enactDecree(s, id) ?? s;
    }
  }
  if (s.upgrades.diplomacy && s.resources.influence > 120) {
    for (const fac of FACTIONS) if (s.factions[fac.id].relation < ALLIANCE_AT && canLobby(s, fac.id).ok) s = lobbyFaction(s, fac.id) ?? s;
  }
  // Terraformação: uma por vez, também respeitando a reserva do armazém.
  if (s.upgrades.terraforming) {
    for (const loc of s.locations) {
      if (!canTerraform(s, loc).ok) continue;
      const next = startTerraform(s, loc.id);
      if (next && next.resources.water >= caps.water * 0.3 && next.resources.components >= caps.components * 0.3) { s = next; break; }
    }
  }
  // Drones: Entregador e Batedor primeiro (ligam automações); o resto vai para bônus.
  const free = droneFree(s);
  if (free > 0) {
    const plan: [Parameters<typeof assignDrones>[1], number][] = [['courier', 1], ['scout', s.upgrades.exploration ? 1 : 0]];
    for (const [role, want] of plan) if (want > 0 && (s.drones[role] ?? 0) < want) s = assignDrones(s, role, want) ?? s;
    const rest = droneFree(s);
    const hasColony = s.locations.some(l => l.outpost);
    const split: [Parameters<typeof assignDrones>[1], number][] = hasColony
      ? [['mechanic', 0.3], ['loader', 0.2], ['hauler', 0.35], ['terraformer', s.upgrades.terraforming ? 0.15 : 0]]
      : [['mechanic', 0.6], ['loader', 0.4]];
    for (const [role, share] of split) if (share > 0 && rest >= 1) s = assignDrones(s, role, Math.max(1, Math.floor(rest * share))) ?? s;
  }
  // Contratos só com folga: depois de entregar, ainda sobra 30% do armazém para construir.
  for (const c of s.contracts) if (s.resources[c.res] - c.amount >= caps[c.res] * 0.3) s = fulfillContract(s, c.id)?.state ?? s;
  // Pesquisas contínuas: só com a árvore principal da fase atual já feita (sobra de ciência).
  // (reserva ciência para qualquer pesquisa da árvore cujos pré-requisitos já foram feitos)
  if (!UPGRADES.some(u => !s.upgrades[u.id] && upgradeRequirementsMet(u, s) && (u.cost.science ?? 0) > 0)) {
    for (const r of REPEATABLES) if (r.unlock(s) && s.resources.science >= repeatableCost(r, s.repeatables[r.id] ?? 0) * 2) s = buyRepeatable(s, r.id) ?? s;
  }
  s = checkAchievements(s).state;

  // Estruturas: resolve gargalos primeiro, depois cresce pelo mais barato.
  for (let k = 0; k < 25; k++) {
    let next: GameState | null = null;
    const e = energyBalance(s);
    const w = workforce(s);
    const st = report?.status ?? {};
    const shortage = BUILDINGS.map(b => st[b.id]).find(x => x?.kind === 'input');

    if (e.supply < e.demand * 1.15 + 2) {
      for (const id of ENERGY) {
        if (id === 'fusion' && s.buildings.iceExtractor < 4 + s.buildings.fusion * 3) continue;
        if ((next = tryBuy(s, id))) break;
      }
      if (!next) next = tryBuy(s, 'battery');
      if (!next) break;                                        // espera juntar para a energia
    } else if (report?.population.status === 'starving' || (s.resources.population > 0 && s.resources.food < 20 && unlocked(s, 'hydroponics'))) {
      next = s.buildings.iceExtractor * 2 < s.buildings.hydroponics + 2 ? tryBuy(s, 'iceExtractor') : tryBuy(s, 'hydroponics');
      if (!next) break;
    } else if (w.ratio < 1 && unlocked(s, 'habitat')) {
      next = tryBuy(s, 'residential') ?? tryBuy(s, 'habitat') ?? tryBuy(s, 'hydroponics');
      if (!next) break;
    } else if (shortage?.kind === 'input' && PRODUCERS[shortage.res]) {
      for (const id of PRODUCERS[shortage.res]!) if ((next = tryBuy(s, id))) break;
      if (!next) next = null;
    } else if (BUILDINGS.some(b => st[b.id]?.kind === 'full') || BUILDINGS.some(b => unlocked(s, b.id) && Object.entries(unitCost(b, s.buildings[b.id], getModifiers(s).cost)).some(([r, v]) => r !== 'credits' && RESOURCES[r as ResId].stored && (v ?? 0) > capsOf(s)[r as ResId] * 0.7))) {
      // Armazém cheio de um grupo: o armazém especializado daquele grupo rende o dobro; senão, o Armazém geral.
      const full = BUILDINGS.map(b => st[b.id]).find(x => x?.kind === 'full');
      const group = full?.kind === 'full' ? RESOURCES[full.res].group : undefined;
      const special = BUILDINGS.find(b => b.storageGroup && b.storageGroup === group);
      next = (special ? tryBuy(s, special.id) : null) ?? tryBuy(s, 'storage');
    }

    if (!next) {
      // Estrutura recém-liberada (ainda zero): junta recursos para ela antes de crescer o resto,
      // mas desiste depois de ~10 min de espera para não travar.
      const fresh = BUILDINGS.find(b => unlocked(s, b.id) && s.buildings[b.id] === 0 && (waiting.get(b.id) ?? 0) < 20 && !ENERGY.includes(b.id));
      if (fresh) {
        next = buyBuilding(s, fresh.id, 1);
        if (!next) { waiting.set(fresh.id, (waiting.get(fresh.id) ?? 0) + 1); break; }
        s = next;
        continue;
      }
    }
    if (!next) {
      // Crescimento: a estrutura liberada mais barata em créditos (ignora energia e bônus caros demais).
      const mod = getModifiers(s);
      const options = BUILDINGS
        .filter(b => unlocked(s, b.id) && !ENERGY.includes(b.id) && b.id !== 'battery' && !b.storageGroup)
        .filter(b => !b.energyUse || e.supply - e.demand >= b.energyUse * mod.energyUse)
        .map(b => ({ b, c: credCost(s, b.id, mod.cost) }))
        .sort((x, y) => x.c - y.c)
        .map(x => x.b);
      // Crescimento sem zerar materiais: mantém 30% do armazém de cada um para as próprias indústrias.
      const capsNow = capsOf(s, mod);
      const keepsBuffer = (id: BuildingId) => Object.entries(unitCost(BUILDING_BY_ID[id], s.buildings[id], mod.cost))
        .every(([r, v]) => r === 'credits' || !RESOURCES[r as ResId].stored || s.resources[r as ResId] - (v ?? 0) >= capsNow[r as ResId] * 0.3);
      for (const b of options) if (keepsBuffer(b.id) && (next = buyBuilding(s, b.id, 1))) break;
    }
    if (!next) break;
    s = next;
  }

  // Vendas por último: excedentes perto do limite do armazém. (Vender antes de construir esvaziava justamente
  // os materiais das construções de quem só aparece de vez em quando.) A escória sempre, se não há Recicladora.
  const capsEnd = capsOf(s);
  for (const r of RES_IDS) {
    if (!RESOURCES[r].sellPrice || r === 'exotic') continue;
    if (s.resources[r] > capsEnd[r] * 0.85 || (r === 'slag' && s.buildings.recycler === 0)) s = sell(s, r).state;
  }
  return s;
}

/**
 * Perfis de jogador: com que frequência a pessoa abre o jogo para decidir e quanto clica.
 * "ideal" fica de olho o tempo todo; "casual" volta algumas vezes por hora; "ocioso" só passa de vez em quando.
 * `rounds` = quantas rodadas de decisões cada visita faz (quem aparece pouco gasta tudo de uma vez).
 */
export interface Profile { actEarly: number; actLate: number; clicks: number; clickUntil: number; rounds: number }
export const PROFILES: Record<'ideal' | 'casual' | 'idle', Profile> = {
  ideal: { actEarly: 5, actLate: 30, clicks: 4, clickUntil: 15, rounds: 1 },
  casual: { actEarly: 90, actLate: 600, clicks: 2, clickUntil: 8, rounds: 3 },
  idle: { actEarly: 600, actLate: 3600, clicks: 1, clickUntil: 3, rounds: 8 },
};

/** Joga por `seconds` segundos simulados e devolve os marcos atingidos. */
export function playBot(seconds: number, opts: {
  clicksPerSecond?: number; start?: GameState; profile?: Profile;
  /** Quando devolve true a partida para (padrão: assim que a Ascensão fica disponível). */
  stopWhen?: (s: GameState) => boolean;
  /** Chamado depois de cada passo de simulação (para conferir invariantes nos testes). */
  onStep?: (s: GameState, report: TickReport) => void;
} = {}) {
  const profile = opts.profile ?? PROFILES.ideal;
  let s = opts.start ?? newGame(0);
  const milestones: Milestone[] = [];
  const mark = (id: string, cond: boolean) => { if (cond && !milestones.some(m => m.id === id)) milestones.push({ id, at: s.stats.playTime }); };
  let report: TickReport | null = null;
  let t = 0;
  let lastAct = -Infinity;
  let seed = 12345;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const waiting: Waiting = new Map();
  while (t < seconds) {
    const dt = t < 3600 ? 1 : t < 6 * 3600 ? 5 : 20;
    const cps = opts.clicksPerSecond ?? profile.clicks;
    if (cps > 0 && s.buildings.miner < profile.clickUntil) {
      for (let i = 0; i < cps * dt; i++) s = mineClick(s, 1).state;
    }
    const r = simulate(s, dt);
    s = r.state; report = r.report;
    // Crises só surgem com o jogo aberto: o bot (que joga sem parar) também as recebe.
    if (s.crisisTimer <= 0) s = spawnCrisis(s, rand);
    opts.onStep?.(s, r.report);
    t += dt;
    if (t - lastAct >= (t < 3600 ? profile.actEarly : profile.actLate)) { for (let k = 0; k < profile.rounds; k++) s = botAct(s, report, waiting, profile.actLate <= 900); lastAct = t; }
    mark('miner', s.buildings.miner > 0);
    mark('refinery', s.buildings.refinery > 0);
    mark('lab', !!s.upgrades.lab);
    mark('factory', s.buildings.factory > 0);
    mark('habitats', !!s.upgrades.habitats);
    mark('population10', s.resources.population >= 10);
    mark('exploration', !!s.upgrades.exploration);
    mark('outpost', s.locations.some(l => l.outpost));
    mark('diplomacy', !!s.upgrades.diplomacy);
    mark('ally', Object.values(s.factions).some(f => f.relation >= 60));
    mark('route', s.routes.length > 0);
    mark('crisis', s.stats.crisesSolved > 0);
    mark('terraform1', s.locations.some(l => (l.outpost?.terra ?? 0) >= 1));
    mark('drones', s.resources.drones >= 10);
    mark('fusion', s.buildings.fusion > 0);
    mark('megaEngineering', !!s.upgrades.megaEngineering);
    mark('dyson1', (s.megaprojects.dyson ?? 0) >= 1);
    mark('ascension', canAscend(s));
    if (opts.stopWhen ? opts.stopWhen(s) : milestones.some(m => m.id === 'ascension')) break;
  }
  return { state: s, milestones };
}

/** Gasta Dados de Ascensão como um jogador faria: o mais barato que couber, repetidamente. */
function spendPerks(s: GameState): GameState {
  for (let k = 0; k < 200; k++) {
    const options = PERKS.filter(p => (p.max === undefined || (s.ascension.perks[p.id] ?? 0) < p.max) && perkCost(p, s.ascension.perks[p.id] ?? 0) <= s.ascension.points)
      .sort((a, b) => perkCost(a, s.ascension.perks[a.id] ?? 0) - perkCost(b, s.ascension.perks[b.id] ?? 0));
    const next = options.length ? buyPerk(s, options[0].id) : null;
    if (!next) break;
    s = next;
  }
  return s;
}

function spendStars(s: GameState): GameState {
  for (let k = 0; k < 200; k++) {
    const options = STAR_PERKS.filter(p => (p.max === undefined || (s.transcendence.perks[p.id] ?? 0) < p.max) && starPerkCost(p, s.transcendence.perks[p.id] ?? 0) <= s.transcendence.seeds)
      .sort((a, b) => starPerkCost(a, s.transcendence.perks[a.id] ?? 0) - starPerkCost(b, s.transcendence.perks[b.id] ?? 0));
    const next = options.length ? buyStarPerk(s, options[0].id) : null;
    if (!next) break;
    s = next;
  }
  return s;
}

export interface CampaignEvent { what: 'ascension' | 'singularity' | 'transcendence'; journey: number; hoursInJourney: number; totalHours: number }

/**
 * Campanha completa: joga várias jornadas, ascendendo ao liberar a Ascensão, e na última vai até a Singularidade
 * e transcende. Serve para varrer o jogo inteiro à procura de travas e valores inválidos (ver soak.test.ts).
 */
export function playCampaign(opts: {
  maxHours: number; ascensions: number; transcendences?: number; profile?: Profile;
  onStep?: (s: GameState, report: TickReport) => void;
  /** Chamado em cada marco (Ascensão, Singularidade, Transcendência) com o estado de antes de recomeçar. */
  onEvent?: (e: CampaignEvent, before: GameState) => void;
}) {
  let s = newGame(0);
  const events: CampaignEvent[] = [];
  let spent = 0;                                          // segundos totais já jogados
  let journeyStart = 0;
  const max = opts.maxHours * 3600;
  const wantTranscends = opts.transcendences ?? 1;
  const note = (what: CampaignEvent['what'], before: GameState) => {
    const e = { what, journey: s.ascension.count + s.transcendence.count, hoursInJourney: (spent - journeyStart) / 3600, totalHours: spent / 3600 };
    events.push(e);
    opts.onEvent?.(e, before);
  };
  while (spent < max && s.transcendence.count < wantTranscends) {
    const goingForEnd = s.ascension.count >= opts.ascensions;
    const startPlay = s.stats.playTime;
    const r = playBot(max - spent, { start: s, profile: opts.profile, onStep: opts.onStep, stopWhen: x => (goingForEnd ? x.transcendence.unlocked : canAscend(x)) });
    spent += r.state.stats.playTime - startPlay;
    s = r.state;
    if (goingForEnd) {
      if (!s.transcendence.unlocked) break;                // não chegou à Singularidade no tempo dado
      note('singularity', s);
      if (!canTranscend(s)) break;
      const before = s;
      s = spendStars(transcend(s, 0)!);
      note('transcendence', before);
      journeyStart = spent;
    } else {
      if (!canAscend(s)) break;
      const before = s;
      s = spendPerks(ascend(s, 0)!);
      note('ascension', before);
      journeyStart = spent;
    }
  }
  return { state: s, events, hours: spent / 3600 };
}

