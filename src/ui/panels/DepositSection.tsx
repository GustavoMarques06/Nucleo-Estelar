import { useGame } from '../../game/store';
import { RESOURCES } from '../../game/data/resources';
import { VEIN_KIND_BY_ID } from '../../game/data/deposit';
import { getModifiers } from '../../game/engine/modifiers';
import { activeMix, activeVein, autoDepositUnlocked, canProspect, extractionRate, prospectCost, prospectingUnlocked } from '../../game/engine/deposit';
import { fmt, fmtDuration } from '../../game/engine/format';
import { Icon } from '../Icon';
import { CostList } from './BuildingsPanel';
import type { Amounts, ResId, Vein } from '../../game/types';

function Mix({ mix }: { mix: Amounts }) {
  const parts = (Object.entries(mix) as [ResId, number][]).sort((a, b) => b[1] - a[1]);
  return (
    <span className="mix">
      {parts.map(([r, v]) => <span key={r} title={RESOURCES[r].name}><Icon name={RESOURCES[r].icon} size={16} />{Math.round(v * 100)}%</span>)}
    </span>
  );
}

function VeinCard({ v, focused }: { v: Vein; focused: boolean }) {
  const game = useGame(s => s.game);
  const setFocus = useGame(s => s.setFocus);
  const m = getModifiers(game);
  const kind = VEIN_KIND_BY_ID[v.kind];
  const spent = v.reserve <= 0;
  const pct = (v.reserve / v.total) * 100;
  const rate = extractionRate(game, m) * v.yield;
  return (
    <article className={`card vein ${focused ? 'on' : ''} ${spent ? 'spent' : ''}`}>
      <Icon name={kind?.icon ?? 'ore-iron'} size={48} className="card-art" />
      <div className="card-main">
        <h3>{v.name} {focused && <span className="count ok">em foco</span>}{spent && <span className="count">esgotado</span>}</h3>
        <p className="desc">{kind?.desc}</p>
        <Mix mix={v.mix} />
        <div className="bar" title={`${fmt(v.reserve)} de ${fmt(v.total)} unidades`}><div style={{ width: `${pct}%` }} /></div>
        <small className="desc">
          Rende ×{v.yield.toFixed(1)}
          {!spent && rate > 0 && <> · dura cerca de {fmtDuration(v.reserve / rate)} no ritmo atual</>}
        </small>
      </div>
      {!spent && !focused && <button className="btn buy" onClick={() => setFocus(v.id)}>Perfurar aqui</button>}
    </article>
  );
}

/** A jazida do asteroide: crosta infinita e veios que se esgotam, com prospecção para achar novos. */
export function DepositSection() {
  const game = useGame(s => s.game);
  const prospect = useGame(s => s.prospect);
  const setFocus = useGame(s => s.setFocus);
  const setAuto = useGame(s => s.setAutoDeposit);
  if (!prospectingUnlocked(game)) return null;
  const m = getModifiers(game);
  const mix = activeMix(game, m);
  const vein = activeVein(game);
  const can = canProspect(game);
  const cost: Amounts = prospectCost(game, m);
  const veins = game.deposit.veins;
  return (
    <div className="deposit">
      <h4 className="section">Jazida</h4>
      <p className="hint">
        A <b>crosta</b> do asteroide é infinita, mas rende pouco. <b>Veios</b> rendem mais e trazem minérios novos, porém se esgotam
        (cada um dura cerca de 15 minutos de extração). Prospecte para encontrar veios e escolha de qual perfurar; esgotado, a extração volta à crosta.
      </p>
      <article className={`card vein ${vein ? '' : 'on'}`}>
        <Icon name="asteroid-main" size={48} className="card-art" />
        <div className="card-main">
          <h3>Crosta {!vein && <span className="count ok">em foco</span>}</h3>
          <p className="desc">Infinita. Ferro, cobre e um pouco de ouro.</p>
          <Mix mix={mix.veinId ? { iron: 0.68, copper: 0.3, gold: 0.02 } : mix.shares} />
        </div>
        {vein && <button className="btn buy" onClick={() => setFocus('crust')}>Perfurar a crosta</button>}
      </article>
      {veins.map(v => <VeinCard key={v.id} v={v} focused={v.id === mix.veinId} />)}
      <div className="prospect-row">
        <button className="btn buy" disabled={!can.ok} onClick={() => prospect()} title={can.reason}>
          Prospectar veio <CostList cost={cost} have={game.resources} />
        </button>
        {autoDepositUnlocked(game) && (
          <label className="toggle" title="Escolhe o melhor veio e prospecta sozinho quando o último acaba (precisa de créditos de sobra).">
            <input type="checkbox" checked={game.deposit.auto} onChange={e => setAuto(e.target.checked)} />
            Sondas autônomas
          </label>
        )}
      </div>
      {!can.ok && can.reason && <p className="status sev-warn">{can.reason}</p>}
    </div>
  );
}
