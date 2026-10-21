import { useEffect, useRef } from 'react';
import type { GameScene } from '../render/GameScene';
import { t } from '../i18n';
import { useGame } from '../game/store';
import { MEGA_BY_ID } from '../game/data/megaprojects';

export function SceneView({ onReady }: { onReady?: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const ready = useRef(onReady);
  const view = useGame(s => s.sceneView);
  const locName = useGame(s => s.game.locations.find(l => l.id === s.selectedLoc)?.name ?? '');
  const megaName = useGame(s => (s.selectedMega ? MEGA_BY_ID[s.selectedMega]?.name ?? '' : ''));
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
  const label = view === 'civ' ? t('Aurora, o mundo dos colonos')
    : view === 'loc' ? t('Planeta escolhido no mapa: {nome}', { nome: locName })
    : view === 'mega' ? t('Megaprojeto escolhido no mapa: {nome}', { nome: t(megaName) })
    : t('Asteroide — clique para extrair minério');
  return <div ref={host} className="scene" aria-label={label} />;
}
