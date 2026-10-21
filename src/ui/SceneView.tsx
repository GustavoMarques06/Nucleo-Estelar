import { useEffect, useRef } from 'react';
import type { GameScene } from '../render/GameScene';
import { t } from '../i18n';
import { useGame } from '../game/store';

export function SceneView({ onReady }: { onReady?: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const ready = useRef(onReady);
  const view = useGame(s => s.sceneView);
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
  return <div ref={host} className="scene" aria-label={view === 'civ' ? t('Aurora, o mundo dos colonos') : t('Asteroide — clique para extrair minério')} />;
}
