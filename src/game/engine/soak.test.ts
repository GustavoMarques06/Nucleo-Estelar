import { beforeAll, describe, expect, it } from 'vitest';
import type { BuildingId, DroneRole, GameState, ResId, Specialization, TickReport } from '../types';
import { playCampaign, type CampaignEvent } from './bot';
import { cloneState, rng } from './state';
import { buyBuilding, buyUpgrade, goldenStrike, mineClick, sell, simulate } from './economy';
import { batteryCap, capsOf, energyBalance, getModifiers } from './modifiers';
import { THROTTLE_STEPS, overclockReactor, setPriority, setThrottle } from './energy';
import { prospect, setFocus } from './deposit';
import { DRONE_ROLES } from '../data/drones';
import { RES_IDS, RESOURCES } from '../data/resources';
import { BUILDINGS, BUILDING_IDS } from '../data/buildings';
import { UPGRADES, UPGRADE_BY_ID } from '../data/upgrades';
import { MEGAPROJECTS, MEGA_BY_ID } from '../data/megaprojects';
import { REPEATABLES } from '../data/repeatables';
import { DECREES } from '../data/decrees';
import { FACTIONS } from '../data/factions';
import { SPECIALIZATIONS } from '../data/locations';
import { BALANCE } from '../data/balance';
import { GOALS } from '../data/goals';
import { STORY } from '../data/story';
import { unitCost } from './costs';
import { advise } from './advisor';
import { upkeepBreakdown } from './upkeep';
import { quoteSale, tradedResources } from './market';
import { applyOffline } from './offline';
import { parseSave, serialize } from './save';
import { establishOutpost, launchExpedition, setSpecialization, startTerraform, upgradeOutpost } from './expansion';
import { closeRoute, dropInsurance, insureRoute, maxRoutes, openRoute } from './routes';
import { fulfillContract } from './contracts';
import { enactDecree } from './decrees';
import { giveGift, lobbyFaction } from './factions';
import { resolveCrisis, spawnCrisis } from './crises';
import { assignDrones } from './drones';
import { buildMegaStage, buyRepeatable, checkAchievements, checkGoals, checkStory, chooseEvent, dismissEvent, nextMegaStage, spawnEvent } from './progression';

// Teste de resistência: joga a campanha inteira com o jogador automático (várias Ascensões e, no modo completo,
// a Singularidade e a Transcendência) conferindo, a cada passo, que o estado continua válido. Depois pega estados
// de várias fases e aplica ações aleatórias ("macaco") para achar travas e erros em caminhos pouco usados.
//
//   npm test          → versão curta (≈ 2 Ascensões)
//   npm run soak      → versão completa (até a Transcendência; leva vários minutos)
const FULL = process.env.SOAK === 'full';
const H = 3600;

// ---------- invariantes ----------
/** JSON com chaves em ordem fixa: abrir um save reordena as chaves, e isso não é uma diferença de verdade. */
const canon = (x: unknown): string => JSON.stringify(x, (_, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v));
const finite = (x: unknown) => typeof x === 'number' && Number.isFinite(x);

/** Tira o que o save descarta de propósito (valores zerados ou falsos) para comparar só o que importa. */
function normalize(save: Record<string, any>): Record<string, any> {
  const out = { ...save };
  delete out.savedAt;
  delete out.sig;                 // a assinatura muda junto com savedAt
  out.autosell = Object.fromEntries(Object.entries(save.autosell ?? {}).filter(([, x]) => x));
  out.keep = Object.fromEntries(Object.entries(save.keep ?? {}).filter(([, x]) => x));
  out.recipes = Object.fromEntries(Object.entries(save.recipes ?? {}).filter(([, x]) => x));  out.market = { clock: Math.round((save.market?.clock ?? 0) * 1e6) / 1e6, sat: Object.fromEntries(Object.entries(save.market?.sat ?? {}).filter(([, x]) => (x as number) > 0.002)) };
  return out;
}

