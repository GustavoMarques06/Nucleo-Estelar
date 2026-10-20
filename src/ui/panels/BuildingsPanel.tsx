import type { Amounts, BuildingDef, BuildingStatus, Category, ResId } from '../../game/types';
import { useGame, type BuyAmount } from '../../game/store';
import { BUILDINGS } from '../../game/data/buildings';
import { RESOURCES, STORAGE_GROUPS } from '../../game/data/resources';
import { UPGRADE_BY_ID } from '../../game/data/upgrades';
import { BALANCE } from '../../game/data/balance';
import { MILESTONE_SPECIALS, SPECIAL_AT, hasMilestones, milestoneLevel, nextMilestone, prevMilestone } from '../../game/data/milestones';
import { bulkCost, canAfford, maxAffordable } from '../../game/engine/costs';
import {
  buildingStorage, capsOf, getModifiers, isBuildingUnlocked, isUpgradeVisible, milestoneOf, prodMult, recipeOf, throttleOf, type Modifiers,
} from '../../game/engine/modifiers';
import { THROTTLE_STEPS, faultChance, overclockPhase, prioritizable, throttleable } from '../../game/engine/energy';
import { fmt, fmtDuration, fmtNum } from '../../game/engine/format';
import { activeMix } from '../../game/engine/deposit';
import { Icon } from '../Icon';
import { t } from '../../i18n';
import { EnergySection } from './EnergySection';
import { useSpotTarget } from '../spotlight';

const AMOUNTS: BuyAmount[] = [1, 10, 'max'];

export function CostList({ cost, have }: { cost: Amounts; have: Record<ResId, number> }) {
  // Custos maiores que a capacidade do armazém nunca seriam pagos: avisa para construir armazéns.
  const game = useGame(s => s.game);
  const caps = capsOf(game);
  return (
    <span className="cost">
      {Object.entries(cost).map(([r, v]) => {
        const cap = caps[r as ResId];
        const over = RESOURCES[r as ResId].stored && (v ?? 0) > cap;
        return (
          <span key={r} className={`${have[r as ResId] >= (v ?? 0) ? '' : 'short'} ${over ? 'over' : ''}`}
            title={over ? t('{nome}: maior que a capacidade do armazém ({n})', { nome: t(RESOURCES[r as ResId].name), n: fmt(cap) }) : t(RESOURCES[r as ResId].name)}>
            <Icon name={RESOURCES[r as ResId].icon} size={16} />{fmt(v ?? 0)}{over && '!'}
          </span>
        );
      })}
    </span>
  );
}

function statusLabel(st: BuildingStatus | undefined): [string, string] | null {
  if (!st) return null;
  switch (st.kind) {
    case 'ok': return [t('Operando'), 'sev-ok'];
    case 'power': return [t('Energia insuficiente ({n}%)', { n: Math.round(st.ratio * 100) }), 'sev-bad'];
    case 'workers': return [t('Falta mão de obra ({n}%)', { n: Math.round(st.ratio * 100) }), 'sev-warn'];
    case 'input': return [t('Sem {recurso}', { recurso: t(RESOURCES[st.res].name).toLowerCase() }), 'sev-warn'];
    case 'full': return [t('Armazém cheio: {recurso}', { recurso: t(RESOURCES[st.res].name).toLowerCase() }), 'sev-warn'];
    case 'paused': return [t('Pausada (ritmo 0%)'), 'sev-warn'];
    case 'surplus': return [t('Pouca energia sobrando: convertendo {n}%', { n: Math.round(st.ratio * 100) }), 'sev-warn'];
    default: return null;
  }
}

const BOOST_TEXT: Record<string, string> = {
  energyAll: 'em toda a energia', priceAll: 'no preço de venda', popGrowth: 'no crescimento populacional',
  tax: 'nos impostos', outputAll: 'em toda a produção', outpost: 'na produção das colônias', expeditionSpeed: 'na velocidade das expedições',
};

