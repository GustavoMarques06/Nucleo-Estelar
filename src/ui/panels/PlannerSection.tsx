import { useState } from 'react';
import type { BuildingId } from '../../game/types';
import { useGame } from '../../game/store';
import { BUILDING_BY_ID } from '../../game/data/buildings';
import { RESOURCES } from '../../game/data/resources';
import { planChain, plannable } from '../../game/engine/planner';
import { fmt, fmtNum } from '../../game/engine/format';
import { Icon } from '../Icon';
import { t } from '../../i18n';

const COUNTS = [1, 5, 10, 25, 50, 100, 250];

/** Planejador de cadeia: quantas estruturas de cada elo sustentam N de uma estrutura (aba Indústria). */
export function PlannerSection() {
  const game = useGame(s => s.game);
  const options = plannable(game);
  const [pick, setPick] = useState<BuildingId | null>(null);
  const [count, setCount] = useState(10);
  if (!options.length) return null;
  const target = pick && options.some(b => b.id === pick) ? pick : (options.find(b => b.id === 'factory') ?? options[0]).id;
  const plan = planChain(game, target, count);
  return (
    <details className="planner">
      <summary><Icon name="icon-tool" size={22} /> {t('Planejador de cadeia')}</summary>
      <p className="hint">{t('Quantas estruturas de cada elo sustentam a quantidade escolhida, com os bônus e as receitas de agora. Não conta o que as outras estruturas já consomem.')}</p>
      <div className="loc-actions">
        <label className="spec">{t('Para')}
          <select value={count} onChange={e => setCount(Number(e.target.value))}>
            {COUNTS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="spec">{t('Estrutura')}
          <select value={target} onChange={e => setPick(e.target.value as BuildingId)}>
            {options.map(b => <option key={b.id} value={b.id}>{t(b.name)}</option>)}
          </select>
        </label>
      </div>
      <table className="stats-table planner-table">
        <thead><tr><th>{t('Elo')}</th><td>{t('Precisa')}</td><td>{t('Você tem')}</td></tr></thead>
        <tbody>
          {plan.rows.map(r => {
            const b = BUILDING_BY_ID[r.building];
            const need = Math.ceil(r.units - 1e-9);
            return (
              <tr key={r.building}>
                <th><Icon name={b.sprite} size={22} /> {t(b.name)} <small className="dim">→ {r.feeds.map(x => t(RESOURCES[x].name).toLowerCase()).join(', ')}</small></th>
                <td title={fmtNum(r.units)}>{fmt(need)}</td>
                <td className={r.have >= need ? 'sev-ok' : 'sev-warn'}>{fmt(r.have)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="hint">
        {t('Energia da cadeia inteira: {e}. Trabalhadores: {w}.', { e: fmt(plan.energy), w: fmt(plan.workers) })}
        {plan.missing.length > 0 && ' ' + t('Ninguém produz ainda: {lista}.', { lista: plan.missing.map(r => t(RESOURCES[r].name).toLowerCase()).join(', ') })}
      </p>
    </details>
  );
}
