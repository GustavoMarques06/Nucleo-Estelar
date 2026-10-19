import { useState } from 'react';
import { useGame } from '../../game/store';
import { STAR_PERKS, starPerkCost } from '../../game/data/transcendence';
import { canTranscend, endingReached, pendingSeeds } from '../../game/engine/progression';
import { fmt } from '../../game/engine/format';
import { Icon } from '../Icon';

/** Segunda camada de recomeço, liberada ao concluir a Singularidade. */
export function TranscendencePanel() {
  const game = useGame(s => s.game);
  const transcend = useGame(s => s.transcend);
  const buyPerk = useGame(s => s.buyStarPerk);
  const [confirming, setConfirming] = useState(false);
  const t = game.transcendence;
  const gain = pendingSeeds(game);

  if (!endingReached(game)) {
    return (
      <div className="panel-body">
        <p className="hint">
          A Transcendência é o verdadeiro fim: complete a <b>Singularidade</b> (aba Megaprojetos, liberada depois do estágio 5 do Núcleo Estelar)
          para liberá-la.
        </p>
      </div>
    );
  }

  return (
    <div className="panel-body">
      <article className="card">
        <Icon name="star-white-dwarf" size={64} className="card-art" />
        <div className="card-main">
          <h3>Sementes Estelares: {fmt(t.seeds)}</h3>
          <p className="desc">Recebidas ao todo: {fmt(t.total)} · Transcendências: {t.count}</p>
          <p className="desc">
            Ao transcender agora você recebe <b>{fmt(gain)}</b> sementes (cresce com os Dados de Ascensão acumulados, o Núcleo Estelar e a Singularidade).
          </p>
        </div>
      </article>
      <button className="btn big primary" disabled={!canTranscend(game)} onClick={() => setConfirming(true)}>
        {canTranscend(game) ? `Transcender (+${fmt(gain)})` : 'Acumule mais Dados de Ascensão para receber sementes'}
      </button>

      <h4 className="section">Melhorias da Transcendência</h4>
      {STAR_PERKS.map(p => {
        const level = t.perks[p.id] ?? 0;
        const maxed = p.max !== undefined && level >= p.max;
        const cost = starPerkCost(p, level);
        return (
          <article key={p.id} className="card">
            <Icon name={p.icon} size={48} className="card-art" />
            <div className="card-main">
              <h3>{p.name} <span className="count">nível {level}{p.max ? `/${p.max}` : ''}</span></h3>
              <p className="desc">{p.desc(level)}</p>
            </div>
            <button className="btn buy" disabled={maxed || t.seeds < cost} onClick={() => buyPerk(p.id)}>
              {maxed ? 'Máximo' : <>Melhorar<span className="cost"><span><Icon name="star-white-dwarf" size={16} />{cost}</span></span></>}
            </button>
          </article>
        );
      })}

      {confirming && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="tr-title">
          <div className="modal-box">
            <h2 id="tr-title">Transcendência</h2>
            <p>Você recebe <b>{fmt(gain)} Sementes Estelares</b> e uma nova era começa.</p>
            <p><b className="sev-bad">Será perdido:</b> tudo desta jornada <i>e também</i> os Dados de Ascensão e as melhorias da Ascensão.</p>
            <p><b className="sev-ok">Será mantido:</b> Sementes Estelares e suas melhorias, conquistas, catálogo de minerais, dicas e opções.</p>
            <div className="row">
              <button className="btn" onClick={() => setConfirming(false)}>Cancelar</button>
              <button className="btn primary" onClick={() => { setConfirming(false); transcend(); }}>Transcender</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
