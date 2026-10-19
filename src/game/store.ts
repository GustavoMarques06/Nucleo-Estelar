import { create } from 'zustand';
import type { BuildingId, DroneRole, Flows, FlowSource, GameState, ResId, Settings, Specialization, TickReport } from './types';
import { RES_IDS } from './data/resources';
import { BALANCE } from './data/balance';
import { BUILDING_BY_ID } from './data/buildings';
import { newGame } from './engine/state';
import { buyBuilding, buyUpgrade, mineClick, sell, simulate } from './engine/economy';
import { clearSave, loadBackup, loadGame, parseSave, saveGame, serialize } from './engine/save';
import { applyOffline, type OfflineSummary } from './engine/offline';
import { energyBalance, getModifiers } from './engine/modifiers';
import { maxAffordable } from './engine/costs';
import { establishOutpost, launchExpedition, setSpecialization, startTerraform, upgradeOutpost } from './engine/expansion';
import { fulfillQuest, giveGift, lobbyFaction } from './engine/factions';
import { prospect, setAutoDeposit, setFocus } from './engine/deposit';
import { enactDecree } from './engine/decrees';
import { DECREE_BY_ID } from './data/decrees';
import { FACTION_BY_ID, QUEST_RELATION } from './data/factions';
import { resolveCrisis, spawnCrisis } from './engine/crises';
import { closeRoute, dropInsurance, insureRoute, openRoute } from './engine/routes';
import { CRISIS_BY_KIND } from './data/crises';
import { assignDrones } from './engine/drones';
import { GOAL_BY_ID } from './data/goals';
import { checkGoals, checkStory, ascend, buildMegaStage, buyPerk, buyStarPerk, transcend, buyRepeatable, checkAchievements, chooseEvent, dismissEvent, spawnEvent } from './engine/progression';
import { fulfillContract } from './engine/contracts';
import { ACHIEVEMENT_BY_ID } from './data/achievements';
import { events } from './events';

export type BuyAmount = 1 | 10 | 'max';
export type History = Partial<Record<ResId, number[]>>;
export const HISTORY_STEP = 10;         // segundos de jogo entre amostras
export const HISTORY_MAX = 180;         // 30 min de histórico
export interface Toast { id: number; text: string; kind: 'info' | 'warn' | 'bad'; count: number }

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
  saveError: boolean;             // o navegador recusou o último salvamento
  storyQueue: string[];           // registros do diário esperando para serem mostrados (interface; não salvo)

  boot(): void;
  advance(dt: number): void;
  mine(x?: number, y?: number): void;
  sell(res: ResId): void;
  buy(id: BuildingId): void;
  upgrade(id: string): void;
  launchExpedition(): void;
  establishOutpost(locId: string, spec: Specialization, byInfluence?: boolean): void;
  upgradeOutpost(locId: string): void;
  setSpecialization(locId: string, spec: Specialization): void;
  buildMega(id: string): void;
  ascend(): void;
  buyPerk(id: string): void;
  buyStarPerk(id: string): void;
  transcend(): void;
  dismissEnding(): void;
  selectLoc(id: string | null): void;
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
  setAutosell(res: ResId, on: boolean): void;
  setSetting<K extends keyof Settings>(k: K, v: Settings[K]): void;
  setBuyAmount(a: BuyAmount): void;
  dismissOffline(): void;
  dismissStory(): void;
  toast(text: string, kind?: Toast['kind']): void;
  dismissToast(id: number): void;
  save(): boolean;
  exportSave(): string;
  importSave(text: string): boolean;
  restoreBackup(): boolean;
  reset(): void;
}