function describe(b: BuildingDef, m: Modifiers, owned: number, recipe: { inputs?: Amounts; outputs?: Amounts; energy: number }, mix: ReturnType<typeof activeMix>): string[] {
  const lines: string[] = [];
  const fmtA = (a: Amounts, mult?: (r: ResId) => number) =>
    Object.entries(a).map(([r, v]) => `${fmt((v ?? 0) * (mult ? mult(r as ResId) : 1))} ${t(RESOURCES[r as ResId].name).toLowerCase()}`).join(' + ');
  const k = milestoneOf(m, b.id);
  // Indústrias aceleradas pelos Carregadores: mais insumo e mais produto por segundo.
  const speed = b.category === 'industry' ? m.industrySpeed : 1;
  if (b.extract) {
    const shares = mix.shares;
    lines.push(t('Extrai {n}/s:', { n: fmt(b.extract * mix.yield * prodMult(m, 'iron', b.id)) }) + ' ' + Object.entries(shares).map(([r, p]) => `${t(RESOURCES[r as ResId].name)} ${Math.round((p ?? 0) * 100)}%`).join(', '));
  }
  if (b.surplus) {
    lines.push(t('Absorve até {n} de energia sobrando → {saida} por segundo', { n: fmt(b.surplus), saida: fmtA(recipe.outputs ?? {}, r => prodMult(m, r, b.id)) }));
  } else if (recipe.outputs) {
    const out = fmtA(recipe.outputs, r => prodMult(m, r, b.id) * speed);
    lines.push(recipe.inputs ? t('{entrada} → {saida} por segundo', { entrada: fmtA(recipe.inputs, () => speed), saida: out }) : t('Produz {saida} por segundo', { saida: out }));
  }
  if (b.byproducts) lines.push(t('Subproduto: {n} por segundo (nunca trava a produção)', { n: fmtA(b.byproducts, () => speed) }));
  if (b.energyOut) lines.push(t('Gera {n} de energia', { n: fmt(b.energyOut * (m.energyOut[b.id] ?? 1) * m.energyAll) }) + (b.inputs ? ' ' + t('(consome {n}/s)', { n: fmtA(b.inputs) }) : '') + (b.daylight ? ' — ' + t('de {a}% à noite a {b}% ao meio-dia', { a: Math.round((1 - BALANCE.dayAmplitude) * 100), b: Math.round((1 + BALANCE.dayAmplitude) * 100) }) : ''));
  if (b.battery) lines.push(t('Guarda {n} de carga de energia', { n: fmt(b.battery * k) }));
  if (b.energyUse) lines.push(t('Consome {n} de energia', { n: fmt(b.energyUse * m.energyUse * recipe.energy) }));
  if (b.workers) lines.push(t('Precisa de {n} trabalhadores', { n: fmt(b.workers) }));
  if (b.housing) lines.push(t('Moradia para {n} pessoas', { n: fmt(b.housing * m.popCap * k) }));
  if (b.storage) {
    const n = fmt((buildingStorage(b, owned + 1) - buildingStorage(b, owned)) * m.storage);
    lines.push(b.storageGroup ? t('O próximo adiciona +{n} de capacidade só de {grupo}', { n, grupo: t(STORAGE_GROUPS[b.storageGroup].short) }) : t('O próximo adiciona +{n} de capacidade de todos os materiais', { n }));
  }
  if (b.boost) lines.push(`+${fmt(b.boost.per * k * 100)}% ${t(BOOST_TEXT[b.boost.kind])} ${t('por unidade')}`);
  if (b.upkeep) lines.push(t('Manutenção: {n} créditos/s por unidade', { n: fmt(b.upkeep * m.upkeep) }));
  return lines;
}

/** Barra até o próximo marco de quantidade (e o bônus especial do marco de 100, se ainda não chegou). */
function MilestoneBar({ b, owned }: { b: BuildingDef; owned: number }) {
  // Complexidade gradual: a barra aparece com a primeira unidade; a dica do bônus de 100, quando ele já está à vista.
  if (!hasMilestones(b) || owned < 1) return null;
  const level = milestoneLevel(owned);
  const next = nextMilestone(owned), prev = prevMilestone(owned);
  const pct = ((owned - prev) / (next - prev)) * 100;
  const special = MILESTONE_SPECIALS[b.id];
  const mult = Math.pow(BALANCE.milestoneMult, level);
  return (
    <div className="milestone" title={t('A cada marco (10, 25, 50, 100, 150, 200…) a estrutura rende ×{n}.', { n: fmtNum(BALANCE.milestoneMult) })}>
      <div className="milestone-head">
        <span>{level > 0 ? <b>{t('Marcos')} ×{fmt(mult)}</b> : t('Marco')}</span>
        <span>{owned}/{next} → ×{fmtNum(BALANCE.milestoneMult)}</span>
      </div>
      <div className="bar milestone-bar"><div style={{ width: `${pct}%` }} /></div>
      {special && owned >= SPECIAL_AT / 2 && owned < SPECIAL_AT && <small className="dim">{t('Com {n}: bônus especial — {texto}.', { n: SPECIAL_AT, texto: t(special.text) })}</small>}
      {special && owned >= SPECIAL_AT && <small className="sev-ok">{t('Bônus especial ativo: {texto}.', { texto: t(special.text) })}</small>}
    </div>
  );
}

