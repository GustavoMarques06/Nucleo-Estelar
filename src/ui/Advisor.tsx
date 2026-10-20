import { useGame } from '../game/store';
import { advise } from '../game/engine/advisor';
import { BUILDING_BY_ID } from '../game/data/buildings';
import { bulkCost, canAfford } from '../game/engine/costs';
import { getModifiers } from '../game/engine/modifiers';
import { t } from '../i18n';
import { CATEGORY_TAB, type TabId } from './tabs';
import { useSpotlight } from './spotlight';

/** Telemetria: o que produz, o que limita (com o botão que resolve) e o próximo passo. */
export function Advisor({ goTo }: { goTo: (tab: TabId) => void }) {
  const game = useGame(s => s.game);
  const report = useGame(s => s.report);
  const rates = useGame(s => s.rates);
  const buyOne = useGame(s => s.buyAmountOf);
  const spot = useSpotlight(s => s.show);
  const a = advise(game, report, rates);
  const act = a.action;
  let button: { label: string; run: () => void } | null = null;
  if (act && 'build' in act) {
    const def = BUILDING_BY_ID[act.build];
    const affordable = canAfford(game, bulkCost(def, game.buildings[act.build], 1, getModifiers(game).cost));
    // Dá para pagar: constrói na hora. Senão, leva até o card (destacado) para ver o que falta.
    button = affordable
      ? { label: t('Construir {nome}', { nome: t(def.name) }), run: () => buyOne(act.build, 1) }
      : { label: t('Ir'), run: () => { goTo(CATEGORY_TAB[def.category]); spot('building', act.build); } };
  } else if (act) {
    button = { label: t('Ir'), run: () => { goTo(act.tab as TabId); if (act.upgrade) spot('upgrade', act.upgrade); } };
  }
  return (
    <div className="advisor" role="status">
      <div><span className="k">{t('Produzindo')}</span>{a.producing}</div>
      <div>
        <span className="k">{t('Limitando')}</span>
        <span className="advisor-limit">
          <span className={`sev-${a.limiting.severity}`}>{a.limiting.text}</span>
          {button && a.limiting.severity !== 'ok' && <button className="btn small" onClick={button.run}>{button.label}</button>}
        </span>
      </div>
      <div><span className="k">{t('Próximo passo')}</span>
        <span className="advisor-limit">{a.next}{button && a.limiting.severity === 'ok' && <button className="btn small" onClick={button.run}>{button.label}</button>}</span>
      </div>
    </div>
  );
}