const zeroRates = () => Object.fromEntries(RES_IDS.map(r => [r, 0])) as Record<ResId, number>;
let toastId = 0;
const toastTimers = new Map<number, ReturnType<typeof setTimeout>>();
const MAX_TOASTS = 4;
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
    saveError: false,
    storyQueue: [],

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
    },

    advance(dt) {
      // Abas em segundo plano recebem intervalos atrasados: simula em blocos de até 1 s.
      let remaining = Math.min(dt, BALANCE.offlineCapSeconds);
      let game = get().game;
      // Aba que ficou muito tempo em segundo plano: sem crises acumuladas (ausência nunca é punida).
      const longGap = dt > 30;
      if (longGap && (game.crises.length || game.contracts.some(c => c.risk))) game = { ...game, crises: [], contracts: game.contracts.filter(c => !c.risk) };
      let report: TickReport | null = null;
      let found = 0;
      const before = { ...game.resources };
      while (remaining > 0) {
        const step = Math.min(1, remaining);
        ({ state: game, report } = simulate(game, step, { flows: step >= remaining - 1e-9 }));
        found += report.finishedExpeditions.length;
        remaining -= step;
      }
      if (longGap) game = { ...game, crisisTimer: Math.max(game.crisisTimer, 240) };
      // Crises de colônia e eventos espaciais só surgem com o jogo aberto.
      if (game.crisisTimer <= 0) {
        const had = game.crises.length;
        game = spawnCrisis(game);
        const c = game.crises[game.crises.length - 1];
        if (game.crises.length > had && c) {
          const loc = game.locations.find(l => l.id === c.locId);
          events.emit({ type: 'crisis' });
          get().toast(`${CRISIS_BY_KIND[c.kind].name} em ${loc?.name ?? 'uma colônia'}! Veja no Mapa.`, 'warn');
        }
      }
      // Eventos espaciais só surgem com o jogo aberto.
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
      set({ game, report, rates, flows, history, ...(story.fresh.length ? { storyQueue: [...get().storyQueue, ...story.fresh] } : {}) });
      for (const id of goals.done) {
        events.emit({ type: 'goal' });
        const g = GOAL_BY_ID[id];
        get().toast(`Objetivo concluído: ${g.title}${g.reward ? ` (+${g.reward.credits} créditos)` : ''}`);
      }
      for (const id of ach.unlocked) {
        events.emit({ type: 'achievement', id });
        get().toast(`Conquista: ${ACHIEVEMENT_BY_ID[id].name} (+2% de produção)`);
      }
      for (const id of report?.finishedTerraforms ?? []) {
        events.emit({ type: 'terraformed' });
        get().toast(`Terraformação concluída em ${game.locations.find(l => l.id === id)?.name ?? 'uma colônia'}!`);
      }
      if (found > 0) {
        events.emit({ type: 'discovered', count: found });
        get().toast(found === 1 ? 'Expedição concluída: novo local descoberto!' : `${found} novos locais descobertos!`);
      }
    },

    mine(x, y) {
      const { state, gained } = mineClick(get().game, BALANCE.clickAmount);
      if (Object.keys(gained).length === 0) { get().toast('Armazém cheio — venda ou processe o minério.', 'warn'); return; }
      set({ game: state });
      events.emit({ type: 'mined', gained, x, y });
    },

    sell(res) {
      const { state, earned } = sell(get().game, res);
      if (earned > 0) { set({ game: state }); events.emit({ type: 'sold', res, earned }); }
    },

    buy(id) {
      const { game, buyAmount } = get();
      const amount = buyAmount === 'max' ? maxAffordable(game, BUILDING_BY_ID[id], getModifiers(game).cost) : buyAmount;
      const next = buyBuilding(game, id, amount);
      commit(next, () => {
        events.emit({ type: 'built', id, amount });
        if (BUILDING_BY_ID[id].energyUse) {
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
    setSpecialization(locId, spec) { commit(setSpecialization(get().game, locId, spec)); },

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
      commit(r?.state ?? null, () => { events.emit({ type: 'contract' }); get().toast(`Pedido cumprido: ${FACTION_BY_ID[r!.quest.faction].name} (+${QUEST_RELATION} de relação).`); });
    },
    prospect() {
      const before = new Set(get().game.deposit.veins.map(v => v.id));
      const next = prospect(get().game);
      commit(next, () => { const v = next!.deposit.veins.find(x => !before.has(x.id)); get().toast(`Veio encontrado: ${v?.name ?? 'novo veio'}.`); });
    },
    setFocus(id) { commit(setFocus(get().game, id)); },
    setAutoDeposit(on) { commit(setAutoDeposit(get().game, on)); },
    lobby(id) { commit(lobbyFaction(get().game, id), () => events.emit({ type: 'gift' })); },
    enactDecree(id) { commit(enactDecree(get().game, id), () => { events.emit({ type: 'upgraded', id }); get().toast(`Decreto: ${DECREE_BY_ID[id].name}.`); }); },
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

    ascend() {
      commit(ascend(get().game), () => {
        set({ report: null, rates: zeroRates(), flows: null, history: {} });
        events.emit({ type: 'ascended' });
        get().toast('Projeto Ascensão concluído. Uma nova jornada começa.');
        get().save();
      });
    },
    buyPerk(id) { commit(buyPerk(get().game, id), () => events.emit({ type: 'upgraded', id })); },
    buyRepeatable(id) { commit(buyRepeatable(get().game, id), () => events.emit({ type: 'upgraded', id })); },
    fulfillContract(id) {
      const r = fulfillContract(get().game, id);
      commit(r?.state ?? null, () => { events.emit({ type: 'contract' }); get().toast('Contrato cumprido!'); });
    },

    chooseEvent(choice) {
      const r = chooseEvent(get().game, choice);
      if (!r) { events.emit({ type: 'denied' }); get().toast('Recursos insuficientes para essa escolha.', 'warn'); return; }
      set({ game: r.state });
      events.emit({ type: 'eventChosen' });
    },
    dismissEvent() { set({ game: dismissEvent(get().game) }); },

    dismissTip(id) {
      const g = get().game;
      if (!g.tips.includes(id)) set({ game: { ...g, tips: [...g.tips, id] } });
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
    toast(text, kind = 'info') {
      const same = get().toasts.find(t => t.text === text);
      const id = same?.id ?? ++toastId;
      const toast: Toast = { id, text, kind, count: (same?.count ?? 0) + 1 };
      const rest = get().toasts.filter(t => t.id !== id);
      set({ toasts: [...rest, toast].slice(-MAX_TOASTS) });
      clearTimeout(toastTimers.get(id));
      toastTimers.set(id, setTimeout(() => get().dismissToast(id), 4000));
    },
    dismissToast(id) {
      clearTimeout(toastTimers.get(id));
      toastTimers.delete(id);
      set({ toasts: get().toasts.filter(t => t.id !== id) });
    },

    save() {
      const ok = saveGame(get().game);
      const failedBefore = get().saveError;
      if (ok === failedBefore) set({ saveError: !ok });
      if (!ok && !failedBefore) get().toast('Não foi possível salvar neste navegador. Exporte o save em Opções.', 'bad');
      return ok;
    },

    exportSave() { return serialize(get().game); },

    importSave(text) {
      const parsed = parseSave(text.trim());
      if (!parsed) return false;
      const { state, summary } = applyOffline(parsed);
      set({ game: state, offline: summary, report: null, rates: zeroRates(), flows: null, history: {}, ending: false });
      get().save();
      return true;
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
