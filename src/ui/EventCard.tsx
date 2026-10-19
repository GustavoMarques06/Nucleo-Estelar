import { useGame } from '../game/store';
import { EVENT_BY_ID } from '../game/data/events';
import { BALANCE } from '../game/data/balance';
import { eventChoiceCost } from '../game/engine/progression';
import { canAfford } from '../game/engine/costs';
import { fmtDuration } from '../game/engine/format';
import { Icon } from './Icon';

/** Cartão de evento espacial: aparece sobre a cena e some sozinho se ignorado. */
export function EventCard() {
  const game = useGame(s => s.game);
  const choose = useGame(s => s.chooseEvent);
  const dismiss = useGame(s => s.dismissEvent);
  const ev = game.event;
  const def = ev && EVENT_BY_ID[ev.id];
  if (!ev || !def) return null;
  return (
    <div className="event-card" role="dialog" aria-label={def.name}>
      <Icon name={def.sprite} size={72} />
      <div className="event-main">
        <h3>{def.name}</h3>
        <p>{def.text}</p>
        <div className="event-choices">
          {def.choices.map((c, i) => (
            <button key={i} className="btn small" disabled={!canAfford(game, eventChoiceCost(game, i))} onClick={() => choose(i)}>{c.label}</button>
          ))}
          <button className="btn small" onClick={dismiss}>Ignorar</button>
        </div>
        <div className="bar"><div style={{ width: `${(ev.remaining / BALANCE.eventDuration) * 100}%` }} /></div>
        <small>Some em {fmtDuration(ev.remaining)}</small>
      </div>
    </div>
  );
}

/** Efeitos temporários ativos (de eventos). */
export function Buffs() {
  const buffs = useGame(s => s.game.buffs);
  if (!buffs.length) return null;
  return (
    <div className="buffs">
      {buffs.map(b => <span key={b.id} className="buff"><Icon name="icon-star" size={16} />{b.name} · {fmtDuration(b.remaining)}</span>)}
    </div>
  );
}
