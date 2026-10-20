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
import { Tx } from '../../i18n/Tx';
import { CostList } from './BuildingsPanel';
import { t } from '../../i18n';

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
          <h4>{t(def.name)}</h4>
          <p>{t(def.text)}</p>
          <small>{t('Produção reduzida · termina sozinha em {tempo}', { tempo: fmtDuration(c.remaining) })}</small>
        </div>
      </div>
      <div className="bar"><div style={{ width: `${(c.remaining / c.total) * 100}%` }} /></div>
      <div className="crisis-actions">
        <button className="btn buy" disabled={!canAfford(game, cost)} onClick={() => resolve(c.id, 'pay')}>
          {t(def.fixLabel)} <CostList cost={cost} have={game.resources} />
        </button>
        <button className="btn buy" disabled={!canHelp} onClick={() => resolve(c.id, 'help')}
          title={canHelp ? t('Custa {n} de relação', { n: HELP_COST }) : t('Exige tratado com {nome} (relação 25)', { nome: t(helper.name) })}>
          {t('Pedir ajuda: {nome}', { nome: t(helper.name) })}
          <small>{canHelp ? t('−{n} de relação', { n: HELP_COST }) : t('sem tratado')}</small>
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
  const chosen = partners.find(l => l.id === target) ?? partners[0] ?? null;
  const check = chosen ? canOpenRoute(game, loc.id, chosen.id) : { ok: false, reason: t('Sem outras colônias para ligar.') };
  const cost = chosen ? routeCost(game, loc, chosen) : {};

  return (
    <div className="routes-box">
      <h4 className="section sub">{t('Rotas comerciais')} <small>{mine.length}/{max}</small></h4>
      <p className="desc">
        {t('Esta colônia precisa de')} <b><Icon name={RESOURCES[need].icon} size={16} /> {t(RESOURCES[need].name).toLowerCase()}</b>.
        {info.supplied ? <span className="sev-ok"> {t('Abastecida: produção +{n}%.', { n: Math.round(ROUTE.suppliedBonus * 100) })}</span> : <span className="sev-warn"> {t('Ligue-a a uma colônia que produza isso: +{n}%.', { n: Math.round(ROUTE.suppliedBonus * 100) })}</span>}
        {info.suppliesCount > 0 && <span className="sev-ok"> {t('Fornece a {a} parceira(s): +{b}%.', { a: info.suppliesCount, b: Math.round(ROUTE.supplierBonus * info.suppliesCount * 100) })}</span>}
      </p>
      {mine.map(r => {
        const other = game.locations.find(l => l.id === (r.a === loc.id ? r.b : r.a));
        if (!other) return null;
        const gives = colonyProduces(other).includes(need);
        const takes = colonyProduces(loc).includes(needOf(other));
        return (
          <div key={r.id} className="route-row">
            <button className="link" onClick={() => select(other.id)}>{other.name}</button>
            <small>{gives ? t('fornece {recurso}', { recurso: t(RESOURCES[need].name).toLowerCase() }) : ''}{gives && takes ? ' · ' : ''}{takes ? t('recebe de você') : ''}{!gives && !takes ? t('sem troca útil') : ''}</small>
            {isBlocked(game, r) && <small className="sev-bad">{t('bloqueada')}</small>}
            {r.insured
              ? <button className="btn small active" title={t('Rota segurada: imune a bloqueios (custa manutenção). Clique para remover.')} onClick={() => dropInsurance(r.id)}>{t('Segurada')}</button>
              : <button className="btn small" disabled={!canAfford(game, insuranceCost(game))} title={t('Seguro: a rota fica imune a bloqueios de piratas, ao custo de manutenção.')} onClick={() => insure(r.id)}>{t('Segurar')} <CostList cost={insuranceCost(game)} have={game.resources} /></button>}
            <button className="btn small" onClick={() => close(r.id)}>{t('Encerrar')}</button>
          </div>
        );
      })}
      {!unlocked && <p className="hint"><Tx k="Pesquise <b>Rotas de transporte</b> (fase 5) para abrir rotas." /></p>}
      {unlocked && partners.length === 0 && mine.length === 0 && <p className="hint">{t('Funde outra colônia para poder ligá-las.')}</p>}
      {unlocked && partners.length > 0 && (
        <div className="route-new">
          <select value={chosen?.id ?? ''} onChange={e => setTarget(e.target.value)} aria-label={t('Colônia parceira')}>
            {partners.map(p => {
              const sc = routeScore(loc, p);
              return <option key={p.id} value={p.id}>{p.name} · {t(LOCATION_BY_TYPE[p.type].name)}{sc >= 2 ? ' ★ ' + t('abastece') : sc === 1 ? ' · ' + t('recebe') : ''}</option>;
            })}
          </select>
          <button className="btn buy" disabled={!check.ok} onClick={() => chosen && open(loc.id, chosen.id)}>
            {t('Abrir rota')} <CostList cost={cost} have={game.resources} />
          </button>
        </div>
      )}
      {unlocked && !check.ok && check.reason && partners.length > 0 && <p className="status sev-warn">{t(check.reason)}</p>}
    </div>
  );
}
