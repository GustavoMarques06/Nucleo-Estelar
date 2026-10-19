import { BALANCE } from './data/balance';
import { useGame } from './store';

/** Inicia simulação (4 Hz, separada da renderização) e salvamento automático. */
export function startGameLoop(): () => void {
  const st = useGame.getState();
  st.boot();
  let last = performance.now();
  const sim = setInterval(() => {
    const now = performance.now();
    const dt = (now - last) / 1000;
    // Modo foco: atualiza a cada ~1 s (4× menos trabalho); o tempo acumulado entra todo no próximo passo.
    if (useGame.getState().game.settings.focus && dt < 1) return;
    last = now;
    if (dt > 0) useGame.getState().advance(dt);
  }, 1000 / BALANCE.simulationHz);
  const autosave = setInterval(() => useGame.getState().save(), 10_000);
  const onHide = () => { if (document.visibilityState === 'hidden') useGame.getState().save(); };
  const onUnload = () => useGame.getState().save();
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('beforeunload', onUnload);
  return () => {
    clearInterval(sim); clearInterval(autosave);
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('beforeunload', onUnload);
  };
}
