import { useGame } from '../game/store';
import { advise } from '../game/engine/advisor';
import { GOALS, currentGoal } from '../game/data/goals';
import { Icon } from './Icon';

/** Objetivo guiado atual: sempre há um próximo passo à vista (GDD, princípio 1). */
function GoalRow() {
  const game = useGame(s => s.game);
  const goal = currentGoal(game);
  if (!goal) return null;
  const p = goal.progress(game);
  const done = game.goals.length;
  return (
    <div className="goal" aria-label="Objetivo atual">
      <Icon name={goal.icon} size={36} />
      <div>
        <b>{goal.title} <small>({done + 1}/{GOALS.length})</small></b>
        <small>{goal.hint}</small>
        <div className="bar"><div style={{ width: `${(p.cur / p.target) * 100}%` }} /></div>
      </div>
      {goal.reward && <span className="reward">+{goal.reward.credits} cr</span>}
    </div>
  );
}

export function Advisor() {
  const game = useGame(s => s.game);
  const report = useGame(s => s.report);
  const rates = useGame(s => s.rates);
  const a = advise(game, report, rates);
  return (
    <div className="advisor" role="status">
      <div><span className="k">Produzindo</span>{a.producing}</div>
      <div><span className="k">Limitando</span><span className={`sev-${a.limiting.severity}`}>{a.limiting.text}</span></div>
      <div><span className="k">Próximo passo</span>{a.next}</div>
      <GoalRow />
    </div>
  );
}
