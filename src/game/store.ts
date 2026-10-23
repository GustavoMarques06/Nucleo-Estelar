import { create } from 'zustand';
import type { Amounts, BuildingId, Category, DirectiveDo, DirectiveWhen, DroneRole, Flows, FlowSource, GameState, Priority, ResId, Settings, Specialization, TickReport } from './types';
import { RES_IDS } from './data/resources';
import { BALANCE } from './data/balance';
import { BUILDING_BY_ID } from './data/buildings';
import { newGame } from './engine/state';
import { buyBuilding, buyUpgrade, fissureFinale, fissureStrike, goldenStrike, mineClick, sell, simulate } from './engine/economy';
import { overclockReactor, setPriority, setThrottle, toggleProtect } from './engine/energy';
import { layerIndex } from './engine/deposit';
import { LAYERS } from './data/layers';
import { MILESTONE_SPECIALS, SPECIAL_AT, hasMilestones, milestoneLevel } from './data/milestones';
import { fmt, fmtDuration, fmtNum } from './engine/format';
import { clearSave, loadBackup, loadGame, parseSave, saveGame, saveSignature, serialize } from './engine/save';
import { applyOffline, type OfflineSummary } from './engine/offline';
import { energyBalance, getModifiers } from './engine/modifiers';
import { maxAffordable } from './engine/costs';
import { establishOutpost, launchExpedition, linkColony, setSpecialization, startTerraform, upgradeOutpost } from './engine/expansion';
import { fulfillQuest, giveGift, lobbyFaction, territoryTick } from './engine/factions';
import { prospect, setAutoDeposit, setFocus } from './engine/deposit';
import { enactDecree } from './engine/decrees';
import { DECREE_BY_ID } from './data/decrees';
import { FACTION_BY_ID, QUEST_RELATION } from './data/factions';
import { resolveCrisis, spawnCrisis } from './engine/crises';
import { closeRoute, dropInsurance, insureRoute, openRoute } from './engine/routes';
import { CRISIS_BY_KIND } from './data/crises';
import { assignDrones } from './engine/drones';
import { GOAL_BY_ID } from './data/goals';
import { LORE_BY_ID } from './data/lore';
import { ERAS, eraIndex } from './engine/civilization';
import { surfaceChain, checkGoals, checkStory, ascend, buildMegaStage, buyPerk, buyStarPerk, transcend, buyRepeatable, checkAchievements, chooseEvent, dismissEvent, eventChoiceCost, spawnEvent } from './engine/progression';
import { EVENT_BY_ID } from './data/events';
import { fulfillContract } from './engine/contracts';
import { ACHIEVEMENT_BY_ID } from './data/achievements';
import { events } from './events';
import { activeChallenge, challengeMet } from './engine/challenges';
import { CHALLENGE_BY_ID } from './data/challenges';
import { t, tName, tStatic } from '../i18n';
import { chooseDoctrine } from './engine/doctrines';
import { DOCTRINE_BY_ID } from './data/doctrines';
import { addDirective, removeDirective, updateDirective } from './engine/directives';
import { toggleCrew } from './engine/crew';
import { startDig } from './engine/digs';
import { RELIC_BY_ID } from './data/relics';
import { delayRival } from './engine/race';
import { recordTimeline } from './engine/timeline';

export type BuyAmount = 1 | 10 | 'max';
export type SceneView = 'base' | 'civ' | 'loc' | 'mega';   // loc: o planeta escolhido no mapa; mega: o megaprojeto
export type History = Partial<Record<ResId, number[]>>;
export const HISTORY_STEP = 10;         // segundos de jogo entre amostras
export const HISTORY_MAX = 180;         // 30 min de histórico
export interface Toast { id: number; text: string; kind: 'info' | 'warn' | 'bad'; count: number }
/** O que uma escolha de evento rendeu: a interface mostra com uma animação de "investigando…" e depois revela item a item. */
export interface EventResult {
  key: number;
  event: string;              // nome do evento (texto-fonte)
  sprite: string;
  choice: string;             // texto da escolha
  reward: Amounts;
  paid: Amounts;
  buff?: { name: string; duration: number };
  relation?: Record<string, number>;
  reputation?: number;
  continues: boolean;         // a escolha agendou a continuação da história
}

