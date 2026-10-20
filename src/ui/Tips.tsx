import { useGame } from '../game/store';
import { TIPS } from '../game/data/tips';
import { Icon } from './Icon';
import { t } from '../i18n';
import { tutorialActive } from './Tutorial';

/** Mostra a primeira dica ainda não vista cuja mecânica já apareceu. */
export function Tips() {
  const game = useGame(s => s.game);
  const dismiss = useGame(s => s.dismissTip);
  const offline = useGame(s => s.offline);
  const tip = TIPS.find(x => !game.tips.includes(x.id) && x.when(game));
  if (!tip || offline || tutorialActive(game)) return null;
  return (
    <div className="tip" role="note">
      <Icon name={tip.icon} size={40} />
      <div>
        <b>{t(tip.title)}</b>
        <p>{t(tip.text)}</p>
      </div>
      <button className="btn small" onClick={() => dismiss(tip.id)}>{t('Entendi')}</button>
    </div>
  );
}