/** Ritmo, prioridade e sobrecarga de uma estrutura já construída. */
function Controls({ b }: { b: BuildingDef }) {
  const game = useGame(s => s.game);
  const setThrottle = useGame(s => s.setThrottle);
  const setPriority = useGame(s => s.setPriority);
  const overclock = useGame(s => s.overclock);
  const th = throttleOf(game, b.id);
  const phase = b.overclock ? overclockPhase(game, b.id) : null;
  if (!throttleable(b.id) && !phase) return null;
  return (
    <div className="controls">
      {throttleable(b.id) && (
        <label className="spec recipe" title={t('Ritmo de trabalho: menos ritmo gasta menos energia, insumos e trabalhadores (a manutenção continua).')}>{t('Ritmo')}
          <select value={th} onChange={e => setThrottle(b.id, Number(e.target.value))}>
            {THROTTLE_STEPS.map(v => <option key={v} value={v}>{v === 0 ? t('Pausada') : `${Math.round(v * 100)}%`}</option>)}
          </select>
        </label>
      )}
      {prioritizable(b.id) && (
        <label className="spec recipe" title={t('Na falta de insumos, as estruturas de prioridade alta pegam o material primeiro.')}>{t('Prioridade')}
          <select value={game.priority[b.id] ?? 0} onChange={e => setPriority(b.id, Number(e.target.value) as 1 | -1 | 0)}>
            <option value={1}>{t('Alta')}</option>
            <option value={0}>{t('Normal')}</option>
            <option value={-1}>{t('Baixa')}</option>
          </select>
        </label>
      )}
      {phase && (
        <button className={`btn small overclock ${phase.kind}`} disabled={phase.kind !== 'ready'} onClick={() => overclock(b.id)}
          title={t('Sobrecarga: energia ×{m} por {s} s; depois {tempo} esfriando.', { m: BALANCE.overclockMult, s: BALANCE.overclockTime, tempo: fmtDuration(BALANCE.overclockCooldown) }) + ' ' + t('Risco de pane: {p}% (gera metade e esfria mais tempo).', { p: Math.round(faultChance(b.id) * 100) })}>
          {phase.kind === 'ready' ? t('Sobrecarga ×{m}', { m: BALANCE.overclockMult }) : phase.kind === 'active' ? t('Em sobrecarga · {tempo}', { tempo: fmtDuration(phase.left) }) : game.overclock[b.id]?.fault ? t('Pane · {tempo}', { tempo: fmtDuration(phase.left) }) : t('Esfriando · {tempo}', { tempo: fmtDuration(phase.left) })}
        </button>
      )}
    </div>
  );
}

/** Seletor ×1 / ×10 / Máx (vale para todas as listas de estruturas). */
export function BuyAmountPicker() {
  const buyAmount = useGame(s => s.buyAmount);
  const setBuyAmount = useGame(s => s.setBuyAmount);
  return (
    <div className="amounts" role="group" aria-label={t('Quantidade de compra')}>
      {t('Comprar')}
      {AMOUNTS.map(a => (
        <button key={a} className={`btn small ${buyAmount === a ? 'active' : ''}`} onClick={() => setBuyAmount(a)}>
          {a === 'max' ? t('Máx') : `×${a}`}
        </button>
      ))}
    </div>
  );
}

