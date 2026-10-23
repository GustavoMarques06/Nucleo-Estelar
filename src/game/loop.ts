import { BALANCE } from './data/balance';
import { useGame } from './store';

// Uma aba por vez: duas abas abertas simulariam e salvariam por cima uma da outra (perdendo progresso).
// A aba que abre por último assume; a anterior grava na hora, pausa e avisa. "Jogar aqui" assume de volta.
type TabMsg = { type: 'claim' | 'saved'; from: string; to?: string };
const TAB_ID = Math.random().toString(36).slice(2);
let channel: BroadcastChannel | null = null;

/** Assume o jogo nesta aba: a outra grava, pausa e esta recarrega o save dela. */
export function takeOver() {
  if (!channel) { useGame.getState().setInactive(false); return; }
  channel.postMessage({ type: 'claim', from: TAB_ID } satisfies TabMsg);
}

function listenTabs() {
  if (typeof BroadcastChannel === 'undefined') return;
  channel = new BroadcastChannel('nucleo-estelar');
  channel.onmessage = (e: MessageEvent<TabMsg>) => {
    const m = e.data;
    if (!m || m.from === TAB_ID) return;
    const st = useGame.getState();
    if (m.type === 'claim') {
      if (st.inactive) return;
      st.setInactive(true);                                     // grava antes de pausar
      channel!.postMessage({ type: 'saved', from: TAB_ID, to: m.from } satisfies TabMsg);
    } else if (m.type === 'saved' && m.to === TAB_ID) {
      st.reloadFromSave();                                      // o progresso que a outra aba acabou de gravar
      st.setInactive(false);
    }
  };
  takeOver();
}

/** Inicia simulação (4 Hz, separada da renderização) e salvamento automático. */
export function startGameLoop(): () => void {
  const st = useGame.getState();
  st.boot();
  listenTabs();
  let last = performance.now();
  let lastWall = Date.now();
  const sim = setInterval(() => {
    const now = performance.now(), wallNow = Date.now();
    let dt = (now - last) / 1000;
    // Computador suspenso: em alguns sistemas o relógio do navegador para e só o de parede anda. Vale o maior.
    const wall = (wallNow - lastWall) / 1000;
    if (wall > dt + 5) dt = wall;
    // Modo foco: atualiza a cada ~1 s (4× menos trabalho); o tempo acumulado entra todo no próximo passo.
    if (useGame.getState().game.settings.focus && dt < 1) return;
    last = now;
    lastWall = wallNow;
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
    channel?.close();
    channel = null;
  };
}
