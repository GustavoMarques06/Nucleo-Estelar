import { useGame } from '../../game/store';
import { DRONE_ROLES, droneBonus } from '../../game/data/drones';
import { droneAssigned, droneFree, droneTotal, dronesUnlocked } from '../../game/engine/drones';
import { getModifiers } from '../../game/engine/modifiers';
import { fmt } from '../../game/engine/format';
import { Icon } from '../Icon';
import { t } from '../../i18n';

/** Frota de drones: o Hangar (aba Logística) monta, aqui se designa cada drone a uma função. */
export function DronesSection() {
  const game = useGame(s => s.game);
  const assign = useGame(s => s.assignDrones);
  if (!dronesUnlocked(game)) return null;
  const m = getModifiers(game);
  const total = droneTotal(game), free = droneFree(game);
  return (
    <>
      <h4 className="section">{t('Frota de drones')}</h4>
      <p className="hint">
        {t('{a} drones · {b} em serviço ·', { a: fmt(total), b: fmt(droneAssigned(game)) })} <b className={free > 0 ? 'sev-ok' : ''}>{t('{n} livres', { n: fmt(free) })}</b>.
        {game.buildings.maintenance === 0 && ' ' + t('Construa um Hangar de drones para produzi-los.')}
        {' '}{t('Cada função liga uma automação com o primeiro drone e ganha bônus com retornos decrescentes.')}
      </p>
      {DRONE_ROLES.map(r => {
        const n = game.drones[r.id] ?? 0;
        const now = droneBonus(r, n, m.droneBoost), next = droneBonus(r, n + 10, m.droneBoost);
        return (
          <article key={r.id} className="card drone-role">
            <Icon name={r.icon} size={56} className="card-art" />
            <div className="card-main">
              <h3>{t(r.name)} <span className="count">×{fmt(n)}</span></h3>
              <p className="desc">{t(r.desc)}</p>
              <ul className="stats">
                {r.auto !== '—' && <li className={n > 0 ? 'sev-ok' : 'dim'}>{t(r.auto)}{n > 0 ? ' ' + t('(ativo)') : ' ' + t('(com 1 drone)')}</li>}
                <li>{t(r.bonus)}: +{Math.round(now * 100)}% <span className="dim">{t('(+10 drones → +{a}%, máx. +{b}%)', { a: Math.round(next * 100), b: Math.round(r.max * m.droneBoost * 100) })}</span></li>
              </ul>
            </div>
            <div className="drone-ctl">
              <button className="btn small" disabled={n < 1} onClick={() => assign(r.id, -10)}>−10</button>
              <button className="btn small" disabled={n < 1} onClick={() => assign(r.id, -1)}>−1</button>
              <button className="btn small" disabled={free < 1} onClick={() => assign(r.id, 1)}>+1</button>
              <button className="btn small" disabled={free < 1} onClick={() => assign(r.id, 10)}>+10</button>
              <button className="btn small" disabled={free < 1} onClick={() => assign(r.id, free)}>{t('Todos')}</button>
            </div>
          </article>
        );
      })}
    </>
  );
}