/** Primeira diferença encontrada entre dois valores (para a mensagem de erro). */
function detail(a: any, b: any, path = ''): string {
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return `${path || 'valor'}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (canon(a[k]) !== canon(b[k])) return detail(a[k], b[k], `${path}${path ? '.' : ''}${k}`);
  return path;
}

/** Lista o que está errado no estado (vazia = tudo certo). `deep` confere também armazém, energia e o ciclo de salvar/abrir. */
function violations(s: GameState, deep = false): string[] {
  const v: string[] = [];
  for (const r of RES_IDS) {
    const x = s.resources[r];
    if (!finite(x)) v.push(`recurso ${r} inválido (${x})`);
    else if (x < -1e-6) v.push(`recurso ${r} negativo (${x})`);
    else if (x > 1e200) v.push(`recurso ${r} gigantesco (${x})`);
  }
  for (const b of BUILDING_IDS) if (!Number.isInteger(s.buildings[b]) || s.buildings[b] < 0) v.push(`estrutura ${b} = ${s.buildings[b]}`);
  for (const k of ['debt', 'contractTimer', 'crisisTimer', 'eventTimer', 'nextSeed'] as const) if (!finite(s[k])) v.push(`${k} inválido (${s[k]})`);
  if (s.debt < 0) v.push(`dívida negativa (${s.debt})`);
  if (!finite(s.market.clock)) v.push('relógio do mercado inválido');
  for (const [r, x] of Object.entries(s.market.sat)) if (!finite(x) || (x as number) < 0) v.push(`saturação ${r} inválida (${x})`);
  for (const [k, x] of Object.entries(s.stats)) if (typeof x === 'number' && (!finite(x) || x < 0)) v.push(`estatística ${k} inválida (${x})`);
  for (const [r, x] of Object.entries(s.stats.produced)) if (!finite(x) || (x as number) < 0) v.push(`produção ${r} inválida`);
  if (s.stats.reputation < 0) v.push('reputação negativa');
  for (const id of Object.keys(s.upgrades)) if (!UPGRADE_BY_ID[id]) v.push(`pesquisa desconhecida ${id}`);
  for (const [id, n] of Object.entries(s.megaprojects)) {
    const def = MEGA_BY_ID[id];
    if (!def) v.push(`megaprojeto desconhecido ${id}`);
    else if (!def.endless && n > def.stages.length) v.push(`megaprojeto ${id} além do último estágio (${n})`);
  }
  const ids = new Set(s.locations.map(l => l.id));
  if (ids.size !== s.locations.length) v.push('locais com id repetido');
  for (const l of s.locations) {
    if (!finite(l.richness) || l.richness <= 0) v.push(`riqueza inválida em ${l.id}`);
    if (l.outpost && (!Number.isInteger(l.outpost.level) || l.outpost.level < 1 || l.outpost.terra < 0 || l.outpost.terra > 5)) v.push(`colônia ${l.id} inválida (${JSON.stringify(l.outpost)})`);
  }
  const colonies = new Set(s.locations.filter(l => l.outpost).map(l => l.id));
  const perLoc = new Map<string, number>();
  for (const c of s.crises) {
    if (!colonies.has(c.locId)) v.push(`crise em local sem colônia (${c.locId})`);
    perLoc.set(c.locId, (perLoc.get(c.locId) ?? 0) + 1);
    if (!finite(c.remaining) || c.remaining <= 0) v.push('crise expirada ainda na lista');
  }
  for (const [loc, n] of perLoc) if (n > 1) v.push(`${n} crises na mesma colônia ${loc}`);
  const pairs = new Set<string>();
  const count = new Map<string, number>();
  for (const r of s.routes) {
    if (!colonies.has(r.a) || !colonies.has(r.b) || r.a === r.b) v.push(`rota ${r.id} inválida`);
    const k = [r.a, r.b].sort().join('|');
    if (pairs.has(k)) v.push(`rota duplicada ${k}`);
    pairs.add(k);
    count.set(r.a, (count.get(r.a) ?? 0) + 1); count.set(r.b, (count.get(r.b) ?? 0) + 1);
  }
  const maxR = maxRoutes(s);
  for (const [loc, n] of count) if (n > maxR + 3) v.push(`colônia ${loc} com ${n} rotas (limite ${maxR})`);
  for (const c of s.contracts) if (!finite(c.amount) || c.amount <= 0 || !finite(c.remaining)) v.push(`contrato inválido ${c.id}`);
  for (const b of s.buffs) if (!finite(b.remaining) || b.remaining <= 0) v.push(`efeito expirado na lista (${b.name})`);
  if (s.expeditions.length > BALANCE.expeditionMax + 3) v.push(`${s.expeditions.length} expedições ao mesmo tempo`);
  const assigned = Object.values(s.drones).reduce((a, b) => a + b, 0);
  if (assigned > Math.floor(s.resources.drones) + 1) v.push(`drones designados (${assigned}) acima dos existentes (${Math.floor(s.resources.drones)})`);
  for (const f of FACTIONS) { const x = s.factions[f.id]?.relation; if (!finite(x) || x < 0 || x > 100) v.push(`relação ${f.id} fora de 0–100 (${x})`); }
  for (const g of s.goals) if (!GOALS.some(x => x.id === g)) v.push(`objetivo desconhecido ${g}`);

  if (!finite(s.energyCharge) || s.energyCharge < 0) v.push(`carga das baterias inválida (${s.energyCharge})`);
  for (const [id, oc] of Object.entries(s.overclock)) if (!oc || !finite(oc.left) || !finite(oc.cool) || (oc.left <= 0 && oc.cool <= 0)) v.push(`sobrecarga inválida em ${id}`);
  for (const [id, x] of Object.entries(s.throttle)) if (!finite(x) || x! < 0 || x! >= 1) v.push(`ritmo inválido em ${id} (${x})`);
  if (deep) {
    const caps = capsOf(s);
    for (const r of RES_IDS) if (RESOURCES[r].stored && s.resources[r] > caps[r] * (1 + 1e-9) + 1e-6) v.push(`${r} acima da capacidade do armazém (${s.resources[r]} > ${caps[r]})`);
    if (s.energyCharge > batteryCap(s) * (1 + 1e-9) + 1e-6) v.push(`baterias acima da carga máxima (${s.energyCharge} > ${batteryCap(s)})`);
    const e = energyBalance(s);
    if (!(e.ratio >= 0 && e.ratio <= 1)) v.push(`razão de energia fora de 0–1 (${e.ratio})`);
    // Salvar e abrir de novo deve devolver exatamente o mesmo estado.
    try {
      const text = serialize(s, 0);
      const back = parseSave(text);
      if (!back) v.push('o save gerado não abre');
      else {
        const again = serialize(back, 0);
        const a = normalize(JSON.parse(text)), b = normalize(JSON.parse(again));
        const diff = Object.keys(a).filter(k => canon(a[k]) !== canon(b[k]));
        for (const k of diff) v.push(`salvar→abrir muda ${k}: ${detail(a[k], b[k])}`);
      }
    } catch (err) { v.push(`erro ao salvar/abrir: ${(err as Error).message}`); }
    v.push(...uiQueries(s));
  }
  return v;
}

/** Roda as consultas que a interface faz o tempo todo: nenhuma pode lançar erro nem devolver número inválido. */
function uiQueries(s: GameState): string[] {
  const v: string[] = [];
  const attempt = (name: string, fn: () => unknown) => { try { const r = fn(); if (typeof r === 'number' && !Number.isFinite(r)) v.push(`${name} devolveu ${r}`); } catch (e) { v.push(`${name} lançou: ${(e as Error).message}`); } };
  const m = getModifiers(s);
  const { report } = simulate(s, 1, { flows: true });
  attempt('advise', () => advise(s, report, Object.fromEntries(RES_IDS.map(r => [r, 0])) as Record<ResId, number>));
  attempt('upkeep', () => upkeepBreakdown(s, m).total);
  for (const r of tradedResources()) attempt(`cotação ${r}`, () => quoteSale(s, m, r, Math.floor(s.resources[r])).earned);
  for (const b of BUILDINGS) for (const x of Object.values(unitCost(b, s.buildings[b.id], m.cost))) if (!finite(x) || (x as number) < 0) v.push(`custo inválido em ${b.id}`);
  for (const mp of MEGAPROJECTS) attempt(`megaprojeto ${mp.id}`, () => { const st = nextMegaStage(s, mp.id); for (const x of Object.values(st?.cost ?? {})) if (!finite(x)) throw new Error('custo inválido'); return 0; });
  for (const g of GOALS) attempt(`objetivo ${g.id}`, () => { const p = g.progress(s); if (!(p.cur >= 0 && p.cur <= p.target)) throw new Error(`progresso ${p.cur}/${p.target}`); return p.cur; });
  for (const e of STORY) attempt(`diário ${e.id}`, () => e.when(s) ? 1 : 0);
  if (report.flows) for (const src of Object.values(report.flows)) for (const x of Object.values(src)) if (!finite(x)) v.push('fluxo com valor inválido');
  return v;
}

// ---------- campanha ----------
interface Snapshot { label: string; state: GameState }

function runCampaign() {
  const problems: string[] = [];
  const snapshots: Snapshot[] = [];
  let step = 0;
  let lastPlay = 0, lastEarned = 0, lastProgressAt = 0;
  const note = (msg: string, s: GameState) => { if (problems.length < 40) problems.push(`[${(s.stats.playTime / H).toFixed(1)} h, journey ${s.ascension.count}/${s.transcendence.count}] ${msg}`); };
  const log: string[] = [];
  const onStep = (s: GameState, _r: TickReport) => {
    step++;
    for (const msg of violations(s, step % 400 === 0)) note(msg, s);
    // Estagnação: dez horas de jogo sem ganhar créditos novos é uma trava.
    if (s.stats.playTime < lastPlay) { lastEarned = 0; lastProgressAt = s.stats.playTime; }
    lastPlay = s.stats.playTime;
    if (s.stats.earned > lastEarned * 1.0001 + 1) { lastEarned = s.stats.earned; lastProgressAt = s.stats.playTime; }
    else if (s.stats.playTime - lastProgressAt > 10 * H && s.stats.playTime > 2 * H) { note('sem ganhar créditos há 10 h de jogo (economia travada)', s); lastProgressAt = s.stats.playTime; }
    if (step % (FULL ? 25_000 : 6_000) === 0 && snapshots.length < 12) snapshots.push({ label: `${(s.stats.playTime / H).toFixed(0)} h · journey ${s.ascension.count}`, state: cloneState(s) });
  };
  const events: CampaignEvent[] = [];
  const out = FULL
    ? playCampaign({ maxHours: 4000, ascensions: 2, transcendences: 1, onStep, onEvent: e => { events.push(e); log.push(`${e.what} (jornada ${e.journey}) em ${e.hoursInJourney.toFixed(1)} h; total ${e.totalHours.toFixed(1)} h`); } })
    : playCampaign({ maxHours: 70, ascensions: 5, transcendences: 1, onStep, onEvent: e => { events.push(e); log.push(`${e.what} (jornada ${e.journey}) em ${e.hoursInJourney.toFixed(1)} h; total ${e.totalHours.toFixed(1)} h`); } });
  return { ...out, problems, snapshots, log };
}

// ---------- macaco: ações aleatórias ----------
function monkey(start: GameState, seed: number, actions: number) {
  const r = rng(seed);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
  const problems: string[] = [];
  let s = cloneState(start);
  // Bastante material para que muitas ações deem certo.
  const rich = (x: GameState) => {
    const caps = capsOf(x);
    for (const id of RES_IDS) if (RESOURCES[id].stored) x.resources[id] = Math.max(x.resources[id], caps[id] * 0.8);
    x.resources.credits = Math.max(x.resources.credits, 1e14);
    x.resources.science = Math.max(x.resources.science, 1e11);
    x.resources.influence = Math.max(x.resources.influence, 1e4);
    x.resources.ships = Math.max(x.resources.ships, 20);
    x.resources.drones = Math.max(x.resources.drones, 30);
    return x;
  };
  s = rich(s);
  const colonies = () => s.locations.filter(l => l.outpost);
  const types = SPECIALIZATIONS.map(x => x.id) as Specialization[];
  const roles = DRONE_ROLES.map(x => x.id) as DroneRole[];
  type Action = [string, () => GameState | null];
  const table = (): Action[] => [
    ['vender', () => sell(s, pick(tradedResources())).state],
    ['construir', () => buyBuilding(s, pick(BUILDING_IDS) as BuildingId, 1 + Math.floor(r() * 5))],
    ['pesquisar', () => buyUpgrade(s, pick(UPGRADES).id)],
    ['expedição', () => launchExpedition(s)],
    ['fundar', () => { const l = pick(s.locations.filter(x => !x.outpost).concat(s.locations)); return l ? establishOutpost(s, l.id, pick(types), r() < 0.4) : null; }],
    ['ampliar', () => { const l = pick(colonies()); return l ? upgradeOutpost(s, l.id) : null; }],
    ['especializar', () => { const l = pick(colonies()); return l ? setSpecialization(s, l.id, pick(types)) : null; }],
    ['terraformar', () => { const l = pick(colonies()); return l ? startTerraform(s, l.id) : null; }],
    ['abrir rota', () => { const c = colonies(); return c.length > 1 ? openRoute(s, pick(c).id, pick(c).id) : null; }],
    ['fechar rota', () => (s.routes.length ? closeRoute(s, pick(s.routes).id) : null)],
    ['segurar rota', () => (s.routes.length ? insureRoute(s, pick(s.routes).id) : null)],
    ['tirar seguro', () => (s.routes.length ? dropInsurance(s, pick(s.routes).id) : null)],
    ['contrato', () => (s.contracts.length ? fulfillContract(s, pick(s.contracts).id)?.state ?? null : null)],
    ['decreto', () => enactDecree(s, pick(DECREES).id)],
    ['presente', () => giveGift(s, pick(FACTIONS).id)],
    ['campanha', () => lobbyFaction(s, pick(FACTIONS).id)],
    ['crise', () => (s.crises.length ? resolveCrisis(s, pick(s.crises).id, r() < 0.5 ? 'pay' : 'help') : null)],
    ['drones', () => assignDrones(s, pick(roles), Math.floor(r() * 11) - 5)],
    ['megaprojeto', () => buildMegaStage(s, pick(MEGAPROJECTS).id)],
    ['contínua', () => buyRepeatable(s, pick(REPEATABLES).id)],
    ['evento', () => { if (!s.event) return spawnEvent(s, r); return r() < 0.7 ? chooseEvent(s, Math.floor(r() * 3))?.state ?? null : dismissEvent(s); }],
    ['spawn de crise', () => spawnCrisis(s, r)],
    ['clique', () => mineClick(s, 1).state],
    ['ponto brilhante', () => goldenStrike(s).state],
    ['sobrecarga', () => overclockReactor(s, pick(['fission', 'fusion', 'solar', 'miner'] as BuildingId[]))],
    ['ritmo', () => setThrottle(s, pick(BUILDING_IDS) as BuildingId, pick(THROTTLE_STEPS))],
    ['prioridade', () => setPriority(s, pick(BUILDING_IDS) as BuildingId, pick([1, -1, 0] as const))],
    ['veio', () => { const v = s.deposit.veins.length ? pick(s.deposit.veins) : null; return v ? setFocus(s, v.id) : prospect(s); }],
    ['venda automática', () => ({ ...s, autosell: { ...s.autosell, [pick(tradedResources())]: r() < 0.7 }, keep: { ...s.keep, [pick(tradedResources())]: pick([0, 0.1, 0.25, 0.5, 0.75]) }, autosellFloor: pick([0, 0.5, 1, 1.3]) })],
    ['receita', () => { const b = pick(BUILDINGS.filter(x => x.alt)); const recipes = { ...s.recipes }; if (r() < 0.5) recipes[b.id] = true; else delete recipes[b.id]; return { ...s, recipes }; }],
    ['simular', () => simulate(s, pick([1, 5, 30, 120, 600])).state],
    ['conquistas e objetivos', () => checkStory(checkGoals(checkAchievements(s).state).state).state],
  ];
  const trail: string[] = [];
  let before = '';
  for (let i = 0; i < actions; i++) {
    const [name, act] = pick(table());
    before = `drones ${s.resources.drones.toFixed(2)} designados ${Object.values(s.drones).join('/')}`;
    trail.push(name); if (trail.length > 6) trail.shift();
    try {
      const next = act();
      if (next) s = next;
    } catch (e) { problems.push(`ação "${name}" lançou: ${(e as Error).message}`); continue; }
    if (i % 25 === 0) s = rich(s);
    const bad = violations(s, i % 60 === 0);
    if (bad.length) { problems.push(`depois de "${name}" (antes: ${before}; depois: drones ${s.resources.drones.toFixed(2)} designados ${Object.values(s.drones).join('/')}; anteriores: ${trail.slice(0, -1).join(', ')}): ${bad.slice(0, 3).join('; ')}`); if (problems.length > 10) break; }
  }
  return { problems, state: s };
}

// ---------- os testes ----------
describe(FULL ? 'resistência: campanha completa até a Transcendência' : 'resistência: campanha curta', () => {
  let campaign!: ReturnType<typeof runCampaign>;
  let summary = '';
  beforeAll(() => {
    campaign = runCampaign();
    summary = `${campaign.log.join('\n')}\nestado final: ${campaign.hours.toFixed(0)} h, ascensões ${campaign.state.ascension.count}, núcleo ${campaign.state.megaprojects.core ?? 0}, singularidade ${campaign.state.megaprojects.singularity ?? 0}, transcendências ${campaign.state.transcendence.count}`;
  }, 3_000_000);

  it('percorre as jornadas sem estado inválido nem economia travada', () => {
    console.log('\n' + summary);
    expect(campaign.problems, campaign.problems.slice(0, 15).join('\n')).toEqual([]);
  }, 3_000_000);

  it('chega às Ascensões esperadas', () => {
    expect(campaign.events.filter(e => e.what === 'ascension').length, summary).toBeGreaterThanOrEqual(2);
    if (FULL) {
      expect(campaign.events.some(e => e.what === 'singularity'), `a Singularidade não foi alcançada\n${summary}`).toBe(true);
      expect(campaign.events.some(e => e.what === 'transcendence'), `não transcendeu\n${summary}`).toBe(true);
    }
  });

  it('cada jornada seguinte é mais rápida que a anterior', () => {
    const asc = campaign.events.filter(e => e.what === 'ascension').map(e => e.hoursInJourney);
    if (asc.length >= 2) expect(asc[1], summary).toBeLessThan(asc[0]);
  });

  it('o jogador volta depois de 8 h fora em qualquer fase, sem estado inválido', () => {
    const bad: string[] = [];
    for (const snap of campaign.snapshots) {
      const { state } = applyOffline({ ...snap.state, savedAt: 0 }, 8 * H * 1000);
      for (const msg of violations(state, true)) bad.push(`${snap.label}: ${msg}`);
    }
    expect(bad).toEqual([]);
  });

  it('ações aleatórias em estados de todas as fases não quebram nada', () => {
    const bad: string[] = [];
    campaign.snapshots.forEach((snap, i) => {
      const { problems } = monkey(snap.state, 1000 + i, FULL ? 600 : 250);
      for (const msg of problems) bad.push(`${snap.label}: ${msg}`);
    });
    expect(bad, bad.slice(0, 12).join('\n')).toEqual([]);
  }, 600_000);

  it('o estado inicial e cada passo de Ascensão/Transcendência geram saves válidos', () => {
    for (const s of [campaign.state, ...campaign.snapshots.map(x => x.state)]) {
      const bad = violations(s, true);
      expect(bad, bad.join('\n')).toEqual([]);
    }
  });
});

