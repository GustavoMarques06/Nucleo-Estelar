import { useGame } from '../../game/store';
import { UPGRADES, UPGRADE_BY_ID } from '../../game/data/upgrades';
import { canAfford } from '../../game/engine/costs';
import { isUpgradeVisible, upgradeRequirementsMet } from '../../game/engine/modifiers';
import { Icon } from '../Icon';
import { BuildingList, BuyAmountPicker, CostList } from './BuildingsPanel';
import { REPEATABLES, repeatableCost } from '../../game/data/repeatables';

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

  return (
    <div className="panel-body">
      {game.upgrades.lab && <><BuyAmountPicker /><BuildingList category="science" title="Laboratórios · geram ciência" /></>}
      <h4 className="section">Árvore de pesquisa</h4>
      {available.length === 0 && <p className="hint">Nenhuma pesquisa disponível agora. Expanda a operação para liberar novas.</p>}
      {phases.map(p => (
        <div key={p} className="phase-group">
          <h4 className="section sub">{PHASES[p]}</h4>
          {available.filter(u => u.phase === p).map(u => (
            <article key={u.id} className="card">
              <Icon name={u.icon} size={56} className="card-art" />
              <div className="card-main">
                <h3>{u.name}</h3>
                <p className="desc">{u.desc}</p>
              </div>
              <button className="btn buy" disabled={!canAfford(game, u.cost)} onClick={() => upgrade(u.id)}>
                Pesquisar
                <CostList cost={u.cost} have={game.resources} />
              </button>
            </article>
          ))}
        </div>
      ))}
      {repeatables.length > 0 && (
        <>
          <h4 className="section">Pesquisa contínua · sem limite</h4>
          {repeatables.map(r => {
            const level = game.repeatables[r.id] ?? 0;
            const cost = { science: repeatableCost(r, level) };
            return (
              <article key={r.id} className="card repeatable">
                <Icon name={r.icon} size={48} className="card-art" />
                <div className="card-main">
                  <h3>{r.name} <span className="count">nível {level}</span></h3>
                  <p className="desc">{r.desc(level)}</p>
                </div>
                <button className="btn buy" disabled={!canAfford(game, cost)} onClick={() => buyRepeatable(r.id)}>
                  Pesquisar <CostList cost={cost} have={game.resources} />
                </button>
              </article>
            );
          })}
        </>
      )}
      {upcoming.length > 0 && (
        <>
          <h4 className="section">Em seguida</h4>
          {upcoming.map(u => (
            <p key={u.id} className="hint upcoming">
              <Icon name={u.icon} size={20} /> <b>{u.name}</b> — requer {(u.requires ?? []).map(r => UPGRADE_BY_ID[r]?.name).join(' e ')}
            </p>
          ))}
        </>
      )}
      {owned.length > 0 && (
        <>
          <h4 className="section">Concluídas ({owned.length}/{UPGRADES.length})</h4>
          <div className="done-list">
            {owned.map(u => <span key={u.id} className="done" title={u.desc}><Icon name={u.icon} size={20} />{u.name}</span>)}
          </div>
        </>
      )}
    </div>
  );
}
