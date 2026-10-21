import { useEffect, useState } from 'react';
import { useGame } from '../game/store';
import { FACTION_BY_ID } from '../game/data/factions';
import { isDisputed, locationSprite } from '../game/engine/expansion';
import { getModifiers } from '../game/engine/modifiers';
import { fmtDuration } from '../game/engine/format';
import { crisisOf } from '../game/engine/crises';
import { routeInfo } from '../game/engine/routes';
import { digOf, digsUnlocked, hasAnomaly } from '../game/engine/digs';
import { artUrl } from '../assets';
import { SECTOR_SIZE, nodePosition, sectorBackground, sectorCount, sectorName, sectorOf } from './mapLayout';
import { Icon } from './Icon';
import { t } from '../i18n';

/** Mapa estelar: sobrepõe a cena central quando a aba Mapa está aberta. */
export function MapView() {
  const game = useGame(s => s.game);
  const selected = useGame(s => s.selectedLoc);
  const select = useGame(s => s.selectLoc);
  const m = getModifiers(game);
  const total = game.locations.length + game.expeditions.length;
  const sectors = sectorCount(total);
  const selIndex = game.locations.findIndex(l => l.id === selected);
  const [sector, setSector] = useState(() => (selIndex >= 0 ? sectorOf(selIndex) : sectors - 1));
  // Selecionar um local (pela lista) leva o mapa ao setor dele.
  useEffect(() => { if (selIndex >= 0) setSector(sectorOf(selIndex)); }, [selIndex]);
  const cur = Math.min(sector, sectors - 1);

  const locs = game.locations.map((l, i) => ({ l, i })).filter(x => sectorOf(x.i) === cur);
  const pending = game.expeditions.map((e, k) => ({ e, i: game.locations.length + k })).filter(x => sectorOf(x.i) === cur);
  const colonies = locs.filter(x => x.l.outpost);

  return (
    <div className="map-view" role="region" aria-label={t('Mapa estelar')}>
      <div className="map-bg" style={{ backgroundImage: `url(${artUrl(sectorBackground(cur))})` }} />
      <svg className="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {colonies.map(({ l, i }) => {
          const p = nodePosition(i);
          return <line key={l.id} x1="50" y1="50" x2={p.x} y2={p.y} className={l.outpost && l.outpost.terra >= 5 ? 'line-garden' : ''} />;
        })}
      </svg>

      <svg className="map-lines routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {game.routes.map(r => {
          const ia = game.locations.findIndex(l => l.id === r.a), ib = game.locations.findIndex(l => l.id === r.b);
          if (ia < 0 || ib < 0 || sectorOf(ia) !== cur || sectorOf(ib) !== cur) return null;
          const pa = nodePosition(ia), pb = nodePosition(ib);
          const la = game.locations[ia], lb = game.locations[ib];
          const good = routeInfo(game, la).supplied || routeInfo(game, lb).supplied;
          return <line key={r.id} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} className={good ? 'route-good' : 'route-idle'} />;
        })}
      </svg>
      {/* Rotas cuja outra ponta está em outro setor: um rótulo clicável leva até lá. */}
      {game.routes.flatMap(r => {
        const ia = game.locations.findIndex(l => l.id === r.a), ib = game.locations.findIndex(l => l.id === r.b);
        if (ia < 0 || ib < 0 || sectorOf(ia) === sectorOf(ib)) return [];
        const [near, far] = sectorOf(ia) === cur ? [ia, ib] : sectorOf(ib) === cur ? [ib, ia] : [-1, -1];
        if (near < 0) return [];
        const p = nodePosition(near);
        const dx = p.x - 50, dy = p.y - 50, len = Math.hypot(dx, dy) || 1;
        const x = Math.min(94, Math.max(6, p.x + (dx / len) * 9)), y = Math.min(90, Math.max(8, p.y + (dy / len) * 9));
        return [(
          <button key={r.id} className="route-stub" style={{ left: `${x}%`, top: `${y}%` }} onClick={() => select(game.locations[far].id)}
            title={t('Rota para {nome} ({setor})', { nome: game.locations[far].name, setor: sectorName(sectorOf(far)) })}>
            → {game.locations[far].name}
          </button>
        )];
      })}
      <div className="map-home" title={t('Sua base')}><Icon name="asteroid-main-big" size={64} /><span>{t('Base')}</span></div>

      {locs.map(({ l, i }) => {
        const p = nodePosition(i);
        const claim = l.claimedBy ? FACTION_BY_ID[l.claimedBy] : null;
        const crisis = crisisOf(game, l.id);
        const cls = ['map-node', crisis ? 'crisis' : '', l.outpost ? 'colony' : '', selected === l.id ? 'sel' : '', isDisputed(game, l) ? 'disputed' : '',
          (l.outpost?.terra ?? 0) > 0 ? 'terra' : '', (l.outpost?.terraRemaining ?? 0) > 0 ? 'working' : ''].join(' ');
        return (
          <button key={l.id} className={cls} style={{ left: `${p.x}%`, top: `${p.y}%`, ['--faction' as string]: claim?.color ?? 'transparent' }}
            onClick={() => select(l.id)} title={`${l.name}${claim ? ` · ${t('reivindicado: {nome}', { nome: t(claim.name) })}` : ''}`}>
            <Icon name={locationSprite(l)} size={44} />
            <span className="map-label">{l.name}</span>
            {l.outpost && <span className="map-badge">{l.outpost.level}</span>}
            {crisis && <span className="map-alert" aria-label={t('crise ativa')}>!</span>}
            {digsUnlocked(game) && hasAnomaly(l) && !game.dug.includes(l.id) && (
              <span className={`map-site ${(digOf(game, l.id)?.remaining ?? 0) > 0 ? 'working' : ''}`} title={t('Sítio de anomalia')} aria-label={t('Sítio de anomalia')}>✦</span>
            )}
          </button>
        );
      })}

      {pending.map(({ e, i }) => {
        const p = nodePosition(i);
        return (
          <div key={e.id} className="map-node pending" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <span className="map-q">?</span>
            <span className="map-label">{fmtDuration(Math.max(0, e.remaining) / m.expeditionSpeed)}</span>
          </div>
        );
      })}

      <div className="map-pager">
        <button className="btn small" disabled={cur <= 0} onClick={() => setSector(cur - 1)} aria-label={t('Setor anterior')}>◀</button>
        <span>{sectorName(cur)} · {cur + 1}/{sectors}</span>
        <button className="btn small" disabled={cur >= sectors - 1} onClick={() => setSector(cur + 1)} aria-label={t('Próximo setor')}>▶</button>
      </div>
      <div className="map-legend">
        <span><i className="lg colony" />{t('Colônia')}</span>
        <span><i className="lg free" />{t('Livre')}</span>
        <span><i className="lg claim" />{t('Reivindicado')}</span>
        <span><i className="lg garden" />{t('Terraformado')}</span>
        <span><i className="lg route" />{t('Rota')}</span>
        <span><i className="lg alert" />{t('Crise')}</span>
        {digsUnlocked(game) && <span><i className="lg site">✦</i>{t('Sítio de anomalia')}</span>}
      </div>
      {total === 0 && <p className="map-empty">{t('Nenhum local descoberto ainda. Lance uma expedição na aba Expansão.')}</p>}
      <small className="map-cap">{t('{n} locais por setor', { n: SECTOR_SIZE })}</small>
    </div>
  );
}
