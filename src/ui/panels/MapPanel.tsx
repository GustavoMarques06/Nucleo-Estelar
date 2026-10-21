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
import { t, tp } from '../../i18n';

/** Detalhes do local selecionado no mapa e lista de todos os locais. O mapa em si abre numa janela flutuante. */
export function MapPanel({ onOpenMap }: { onOpenMap: () => void }) {
  const game = useGame(s => s.game);
  const selected = useGame(s => s.selectedLoc);
  const select = useGame(s => s.selectLoc);
  const m = getModifiers(game);
  const loc = game.locations.find(l => l.id === selected) ?? null;
  const colonies = game.locations.filter(l => l.outpost);
  const total: Amounts = {};
  for (const l of colonies) for (const [r, v] of Object.entries(outpostYield(l, m, game))) total[r as ResId] = (total[r as ResId] ?? 0) + (v ?? 0);

  const openMap = <button className="btn primary big map-open" onClick={onOpenMap}><Icon name="nav-map" size={24} /> {t('Abrir mapa estelar')}</button>;
  // Planeta escolhido no mapa: o painel mostra só ele. A visão geral e a lista voltam quando nada está selecionado.
  if (loc) return <div className="panel-body">{openMap}<LocationCard loc={loc} /></div>;

  return (
    <div className="panel-body">
      {openMap}
      <p className="hint">
        {t('{a} locais · {b} colônias · {c} reivindicados · {d}.', { a: game.locations.length, b: colonies.length, c: game.locations.filter(l => l.claimedBy && !l.outpost).length, d: tp(game.routes.length, '{n} rota', '{n} rotas') })}
        {' '}{t('Escolha um local no mapa para fundar, ampliar ou terraformar.')}
      </p>
      {game.crises.length > 0 && (
        <div className="crisis-list">
          {game.crises.map(c => {
            const l = game.locations.find(x => x.id === c.locId);
            return (
              <button key={c.id} className="crisis-chip" onClick={() => select(c.locId)}>
                <Icon name={CRISIS_BY_KIND[c.kind].icon} size={24} />
                <b>{t(CRISIS_BY_KIND[c.kind].name)}</b> {t('em')} {l?.name ?? '?'} · {fmtDuration(c.remaining)}
              </button>
            );
          })}
        </div>
      )}
      {colonies.length > 0 && <p className="hint">{t('Produção das colônias:')} <Yields y={total} /></p>}
      {game.locations.length > 0 && <p className="hint">{t('Nenhum local selecionado.')}</p>}
      {game.locations.length > 0 && (
        <>
          <h4 className="section">{t('Todos os locais')}</h4>
          <div className="loc-list">
            {game.locations.slice().reverse().map(l => {
              const claim = l.claimedBy ? FACTION_BY_ID[l.claimedBy] : null;
              return (
                <button key={l.id} className={`loc-row ${selected === l.id ? 'sel' : ''}`} onClick={() => select(l.id)}>
                  <Icon name={locationSprite(l)} size={28} />
                  <span className="loc-row-name">{l.name}</span>
                  <small>{t(LOCATION_BY_TYPE[l.type].name)}</small>
                  {claim && !l.outpost && <i className="faction-dot" style={{ background: claim.color }} title={t(claim.name)} />}
                  {isDisputed(game, l) && <small className="sev-warn">{t('disputa')}</small>}
                  {l.outpost && <b className="count">{t('nv')} {l.outpost.level}{l.outpost.terra > 0 ? ` · ★${l.outpost.terra}` : ''}</b>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
