// Áudio do jogo: efeitos sonoros e música, com volume geral. Tudo pode ser desligado nas opções, e nenhum
// estado importante depende só do som (GDD, seção 11).
import { events } from '../game/events';
import { useGame } from '../game/store';
import { resumeContext, setVolume } from './context';
import { startMusic, stopMusic } from './music';
import { SFX } from './sfx';

/** Liga efeitos, música e volume às configurações; devolve a função que desliga tudo. */
export function startAudio(): () => void {
  const sync = () => {
    const { settings } = useGame.getState().game;
    setVolume(settings.volume);
    // A música só toca com a aba visível (em segundo plano ela só gastaria bateria).
    if (settings.music && settings.volume > 0 && document.visibilityState === 'visible') startMusic(); else stopMusic();
  };

  const offEvents = events.on(e => {
    const { settings } = useGame.getState().game;
    if (!settings.sound || settings.volume <= 0) return;
    try { SFX[e.type]?.(); } catch { /* áudio indisponível */ }
  });

  // Reage só quando as configurações de áudio mudam (o estado do jogo muda 4× por segundo).
  let last = '';
  const offStore = useGame.subscribe(s => {
    const k = `${s.game.settings.music}|${s.game.settings.volume}`;
    if (k !== last) { last = k; sync(); }
  });

  // O navegador só libera o áudio depois de um gesto do jogador.
  const unlock = () => { resumeContext(); sync(); };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  document.addEventListener('visibilitychange', sync);

  return () => {
    offEvents(); offStore(); stopMusic();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    document.removeEventListener('visibilitychange', sync);
  };
}
