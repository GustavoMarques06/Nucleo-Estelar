import type { Amounts, BuildingDef, BuildingStatus, Category, ResId } from '../../game/types';
import { useGame, type BuyAmount } from '../../game/store';
import { BUILDINGS } from '../../game/data/buildings';
import { RESOURCES } from '../../game/data/resources';
import { UPGRADE_BY_ID } from '../../game/data/upgrades';
import { bulkCost, canAfford, maxAffordable } from '../../game/engine/costs';
import { buildingStorage, getModifiers, isBuildingUnlocked, isUpgradeVisible, prodMult, recipeOf, storageCap, type Modifiers } from '../../game/engine/modifiers';
import { fmt } from '../../game/engine/format';
import { activeMix } from '../../game/engine/deposit';
import { Icon } from '../Icon';

const AMOUNTS: BuyAmount[] = [1, 10, 'max'];

export function CostList({ cost, have }: { cost: Amounts; have: Record<ResId, number> }) {
  // Custos maiores que a capacidade do armazém nunca seriam pagos: avisa para construir armazéns.
  const cap = useGame(s => storageCap(s.game));
  return (
    <span className="cost">
      {Object.entries(cost).map(([r, v]) => {
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
  if (b.extract) {
    const shares = mix.shares;
    lines.push(`Extrai ${fmt(b.extract * mix.yield * prodMult(m, 'iron', b.id))}/s: ` + Object.entries(shares).map(([r, p]) => `${RESOURCES[r as ResId].name} ${Math.round((p ?? 0) * 100)}%`).join(', '));
  }
  if (recipe.outputs) {
    const out = fmtA(recipe.outputs, r => prodMult(m, r, b.id));
    lines.push(recipe.inputs ? `${fmtA(recipe.inputs)} → ${out} por segundo` : `Produz ${out} por segundo`);
  }
  if (b.energyOut) lines.push(`Gera ${fmt(b.energyOut * (m.energyOut[b.id] ?? 1) * m.energyAll)} de energia${b.inputs ? ` (consome ${fmtA(b.inputs)}/s)` : ''}`);
  if (b.energyUse) lines.push(`Consome ${fmt(b.energyUse * m.energyUse * recipe.energy)} de energia`);
  if (b.workers) lines.push(`Precisa de ${fmt(b.workers)} trabalhadores`);
  if (b.housing) lines.push(`Moradia para ${fmt(b.housing * m.popCap)} pessoas`);
  if (b.storage) lines.push(`O próximo adiciona +${fmt((buildingStorage(b, owned + 1) - buildingStorage(b, owned)) * m.storage)} de capacidade`);
  if (b.boost) lines.push(`+${Math.round(b.boost.per * 100)}% ${BOOST_TEXT[b.boost.kind]} por unidade`);
  if (b.upkeep) lines.push(`Manutenção: ${fmt(b.upkeep * m.upkeep)} créditos/s por unidade`);
  return lines;
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
  const mix = activeMix(game, m);
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
        return (
          <article key={b.id} className={`card ${nudge ? 'nudge' : ''}`}>
            <Icon name={b.sprite} size={72} className="card-art" />
            <div className="card-main">
              <h3>{b.name} <span className="count">×{owned}</span></h3>
              <p className="desc">{b.desc}</p>
              <ul className="stats">{describe(b, m, owned, recipeOf(game, b), mix).map(l => <li key={l}>{l}</li>)}</ul>
              {b.alt && owned > 0 && (
                <label className="spec recipe" title={b.alt.desc}>Receita
                  <select value={game.recipes[b.id] ? 'alt' : 'std'} onChange={e => setRecipe(b.id, e.target.value === 'alt')}>
                    <option value="std">Padrão</option>
                    <option value="alt">{b.alt.name}</option>
                  </select>
                </label>
              )}
              {b.alt && game.recipes[b.id] && <p className="desc">{b.alt.desc}</p>}
              {st && <p className={`status ${st[1]}`}>{st[0]}</p>}
            </div>
            <button className="btn buy" disabled={!affordable} onClick={() => buy(b.id)}>
              Construir{amount > 1 ? ` ×${amount}` : ''}
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
