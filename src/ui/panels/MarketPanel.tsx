import type { Amounts, Contract, ResId } from '../../game/types';
import { useGame } from '../../game/store';
import { RESOURCES } from '../../game/data/resources';
import { BALANCE } from '../../game/data/balance';
import { KEEP_STEPS, MARKET, SELL_FLOORS, marketAt, marketCurve, nextPeak } from '../../game/data/market';
import { getModifiers, repLevel } from '../../game/engine/modifiers';
import { contractsUnlocked } from '../../game/engine/contracts';
import { isHigh, marketDepth, marketFactor, marketUnlocked, quoteSale, saturationOf, tradedResources, unitPriceNow } from '../../game/engine/market';
import { fmt, fmtDuration } from '../../game/engine/format';
import { Icon } from '../Icon';
import { BuildingList, BuyAmountPicker } from './BuildingsPanel';

function Reward({ r }: { r: Amounts }) {
  return (
    <span className="cost">
      {(Object.entries(r) as [ResId, number][]).map(([k, v]) => (
        <span key={k} title={RESOURCES[k].name}><Icon name={RESOURCES[k].icon} size={16} />+{fmt(v)}</span>
      ))}
    </span>
  );
}

/** Reputação comercial: sobe ao cumprir contratos e melhora rotas, contratos e a demanda do mercado. */
function Reputation() {
  const game = useGame(s => s.game);
  const rep = game.stats.reputation;
  const lvl = repLevel(game);
  const next = BALANCE.repStep * Math.pow(lvl + 1, 2);
  const prev = BALANCE.repStep * lvl * lvl;
  return (
    <div className="rep-box" title="Cada nível: rotas 3% mais baratas, contratos +3% e demanda do mercado +8%.">
      <b><Icon name="icon-reputation" size={22} /> Reputação comercial · nível {lvl}</b>
      <div className="bar"><div style={{ width: `${Math.min(100, ((rep - prev) / (next - prev)) * 100)}%` }} /></div>
      <small>{fmt(rep)} / {fmt(next)} pontos · rotas −{Math.min(50, lvl * 3)}% · contratos +{lvl * 3}% · demanda +{lvl * 8}%</small>
    </div>
  );
}

function ContractCard({ c }: { c: Contract }) {
  const game = useGame(s => s.game);
  const fulfill = useGame(s => s.fulfillContract);
  const have = game.resources[c.res];
  const ok = have >= c.amount;
  const total = c.risk ? BALANCE.contractRiskDuration : BALANCE.contractDuration;
  return (
    <article className={`card contract ${c.risk ? 'urgent' : ''}`}>
      <Icon name={RESOURCES[c.res].icon} size={48} className="card-art" />
      <div className="card-main">
        <h3>
          Entregar {fmt(c.amount)} {RESOURCES[c.res].name.toLowerCase()}
          {c.risk && <span className="count warn" title={`Paga ${Math.round((BALANCE.contractRiskMult - 1) * 100)}% a mais, mas falhar custa ${BALANCE.repRiskFail} de reputação.`}>URGENTE</span>}
        </h3>
        <p className="desc">Você tem {fmt(have)} · expira em {fmtDuration(c.remaining)} · reputação +{c.risk ? BALANCE.repRiskContract : BALANCE.repContract}</p>
        <div className="bar"><div style={{ width: `${(c.remaining / total) * 100}%` }} /></div>
      </div>
      <button className="btn buy" disabled={!ok} onClick={() => fulfill(c.id)}>
        Entregar <Reward r={c.reward} />
      </button>
    </article>
  );
}

function Contracts() {
  const game = useGame(s => s.game);
  if (!contractsUnlocked(game)) return null;
  return (
    <>
      <h4 className="section">Contratos comerciais</h4>
      <p className="hint">
        Pedidos com prazo que pagam bem acima do preço base (não variam com o mercado nem saturam a demanda). Novas ofertas a cada 3 minutos.
        {game.stats.contractsDone >= BALANCE.contractRiskAfter && ' Os urgentes pagam mais, mas falhar custa reputação.'}
      </p>
      {game.stats.contractsDone > 0 && <Reputation />}
      {game.contracts.length === 0 && <p className="hint">Nenhum contrato aberto agora. Aguarde a próxima oferta.</p>}
      {game.contracts.map(c => <ContractCard key={c.id} c={c} />)}
    </>
  );
}

/** Previsão dos próximos 15 minutos: a linha pontilhada é o preço base, o ponto é agora. */
function Spark({ res, clock }: { res: ResId; clock: number }) {
  const pts = marketCurve(res, clock, 900, 40);
  // A escala acompanha a amplitude de cada recurso: assim a curva sempre é legível.
  const amp = (MARKET[res]?.amp ?? 0.2) * 1.15;
  const x = (i: number) => (i / (pts.length - 1)) * 100;
  const y = (v: number) => 16 - ((v - 1) / amp) * 14;
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <svg className="spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2="100" y1={y(1)} y2={y(1)} />
      <path d={d} />
      <circle cx="0.8" cy={y(pts[0])} r="1.6" />
    </svg>
  );
}

