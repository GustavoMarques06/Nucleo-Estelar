import { useGame } from '../../game/store';
import { BALANCE } from '../../game/data/balance';
import { getModifiers, housingCap, workforce } from '../../game/engine/modifiers';
import { fmt, fmtRate } from '../../game/engine/format';
import { Icon } from '../Icon';
import { BuildingList, BuyAmountPicker } from './BuildingsPanel';
import { t } from '../../i18n';

const STATUS: Record<string, [string, string]> = {
  none: ['Sem colonos ainda', ''],
  growing: ['Crescendo', 'sev-ok'],
  stable: ['Estável', 'sev-ok'],
  housing: ['Moradia lotada', 'sev-warn'],
  starving: ['Fome: a população está diminuindo', 'sev-bad'],
};

export function CivilizationPanel() {
  const game = useGame(s => s.game);
  const report = useGame(s => s.report);
  const rates = useGame(s => s.rates);
  const m = getModifiers(game);
  const pop = game.resources.population;
  const cap = housingCap(game, m);
  const work = workforce(game);
  const [label0, cls] = STATUS[report?.population.status ?? 'none'];
  const label = t(label0);
  const taxes = pop * BALANCE.taxPerPerson * m.tax * m.outputAll;

  return (
    <div className="panel-body">
      {game.upgrades.habitats && (
        <>
          <article className="card">
            <Icon name="char-colonist-wave" size={64} className="card-art" />
            <div className="card-main">
              <h3>{t('População')} {fmt(pop)} / {fmt(cap)}</h3>
              <p className={`status ${cls}`}>{label}</p>
              <ul className="stats">
                <li>{t('Alimentos: {a} ({b}) · consumo {c}/s', { a: fmt(game.resources.food), b: fmtRate(rates.food), c: fmt(pop * BALANCE.foodPerPerson) })}</li>
                <li>{t('Mão de obra: {a} vagas para {b} pessoas', { a: fmt(work.demand), b: fmt(work.supply) })}{work.ratio < 1 ? ' — ' + t('estruturas a {n}%', { n: Math.round(work.ratio * 100) }) : ''}</li>
                <li>{t('Impostos: +{n} créditos/s', { n: fmt(taxes) })}</li>
              </ul>
            </div>
          </article>
        </>
      )}
      <BuyAmountPicker />
      <BuildingList category="civilization" title={t('Moradia, alimento e saúde')} />
    </div>
  );
}
