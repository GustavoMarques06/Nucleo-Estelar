import type { BuildingId, GameState, ResId, TickReport } from '../types';
import { BUILDINGS, BUILDING_BY_ID } from '../data/buildings';
import { RESOURCES } from '../data/resources';
import { UPGRADES } from '../data/upgrades';
import { BALANCE } from '../data/balance';
import { nextMilestone } from '../data/milestones';
import { unitCost, canAfford, maxAffordable } from './costs';
import { capsOf, getModifiers, isBuildingUnlocked, isUpgradeVisible } from './modifiers';
import { fmt, fmtNum, fmtRate } from './format';
import { CRISIS_BY_KIND } from '../data/crises';
import { t } from '../../i18n';

export type Severity = 'ok' | 'warn' | 'bad';
/** O que o jogador pode fazer já para resolver o que limita: construir algo ou abrir uma aba (com destaque opcional). */
export type AdviceAction = { build: BuildingId } | { tab: string; upgrade?: string };
export interface Advice {
  producing: string;
  limiting: { text: string; severity: Severity };
  next: string;
  action?: AdviceAction;
}

const costText = (s: GameState, id: BuildingId) =>
  Object.entries(unitCost(BUILDING_BY_ID[id], s.buildings[id], getModifiers(s).cost))
    .map(([r, v]) => `${fmt(v ?? 0)} ${r === 'credits' ? 'cr' : t(RESOURCES[r as ResId].name).toLowerCase()}`).join(' + ');

const has = (s: GameState, id: BuildingId) => isBuildingUnlocked(BUILDING_BY_ID[id], s);

/**
 * Regra de ouro do GDD: o jogador deve saber o que está produzindo,
 * o que limita o crescimento e qual investimento ajuda agora.
 */
