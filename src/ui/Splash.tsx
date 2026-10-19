import { useEffect, useState } from 'react';

const MIN_MS = 1400;

/** Tela de carregamento: some quando a cena está pronta e o tempo mínimo passou. */
export function Splash({ ready }: { ready: boolean }) {
  const [minDone, setMinDone] = useState(false);
  const [gone, setGone] = useState(false);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), MIN_MS);
    // A barra anda sozinha até 90%; o restante só quando tudo estiver pronto.
    const p = setInterval(() => setProgress(v => Math.min(90, v + 6)), 140);
    return () => { clearTimeout(t); clearInterval(p); };
  }, []);

  const done = ready && minDone;
  useEffect(() => {
    if (!done) return;
    setProgress(100);
    const t = setTimeout(() => setGone(true), 500);
    return () => clearTimeout(t);
  }, [done]);

  if (gone) return null;
  return (
    <div className={`splash ${done ? 'out' : ''}`} role="status" aria-label="Carregando">
      <div className="splash-art">
        <img src={`${import.meta.env.BASE_URL}assets/art/loading-art.jpg`} alt="" draggable={false} />
        <div className="splash-bar"><div className="splash-fill" style={{ width: `${progress}%` }} /></div>
      </div>
    </div>
  );
}
