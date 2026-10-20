import { useEffect, useRef } from 'react';
import type { GameScene } from '../render/GameScene';
import { t } from '../i18n';

export function SceneView({ onReady }: { onReady?: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const ready = useRef(onReady);
  ready.current = onReady;

  useEffect(() => {
    // PixiJS fica num chunk separado: a interface aparece antes da cena carregar.
    let scene: GameScene | null = null;
    let disposed = false;
    import('../render/GameScene').then(({ GameScene }) => {
      if (disposed) return;
      scene = new GameScene();
      scene.init(host.current!)
        .then(() => { if (!disposed) ready.current?.(); })
        .catch(err => { console.error('Falha ao iniciar a cena', err); ready.current?.(); });
    });
    return () => { disposed = true; scene?.destroy(); };
  }, []);
  return <div ref={host} className="scene" aria-label={t('Asteroide — clique para extrair minério')} />;
}
