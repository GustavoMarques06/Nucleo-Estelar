import { useState } from 'react';
import { useGame } from '../../game/store';
import { PERKS, perkCost } from '../../game/data/ascension';
import { canAscend, pendingAscension } from '../../game/engine/progression';
import { fmt } from '../../game/engine/format';
import { Icon } from '../Icon';

export function AscensionPanel() {
  const game = useGame(s => s.game);
  const ascend = useGame(s => s.ascend);
  const buyPerk = useGame(s => s.buyPerk);
  const [confirming, setConfirming] = useState(false);
  const gain = pendingAscension(game);
  const a = game.ascension;

  return (
    <div className="panel-body">
      <article className="card">
        <Icon name="icon-star" size={64} className="card-art" />
        <div className="card-main">
          <h3>Dados de Ascensão: {fmt(a.points)}</h3>
          <p className="desc">Recebidos ao todo: {fmt(a.total)} · Ascensões: {a.count}</p>
          <p className="desc">Ao ascender agora você recebe <b>{fmt(gain)}</b> dados (cresce com os créditos ganhos nesta jornada: {fmt(game.stats.earned)}).</p>
        </div>
      </article>

      {game.upgrades.ascensionProject ? (
        <button className="btn big primary" disabled={!canAscend(game)} onClick={() => setConfirming(true)}>
          {canAscend(game) ? `Iniciar Projeto Ascensão (+${fmt(gain)})` : 'Ganhe mais créditos para receber dados'}
        </button>
      ) : (
        <p className="hint">Pesquise <b>Projeto Ascensão</b> (fase 6) para poder recomeçar com bônus permanentes.</p>
      )}

      <h4 className="section">Melhorias permanentes</h4>
      {PERKS.map(p => {
        const level = a.perks[p.id] ?? 0;
        const maxed = p.max !== undefined && level >= p.max;
        const cost = perkCost(p, level);
        return (
          <article key={p.id} className="card">
            <Icon name={p.icon} size={48} className="card-art" />
            <div className="card-main">
              <h3>{p.name} <span className="count">nível {level}{p.max ? `/${p.max}` : ''}</span></h3>
              <p className="desc">{p.desc(level)}</p>
            </div>
            <button className="btn buy" disabled={maxed || a.points < cost} onClick={() => buyPerk(p.id)}>
              {maxed ? 'Máximo' : <>Melhorar<span className="cost"><span><Icon name="icon-star" size={16} />{cost}</span></span></>}
            </button>
          </article>
        );
      })}

      {confirming && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="asc-title">
          <div className="modal-box">
            <h2 id="asc-title">Projeto Ascensão</h2>
            <p>Você recebe <b>{fmt(gain)} Dados de Ascensão</b> e começa uma nova jornada.</p>
            <p><b className="sev-bad">Será perdido:</b> recursos, estruturas, pesquisas, colônias, locais descobertos e megaprojetos desta jornada.</p>
            <p><b className="sev-ok">Será mantido:</b> Dados de Ascensão, melhorias permanentes, catálogo de minerais, opções e estatísticas totais.</p>
            <div className="row">
              <button className="btn" onClick={() => setConfirming(false)}>Cancelar</button>
              <button className="btn primary" onClick={() => { setConfirming(false); ascend(); }}>Ascender</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