export function MarketPanel() {
  const game = useGame(s => s.game);
  const sell = useGame(s => s.sell);
  const setAutosell = useGame(s => s.setAutosell);
  const setFloor = useGame(s => s.setAutosellFloor);
  const setKeep = useGame(s => s.setKeep);
  const m = getModifiers(game);
  const dynamic = marketUnlocked(game);
  const clock = game.market.clock;
  const list = tradedResources().filter(r => (game.stats.produced[r] ?? 0) > 0 || game.resources[r] > 0);

  return (
    <div className="panel-body">
      <Contracts />
      {game.upgrades.commerce && <><BuyAmountPicker /><BuildingList category="commerce" title="Estruturas comerciais" /></>}
      <h4 className="section">Mercado</h4>
      <p className="hint">
        {dynamic
          ? 'Os preços oscilam e a demanda de cada recurso satura quando você vende demais: segure o estoque na baixa, venda na alta e diversifique. A demanda se recupera com o tempo.'
          : 'Vender gera créditos na hora. Pesquise Entrepostos comerciais para liberar o mercado dinâmico.'}
        {!m.autosell && ' A pesquisa “Logística automatizada” libera a venda automática.'}
      </p>
      {m.autosell && dynamic && (
        <div className="market-top">
          <label>Venda automática só com preço
            <select value={game.autosellFloor} onChange={e => setFloor(Number(e.target.value))}>
              {SELL_FLOORS.map(f => <option key={f} value={f}>{f === 0 ? 'qualquer' : `≥ ${Math.round(f * 100)}% do base`}</option>)}
            </select>
          </label>
        </div>
      )}
      {list.map(r => {
        const def = RESOURCES[r];
        const factor = marketFactor(game, r);
        const units = Math.floor(game.resources[r]);
        const now = unitPriceNow(game, m, r);
        const total = quoteSale(game, m, r, units).earned;
        const avg = units > 0 ? total / units : now;
        const trend = marketAt(r, clock + 90) - marketAt(r, clock);
        const peak = nextPeak(r, clock);
        const pct = Math.round((factor - 1) * 100);
        const sat = saturationOf(game, r);
        const satPct = Math.round((1 - 1 / (1 + sat)) * 100);       // quanto do preço já foi perdido
        const depth = marketDepth(game, m, r);
        return (
          <article key={r} className={`card market ${dynamic && isHigh(factor) && sat < 0.25 ? 'hot' : ''}`}>
            <Icon name={def.icon} size={48} className="card-art" />
            <div className="card-main">
              <h3>{def.name}</h3>
              <p className="desc">{fmt(game.resources[r])} em estoque</p>
              <p className={`price-tag ${dynamic ? (pct > 5 && satPct < 15 ? 'up' : pct < -5 || satPct > 30 ? 'down' : '') : ''}`}>
                {fmt(now)} cr cada
                {dynamic && <small>{pct >= 0 ? '+' : ''}{pct}% {trend > 0.004 ? '▲ subindo' : trend < -0.004 ? '▼ caindo' : '● estável'}</small>}
              </p>
              {dynamic && (
                <div className={`demand ${satPct > 40 ? 'high' : satPct > 15 ? 'mid' : ''}`}
                  title={`O mercado absorve cerca de ${fmt(depth)} unidades antes de o preço cair à metade. Saturação atual: ${satPct}% do preço perdido; metade se recupera a cada ${fmtDuration(BALANCE.marketRecovery)}.`}>
                  <span>Demanda {satPct === 0 ? 'livre' : `saturada ${satPct}%`}</span>
                  <i><b style={{ width: `${satPct}%` }} /></i>
                </div>
              )}
              {dynamic && units > 0 && avg < now * 0.97 && <small className="desc">Vender tudo agora rende em média {fmt(avg)} cr por unidade.</small>}
              {dynamic && (
                <>
                  <Spark res={r} clock={clock} />
                  <small className="desc">{peak.in === 0 ? 'Este é o melhor momento dos próximos 30 min.' : `Pico em cerca de ${fmtDuration(peak.in)} (${peak.mult >= 1 ? '+' : ''}${Math.round((peak.mult - 1) * 100)}%).`}</small>
                </>
              )}
              {m.autosell && (
                <div className="autosell-row">
                  <label className="toggle">
                    <input type="checkbox" checked={!!game.autosell[r]} onChange={e => setAutosell(r, e.target.checked)} />
                    Venda automática
                  </label>
                  {game.autosell[r] && (
                    <label className="toggle" title="Fração do armazém que a venda automática nunca vende (estoque de segurança para construir).">
                      Reserva
                      <select value={game.keep[r] ?? 0} onChange={e => setKeep(r, Number(e.target.value))}>
                        {KEEP_STEPS.map(k => <option key={k} value={k}>{k === 0 ? 'nenhuma' : `${Math.round(k * 100)}% do armazém`}</option>)}
                      </select>
                    </label>
                  )}
                </div>
              )}
            </div>
            <button className="btn buy" disabled={units < 1} onClick={() => sell(r)}>
              Vender tudo
              <span className="cost"><span><Icon name="icon-credits" size={16} />{fmt(total)}</span></span>
            </button>
          </article>
        );
      })}
    </div>
  );
}
