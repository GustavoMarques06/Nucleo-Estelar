import { useGame } from '../game/store';
import { TIPS } from '../game/data/tips';
import { Icon } from './Icon';

/** Mostra a primeira dica ainda não vista cuja mecânica já apareceu. */
export function Tips() {
  const game = useGame(s => s.game);
  const dismiss = useGame(s => s.dismissTip);
  const offline = useGame(s => s.offline);
  const tip = TIPS.find(t => !game.tips.includes(t.id) && t.when(game));
  if (!tip || offline) return null;
  return (
    <div className="tip" role="note">
      <Icon name={tip.icon} size={40} />
      <div>
        <b>{tip.title}</b>
        <p>{tip.text}</p>
      </div>
      <button className="btn small" onClick={() => dismiss(tip.id)}>Entendi</button>
    </div>
  );
}
