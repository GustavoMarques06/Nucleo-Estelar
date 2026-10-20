import { useState } from 'react';
import { useGame } from '../../game/store';
import { STAR_PERKS, starPerkCost } from '../../game/data/transcendence';
import { canTranscend, endingReached, pendingSeeds } from '../../game/engine/progression';
import { fmt } from '../../game/engine/format';
import { Icon } from '../Icon';
import { Tx } from '../../i18n/Tx';
import { t } from '../../i18n';

/** Segunda camada de recomeço, liberada ao concluir a Singularidade. */
export function TranscendencePanel() {
  const game = useGame(s => s.game);
  const transcend = useGame(s => s.transcend);
  const buyPerk = useGame(s => s.buyStarPerk);
  const [confirming, setConfirming] = useState(false);
  const tr = game.transcendence;
  const gain = pendingSeeds(game);

  if (!endingReached(game)) {
    return (
      <div className="panel-body">
        <p className="hint">
          <Tx k="A Transcendência é o verdadeiro fim: complete a <b>Singularidade</b> (aba Megaprojetos, liberada depois do estágio 5 do Núcleo Estelar) para liberá-la." />
        </p>
      </div>
    );
  }

  return (
    <div className="panel-body">
      <article className="card">
        <Icon name="star-white-dwarf" size={64} className="card-art" />
        <div className="card-main">
          <h3>{t('Sementes Estelares: {n}', { n: fmt(tr.seeds) })}</h3>
          <p className="desc">{t('Recebidas ao todo: {a} · Transcendências: {b}', { a: fmt(tr.total), b: tr.count })}</p>
          <p className="desc">
            <Tx k="Ao transcender agora você recebe <b>{n}</b> sementes (cresce com os Dados de Ascensão acumulados, o Núcleo Estelar e a Singularidade)." v={{ n: fmt(gain) }} />
          </p>
        </div>
      </article>
      <button className="btn big primary" disabled={!canTranscend(game)} onClick={() => setConfirming(true)}>
        {canTranscend(game) ? t('Transcender (+{n})', { n: fmt(gain) }) : t('Acumule mais Dados de Ascensão para receber sementes')}
      </button>

      <h4 className="section">{t('Melhorias da Transcendência')}</h4>
      {STAR_PERKS.map(p => {
        const level = tr.perks[p.id] ?? 0;
        const maxed = p.max !== undefined && level >= p.max;
        const cost = starPerkCost(p, level);
        return (
          <article key={p.id} className="card">
            <Icon name={p.icon} size={48} className="card-art" />
            <div className="card-main">
              <h3>{t(p.name)} <span className="count">{t('nível {n}', { n: level })}{p.max ? `/${p.max}` : ''}</span></h3>
              <p className="desc">{p.desc(level)}</p>
            </div>
            <button className="btn buy" disabled={maxed || tr.seeds < cost} onClick={() => buyPerk(p.id)}>
              {maxed ? t('Máximo') : <>{t('Melhorar')}<span className="cost"><span><Icon name="star-white-dwarf" size={16} />{cost}</span></span></>}
            </button>
          </article>
        );
      })}

      {confirming && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="tr-title">
          <div className="modal-box">
            <h2 id="tr-title">{t('Transcendência')}</h2>
            <p><Tx k="Você recebe <b>{n} Sementes Estelares</b> e uma nova era começa." v={{ n: fmt(gain) }} /></p>
            <p><b className="sev-bad">{t('Será perdido:')}</b> <Tx k="tudo desta jornada <i>e também</i> os Dados de Ascensão e as melhorias da Ascensão." /></p>
            <p><b className="sev-ok">{t('Será mantido:')}</b> {t('Sementes Estelares e suas melhorias, conquistas, catálogo de minerais, dicas e opções.')}</p>
            <div className="row">
              <button className="btn" onClick={() => setConfirming(false)}>{t('Cancelar')}</button>
              <button className="btn primary" onClick={() => { setConfirming(false); transcend(); }}>{t('Transcender')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
