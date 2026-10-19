import type { Amounts, ResId } from '../../game/types';
import { useGame } from '../../game/store';
import { FACTION_BY_ID } from '../../game/data/factions';
import { LOCATION_BY_TYPE } from '../../game/data/locations';
import { getModifiers } from '../../game/engine/modifiers';
import { isDisputed, locationSprite, outpostYield } from '../../game/engine/expansion';
import { Icon } from '../Icon';
import { CRISIS_BY_KIND } from '../../game/data/crises';
import { fmtDuration } from '../../game/engine/format';
import { LocationCard, Yields } from './LocationCard';

/** Detalhes do local selecionado no mapa e lista de todos os locais. */
export function MapPanel() {
  const game = useGame(s => s.game);
  const selected = useGame(s => s.selectedLoc);
  const select = useGame(s => s.selectLoc);
  const m = getModifiers(game);
  const loc = game.locations.find(l => l.id === selected) ?? null;
  const colonies = game.locations.filter(l => l.outpost);
  const total: Amounts = {};
  for (const l of colonies) for (const [r, v] of Object.entries(outpostYield(l, m, game))) total[r as ResId] = (total[r as ResId] ?? 0) + (v ?? 0);

  return (
    <div className="panel-body">
      <p className="hint">
        {game.locations.length} locais · {colonies.length} colônias · {game.locations.filter(l => l.claimedBy && !l.outpost).length} reivindicados · {game.routes.length} {game.routes.length === 1 ? 'rota' : 'rotas'}.
        Escolha um local no mapa para fundar, ampliar ou terraformar.
      </p>
      {game.crises.length > 0 && (
        <div className="crisis-list">
          {game.crises.map(c => {
            const l = game.locations.find(x => x.id === c.locId);
            return (
              <button key={c.id} className="crisis-chip" onClick={() => select(c.locId)}>
                <Icon name={CRISIS_BY_KIND[c.kind].icon} size={24} />
                <b>{CRISIS_BY_KIND[c.kind].name}</b> em {l?.name ?? '?'} · {fmtDuration(c.remaining)}
              </button>
            );
          })}
        </div>
      )}
      {colonies.length > 0 && <p className="hint">Produção das colônias: <Yields y={total} /></p>}
      {loc ? <LocationCard loc={loc} /> : game.locations.length > 0 && <p className="hint">Nenhum local selecionado.</p>}
      {game.locations.length > 0 && (
        <>
          <h4 className="section">Todos os locais</h4>
          <div className="loc-list">
            {game.locations.slice().reverse().map(l => {
              const claim = l.claimedBy ? FACTION_BY_ID[l.claimedBy] : null;
              return (
                <button key={l.id} className={`loc-row ${selected === l.id ? 'sel' : ''}`} onClick={() => select(l.id)}>
                  <Icon name={locationSprite(l)} size={28} />
                  <span className="loc-row-name">{l.name}</span>
                  <small>{LOCATION_BY_TYPE[l.type].name}</small>
                  {claim && !l.outpost && <i className="faction-dot" style={{ background: claim.color }} title={claim.name} />}
                  {isDisputed(game, l) && <small className="sev-warn">disputa</small>}
                  {l.outpost && <b className="count">nv {l.outpost.level}{l.outpost.terra > 0 ? ` · ★${l.outpost.terra}` : ''}</b>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