interface Store {
  game: GameState;
  report: TickReport | null;
  rates: Record<ResId, number>;   // fluxo líquido suavizado por segundo
  flows: Flows | null;            // fluxo por origem, suavizado (painel de finanças)
  history: History;               // saldo por segundo de cada recurso, amostrado a cada HISTORY_STEP (não salvo)
  offline: OfflineSummary | null;
  toasts: Toast[];
  buyAmount: BuyAmount;
  ending: boolean;                // mostra a tela de desfecho
  selectedLoc: string | null;     // local selecionado no mapa (interface; não salvo)
  selectedMega: string | null;    // megaprojeto escolhido no mapa: a aba Megaprojetos mostra só ele (interface; não salvo)
  saveError: boolean;             // o navegador recusou o último salvamento
  inactive: boolean;              // o jogo foi aberto em outra aba: esta não simula nem salva (interface; não salvo)
  setInactive(v: boolean): void;
  reloadFromSave(): void;
  storyQueue: string[];           // registros do diário esperando para serem mostrados (interface; não salvo)
  sceneView: SceneView;           // o que a cena mostra: o asteroide (mineração) ou o planeta dos colonos (interface; não salvo)
  setSceneView(v: SceneView): void;

  boot(): void;
  advance(dt: number): void;
  mine(x?: number, y?: number): void;
  strike(x?: number, y?: number): void;
  overclock(id: BuildingId): void;
  setThrottle(id: BuildingId, value: number): void;
  setPriority(id: BuildingId, p: Priority | 0): void;
  toggleProtect(cat: Category): void;
  linkColony(locId: string): void;
  sell(res: ResId): void;
  buy(id: BuildingId): void;
  buyAmountOf(id: BuildingId, amount: number): void;
  onlyAffordable: boolean;
  setOnlyAffordable(v: boolean): void;
  upgrade(id: string): void;
  launchExpedition(): void;
  establishOutpost(locId: string, spec: Specialization, byInfluence?: boolean): void;
  upgradeOutpost(locId: string): void;
  setSpecialization(locId: string, spec: Specialization): void;
  buildMega(id: string): void;
  ascend(next?: string | null): void;
  abandonChallenge(): void;
  buyPerk(id: string): void;
  buyStarPerk(id: string): void;
  transcend(): void;
  dismissEnding(): void;
  selectLoc(id: string | null): void;
  selectMega(id: string | null): void;
  giveGift(factionId: string): void;
  lobby(factionId: string): void;
  prospect(): void;
  setFocus(id: string): void;
  setAutoDeposit(on: boolean): void;
  fulfillQuest(id: string): void;
  enactDecree(id: string): void;
  insureRoute(id: string): void;
  dropInsurance(id: string): void;
  setRecipe(id: BuildingId, alt: boolean): void;
  setKeep(res: ResId, fraction: number): void;
  assignDrones(role: DroneRole, delta: number): void;
  startTerraform(locId: string): void;
  resolveCrisis(id: string, how: 'pay' | 'help'): void;
  openRoute(a: string, b: string): void;
  closeRoute(id: string): void;
  setAutosellFloor(f: number): void;
  buyRepeatable(id: string): void;
  fulfillContract(id: string): void;
  dismissTip(id: string): void;
  chooseEvent(choice: number): void;
  dismissEvent(): void;
  eventResult: EventResult | null;
  dismissEventResult(): void;
  setAutosell(res: ResId, on: boolean): void;
  chooseDoctrine(axis: string, option: string): void;
  addDirective(): void;
  updateDirective(id: string, patch: { when?: DirectiveWhen; then?: DirectiveDo; on?: boolean }): void;
  removeDirective(id: string): void;
  toggleCrew(id: string): void;
  startDig(locId: string): void;
  delayRival(): void;
  abandonWeekly(): void;
  /** Rachadura `step` (0–2) de uma fissura: devolve false se o armazém estava cheio. */
  fissure(step: number, x?: number, y?: number): boolean;
  fissureFinale(x?: number, y?: number): void;
  setSetting<K extends keyof Settings>(k: K, v: Settings[K]): void;
  setBuyAmount(a: BuyAmount): void;
  dismissOffline(): void;
  dismissStory(): void;
  toast(text: string, kind?: Toast['kind']): void;
  dismissToast(id: number): void;
  save(): boolean;
  exportSave(): string;
  importSave(text: string): 'ok' | 'invalid' | 'tampered';
  restoreBackup(): boolean;
  reset(): void;
}