/** Lista as estruturas de uma categoria (sem moldura): usada pelas abas e por painéis compostos. */
export function BuildingList({ category, title }: { category: Category; title?: string }) {
  const game = useGame(s => s.game);
  const report = useGame(s => s.report);
  const buyAmount = useGame(s => s.buyAmount);
  const buy = useGame(s => s.buy);
  const setRecipe = useGame(s => s.setRecipe);
  const m = getModifiers(game);
  const inCat = BUILDINGS.filter(b => b.category === category);
  const list = inCat.filter(b => isBuildingUnlocked(b, game));
  const spotId = useSpotTarget('building', list.length);
  // Só as próximas: estruturas cuja pesquisa já pode ser feita (evita uma lista enorme no começo).
  const waiting = inCat.filter(b => b.requires && !isBuildingUnlocked(b, game) && UPGRADE_BY_ID[b.requires] && isUpgradeVisible(UPGRADE_BY_ID[b.requires], game));
  if (!list.length && !waiting.length && title) return null;

  return (
    <>
      {title && <h4 className="section">{title}</h4>}
      {list.length === 0 && <p className="hint">{t('Continue progredindo para desbloquear estruturas desta categoria.')}</p>}
      {list.map(b => {
        const owned = game.buildings[b.id];
        const amount = buyAmount === 'max' ? Math.max(1, maxAffordable(game, b, m.cost)) : buyAmount;
        const cost = bulkCost(b, owned, amount, m.cost);
        const affordable = canAfford(game, cost);
        const st = owned > 0 ? statusLabel(report?.status[b.id]) : null;
        // A primeira estrutura da partida chama atenção quando já dá para comprar.
        const nudge = affordable && owned === 0 && b.id === 'miner' && game.buildings.miner === 0;
        // A compra atual cruza um marco? Destaca o botão.
        const crosses = hasMilestones(b) && milestoneLevel(owned + amount) > milestoneLevel(owned);
        return (
          <article key={b.id} data-spot={`building:${b.id}`} className={`card ${nudge ? 'nudge' : ''} ${spotId === b.id ? 'spot' : ''}`}>
            <Icon name={b.sprite} size={72} className="card-art" />
            <div className="card-main">
              <h3>{t(b.name)} <span className="count">×{owned}</span></h3>
              <p className="desc">{t(b.desc)}</p>
              <ul className="stats">{describe(b, m, owned, recipeOf(game, b), activeMix(game, m, b.id)).map(l => <li key={l}>{l}</li>)}</ul>
              <MilestoneBar b={b} owned={owned} />
              {owned > 0 && (
                <div className="controls-row">
                  {b.alt && (
                    <label className="spec recipe" title={t(b.alt.desc)}>{t('Receita')}
                      <select value={game.recipes[b.id] ? 'alt' : 'std'} onChange={e => setRecipe(b.id, e.target.value === 'alt')}>
                        <option value="std">{t('Padrão')}</option>
                        <option value="alt">{t(b.alt.name)}</option>
                      </select>
                    </label>
                  )}
                  <Controls b={b} />
                </div>
              )}
              {b.alt && game.recipes[b.id] && <p className="desc">{t(b.alt.desc)}</p>}
              {st && <p className={`status ${st[1]}`}>{st[0]}</p>}
            </div>
            <button className={`btn buy ${crosses && affordable ? 'milestone-buy' : ''}`} disabled={!affordable} onClick={() => buy(b.id)}>
              {t('Construir')}{amount > 1 ? ` ×${amount}` : ''}
              {crosses && <small className="milestone-tag">{t('marco ×{n}', { n: fmtNum(BALANCE.milestoneMult) })}</small>}
              <CostList cost={cost} have={game.resources} />
            </button>
          </article>
        );
      })}
      {waiting.length > 0 && (
        <p className="hint">
          {t('Aguardando pesquisa:')} {waiting.map(b => `${t(b.name)} (${t(UPGRADE_BY_ID[b.requires!]?.name ?? '')})`).join(' · ')}
        </p>
      )}
    </>
  );
}

/** Aba simples de uma categoria de estruturas. */
export function BuildingsPanel({ category, intro }: { category: Category; intro?: string }) {
  return (
    <div className="panel-body">
      {intro && <p className="hint">{t(intro)}</p>}
      {category === 'energy' && <EnergySection />}
      <BuyAmountPicker />
      <BuildingList category={category} />
    </div>
  );
}
