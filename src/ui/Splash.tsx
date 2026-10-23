import { useEffect, useState } from 'react';
import { t } from '../i18n';

const MIN_MS = 1400;

/** Tela de carregamento: some quando a cena está pronta e o tempo mínimo passou. */
export function Splash({ ready }: { ready: boolean }) {
  const [minDone, setMinDone] = useState(false);
  const [gone, setGone] = useState(false);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const tm = setTimeout(() => setMinDone(true), MIN_MS);
    // A barra anda sozinha até 90%; o restante só quando tudo estiver pronto.
    const p = setInterval(() => setProgress(v => Math.min(90, v + 6)), 140);
    return () => { clearTimeout(tm); clearInterval(p); };
  }, []);

  const done = ready && minDone;
  useEffect(() => {
    if (!done) return;
    setProgress(100);
    const tm = setTimeout(() => setGone(true), 500);
    return () => clearTimeout(tm);
  }, [done]);

  if (gone) return null;
  const base = import.meta.env.BASE_URL;
  return (
    <div className={`splash ${done ? 'out' : ''}`} role="status" aria-label={t('Carregando')}>
      {/* A ilustração não tem texto nem interface: o logo e a barra vêm por cima (traduzidos e em qualquer tela). */}
      <picture className="splash-scene">
        <source media="(orientation: portrait)" srcSet={`${base}assets/art/loading-art-portrait.jpg`} />
        <img src={`${base}assets/art/loading-art.jpg`} alt="" draggable={false} />
      </picture>
      <img className="splash-logo" src={`${base}assets/sprites/logo-wide.png`} alt={t('Núcleo Estelar')} draggable={false} />
      <div className="splash-load">
        <span className="splash-label">{t('Carregando…')}</span>
        <div className="splash-bar"><div className="splash-fill" style={{ width: `${progress}%` }} /></div>
      </div>
    </div>
  );
}
