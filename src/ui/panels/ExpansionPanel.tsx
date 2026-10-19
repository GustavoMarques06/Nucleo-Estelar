import type { Amounts, ResId } from '../../game/types';
import { useGame } from '../../game/store';
import { getModifiers } from '../../game/engine/modifiers';
import { canLaunch, expeditionCost, expeditionDuration, expeditionsUnlocked, outpostYield, unsettled } from '../../game/engine/expansion';
import { fmtDuration } from '../../game/engine/format';
import { Icon } from '../Icon';
import { BuildingList, BuyAmountPicker, CostList } from './BuildingsPanel';
import { Yields } from './LocationCard';

/** Expedições e estruturas espaciais. Os locais descobertos e as colônias ficam na aba Mapa. */
export function ExpansionPanel() {
  const game = useGame(s => s.game);
  const launch = useGame(s => s.launchExpedition);
  const buildings = <><BuyAmountPicker /><BuildingList category="expansion" title="Estruturas espaciais" /></>;
  if (!expeditionsUnlocked(game)) {
    return (
      <div className="panel-body">
        {buildings}
        <p className="hint">Pesquise <b>Exploração estelar</b> para enviar expedições a outros mundos.</p>
      </div>
    );
  }
  const m = getModifiers(game);
  const can = canLaunch(game);
  const cost = expeditionCost(game, m);
  const colonies = game.locations.filter(l => l.outpost);
  const total: Amounts = {};
  for (const l of colonies) for (const [r, v] of Object.entries(outpostYield(l, m, game))) total[r as ResId] = (total[r as ResId] ?? 0) + (v ?? 0);

  return (
    <div className="panel-body">
      {buildings}
      <h4 className="section">Exploração</h4>
      <article className="card">
        <Icon name="ship-explorer" size={72} className="card-art" />
        <div className="card-main">
          <h3>Expedição</h3>
          <p className="desc">Envia uma nave para descobrir um novo local. Duração: {fmtDuration(expeditionDuration(game, m) / m.expeditionSpeed)}.</p>
          {!can.ok && can.reason && <p className="status sev-warn">{can.reason}</p>}
          {(game.drones.scout ?? 0) > 0 && (
            <p className="hint">Batedores ativos: exploram sozinhos enquanto houver menos de 3 locais sem colônia ({unsettled(game)} agora).</p>
          )}
        </div>
        <button className="btn buy" disabled={!can.ok} onClick={launch}>
          Lançar <CostList cost={cost} have={game.resources} />
        </button>
      </article>
      {game.expeditions.map(e => (
        <div key={e.id} className="expedition">
          <span>Expedição em viagem — {fmtDuration(Math.max(0, e.remaining) / m.expeditionSpeed)}</span>
          <div className="bar"><div style={{ width: `${(1 - Math.max(0, e.remaining) / e.total) * 100}%` }} /></div>
        </div>
      ))}
      {colonies.length > 0 && <p className="hint">Produção total das colônias: <Yields y={total} /></p>}
      <p className="hint">{game.locations.length} locais descobertos · {colonies.length} colônias. Veja e gerencie todos na aba <b>Mapa</b>.</p>
    </div>
  );
}
