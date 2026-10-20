import { useEffect, useState } from 'react';
import type { GameState } from '../game/types';
import { useGame } from '../game/store';
import type { TabId } from './tabs';
import { t } from '../i18n';

// Tutorial dos primeiros minutos: cinco passos curtos, cada um aponta o botão certo e some sozinho quando é cumprido.
// Não guarda estado próprio: o passo atual sai do próprio jogo; só "concluído" e "pulado" ficam salvos (em tips).

export const TUTORIAL_DONE = 'tutorial-done';
export const TUTORIAL_SKIP = 'tutorial-skip';

interface Step {
  id: string;
  text: string;
  /** Seletor do elemento destacado. */
  target: string;
  /** Aba onde o alvo fica (o passo oferece o atalho até lá). */
  tab?: TabId;
  done: (s: GameState) => boolean;
}

const STEPS: Step[] = [
  { id: 'mine', target: '.actionbar .big', text: 'Clique em “Extrair minério” (ou no asteroide) para tirar ferro da rocha.',
    done: s => s.stats.totalMined >= 5 || s.buildings.miner > 0 },
  { id: 'sell', target: '.actionbar .btn:not(.big)', text: 'Venda o ferro: os créditos compram as máquinas.',
    done: s => s.stats.earned >= 15 || s.buildings.miner > 0 },
  { id: 'miner', target: '[data-spot="building:miner"] .btn.buy', tab: 'mining', text: 'Compre uma Mineradora: ela extrai sozinha, mesmo sem você clicar.',
    done: s => s.buildings.miner >= 1 },
  { id: 'solar', target: '[data-spot="building:solar"] .btn.buy', tab: 'energy', text: 'Máquinas gastam energia. Construa um Painel solar na aba Energia.',
    done: s => s.buildings.solar >= 1 },
  { id: 'compass', target: '.compass', text: 'Pronto! A bússola no topo sempre mostra o próximo objetivo e para onde a jornada vai.',
    done: s => s.tips.includes(TUTORIAL_DONE) },
];

/** O tutorial vale só no começo da primeira jornada, até ser concluído ou pulado. */
export function tutorialActive(s: GameState): boolean {
  if (s.tips.includes(TUTORIAL_DONE) || s.tips.includes(TUTORIAL_SKIP)) return false;
  if (s.ascension.count > 0 || s.transcendence.count > 0 || s.stats.playTime > 3600) return false;
  return true;
}

const stepOf = (s: GameState) => STEPS.find(st => !st.done(s)) ?? null;

/** Nos primeiros passos o tutorial é o único guia: a bússola e a telemetria entram só no último passo. */
export const tutorialEarly = (s: GameState) => { const st = tutorialActive(s) ? stepOf(s) : null; return !!st && st.id !== 'compass'; };

/** Balão do passo atual, ancorado no elemento destacado. */
export function Tutorial({ goTo, tab }: { goTo: (tab: TabId) => void; tab: TabId }) {
  const game = useGame(s => s.game);
  const dismissTip = useGame(s => s.dismissTip);
  const active = tutorialActive(game);
  const step = active ? stepOf(game) : null;
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Acompanha o alvo: destaca e mede a posição (a interface se mexe, então mede de novo a cada pouco).
  useEffect(() => {
    if (!step) return;
    let el: Element | null = null;
    const measure = () => {
      const next = document.querySelector(step.target);
      if (next !== el) { el?.classList.remove('coach-target'); el = next; el?.classList.add('coach-target'); }
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    const h = setInterval(measure, 250);
    return () => { clearInterval(h); el?.classList.remove('coach-target'); };
  }, [step?.id, tab]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!step) return null;
  const index = STEPS.indexOf(step);
  const finish = (id: string) => { dismissTip(id); dismissTip('start'); };
  const offTab = step.tab && step.tab !== tab;
  // Balão abaixo do alvo quando há espaço; senão acima. Sem alvo visível, fica no alto, ao centro.
  const style: React.CSSProperties = rect && !offTab
    ? (rect.bottom + 150 < window.innerHeight
      ? { top: rect.bottom + 10, left: Math.min(Math.max(8, rect.left), window.innerWidth - 348) }
      : { top: Math.max(8, rect.top - 150), left: Math.min(Math.max(8, rect.left), window.innerWidth - 348) })
    : { top: 90, left: '50%', transform: 'translateX(-50%)' };

  return (
    <div className="coach" style={style} role="dialog" aria-live="polite" aria-label={t('Tutorial')}>
      <p className="coach-step">{t('Tutorial · passo {a} de {b}', { a: index + 1, b: STEPS.length })}</p>
      <p className="coach-text">{t(step.text)}</p>
      <div className="coach-actions">
        {offTab && <button className="btn small" onClick={() => goTo(step.tab!)}>{t('Ir')}</button>}
        {step.id === 'compass'
          ? <button className="btn small" onClick={() => finish(TUTORIAL_DONE)}>{t('Entendi')}</button>
          : <button className="btn small ghost" onClick={() => finish(TUTORIAL_SKIP)}>{t('Pular tutorial')}</button>}
      </div>
    </div>
  );
}

/** Textos dos passos (chegam ao t() por variável). */
export const TUTORIAL_TEXTS = STEPS.map(s => s.text);
