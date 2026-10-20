import type { ResId } from '../game/types';
import { useGame } from '../game/store';
import { RESOURCES } from '../game/data/resources';
import { UPGRADES } from '../game/data/upgrades';
import { CRISIS_BY_KIND } from '../game/data/crises';
import { BUILDINGS } from '../game/data/buildings';
import { BALANCE } from '../game/data/balance';
import { canOverclock } from '../game/engine/energy';
import { canAfford } from '../game/engine/costs';
import { getModifiers, isUpgradeVisible } from '../game/engine/modifiers';
import { isHigh, marketFactor, marketUnlocked, quoteSale, tradedResources } from '../game/engine/market';
import { fmt, fmtDuration, fmtRate } from '../game/engine/format';
import { Buffs, EventCard } from './EventCard';
import { Icon } from './Icon';

type Goto = 'research' | 'commerce' | 'map' | 'expansion' | 'finance';

function Alert({ tone, icon, title, sub, action, onAction, onClick }: {
  tone: 'bad' | 'ok' | 'info' | 'calm'; icon: string; title: string; sub?: string; action?: string; onAction?: () => void; onClick?: () => void;
}) {
  return (
    <div className={`focus-alert ${tone}`} onClick={onClick}>
      <Icon name={icon} size={36} />
      <div><b>{title}</b>{sub && <small>{sub}</small>}</div>
      {action && <button className="btn small" onClick={e => { e.stopPropagation(); onAction?.(); }}>{action}</button>}
    </div>
  );
}

/** Central de alertas do modo foco: o que precisa de você agora, sem a cena animada. */
export function FocusBoard({ goTo }: { goTo: (tab: Goto) => void }) {
  const game = useGame(s => s.game);
  const rates = useGame(s => s.rates);
  const report = useGame(s => s.report);
  const sell = useGame(s => s.sell);
  const upgrade = useGame(s => s.upgrade);
  const fulfill = useGame(s => s.fulfillContract);
  const overclock = useGame(s => s.overclock);
  const m = getModifiers(game);

  const research = UPGRADES.filter(u => isUpgradeVisible(u, game) && canAfford(game, u.cost)).slice(0, 3);
  const contracts = game.contracts.filter(c => game.resources[c.res] >= c.amount);
  const hot = marketUnlocked(game)
    ? tradedResources().map(r => ({ r, f: marketFactor(game, r) })).filter(x => isHigh(x.f) && game.resources[x.r] >= 1).sort((a, b) => b.f - a.f).slice(0, 3)
    : [];
  const terra = game.locations.filter(l => (l.outpost?.terraRemaining ?? 0) > 0);
  const top = (Object.entries(rates) as [ResId, number][])
    .filter(([r, v]) => !RESOURCES[r].hidden && Math.abs(v) > 0.01)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 8);
  const inProgress = terra.length + game.expeditions.length;
  const behind = report && report.upkeep.ratio < 0.999 ? report.upkeep : null;
  // Falta energia e há reator pronto: a sobrecarga resolve na hora.
  const boostable = report && report.energy.ratio < 0.999 ? BUILDINGS.filter(b => b.overclock && canOverclock(game, b.id)) : [];
  const needsYou = !!game.event || !!behind || game.crises.length + contracts.length + hot.length + research.length + boostable.length > 0;

  return (
    <div className="focus-board" aria-label="Painel do modo foco">
      {top.length > 0 && (
        <div className="focus-rates">
          {top.map(([r, v]) => (
            <div key={r} className={`rate-tile ${v < 0 ? 'neg' : ''}`} title={RESOURCES[r].name}>
              <Icon name={RESOURCES[r].icon} size={26} />
              <b>{fmtRate(v)}</b><small>{RESOURCES[r].name}</small>
            </div>
          ))}
        </div>
      )}
      <Buffs />
      <EventCard />
      <div className="focus-grid">
        {behind && <Alert tone="bad" icon="icon-warning" title="Manutenção em atraso" sub={`estruturas caras a ${Math.round(behind.ratio * 100)}% do ritmo · dívida ${fmt(behind.debt)}`} action="Ver finanças" onAction={() => goTo('finance')} />}
        {boostable.map(b => (
          <Alert key={b.id} tone="bad" icon={b.sprite} title={`Energia em falta: ${b.name} pronto para sobrecarga`}
            sub={`energia ×${BALANCE.overclockMult} por ${BALANCE.overclockTime} s`} action="Sobrecarga" onAction={() => overclock(b.id)} />
        ))}
        {game.crises.map(c => {
          const l = game.locations.find(x => x.id === c.locId);
          return <Alert key={c.id} tone="bad" icon={CRISIS_BY_KIND[c.kind].icon} title={`${CRISIS_BY_KIND[c.kind].name} em ${l?.name}`}
            sub={`termina em ${fmtDuration(c.remaining)}`} action="Resolver" onAction={() => goTo('map')} />;
        })}
        {contracts.map(c => (
          <Alert key={c.id} tone="ok" icon={RESOURCES[c.res].icon} title={`Contrato pronto: ${fmt(c.amount)} ${RESOURCES[c.res].name.toLowerCase()}`}
            sub={`+${fmt(c.reward.credits ?? 0)} créditos · expira em ${fmtDuration(c.remaining)}`} action="Entregar" onAction={() => fulfill(c.id)} />
        ))}
        {hot.map(({ r, f }) => (
          <Alert key={r} tone="ok" icon={RESOURCES[r].icon} title={`${RESOURCES[r].name} em alta: +${Math.round((f - 1) * 100)}%`}
            sub={`${fmt(quoteSale(game, m, r, Math.floor(game.resources[r])).earned)} créditos pelo estoque`} action="Vender" onAction={() => sell(r)} />
        ))}
        {research.map(u => (
          <Alert key={u.id} tone="info" icon={u.icon} title={`Pesquisa: ${u.name}`} sub={u.desc} action="Pesquisar" onAction={() => upgrade(u.id)} />
        ))}
        {terra.map(l => (
          <Alert key={l.id} tone="info" icon={l.sprite} title={`Terraformando ${l.name}`} sub={`${fmtDuration(l.outpost!.terraRemaining / m.terraSpeed)} restantes`} onClick={() => goTo('map')} />
        ))}
        {game.expeditions.length > 0 && (
          <Alert tone="info" icon="ship-explorer" title={`${game.expeditions.length} expedição(ões) em viagem`}
            sub={`a próxima chega em ${fmtDuration(Math.min(...game.expeditions.map(e => e.remaining)) / m.expeditionSpeed)}`} onClick={() => goTo('expansion')} />
        )}
      </div>
      {!needsYou && (
        <Alert tone="calm" icon="icon-check" title={inProgress ? 'Nada precisa de você agora' : 'Tudo em ordem'}
          sub="Sua base está produzindo. Os alertas aparecem aqui — e no título da aba — quando algo pedir sua atenção." />
      )}
    </div>
  );
}
