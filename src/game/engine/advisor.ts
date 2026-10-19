import type { BuildingId, GameState, ResId, TickReport } from '../types';
import { BUILDINGS, BUILDING_BY_ID } from '../data/buildings';
import { RESOURCES } from '../data/resources';
import { UPGRADES } from '../data/upgrades';
import { unitCost, canAfford } from './costs';
import { getModifiers, isBuildingUnlocked, isUpgradeVisible, storageCap } from './modifiers';
import { fmt, fmtRate } from './format';
import { CRISIS_BY_KIND } from '../data/crises';

export type Severity = 'ok' | 'warn' | 'bad';
export interface Advice {
  producing: string;
  limiting: { text: string; severity: Severity };
  next: string;
}

const costText = (s: GameState, id: BuildingId) =>
  Object.entries(unitCost(BUILDING_BY_ID[id], s.buildings[id], getModifiers(s).cost))
    .map(([r, v]) => `${fmt(v ?? 0)} ${r === 'credits' ? 'cr' : RESOURCES[r as ResId].name.toLowerCase()}`).join(' + ');

const has = (s: GameState, id: BuildingId) => isBuildingUnlocked(BUILDING_BY_ID[id], s);

/**
 * Regra de ouro do GDD: o jogador deve saber o que está produzindo,
 * o que limita o crescimento e qual investimento ajuda agora.
 */
export function advise(s: GameState, report: TickReport | null, rates: Partial<Record<ResId, number>>): Advice {
  const producing = (Object.entries(rates) as [ResId, number][])
    .filter(([r, v]) => r !== 'credits' && r !== 'population' && v > 0.01)
    .slice(0, 6)
    .map(([r, v]) => `${RESOURCES[r].name} ${fmtRate(v)}`).join(' · ') || 'nada automático ainda';
  const ok = (next: string): Advice => ({ producing, limiting: { text: 'Nada — crescimento livre', severity: 'ok' }, next });
  const warn = (text: string, next: string, severity: Severity = 'warn'): Advice => ({ producing, limiting: { text, severity }, next });

  const st = report?.status ?? {};
  const e = report?.energy;
  const pop = report?.population;
  const work = report?.workforce;

  if (e && e.ratio < 0.999) {
    const best = (['fusion', 'orbitalCollector', 'fission', 'solar'] as const).find(id => has(s, id))!;
    return warn(`Energia insuficiente — máquinas a ${Math.round(e.ratio * 100)}%`, `Construir ${BUILDING_BY_ID[best].name.toLowerCase()} (${costText(s, best)}).`, 'bad');
  }
  if (report && report.upkeep.ratio < 0.999) {
    return warn(`Manutenção em atraso — estruturas caras a ${Math.round(report.upkeep.ratio * 100)}%`,
      'Aumente a renda (colônias de comércio, venda automática) ou use o decreto Austeridade; veja a aba Finanças.', 'bad');
  }
  const crisis = s.crises[0];
  if (crisis) {
    const loc = s.locations.find(l => l.id === crisis.locId);
    return warn(`${CRISIS_BY_KIND[crisis.kind].name} em ${loc?.name ?? 'uma colônia'}`, 'Resolva no Mapa (pagando ou pedindo ajuda a uma facção) ou espere passar.', 'warn');
  }
  if (pop?.status === 'starving') {
    return warn('População passando fome', has(s, 'hydroponics') ? `Mais estufas hidropônicas (${costText(s, 'hydroponics')}) e água para elas.` : 'Pesquise Habitats pressurizados.', 'bad');
  }
  if (work && work.ratio < 0.999) {
    return warn(`Falta mão de obra — estruturas a ${Math.round(work.ratio * 100)}%`,
      `Mais moradia: ${has(s, 'residential') ? 'torres residenciais' : 'habitats'} e comida para a população crescer.`);
  }
  for (const b of BUILDINGS) {
    const x = st[b.id];
    if (x?.kind === 'input' && s.buildings[b.id] > 0) {
      const name = RESOURCES[x.res].name.toLowerCase();
      const fix: Partial<Record<ResId, string>> = {
        iron: 'mais mineradoras', copper: 'mais mineradoras', alloys: 'mais refinarias ou fundições',
        water: 'extratores de gelo', components: 'mais fábricas', gold: 'prospecção de ouro', exotic: 'colônias em mundos raros',
      };
      return warn(`${b.name} sem ${name}`, `Aumentar a oferta de ${name}${fix[x.res] ? ` com ${fix[x.res]}` : ''}.`);
    }
  }
  for (const b of BUILDINGS) {
    const x = st[b.id];
    if (x?.kind === 'full' && s.buildings[b.id] > 0) {
      return warn(`Armazém de ${RESOURCES[x.res].name.toLowerCase()} cheio`, 'Vender, ligar a venda automática ou construir armazéns.');
    }
  }
  if (pop?.status === 'housing' && pop.cap > 0 && s.resources.population >= pop.cap - 0.5) {
    return warn('Moradia lotada', `Mais ${has(s, 'residential') ? 'torres residenciais' : 'habitats'} deixam a população (e os impostos) crescer.`);
  }
  const capNow = storageCap(s);
  const tooBig = BUILDINGS.find(b => isBuildingUnlocked(b, s) && Object.entries(unitCost(b, s.buildings[b.id], getModifiers(s).cost))
    .some(([r, v]) => RESOURCES[r as ResId].stored && (v ?? 0) > capNow));
  if (tooBig) return warn(`${tooBig.name} custa mais do que cabe no armazém`, `Construir armazéns (${costText(s, 'storage')}) para aumentar a capacidade.`);
  if (s.buildings.miner === 0) {
    return warn('Produção apenas manual', s.resources.credits >= 15 ? 'Comprar a primeira mineradora automática.' : 'Clique no asteroide e venda o minério até comprar uma mineradora.');
  }
  const readyContract = s.contracts.find(c => s.resources[c.res] >= c.amount);
  if (readyContract) return ok(`Contrato pronto na aba Comércio: entregue ${fmt(readyContract.amount)} de ${RESOURCES[readyContract.res].name.toLowerCase()}.`);
  if (s.buildings.refinery === 0 && has(s, 'refinery')) return ok(`Refinaria (${costText(s, 'refinery')}): 2 ferros (2 cr) viram 1 liga (5 cr).`);
  const research = UPGRADES.find(u => isUpgradeVisible(u, s) && canAfford(s, u.cost));
  if (research) return ok(`Pesquisa disponível: ${research.name}.`);
  const fresh = BUILDINGS.find(b => s.buildings[b.id] === 0 && isBuildingUnlocked(b, s));
  if (fresh) return ok(`Nova estrutura liberada: ${fresh.name} (${costText(s, fresh.id)}).`);
  if ((s.megaprojects.dyson ?? 0) >= 4) return ok('Contribua para o Núcleo Estelar (Megaprojetos): cada estágio multiplica toda a produção.');
  if (s.upgrades.lab && s.buildings.observatory === 0) return ok(`Observatório (${costText(s, 'observatory')}) gera ciência para as pesquisas.`);
  return ok(`Mais mineradoras (${costText(s, 'miner')}) ou pesquisas na aba Pesquisa.`);
}
