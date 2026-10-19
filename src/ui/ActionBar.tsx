import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import { BALANCE } from '../game/data/balance';
import { getModifiers } from '../game/engine/modifiers';
import { fmt } from '../game/engine/format';
import { Icon } from './Icon';

export function ActionBar() {
  const game = useGame(s => s.game);
  const mine = useGame(s => s.mine);
  const sell = useGame(s => s.sell);
  // Nos primeiros cliques o botão pulsa, para ninguém ficar sem saber o que fazer.
  const newbie = game.stats.totalMined < 12 && game.buildings.miner === 0;
  // Segurar o botão repete a extração (menos cliques, e acessível a quem não consegue clicar rápido).
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => { if (timer.current) { clearInterval(timer.current); timer.current = null; } };
  const start = () => { stop(); timer.current = setInterval(() => useGame.getState().mine(), 180); };
  useEffect(() => stop, []);
  const perClick = BALANCE.clickAmount * getModifiers(game).click;
  return (
    <div className="actionbar">
      <button className={`btn primary big ${newbie ? 'nudge' : ''}`} onClick={() => mine()} onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
        title="Clique ou segure para extrair">
        <Icon name="nav-mining" size={30} /> Extrair minério <small>+{fmt(perClick)} por clique</small>
      </button>
      <button className={`btn ${game.resources.iron >= 15 && game.buildings.miner === 0 ? 'nudge' : ''}`} disabled={game.resources.iron < 1} onClick={() => sell('iron')}>
        <Icon name="icon-sell" size={24} /> Vender ferro
      </button>
    </div>
  );
}
