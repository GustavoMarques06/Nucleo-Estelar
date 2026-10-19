import { useState } from 'react';
import type { Location } from '../../game/types';
import { useGame } from '../../game/store';
import { RESOURCES } from '../../game/data/resources';
import { CRISIS_BY_KIND } from '../../game/data/crises';
import { FACTION_BY_ID } from '../../game/data/factions';
import { LOCATION_BY_TYPE, ROUTE } from '../../game/data/locations';
import { canAfford } from '../../game/engine/costs';
import { HELP_COST, canAskHelp, crisisCost, crisisOf } from '../../game/engine/crises';
import { canOpenRoute, colonyProduces, insuranceCost, isBlocked, maxRoutes, needOf, routeCost, routeInfo, routeScore, routesOf, routesUnlocked } from '../../game/engine/routes';
import { fmtDuration } from '../../game/engine/format';
import { Icon } from '../Icon';
import { CostList } from './BuildingsPanel';

/** Crise ativa na colônia, com as três respostas: pagar, pedir ajuda ou esperar. */
export function CrisisBox({ loc }: { loc: Location }) {
  const game = useGame(s => s.game);
  const resolve = useGame(s => s.resolveCrisis);
  const c = crisisOf(game, loc.id);
  if (!c) return null;
  const def = CRISIS_BY_KIND[c.kind];
  const cost = crisisCost(game, c);
  const helper = FACTION_BY_ID[def.helper];
  const canHelp = canAskHelp(game, c);
  return (
    <div className="crisis-box" role="alert">
      <div className="crisis-head">
        <Icon name={def.icon} size={44} />
        <div>
          <h4>{def.name}</h4>
          <p>{def.text}</p>
          <small>Produção reduzida · termina sozinha em {fmtDuration(c.remaining)}</small>
        </div>
      </div>
      <div className="bar"><div style={{ width: `${(c.remaining / c.total) * 100}%` }} /></div>
      <div className="crisis-actions">
        <button className="btn buy" disabled={!canAfford(game, cost)} onClick={() => resolve(c.id, 'pay')}>
          {def.fixLabel} <CostList cost={cost} have={game.resources} />
        </button>
        <button className="btn buy" disabled={!canHelp} onClick={() => resolve(c.id, 'help')}
          title={canHelp ? `Custa ${HELP_COST} de relação` : `Exige tratado com ${helper.name} (relação 25)`}>
          Pedir ajuda: {helper.name}
          <small>{canHelp ? `−${HELP_COST} de relação` : 'sem tratado'}</small>
        </button>
      </div>
    </div>
  );
}

/** Rotas comerciais da colônia: o que ela precisa, quem a abastece e novas ligações. */
export function RoutesBox({ loc }: { loc: Location }) {
  const game = useGame(s => s.game);
  const open = useGame(s => s.openRoute);
  const close = useGame(s => s.closeRoute);
  const insure = useGame(s => s.insureRoute);
  const dropInsurance = useGame(s => s.dropInsurance);
  const select = useGame(s => s.selectLoc);
  const [target, setTarget] = useState('');
  if (!loc.outpost) return null;
  const need = needOf(loc);
  const info = routeInfo(game, loc);
  const mine = routesOf(game, loc.id);
  const max = maxRoutes(game);
  const unlocked = routesUnlocked(game);
  // Parceiras possíveis: outras colônias ainda não ligadas, as mais úteis primeiro.
  const partners = game.locations
    .filter(l => l.outpost && l.id !== loc.id && !mine.some(r => r.a === l.id || r.b === l.id))
    .sort((a, b) => routeScore(loc, b) - routeScore(loc, a));
  const chosen = game.locations.find(l => l.id === target) ?? partners[0] ?? null;
  const check = chosen ? canOpenRoute(game, loc.id, chosen.id) : { ok: false, reason: 'Sem outras colônias para ligar.' };
  const cost = chosen ? routeCost(game, loc, chosen) : {};

  return (
    <div className="routes-box">
      <h4 className="section sub">Rotas comerciais <small>{mine.length}/{max}</small></h4>
      <p className="desc">
        Esta colônia precisa de <b><Icon name={RESOURCES[need].icon} size={16} /> {RESOURCES[need].name.toLowerCase()}</b>.
        {info.supplied ? <span className="sev-ok"> Abastecida: produção +{Math.round(ROUTE.suppliedBonus * 100)}%.</span> : <span className="sev-warn"> Ligue-a a uma colônia que produza isso: +{Math.round(ROUTE.suppliedBonus * 100)}%.</span>}
        {info.suppliesCount > 0 && <span className="sev-ok"> Fornece a {info.suppliesCount} parceira(s): +{Math.round(ROUTE.supplierBonus * info.suppliesCount * 100)}%.</span>}
      </p>
      {mine.map(r => {
        const other = game.locations.find(l => l.id === (r.a === loc.id ? r.b : r.a));
        if (!other) return null;
        const gives = colonyProduces(other).includes(need);
        const takes = colonyProduces(loc).includes(needOf(other));
        return (
          <div key={r.id} className="route-row">
            <button className="link" onClick={() => select(other.id)}>{other.name}</button>
            <small>{gives ? `fornece ${RESOURCES[need].name.toLowerCase()}` : ''}{gives && takes ? ' · ' : ''}{takes ? 'recebe de você' : ''}{!gives && !takes ? 'sem troca útil' : ''}</small>
            {isBlocked(game, r) && <small className="sev-bad">bloqueada</small>}
            {r.insured
              ? <button className="btn small active" title="Rota segurada: imune a bloqueios (custa manutenção). Clique para remover." onClick={() => dropInsurance(r.id)}>Segurada</button>
              : <button className="btn small" disabled={!canAfford(game, insuranceCost(game))} title="Seguro: a rota fica imune a bloqueios de piratas, ao custo de manutenção." onClick={() => insure(r.id)}>Segurar <CostList cost={insuranceCost(game)} have={game.resources} /></button>}
            <button className="btn small" onClick={() => close(r.id)}>Encerrar</button>
          </div>
        );
      })}
      {!unlocked && <p className="hint">Pesquise <b>Rotas de transporte</b> (fase 5) para abrir rotas.</p>}
      {unlocked && partners.length === 0 && mine.length === 0 && <p className="hint">Funde outra colônia para poder ligá-las.</p>}
      {unlocked && partners.length > 0 && (
        <div className="route-new">
          <select value={chosen?.id ?? ''} onChange={e => setTarget(e.target.value)} aria-label="Colônia parceira">
            {partners.map(p => {
              const sc = routeScore(loc, p);
              return <option key={p.id} value={p.id}>{p.name} · {LOCATION_BY_TYPE[p.type].name}{sc >= 2 ? ' ★ abastece' : sc === 1 ? ' · recebe' : ''}</option>;
            })}
          </select>
          <button className="btn buy" disabled={!check.ok} onClick={() => chosen && open(loc.id, chosen.id)}>
            Abrir rota <CostList cost={cost} have={game.resources} />
          </button>
        </div>
      )}
      {unlocked && !check.ok && check.reason && partners.length > 0 && <p className="status sev-warn">{check.reason}</p>}
    </div>
  );
}
