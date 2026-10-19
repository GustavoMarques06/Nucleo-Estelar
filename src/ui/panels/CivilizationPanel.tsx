import { useGame } from '../../game/store';
import { BALANCE } from '../../game/data/balance';
import { getModifiers, housingCap, workforce } from '../../game/engine/modifiers';
import { fmt, fmtRate } from '../../game/engine/format';
import { Icon } from '../Icon';
import { BuildingList, BuyAmountPicker } from './BuildingsPanel';

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
  const [label, cls] = STATUS[report?.population.status ?? 'none'];
  const taxes = pop * BALANCE.taxPerPerson * m.tax * m.outputAll;

  return (
    <div className="panel-body">
      {game.upgrades.habitats && (
        <>
          <article className="card">
            <Icon name="char-colonist-wave" size={64} className="card-art" />
            <div className="card-main">
              <h3>População {fmt(pop)} / {fmt(cap)}</h3>
              <p className={`status ${cls}`}>{label}</p>
              <ul className="stats">
                <li>Alimentos: {fmt(game.resources.food)} ({fmtRate(rates.food)}) · consumo {fmt(pop * BALANCE.foodPerPerson)}/s</li>
                <li>Mão de obra: {fmt(work.demand)} vagas para {fmt(work.supply)} pessoas{work.ratio < 1 ? ` — estruturas a ${Math.round(work.ratio * 100)}%` : ''}</li>
                <li>Impostos: +{fmt(taxes)} créditos/s</li>
              </ul>
            </div>
          </article>
        </>
      )}
      <BuyAmountPicker />
      <BuildingList category="civilization" title="Moradia, alimento e saúde" />
    </div>
  );
}
