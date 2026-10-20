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
import { THROTTLE_STEPS, overclockPhase, prioritizable, throttleable } from '../../game/engine/energy';
import { fmt, fmtDuration } from '../../game/engine/format';
import { activeMix } from '../../game/engine/deposit';
import { Icon } from '../Icon';

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
            title={over ? `${RESOURCES[r as ResId].name}: maior que a capacidade do armazém (${fmt(cap)})` : RESOURCES[r as ResId].name}>
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
    case 'ok': return ['Operando', 'sev-ok'];
    case 'power': return [`Energia insuficiente (${Math.round(st.ratio * 100)}%)`, 'sev-bad'];
    case 'workers': return [`Falta mão de obra (${Math.round(st.ratio * 100)}%)`, 'sev-warn'];
    case 'input': return [`Sem ${RESOURCES[st.res].name.toLowerCase()}`, 'sev-warn'];
    case 'full': return [`Armazém cheio: ${RESOURCES[st.res].name.toLowerCase()}`, 'sev-warn'];
    case 'paused': return ['Pausada (ritmo 0%)', 'sev-warn'];
    case 'surplus': return [`Pouca energia sobrando: convertendo ${Math.round(st.ratio * 100)}%`, 'sev-warn'];
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
    Object.entries(a).map(([r, v]) => `${fmt((v ?? 0) * (mult ? mult(r as ResId) : 1))} ${RESOURCES[r as ResId].name.toLowerCase()}`).join(' + ');
  const k = milestoneOf(m, b.id);
  // Indústrias aceleradas pelos Carregadores: mais insumo e mais produto por segundo.
  const speed = b.category === 'industry' ? m.industrySpeed : 1;
  if (b.extract) {
    const shares = mix.shares;
    lines.push(`Extrai ${fmt(b.extract * mix.yield * prodMult(m, 'iron', b.id))}/s: ` + Object.entries(shares).map(([r, p]) => `${RESOURCES[r as ResId].name} ${Math.round((p ?? 0) * 100)}%`).join(', '));
  }
  if (b.surplus) {
    lines.push(`Absorve até ${fmt(b.surplus)} de energia sobrando → ${fmtA(recipe.outputs ?? {}, r => prodMult(m, r, b.id))} por segundo`);
  } else if (recipe.outputs) {
    const out = fmtA(recipe.outputs, r => prodMult(m, r, b.id) * speed);
    lines.push(recipe.inputs ? `${fmtA(recipe.inputs, () => speed)} → ${out} por segundo` : `Produz ${out} por segundo`);
  }
  if (b.byproducts) lines.push(`Subproduto: ${fmtA(b.byproducts, () => speed)} por segundo (nunca trava a produção)`);
  if (b.energyOut) lines.push(`Gera ${fmt(b.energyOut * (m.energyOut[b.id] ?? 1) * m.energyAll)} de energia${b.inputs ? ` (consome ${fmtA(b.inputs)}/s)` : ''}${b.daylight ? ` — de ${Math.round((1 - BALANCE.dayAmplitude) * 100)}% à noite a ${Math.round((1 + BALANCE.dayAmplitude) * 100)}% ao meio-dia` : ''}`);
  if (b.battery) lines.push(`Guarda ${fmt(b.battery * k)} de carga de energia`);
  if (b.energyUse) lines.push(`Consome ${fmt(b.energyUse * m.energyUse * recipe.energy)} de energia`);
  if (b.workers) lines.push(`Precisa de ${fmt(b.workers)} trabalhadores`);
  if (b.housing) lines.push(`Moradia para ${fmt(b.housing * m.popCap * k)} pessoas`);
  if (b.storage) {
    const where = b.storageGroup ? ` só de ${STORAGE_GROUPS[b.storageGroup].short}` : ' de todos os materiais';
    lines.push(`O próximo adiciona +${fmt((buildingStorage(b, owned + 1) - buildingStorage(b, owned)) * m.storage)} de capacidade${where}`);
  }
  if (b.boost) lines.push(`+${fmt(b.boost.per * k * 100)}% ${BOOST_TEXT[b.boost.kind]} por unidade`);
  if (b.upkeep) lines.push(`Manutenção: ${fmt(b.upkeep * m.upkeep)} créditos/s por unidade`);
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
    <div className="milestone" title={`A cada marco (10, 25, 50, 100, 150, 200…) a estrutura rende ×${BALANCE.milestoneMult.toLocaleString('pt-BR')}.`}>
      <div className="milestone-head">
        <span>{level > 0 ? <b>Marcos ×{fmt(mult)}</b> : 'Marco'}</span>
        <span>{owned}/{next} → ×{BALANCE.milestoneMult.toLocaleString('pt-BR')}</span>
      </div>
      <div className="bar milestone-bar"><div style={{ width: `${pct}%` }} /></div>
      {special && owned >= SPECIAL_AT / 2 && owned < SPECIAL_AT && <small className="dim">Com {SPECIAL_AT}: bônus especial — {special.text}.</small>}
      {special && owned >= SPECIAL_AT && <small className="sev-ok">Bônus especial ativo: {special.text}.</small>}
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
        <label className="spec recipe" title="Ritmo de trabalho: menos ritmo gasta menos energia, insumos e trabalhadores (a manutenção continua).">Ritmo
          <select value={th} onChange={e => setThrottle(b.id, Number(e.target.value))}>
            {THROTTLE_STEPS.map(v => <option key={v} value={v}>{v === 0 ? 'Pausada' : `${Math.round(v * 100)}%`}</option>)}
          </select>
        </label>
      )}
      {prioritizable(b.id) && (
        <label className="spec recipe" title="Na falta de insumos, as estruturas de prioridade alta pegam o material primeiro.">Prioridade
          <select value={game.priority[b.id] ?? 0} onChange={e => setPriority(b.id, Number(e.target.value) as 1 | -1 | 0)}>
            <option value={1}>Alta</option>
            <option value={0}>Normal</option>
            <option value={-1}>Baixa</option>
          </select>
        </label>
      )}
      {phase && (
        <button className={`btn small overclock ${phase.kind}`} disabled={phase.kind !== 'ready'} onClick={() => overclock(b.id)}
          title={`Sobrecarga: energia ×${BALANCE.overclockMult} por ${BALANCE.overclockTime} s; depois ${fmtDuration(BALANCE.overclockCooldown)} esfriando.`}>
          {phase.kind === 'ready' ? `Sobrecarga ×${BALANCE.overclockMult}` : phase.kind === 'active' ? `Em sobrecarga · ${fmtDuration(phase.left)}` : `Esfriando · ${fmtDuration(phase.left)}`}
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
    <div className="amounts" role="group" aria-label="Quantidade de compra">
      Comprar
      {AMOUNTS.map(a => (
        <button key={a} className={`btn small ${buyAmount === a ? 'active' : ''}`} onClick={() => setBuyAmount(a)}>
          {a === 'max' ? 'Máx' : `×${a}`}
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
  // Só as próximas: estruturas cuja pesquisa já pode ser feita (evita uma lista enorme no começo).
  const waiting = inCat.filter(b => b.requires && !isBuildingUnlocked(b, game) && UPGRADE_BY_ID[b.requires] && isUpgradeVisible(UPGRADE_BY_ID[b.requires], game));
  if (!list.length && !waiting.length && title) return null;

  return (
    <>
      {title && <h4 className="section">{title}</h4>}
      {list.length === 0 && <p className="hint">Continue progredindo para desbloquear estruturas desta categoria.</p>}
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
          <article key={b.id} className={`card ${nudge ? 'nudge' : ''}`}>
            <Icon name={b.sprite} size={72} className="card-art" />
            <div className="card-main">
              <h3>{b.name} <span className="count">×{owned}</span></h3>
              <p className="desc">{b.desc}</p>
              <ul className="stats">{describe(b, m, owned, recipeOf(game, b), activeMix(game, m, b.id)).map(l => <li key={l}>{l}</li>)}</ul>
              <MilestoneBar b={b} owned={owned} />
              {owned > 0 && (
                <div className="controls-row">
                  {b.alt && (
                    <label className="spec recipe" title={b.alt.desc}>Receita
                      <select value={game.recipes[b.id] ? 'alt' : 'std'} onChange={e => setRecipe(b.id, e.target.value === 'alt')}>
                        <option value="std">Padrão</option>
                        <option value="alt">{b.alt.name}</option>
                      </select>
                    </label>
                  )}
                  <Controls b={b} />
                </div>
              )}
              {b.alt && game.recipes[b.id] && <p className="desc">{b.alt.desc}</p>}
              {st && <p className={`status ${st[1]}`}>{st[0]}</p>}
            </div>
            <button className={`btn buy ${crosses && affordable ? 'milestone-buy' : ''}`} disabled={!affordable} onClick={() => buy(b.id)}>
              Construir{amount > 1 ? ` ×${amount}` : ''}
              {crosses && <small className="milestone-tag">marco ×{BALANCE.milestoneMult.toLocaleString('pt-BR')}</small>}
              <CostList cost={cost} have={game.resources} />
            </button>
          </article>
        );
      })}
      {waiting.length > 0 && (
        <p className="hint">
          Aguardando pesquisa: {waiting.map(b => `${b.name} (${UPGRADE_BY_ID[b.requires!]?.name})`).join(' · ')}
        </p>
      )}
    </>
  );
}

/** Aba simples de uma categoria de estruturas. */
export function BuildingsPanel({ category, intro }: { category: Category; intro?: string }) {
  return (
    <div className="panel-body">
      {intro && <p className="hint">{intro}</p>}
      <BuyAmountPicker />
      <BuildingList category={category} />
    </div>
  );
}
