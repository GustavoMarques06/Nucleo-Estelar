import { useGame } from '../../game/store';
import { UPGRADES, UPGRADE_BY_ID } from '../../game/data/upgrades';
import { canAfford } from '../../game/engine/costs';
import { isUpgradeVisible, upgradeRequirementsMet } from '../../game/engine/modifiers';
import { Icon } from '../Icon';
import { BuildingList, BuyAmountPicker, CostList } from './BuildingsPanel';
import { REPEATABLES, repeatableCost } from '../../game/data/repeatables';
import { t } from '../../i18n';
import { useSpotTarget } from '../spotlight';

const PHASES: Record<number, string> = {
  1: 'Fase 1 · Sobrevivência industrial', 2: 'Fase 2 · Autossuficiência energética', 3: 'Fase 3 · Indústria avançada',
  4: 'Fase 4 · Civilização', 5: 'Fase 5 · Expansão interestelar', 6: 'Fase 6 · Megaprojetos',
};

export function UpgradesPanel() {
  const game = useGame(s => s.game);
  const upgrade = useGame(s => s.upgrade);
  const buyRepeatable = useGame(s => s.buyRepeatable);
  const repeatables = REPEATABLES.filter(r => r.unlock(game));
  const available = UPGRADES.filter(u => isUpgradeVisible(u, game));
  const owned = UPGRADES.filter(u => game.upgrades[u.id]);
  // Próximas: falta só um pré-requisito — mostradas para o jogador planejar.
  const upcoming = UPGRADES.filter(u => !game.upgrades[u.id] && !upgradeRequirementsMet(u, game)
    && (u.requires ?? []).some(r => game.upgrades[r] || available.some(a => a.id === r))).slice(0, 4);
  const phases = [...new Set(available.map(u => u.phase))].sort();
  const spotId = useSpotTarget('upgrade', available.length);

  return (
    <div className="panel-body">
      {game.upgrades.lab && <><BuyAmountPicker /><BuildingList category="science" title={t('Laboratórios · geram ciência')} /></>}
      <h4 className="section">{t('Árvore de pesquisa')}</h4>
      {available.length === 0 && <p className="hint">{t('Nenhuma pesquisa disponível agora. Expanda a operação para liberar novas.')}</p>}
      {phases.map(p => (
        <div key={p} className="phase-group">
          <h4 className="section sub">{t(PHASES[p])}</h4>
          {available.filter(u => u.phase === p).map(u => (
            <article key={u.id} data-spot={`upgrade:${u.id}`} className={`card ${spotId === u.id ? 'spot' : ''}`}>
              <Icon name={u.icon} size={56} className="card-art" />
              <div className="card-main">
                <h3>{t(u.name)}</h3>
                <p className="desc">{t(u.desc)}</p>
              </div>
              <button className="btn buy" disabled={!canAfford(game, u.cost)} onClick={() => upgrade(u.id)}>
                {t('Pesquisar')}
                <CostList cost={u.cost} have={game.resources} />
              </button>
            </article>
          ))}
        </div>
      ))}
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
      {upcoming.length > 0 && (
        <>
          <h4 className="section">{t('Em seguida')}</h4>
          {upcoming.map(u => (
            <p key={u.id} className="hint upcoming">
              <Icon name={u.icon} size={20} /> <b>{t(u.name)}</b> — {t('requer')} {(u.requires ?? []).map(r => t(UPGRADE_BY_ID[r]?.name ?? '')).join(` ${t('e')} `)}
            </p>
          ))}
        </>
      )}
      {owned.length > 0 && (
        <>
          <h4 className="section">{t('Concluídas ({a}/{b})', { a: owned.length, b: UPGRADES.length })}</h4>
          <div className="done-list">
            {owned.map(u => <span key={u.id} className="done" title={t(u.desc)}><Icon name={u.icon} size={20} />{t(u.name)}</span>)}
          </div>
        </>
      )}
    </div>
  );
}
