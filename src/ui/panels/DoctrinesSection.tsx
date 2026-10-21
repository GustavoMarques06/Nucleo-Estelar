import { useState } from 'react';
import { useGame } from '../../game/store';
import { DOCTRINE_AXES, DOCTRINE_BY_ID } from '../../game/data/doctrines';
import { Icon } from '../Icon';
import { t } from '../../i18n';

/** Doutrinas: três escolhas de rumo por jornada (aba Pesquisa). */
export function DoctrinesSection() {
  const game = useGame(s => s.game);
  const choose = useGame(s => s.chooseDoctrine);
  const [pending, setPending] = useState<string | null>(null);
  const open = DOCTRINE_AXES.filter(a => a.unlock(game));
  const nextLocked = DOCTRINE_AXES.find(a => !a.unlock(game));
  if (!open.length) return null;
  return (
    <>
      <h4 className="section">{t('Doutrinas')}</h4>
      <p className="hint">{t('Em três pontos da jornada você escolhe um rumo, com um ganho e um preço. A escolha vale até a próxima Ascensão e não pode ser trocada antes.')}</p>
      {open.map(axis => {
        const chosen = game.doctrines[axis.id] ? DOCTRINE_BY_ID[game.doctrines[axis.id]] : null;
        return (
          <div key={axis.id} className="phase-group doctrine-axis">
            <h4 className="section sub">{t(axis.name)} · {t(axis.desc)}</h4>
            {chosen ? (
              <article className="card doctrine on">
                <Icon name={chosen.icon} size={48} className="card-art" />
                <div className="card-main">
                  <h3>{t(chosen.name)} <span className="count ok">{t('adotada')}</span></h3>
                  <p className="desc">{t(chosen.desc)}</p>
                </div>
              </article>
            ) : axis.options.map(o => (
              <article key={o.id} className={`card doctrine ${pending === o.id ? 'spot' : ''}`}>
                <Icon name={o.icon} size={48} className="card-art" />
                <div className="card-main">
                  <h3>{t(o.name)}</h3>
                  <p className="desc">{t(o.desc)}</p>
                </div>
                <button className="btn buy" onClick={() => { if (pending === o.id) { choose(axis.id, o.id); setPending(null); } else setPending(o.id); }}>
                  {pending === o.id ? t('Confirmar') : t('Adotar')}
                </button>
              </article>
            ))}
            {!chosen && pending && axis.options.some(o => o.id === pending) && <p className="status sev-warn">{t('Toque em Confirmar para adotar. Não dá para trocar antes da Ascensão.')}</p>}
          </div>
        );
      })}
      {nextLocked && <p className="hint upcoming"><b>{t(nextLocked.name)}</b>: {t(nextLocked.requiresText)}</p>}
    </>
  );
}
