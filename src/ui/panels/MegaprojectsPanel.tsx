import type { ResId } from '../../game/types';
import { useGame } from '../../game/store';
import { MEGAPROJECTS, type MegaprojectDef } from '../../game/data/megaprojects';
import { RESOURCES } from '../../game/data/resources';
import { megaAvailable, megaRemaining, megaprojectsUnlocked, nextMegaStage } from '../../game/engine/progression';
import { fmt } from '../../game/engine/format';
import { Icon } from '../Icon';
import { Tx } from '../../i18n/Tx';
import { t } from '../../i18n';

function MegaCard({ mp }: { mp: MegaprojectDef }) {
  const game = useGame(s => s.game);
  const build = useGame(s => s.buildMega);
  const done = game.megaprojects[mp.id] ?? 0;
  const next = nextMegaStage(game, mp.id);
  const left = megaRemaining(game, mp.id);
  const available = megaAvailable(game, mp.id);
  const canGive = available && Object.entries(left).some(([r]) => game.resources[r as ResId] >= 1);
  const total = mp.endless ? '∞' : mp.stages.length;
  const sprite = next?.sprite ?? mp.stages[mp.stages.length - 1]?.sprite ?? 'star-yellow';

  return (
    <article className={`card mega ${done === 0 ? 'not-built' : ''} ${mp.endless ? 'endless' : ''}`}>
      <Icon name={sprite} size={96} className="card-art" />
      <div className="card-main">
        <h3>{t(mp.name)} <span className="count">{done}/{total}</span></h3>
        <p className="desc">{t(mp.desc)}</p>
        {mp.endless ? (
          <ul className="stats">
            {done > 0 && <li className="sev-ok">✓ {t('{n} estágio(s): produção e energia ×{m}', { n: done, m: fmt(Math.pow(1.2, done)) })}</li>}
            {next && <li>{t(next.desc)}</li>}
          </ul>
        ) : (
          <ul className="stats">
            {mp.stages.map((st, i) => <li key={i} className={i < done ? 'sev-ok' : i === done ? '' : 'dim'}>{i < done ? '✓ ' : ''}{t(st.desc)}</li>)}
          </ul>
        )}
        {!available && mp.requiresText && <p className="status sev-warn">{t(mp.requiresText)}</p>}
        {next && available && (
          <div className="mega-progress">
            {(Object.entries(next.cost) as [ResId, number][]).map(([r, tot]) => {
              const got = tot - (left[r] ?? 0);
              return (
                <div key={r} className="mega-res" title={t(RESOURCES[r].name)}>
                  <Icon name={RESOURCES[r].icon} size={18} />
                  <div className="bar"><div style={{ width: `${(got / tot) * 100}%` }} /></div>
                  <small>{fmt(got)} / {fmt(tot)}</small>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {next ? (
        <button className="btn buy" disabled={!canGive} onClick={() => build(mp.id)}>
          {t('Contribuir para o estágio {n}', { n: done + 1 })}
        </button>
      ) : <span className="status sev-ok">{t('Concluído')}</span>}
    </article>
  );
}

export function MegaprojectsPanel() {
  const game = useGame(s => s.game);
  if (!megaprojectsUnlocked(game)) {
    return <div className="panel-body"><p className="hint"><Tx k="Pesquise <b>Engenharia de megaestruturas</b> para liberar os megaprojetos." /></p></div>;
  }
  return (
    <div className="panel-body">
      <p className="hint">
        <Tx k="Obras colossais com bônus permanentes nesta jornada. Os materiais são entregues aos poucos: cada contribuição envia o que houver em estoque. O <b>Núcleo Estelar</b> nunca termina." />
      </p>
      {MEGAPROJECTS.map(mp => <MegaCard key={mp.id} mp={mp} />)}
    </div>
  );
}