export function advise(s: GameState, report: TickReport | null, rates: Partial<Record<ResId, number>>): Advice {
  const producing = (Object.entries(rates) as [ResId, number][])
    .filter(([r, v]) => r !== 'credits' && r !== 'population' && v > 0.01)
    .slice(0, 6)
    .map(([r, v]) => `${t(RESOURCES[r].name)} ${fmtRate(v)}`).join(' · ') || t('nada automático ainda');
  const ok = (next: string, action?: AdviceAction): Advice => ({ producing, limiting: { text: t('Nada — crescimento livre'), severity: 'ok' }, next, action });
  const warn = (text: string, next: string, severity: Severity = 'warn', action?: AdviceAction): Advice => ({ producing, limiting: { text, severity }, next, action });

  const st = report?.status ?? {};
  const e = report?.energy;
  const pop = report?.population;
  const work = report?.workforce;

  if (e && e.ratio < 0.999) {
    const best = (['fusion', 'orbitalCollector', 'fission', 'solar'] as const).find(id => has(s, id))!;
    // À noite, se de dia sobra energia, o remédio é guardar a sobra (baterias), não só construir geradores.
    const night = e.day < 0.95 && s.buildings.solar > 0;
    const fix = night && has(s, 'battery')
      ? t('Baterias ({custo}) guardam a sobra do dia para a noite{extra}.', { custo: costText(s, 'battery'), extra: s.buildings.fission > 0 || s.buildings.fusion > 0 ? t('; a sobrecarga dos reatores também ajuda') : '' })
      : t('Construir {nome} ({custo}).', { nome: t(BUILDING_BY_ID[best].name).toLowerCase(), custo: costText(s, best) });
    return warn(t(night ? 'Energia insuficiente (noite) — máquinas a {n}%' : 'Energia insuficiente — máquinas a {n}%', { n: Math.round(e.ratio * 100) }), fix, 'bad',
      { build: night && has(s, 'battery') ? 'battery' : best });
  }
  if (report && report.upkeep.ratio < 0.999) {
    return warn(t('Manutenção em atraso — estruturas caras a {n}%', { n: Math.round(report.upkeep.ratio * 100) }),
      t('Aumente a renda (colônias de comércio, venda automática) ou use o decreto Austeridade; veja a aba Finanças.'), 'bad', { tab: 'finance' });
  }
  const crisis = s.crises[0];
  if (crisis) {
    const loc = s.locations.find(l => l.id === crisis.locId);
    return warn(t('{crise} em {local}', { crise: t(CRISIS_BY_KIND[crisis.kind].name), local: loc?.name ?? t('uma colônia') }), t('Resolva no Mapa (pagando ou pedindo ajuda a uma facção) ou espere passar.'), 'warn', { tab: 'map' });
  }
  if (pop?.status === 'starving') {
    return warn(t('População passando fome'), has(s, 'hydroponics') ? t('Mais estufas hidropônicas ({custo}) e água para elas.', { custo: costText(s, 'hydroponics') }) : t('Pesquise Habitats pressurizados.'), 'bad',
      has(s, 'hydroponics') ? { build: 'hydroponics' } : { tab: 'research', upgrade: 'habitats' });
  }
  if (work && work.ratio < 0.999) {
    return warn(t('Falta mão de obra — estruturas a {n}%', { n: Math.round(work.ratio * 100) }),
      t('Mais moradia: {tipo} e comida para a população crescer.', { tipo: has(s, 'residential') ? t('torres residenciais') : t('habitats') }), 'warn',
      { build: has(s, 'residential') ? 'residential' : 'habitat' });
  }
  for (const b of BUILDINGS) {
    const x = st[b.id];
    if (x?.kind === 'input' && s.buildings[b.id] > 0) {
      const name = t(RESOURCES[x.res].name).toLowerCase();
      const fix: Partial<Record<ResId, string>> = {
        iron: t('mais mineradoras'), copper: t('mais mineradoras'), alloys: t('mais refinarias ou fundições'),
        water: t('extratores de gelo'), components: t('mais fábricas'), gold: t('prospecção de ouro'), exotic: t('colônias em mundos raros'),
      };
      const source: Partial<Record<ResId, BuildingId>> = { iron: 'miner', copper: 'miner', alloys: 'refinery', water: 'iceExtractor', components: 'factory' };
      const src = source[x.res];
      return warn(t('{nome} sem {recurso}', { nome: t(b.name), recurso: name }), fix[x.res] ? t('Aumentar a oferta de {recurso} com {como}.', { recurso: name, como: fix[x.res]! }) : t('Aumentar a oferta de {recurso}.', { recurso: name }),
        'warn', src && has(s, src) ? { build: src } : undefined);
    }
  }
  for (const b of BUILDINGS) {
    const x = st[b.id];
    if (x?.kind === 'full' && s.buildings[b.id] > 0) {
      return warn(t('Armazém de {recurso} cheio', { recurso: t(RESOURCES[x.res].name).toLowerCase() }), t('Vender, ligar a venda automática ou construir armazéns.'), 'warn', has(s, 'storage') ? { build: 'storage' } : { tab: 'logistics' });
    }
  }
  if (pop?.status === 'housing' && pop.cap > 0 && s.resources.population >= pop.cap - 0.5) {
    return warn(t('Moradia lotada'), t('Mais {tipo} deixam a população (e os impostos) crescer.', { tipo: has(s, 'residential') ? t('torres residenciais') : t('habitats') }), 'warn',
      { build: has(s, 'residential') ? 'residential' : 'habitat' });
  }
  const caps = capsOf(s);
  const tooBig = BUILDINGS.find(b => isBuildingUnlocked(b, s) && Object.entries(unitCost(b, s.buildings[b.id], getModifiers(s).cost))
    .some(([r, v]) => RESOURCES[r as ResId].stored && (v ?? 0) > caps[r as ResId]));
  if (tooBig) return warn(t('{nome} custa mais do que cabe no armazém', { nome: t(tooBig.name) }), t('Construir armazéns ({custo}) para aumentar a capacidade.', { custo: costText(s, 'storage') }), 'warn', { build: 'storage' });
  if (s.buildings.miner === 0) {
    return warn(t('Produção apenas manual'), s.resources.credits >= 15 ? t('Comprar a primeira mineradora automática.') : t('Clique no asteroide e venda o minério até comprar uma mineradora.'), 'warn', { build: 'miner' });
  }
  const readyContract = s.contracts.find(c => s.resources[c.res] >= c.amount);
  if (readyContract) return ok(t('Contrato pronto na aba Comércio: entregue {n} de {recurso}.', { n: fmt(readyContract.amount), recurso: t(RESOURCES[readyContract.res].name).toLowerCase() }), { tab: 'commerce' });
  if (s.buildings.refinery === 0 && has(s, 'refinery')) return ok(t('Refinaria ({custo}): 2 ferros (2 cr) viram 1 liga (5 cr).', { custo: costText(s, 'refinery') }), { build: 'refinery' });
  const research = UPGRADES.find(u => isUpgradeVisible(u, s) && canAfford(s, u.cost));
  if (research) return ok(t('Pesquisa disponível: {nome}.', { nome: t(research.name) }), { tab: 'research', upgrade: research.id });
  const fresh = BUILDINGS.find(b => s.buildings[b.id] === 0 && isBuildingUnlocked(b, s));
  if (fresh) return ok(t('Nova estrutura liberada: {nome} ({custo}).', { nome: t(fresh.name), custo: costText(s, fresh.id) }), { build: fresh.id });
  // Marco ao alcance: a estrutura que chega ao próximo marco com menos compras (até 3), se couber no bolso agora.
  const near = BUILDINGS.filter(b => s.buildings[b.id] > 0 && isBuildingUnlocked(b, s))
    .map(b => ({ b, missing: nextMilestone(s.buildings[b.id]) - s.buildings[b.id] }))
    .filter(x => x.missing <= 3 && maxAffordable(s, x.b, getModifiers(s).cost) >= x.missing)
    .sort((a, b) => a.missing - b.missing)[0];
  if (near) return ok(t('Marco ao alcance: mais {n} {nome} e ela rende ×{m}.', { n: near.missing, nome: t(near.b.name), m: fmtNum(BALANCE.milestoneMult) }), { build: near.b.id });
  if ((s.megaprojects.dyson ?? 0) >= 4) return ok(t('Contribua para o Núcleo Estelar (Megaprojetos): cada estágio multiplica toda a produção.'), { tab: 'megaprojects' });
  if (s.upgrades.lab && s.buildings.observatory === 0) return ok(t('Observatório ({custo}) gera ciência para as pesquisas.', { custo: costText(s, 'observatory') }), { build: 'observatory' });
  return ok(t('Mais mineradoras ({custo}) ou pesquisas na aba Pesquisa.', { custo: costText(s, 'miner') }), { build: 'miner' });
}