const zeroRates = () => Object.fromEntries(RES_IDS.map(r => [r, 0])) as Record<ResId, number>;
let toastId = 0;
const toastTimers = new Map<number, ReturnType<typeof setTimeout>>();
const MAX_TOASTS = 4;
/** Intervalo a partir do qual o jogo trata a pausa como ausência (5 min). Abas em segundo plano recebem no máximo
 *  um tique por minuto e continuam contando como jogo aberto. */
export const ABSENCE_SECONDS = 300;
let lastSample = 0;

export const useGame = create<Store>()((set, get) => {
  /** Aplica um novo estado se a ação foi aceita; senão, avisa com um som de recusa. */
  const commit = (next: GameState | null, onOk?: () => void) => {
    if (!next) { events.emit({ type: 'denied' }); return false; }
    set({ game: next });
    onOk?.();
    return true;
  };

  return {
    game: newGame(),
    report: null,
    rates: zeroRates(),
    flows: null,
    history: {},
    offline: null,
    toasts: [],
    buyAmount: 1,
    ending: false,
    selectedLoc: null,
    selectedMega: null,
    saveError: false,
    inactive: false,
    setInactive(v) {
      // Antes de pausar, grava o que tem: a outra aba vai carregar daqui.
      if (v && !get().inactive) get().save();
      set({ inactive: v });
    },
    reloadFromSave() {
      const loaded = loadGame();
      if (!loaded) return;
      const { state, summary } = applyOffline(loaded.state);
      set({ game: state, report: null, ...(summary ? { offline: summary } : {}) });
    },
    storyQueue: [],
    sceneView: 'base',
    setSceneView(v) { if (get().sceneView !== v) set({ sceneView: v }); },
    eventResult: null,
    onlyAffordable: false,
    setOnlyAffordable(v) { set({ onlyAffordable: v }); },

    boot() {
      // Pede ao navegador para não apagar o save quando faltar espaço.
      try { void navigator.storage?.persist?.(); } catch { /* sem suporte */ }
      const loaded = loadGame();
      if (!loaded) {
        const g = newGame();
        if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) g.settings.reduceMotion = true;
        set({ game: g });
        return;
      }
      const { state, summary } = applyOffline(loaded.state);
      set({ game: state, offline: summary });
      if (loaded.recovered) get().toast('O save principal estava ilegível: restauramos o backup mais recente.', 'warn');
      if (state.integrity.tampered && Date.now() - state.integrity.since < 60_000) get().toast(t('Este save foi modificado fora do jogo. O progresso continua, mas fica marcado como modificado.'), 'warn');
    },

    advance(dt) {
      if (get().inactive) return;           // outra aba está jogando
      // Intervalo muito longo (computador suspenso com o jogo aberto) é ausência: mesmas regras do jogo fechado
      // (ritmo reduzido, limite de horas) e a mesma tela de "bem-vindo de volta". Antes rendia como jogo aberto.
      if (dt > ABSENCE_SECONDS) {
        const now = Date.now();
        const { state, summary } = applyOffline({ ...get().game, savedAt: now - dt * 1000 }, now);
        set({ game: state, ...(summary ? { offline: summary } : {}) });
        dt = 1;                    // segue com um passo normal: conquistas, objetivos e história conferem o novo estado
      }
      // Abas em segundo plano recebem intervalos atrasados: simula em blocos de até 1 s.
      let remaining = Math.min(dt, BALANCE.offlineCapSeconds);
      let game = get().game;
      // Aba que ficou muito tempo em segundo plano: sem crises acumuladas (ausência nunca é punida).
      const longGap = dt > 30;
      if (longGap && (game.crises.length || game.contracts.some(c => c.risk))) game = { ...game, crises: [], contracts: game.contracts.filter(c => !c.risk) };
      let report: TickReport | null = null;
      let found = 0;
      const terraformed: string[] = [];
      const relics: string[] = [];
      let race: 'won' | 'lost' | null = null;
      const layerBefore = layerIndex(game);
      const before = { ...game.resources };
      const veinsBefore = game.deposit.veins.filter(v => v.reserve > 0).length;
      const eraBefore = eraIndex(game);
      // Passos de 1 s; um intervalo enorme (computador suspenso) usa no máximo ~400 passos, como o cálculo offline.
      const stepSize = Math.max(1, remaining / 400);
      while (remaining > 0) {
        const step = Math.min(stepSize, remaining);
        ({ state: game, report } = simulate(game, step, { flows: step >= remaining - 1e-9 }));
        found += report.finishedExpeditions.length;
        terraformed.push(...report.finishedTerraforms);
        relics.push(...report.relics);
        race = report.race ?? race;
        remaining -= step;
      }
      if (longGap) game = { ...game, crisisTimer: Math.max(game.crisisTimer, 240), claimTimer: Math.max(game.claimTimer, 300) };
      // Território: as facções se movem só com o jogo aberto.
      if (game.claimTimer <= 0) {
        const r = territoryTick(game);
        game = r.state;
        if (r.note) {
          const fname = t(FACTION_BY_ID[r.note.faction].name);
          events.emit({ type: 'territory' });
          get().toast(r.note.kind === 'claim' ? t('{faccao} reivindicou {local}.', { faccao: fname, local: r.note.location }) : t('{faccao} liberou {local} para você.', { faccao: fname, local: r.note.location }), r.note.kind === 'claim' ? 'warn' : 'info');
        }
      }
      // Crises de colônia e eventos espaciais só surgem com o jogo aberto.
      if (game.crisisTimer <= 0) {
        const had = game.crises.length;
        game = spawnCrisis(game);
        const c = game.crises[game.crises.length - 1];
        if (game.crises.length > had && c) {
          const loc = game.locations.find(l => l.id === c.locId);
          events.emit({ type: 'crisis' });
          get().toast(t('{crise} em {local}! Veja no Mapa.', { crise: t(CRISIS_BY_KIND[c.kind].name), local: loc?.name ?? t('uma colônia') }), 'warn');
        }
      }
      // Eventos espaciais só surgem com o jogo aberto; as continuações das histórias vêm primeiro.
      {
        const next = surfaceChain(game);
        if (next !== game) { game = next; events.emit({ type: 'spaceEvent', id: game.event!.id }); get().toast(t('A história continua…')); }
      }
      if (game.eventTimer <= 0) {
        game = spawnEvent(game);
        if (game.event) events.emit({ type: 'spaceEvent', id: game.event.id });
      }
      const ach = checkAchievements(game);
      game = ach.state;
      const goals = checkGoals(game);
      game = goals.state;
      const story = checkStory(game);
      game = story.state;
      game = recordTimeline(game);
      const rates = { ...get().rates };
      const a = Math.min(1, dt / 1.5);
      for (const r of RES_IDS) rates[r] += ((game.resources[r] - before[r]) / dt - rates[r]) * a;
      let flows = get().flows;
      if (report?.flows) {
        const next = {} as Flows;
        for (const src of Object.keys(report.flows) as FlowSource[]) {
          const old = flows?.[src] ?? {};
          const cur = report.flows[src];
          const merged: Partial<Record<ResId, number>> = {};
          for (const r of new Set([...Object.keys(old), ...Object.keys(cur)]) as Set<ResId>) {
            const v = (old[r] ?? 0) + ((cur[r] ?? 0) - (old[r] ?? 0)) * a;
            if (Math.abs(v) > 1e-6) merged[r] = v;
          }
          next[src] = merged;
        }
        flows = next;
      }
      let history = get().history;
      if (game.stats.playTime - lastSample >= HISTORY_STEP || game.stats.playTime < lastSample) {
        lastSample = game.stats.playTime;
        history = { ...history };
        for (const r of RES_IDS) history[r] = [...(history[r] ?? []), rates[r]].slice(-HISTORY_MAX);
      }
      if (game.deposit.veins.filter(v => v.reserve > 0).length < veinsBefore) { events.emit({ type: 'veinDepleted' }); get().toast(t('Um veio se esgotou: a extração voltou para a crosta.')); }
      set({ game, report, rates, flows, history, ...(story.fresh.length ? { storyQueue: [...get().storyQueue, ...(story.fresh.length > 2 ? story.fresh.slice(-1) : story.fresh)] } : {}) });
      if (story.fresh.length > 2) get().toast(t('{n} capítulos novos no Diário (aba Registro).', { n: story.fresh.length }));
      const eraNow = eraIndex(game);
      if (eraNow > eraBefore && !longGap) {
        events.emit({ type: 'goal' });
        get().toast(t('Sua civilização entrou na era {nome}!', { nome: t(ERAS[eraNow - 1].name) }));
      }
      if (story.lore.length) {
        const first = LORE_BY_ID[story.lore[0]];
        get().toast(story.lore.length === 1 ? t('Novo no Arquivo: {titulo}', { titulo: t(first.title) }) : t('{n} novos registros no Arquivo (aba Registro).', { n: story.lore.length }));
      }
      for (const id of goals.done) {
        events.emit({ type: 'goal' });
        const g = GOAL_BY_ID[id];
        get().toast(t('Objetivo concluído: {titulo}', { titulo: t(g.title) }) + (g.reward ? ' ' + t('(+{n} créditos)', { n: g.reward.credits ?? 0 }) : ''));
      }
      for (const id of ach.unlocked) {
        events.emit({ type: 'achievement', id });
        get().toast(t('Conquista: {nome} (+2% de produção)', { nome: t(ACHIEVEMENT_BY_ID[id].name) }));
      }
      for (const id of terraformed) {
        events.emit({ type: 'terraformed' });
        get().toast(t('Terraformação concluída em {local}!', { local: game.locations.find(l => l.id === id)?.name ?? t('uma colônia') }));
      }
      for (const id of relics) {
        events.emit({ type: 'achievement', id });
        get().toast(t('Relíquia encontrada: {nome}. {efeito}', { nome: t(RELIC_BY_ID[id].name), efeito: t(RELIC_BY_ID[id].desc) }));
      }
      if (race) {
        const fname = t(FACTION_BY_ID[game.race!.faction].name);
        events.emit({ type: race === 'won' ? 'goal' : 'territory' });
        get().toast(race === 'won' ? t('Seu Portal estelar abriu antes do portal de {faccao}! Bônus até a Ascensão.', { faccao: fname }) : t('{faccao} terminou o portal primeiro: expedições pagam pedágio até a Ascensão.', { faccao: fname }), race === 'won' ? 'info' : 'warn');
      }
      if (found > 0) {
        events.emit({ type: 'discovered', count: found });
        get().toast(found === 1 ? t('Expedição concluída: novo local descoberto!') : t('{n} novos locais descobertos!', { n: found }));
      }
      const layerNow = layerIndex(game);
      if (layerNow > layerBefore) {
        const L = LAYERS[layerNow];
        events.emit({ type: 'layer', index: layerNow });
        get().toast(t('Nova camada do asteroide: {nome}. A crosta agora rende ×{n}.', { nome: t(L.name), n: fmtNum(L.yield) }));
      }
    },

    mine(x, y) {
      const { state, gained } = mineClick(get().game, BALANCE.clickAmount);
      if (Object.keys(gained).length === 0) { get().toast('Armazém cheio — venda ou processe o minério.', 'warn'); return; }
      set({ game: state });
      events.emit({ type: 'mined', gained, x, y });
    },

    strike(x, y) {
      const { state, gained } = goldenStrike(get().game);
      if (Object.keys(gained).length === 0) { get().toast('Armazém cheio — o ponto brilhante se perdeu.', 'warn'); return; }
      set({ game: state });
      events.emit({ type: 'golden', x, y });
      events.emit({ type: 'mined', gained, x, y });
      const total = Object.values(gained).reduce((a, b) => a + (b ?? 0), 0);
      get().toast(t('Ponto brilhante: +{n} de minério!', { n: fmt(total) }));
    },

    overclock(id) {
      commit(overclockReactor(get().game, id), () => {
        const nome = t(BUILDING_BY_ID[id].name);
        if (get().game.overclock[id]?.fault) {
          events.emit({ type: 'denied' });
          get().toast(t('Pane! {nome} desarmou na sobrecarga: gera metade e esfria por mais tempo.', { nome }));
          return;
        }
        events.emit({ type: 'overclock', id });
        get().toast(t('Sobrecarga: {nome} gera ×{m} por {s} s.', { nome, m: BALANCE.overclockMult, s: BALANCE.overclockTime }));
      });
    },
    setThrottle(id, value) { commit(setThrottle(get().game, id, value)); },
    setPriority(id, p) { commit(setPriority(get().game, id, p)); },
    toggleProtect(cat) { commit(toggleProtect(get().game, cat)); },
    linkColony(locId) { commit(linkColony(get().game, locId), () => events.emit({ type: 'outpost' })); },

    sell(res) {
      const { state, earned } = sell(get().game, res);
      if (earned > 0) { set({ game: state }); events.emit({ type: 'sold', res, earned }); }
    },

    buy(id) {
      const { game, buyAmount } = get();
      const amount = buyAmount === 'max' ? maxAffordable(game, BUILDING_BY_ID[id], getModifiers(game).cost) : buyAmount;
      get().buyAmountOf(id, amount);
    },

    /** Compra exatamente `amount` (os botões de correção do conselheiro compram uma por vez, qualquer que seja o seletor). */
    buyAmountOf(id, amount) {
      const { game } = get();
      const next = buyBuilding(game, id, amount);
      commit(next, () => {
        events.emit({ type: 'built', id, amount });
        const def = BUILDING_BY_ID[id];
        const was = game.buildings[id], now = next!.buildings[id];
        // Marcos de quantidade: comemora cada um (e o bônus especial do marco de 100).
        if (hasMilestones(def) && milestoneLevel(now) > milestoneLevel(was)) {
          const special = was < SPECIAL_AT && now >= SPECIAL_AT ? MILESTONE_SPECIALS[id] : undefined;
          events.emit({ type: 'milestone', id, special: !!special });
          get().toast(t('Marco: {n} × {nome} — rende ×{m}!', { n: now, nome: t(def.name), m: fmtNum(BALANCE.milestoneMult) }) + (special ? ' ' + t('Bônus especial: {texto}.', { texto: t(special.text) }) : ''));
        }
        if (def.energyUse) {
          const e = energyBalance(next!);
          if (e.demand > e.supply) get().toast('Energia insuficiente: construa geradores para manter as máquinas a 100%.', 'bad');
        }
      });
    },

    upgrade(id) { commit(buyUpgrade(get().game, id), () => events.emit({ type: 'upgraded', id })); },

    launchExpedition() { commit(launchExpedition(get().game), () => events.emit({ type: 'expeditionLaunched' })); },
    establishOutpost(locId, spec, byInfluence = false) {
      commit(establishOutpost(get().game, locId, spec, byInfluence), () => { events.emit({ type: 'outpost' }); get().toast('Colônia fundada!'); });
    },
    upgradeOutpost(locId) { commit(upgradeOutpost(get().game, locId), () => events.emit({ type: 'outpost' })); },
    setSpecialization(locId, spec) { commit(setSpecialization(get().game, locId, spec), () => get().toast('Colônia reconvertida.')); },

    buildMega(id) {
      const was = get().game.transcendence.unlocked;
      commit(buildMegaStage(get().game, id), () => {
        events.emit({ type: 'mega', id });
        events.emit({ type: 'upgraded', id });
        if (!was && get().game.transcendence.unlocked) { set({ ending: true }); events.emit({ type: 'ending' }); get().save(); }
      });
    },
    giveGift(id) { commit(giveGift(get().game, id), () => events.emit({ type: 'gift' })); },
    fulfillQuest(id) {
      const r = fulfillQuest(get().game, id);
      commit(r?.state ?? null, () => { events.emit({ type: 'contract' }); get().toast(t('Pedido cumprido: {faccao} (+{n} de relação).', { faccao: t(FACTION_BY_ID[r!.quest.faction].name), n: QUEST_RELATION })); });
    },
    prospect() {
      const before = new Set(get().game.deposit.veins.map(v => v.id));
      const next = prospect(get().game);
      commit(next, () => { const v = next!.deposit.veins.find(x => !before.has(x.id)); events.emit({ type: 'prospect' }); get().toast(t('Veio encontrado: {nome}.', { nome: v ? tName(v.name) : t('novo veio') })); });
    },
    setFocus(id) { commit(setFocus(get().game, id)); },
    setAutoDeposit(on) { commit(setAutoDeposit(get().game, on)); },
    lobby(id) { commit(lobbyFaction(get().game, id), () => events.emit({ type: 'gift' })); },
    enactDecree(id) { commit(enactDecree(get().game, id), () => { events.emit({ type: 'decree', id }); get().toast(t('Decreto: {nome}.', { nome: t(DECREE_BY_ID[id].name) })); }); },
    insureRoute(id) { commit(insureRoute(get().game, id), () => get().toast('Rota segurada: imune a bloqueios.')); },
    dropInsurance(id) { commit(dropInsurance(get().game, id)); },
    setRecipe(id, alt) {
      const g = get().game;
      const recipes = { ...g.recipes };
      if (alt) recipes[id] = true; else delete recipes[id];
      set({ game: { ...g, recipes } });
    },
    setKeep(res, fraction) {
      const g = get().game;
      const keep = { ...g.keep };
      if (fraction > 0) keep[res] = fraction; else delete keep[res];
      set({ game: { ...g, keep } });
    },
    assignDrones(role, delta) { commit(assignDrones(get().game, role, delta)); },
    resolveCrisis(id, how) { commit(resolveCrisis(get().game, id, how), () => { events.emit({ type: 'crisisSolved' }); get().toast('Crise resolvida.'); }); },
    openRoute(a, b) { commit(openRoute(get().game, a, b), () => { events.emit({ type: 'route' }); get().toast('Rota comercial aberta.'); }); },
    closeRoute(id) { commit(closeRoute(get().game, id)); },
    setAutosellFloor(f) { const g = get().game; set({ game: { ...g, autosellFloor: f } }); },
    startTerraform(id) { commit(startTerraform(get().game, id), () => get().toast('Terraformação iniciada.')); },
    buyStarPerk(id) { commit(buyStarPerk(get().game, id), () => events.emit({ type: 'upgraded', id })); },
    transcend() {
      commit(transcend(get().game), () => {
        set({ report: null, rates: zeroRates(), flows: null, history: {}, ending: false });
        events.emit({ type: 'transcended' });
        get().toast('Transcendência concluída. Uma nova era começa.');
        get().save();
      });
    },
    dismissEnding() { set({ ending: false }); },
    selectLoc(id) { set({ selectedLoc: id }); },
    selectMega(id) { set({ selectedMega: id }); },

    ascend(next = null) {
      const prev = get().game;
      const cleared = activeChallenge(prev) && challengeMet(prev) ? activeChallenge(prev) : null;
      const weekly = prev.weekly.active !== null ? prev.stats.playTime : null;
      commit(ascend(prev, Date.now(), next), () => {
        set({ report: null, rates: zeroRates(), flows: null, history: {} });
        events.emit({ type: 'ascended' });
        get().toast(t('Projeto Ascensão concluído. Uma nova jornada começa.'));
        if (cleared) { events.emit({ type: 'challenge', done: true }); get().toast(t('Desafio concluído: {nome}! {recompensa}.', { nome: t(cleared.name), recompensa: t(cleared.rewardText) })); }
        if (weekly !== null) { events.emit({ type: 'challenge', done: true }); get().toast(t('Desafio da semana concluído em {tempo}.', { tempo: fmtDuration(weekly) })); }
        if (get().game.weekly.active !== null) { events.emit({ type: 'challenge', done: false }); get().toast(t('Desafio da semana ativo.'), 'warn'); }
        const now = get().game.challenges.active;
        if (now) { events.emit({ type: 'challenge', done: false }); get().toast(t('Desafio ativo: {nome}.', { nome: t(CHALLENGE_BY_ID[now].name) }), 'warn'); }
        get().save();
      });
    },
    abandonChallenge() {
      const g = get().game;
      if (!g.challenges.active) return;
      set({ game: { ...g, challenges: { ...g.challenges, active: null } } });
      get().toast(t('Desafio abandonado. Nada foi perdido.'));
    },
    buyPerk(id) { commit(buyPerk(get().game, id), () => events.emit({ type: 'upgraded', id })); },
    buyRepeatable(id) { commit(buyRepeatable(get().game, id), () => events.emit({ type: 'upgraded', id })); },
    fulfillContract(id) {
      const r = fulfillContract(get().game, id);
      commit(r?.state ?? null, () => { events.emit({ type: 'contract' }); get().toast('Contrato cumprido!'); });
    },

    chooseEvent(choice) {
      const before = get().game;
      const def = before.event ? EVENT_BY_ID[before.event.id] : null;
      const c = def?.choices[choice];
      const paid = eventChoiceCost(before, choice);
      const r = chooseEvent(before, choice);
      if (!r || !def || !c) { events.emit({ type: 'denied' }); get().toast('Recursos insuficientes para essa escolha.', 'warn'); return; }
      const reward = Object.fromEntries(Object.entries(r.reward).filter(([, v]) => (v ?? 0) > 0)) as Amounts;
      set({
        game: r.state,
        eventResult: {
          key: Date.now(), event: def.name, sprite: def.sprite, choice: c.label, reward, paid,
          buff: c.buff && { name: c.buff.name, duration: c.buff.duration }, relation: c.relation, reputation: c.reputation,
          continues: r.state.chain.length > before.chain.length,
        },
      });
      events.emit({ type: 'eventChosen' });
    },
    dismissEventResult() { set({ eventResult: null }); },
    dismissEvent() { set({ game: dismissEvent(get().game) }); },

    dismissTip(id) {
      const g = get().game;
      if (!g.tips.includes(id)) set({ game: { ...g, tips: [...g.tips, id] } });
    },

    chooseDoctrine(axis, option) {
      commit(chooseDoctrine(get().game, axis, option), () => { events.emit({ type: 'upgraded', id: option }); get().toast(t('Doutrina adotada: {nome}.', { nome: t(DOCTRINE_BY_ID[option].name) })); });
    },
    addDirective() { commit(addDirective(get().game)); },
    updateDirective(id, patch) { commit(updateDirective(get().game, id, patch)); },
    removeDirective(id) { commit(removeDirective(get().game, id)); },
    toggleCrew(id) { commit(toggleCrew(get().game, id)); },
    startDig(locId) { commit(startDig(get().game, locId), () => { events.emit({ type: 'prospect' }); get().toast(t('Escavação em andamento.')); }); },
    delayRival() { commit(delayRival(get().game), () => { events.emit({ type: 'gift' }); get().toast(t('Campanha de atraso: o portal rival perdeu 10% do progresso.')); }); },
    abandonWeekly() {
      const g = get().game;
      if (g.weekly.active === null) return;
      set({ game: { ...g, weekly: { ...g.weekly, active: null } } });
      get().toast(t('Desafio da semana abandonado. Nada foi perdido.'));
    },
    fissure(step, x, y) {
      const { state, gained } = fissureStrike(get().game, step);
      if (Object.keys(gained).length === 0) { get().toast('Armazém cheio — o ponto brilhante se perdeu.', 'warn'); return false; }
      set({ game: state });
      events.emit({ type: 'golden', x, y });
      events.emit({ type: 'mined', gained, x, y });
      return true;
    },
    fissureFinale(x, y) {
      const r = fissureFinale(get().game);
      if (!r.vein && Object.keys(r.gained).length === 0) return;
      set({ game: r.state });
      events.emit({ type: 'golden', x, y });
      if (r.vein) { events.emit({ type: 'prospect' }); get().toast(t('Fissura completa: ela revelou um veio novo!')); }
      else { events.emit({ type: 'mined', gained: r.gained, x, y }); get().toast(t('Fissura completa: uma leva extra de minério!')); }
    },

    setAutosell(res, on) {
      const g = get().game;
      set({ game: { ...g, autosell: { ...g.autosell, [res]: on } } });
    },

    setSetting(k, v) {
      const g = get().game;
      set({ game: { ...g, settings: { ...g.settings, [k]: v } } });
    },

    setBuyAmount(a) { set({ buyAmount: a }); },
    dismissOffline() { set({ offline: null }); },
    dismissStory() { set({ storyQueue: get().storyQueue.slice(1) }); },

    // Avisos iguais se agrupam num só (com contador) em vez de empilhar; clicar dispensa.
    toast(raw, kind = 'info') {
      const text = tStatic(raw);
      const same = get().toasts.find(x => x.text === text);
      const id = same?.id ?? ++toastId;
      const toast: Toast = { id, text, kind, count: (same?.count ?? 0) + 1 };
      const rest = get().toasts.filter(x => x.id !== id);
      set({ toasts: [...rest, toast].slice(-MAX_TOASTS) });
      clearTimeout(toastTimers.get(id));
      toastTimers.set(id, setTimeout(() => get().dismissToast(id), 4000));
    },
    dismissToast(id) {
      clearTimeout(toastTimers.get(id));
      toastTimers.delete(id);
      set({ toasts: get().toasts.filter(x => x.id !== id) });
    },

    save() {
      if (get().inactive) return false;         // outra aba está jogando: gravar aqui apagaria o progresso dela
      const ok = saveGame(get().game);
      const failedBefore = get().saveError;
      if (ok === failedBefore) set({ saveError: !ok });
      if (!ok && !failedBefore) get().toast('Não foi possível salvar neste navegador. Exporte o save em Opções.', 'bad');
      return ok;
    },

    exportSave() { return serialize(get().game); },

    importSave(text) {
      // Arquivo editado fora do jogo não entra: a assinatura não confere.
      if (saveSignature(text.trim()) === 'bad') return 'tampered';
      const parsed = parseSave(text.trim());
      if (!parsed) return 'invalid';
      const { state, summary } = applyOffline(parsed);
      set({ game: state, offline: summary, report: null, rates: zeroRates(), flows: null, history: {}, ending: false });
      get().save();
      return 'ok';
    },

    restoreBackup() {
      const b = loadBackup();
      if (!b) return false;
      set({ game: b, report: null, rates: zeroRates(), flows: null, history: {} });
      get().save();
      return true;
    },

    reset() {
      clearSave();
      set({ game: newGame(), report: null, rates: zeroRates(), flows: null, history: {}, offline: null, storyQueue: [] });
    },
  };
});
