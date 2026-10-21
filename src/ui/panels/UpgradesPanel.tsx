import { useGame } from '../../game/store';
import { canAfford } from '../../game/engine/costs';
import { Icon } from '../Icon';
import { BuildingList, BuyAmountPicker, CostList } from './BuildingsPanel';
import { REPEATABLES, repeatableCost } from '../../game/data/repeatables';
import { t } from '../../i18n';
import { DoctrinesSection } from './DoctrinesSection';
import { ResearchTree } from './ResearchTree';

export function UpgradesPanel() {
  const game = useGame(s => s.game);
  const buyRepeatable = useGame(s => s.buyRepeatable);
  const repeatables = REPEATABLES.filter(r => r.unlock(game));

  return (
    <div className="panel-body research-body">
      <div className="research-main"><ResearchTree /></div>
      <div className="research-side">
        {game.upgrades.lab && <><BuyAmountPicker /><BuildingList category="science" title={t('Laboratórios · geram ciência')} /></>}
        <DoctrinesSection />
        {repeatables.length > 0 && (
          <>
            <h4 className="section">{t('Pesquisa contínua · sem limite')}</h4>
            {repeatables.map(r => {
              const level = game.repeatables[r.id] ?? 0;
              const cost = { science: repeatableCost(r, level) };
              return (
                <article key={r.id} className="card repeatable">
                  <Icon name={r.icon} size={48} className="card-art" />
                  <div className="card-main">
                    <h3>{t(r.name)} <span className="count">{t('nível {n}', { n: level })}</span></h3>
                    <p className="desc">{r.desc(level)}</p>
                  </div>
                  <button className="btn buy" disabled={!canAfford(game, cost)} onClick={() => buyRepeatable(r.id)}>
                    {t('Pesquisar')} <CostList cost={cost} have={game.resources} />
                  </button>
                </article>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
