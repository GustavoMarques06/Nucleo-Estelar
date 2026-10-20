import { useState } from 'react';
import type { Amounts, Location, ResId, Specialization } from '../../game/types';
import { useGame } from '../../game/store';
import { RESOURCES } from '../../game/data/resources';
import { BALANCE } from '../../game/data/balance';
import { LOCATION_BY_TYPE, SPECIALIZATIONS } from '../../game/data/locations';
import { FACTION_BY_ID, TREATY_AT } from '../../game/data/factions';
import { MINERAL_BY_ID } from '../../game/data/minerals';
import { canAfford } from '../../game/engine/costs';
import { getModifiers } from '../../game/engine/modifiers';
import {
  LINK_BONUS, MAX_TERRA, canTerraform, isDisputed, linkCost, linkDemand, linkLoss, linkUnlocked, locationSprite, outpostCost, outpostUpgradeCost, outpostYield,
  terraformCost, terraformDuration, terraformable,
} from '../../game/engine/expansion';
import { fmt, fmtDuration } from '../../game/engine/format';
import { artUrl } from '../../assets';
import { Icon } from '../Icon';
import { Tx } from '../../i18n/Tx';
import { CostList } from './BuildingsPanel';
import { CrisisBox, RoutesBox } from './ColonyExtras';
import { t } from '../../i18n';

export function Yields({ y }: { y: Amounts }) {
  const list = (Object.entries(y) as [ResId, number][]).filter(([, v]) => v > 0.0005);
  if (!list.length) return null;
  return (
    <span className="cost yields">
      {list.map(([r, v]) => <span key={r} title={t(RESOURCES[r].name)}><Icon name={RESOURCES[r].icon} size={16} />+{fmt(v)}/s</span>)}
    </span>
  );
}

function Terraform({ loc }: { loc: Location }) {
  const game = useGame(s => s.game);
  const start = useGame(s => s.startTerraform);
  const o = loc.outpost!;
  const m = getModifiers(game);
  if (!terraformable(loc)) return <p className="hint">{t('Este tipo de mundo não pode ser terraformado.')}</p>;
  const stars = '★'.repeat(o.terra) + '☆'.repeat(MAX_TERRA - o.terra);
  const can = canTerraform(game, loc);
  const cost = terraformCost(loc);
  return (
    <div className="terra">
      <h4 className="section sub">{t('Terraformação')} <span className="stars" title={t('Nível de terraformação')}>{stars}</span></h4>
      {o.terraRemaining > 0 ? (
        <>
          <p className="desc">{t('Transformando o ambiente… {tempo}', { tempo: fmtDuration(o.terraRemaining / m.terraSpeed) })}</p>
          <div className="bar"><div style={{ width: `${(1 - o.terraRemaining / o.terraTotal) * 100}%` }} /></div>
        </>
      ) : o.terra >= MAX_TERRA ? (
        <p className="status sev-ok">{t('Mundo-jardim: produção ×{a}, moradia para {b} colonos e alimento próprio.', { a: (1 + 0.3 * MAX_TERRA).toFixed(1), b: fmt(30 * MAX_TERRA * loc.richness) })}</p>
      ) : (
        <>
          <p className="desc">
            {t('Nível {n}: produção +30%, moradia +{m}', { n: o.terra + 1, m: fmt(30 * loc.richness) })}{o.terra + 1 >= 3 ? ', ' + t('alimento próprio') : ''} · {fmtDuration(terraformDuration(loc, m))}
          </p>
          {!game.upgrades.terraforming && <p className="hint"><Tx k="Pesquise <b>Terraformação</b> (fase 5)." /></p>}
          {game.upgrades.terraforming && !can.ok && can.reason && <p className="status sev-warn">{t(can.reason)}</p>}
          {game.upgrades.terraforming && (
            <button className="btn buy" disabled={!can.ok} onClick={() => start(loc.id)}>
              {t('Terraformar')} <CostList cost={cost} have={game.resources} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

function LinkBox({ loc }: { loc: Location }) {
  const game = useGame(s => s.game);
  const link = useGame(s => s.linkColony);
  if (!linkUnlocked(game)) return null;
  if (loc.outpost?.link) {
    return (
      <p className="status sev-ok">
        {t('Ligada à rede: rendimento +{b}%, puxa {n} de energia ({p}% se perde na transmissão).', { b: Math.round(LINK_BONUS * 100), n: fmt(linkDemand(loc)), p: Math.round(linkLoss(loc) * 100) })}
      </p>
    );
  }
  const cost = linkCost(loc);
  return (
    <div className="loc-actions">
      <button className="btn buy" disabled={!canAfford(game, cost)} onClick={() => link(loc.id)}
        title={t('Linha de transmissão: a colônia rende +{b}% enquanto a rede da base a alimentar, mas puxa energia do asteroide.', { b: Math.round(LINK_BONUS * 100) })}>
        {t('Ligar à rede')} <CostList cost={cost} have={game.resources} />
      </button>
    </div>
  );
}

export function LocationCard({ loc }: { loc: Location }) {
  const game = useGame(s => s.game);
  const establish = useGame(s => s.establishOutpost);
  const upgrade = useGame(s => s.upgradeOutpost);
  const setSpec = useGame(s => s.setSpecialization);
  const [spec, setLocalSpec] = useState<Specialization>('mining');
  const def = LOCATION_BY_TYPE[loc.type];
  const m = getModifiers(game);
  const mineral = MINERAL_BY_ID[loc.mineral];
  const claim = loc.claimedBy ? FACTION_BY_ID[loc.claimedBy] : null;
  const disputed = isDisputed(game, loc);
  const cost = outpostCost(game, loc);
  const influenceCost = outpostCost(game, loc, true);
  // Prévia da produção com a especialização escolhida (nível 1) antes de fundar.
  const preview = outpostYield({ ...loc, outpost: loc.outpost ?? { level: 1, spec, terra: 0, terraRemaining: 0, terraTotal: 0 } }, m, game);

  return (
    <article className="loc-card">
      {def.terrain && <div className="loc-terrain" style={{ backgroundImage: `url(${artUrl(def.terrain)})` }} />}
      <div className="loc-body">
        <Icon name={locationSprite(loc)} size={64} className="card-art" />
        <div className="card-main">
          <h3>{loc.name} {loc.outpost && <span className="count">{t('nível {n}', { n: loc.outpost.level })}</span>}</h3>
          <p className="desc">{t('{tipo} · riqueza ×{r} · distância {d}', { tipo: t(def.name), r: loc.richness.toFixed(2), d: loc.distance })}</p>
          {mineral && <p className="desc">{t('Mineral: {nome} ({raridade})', { nome: t(mineral.name), raridade: t(mineral.rarity) })}</p>}
          <Yields y={preview} />
        </div>
      </div>
      {claim && !loc.outpost && (
        <p className={`status ${disputed ? 'sev-warn' : 'sev-ok'} claim`} style={{ borderColor: claim.color }}>
          {disputed
            ? t('Reivindicado pela {faccao}. Sem tratado (relação {r}), fundar custa ×{m} e esfria a relação em {p}.', { faccao: t(claim.name), r: TREATY_AT, m: BALANCE.disputeMult, p: BALANCE.disputePenalty })
            : t('Reivindicado pela {faccao} — o tratado libera a fundação sem taxa.', { faccao: t(claim.name) })}
        </p>
      )}
      {loc.outpost ? (
        <>
          <div className="loc-actions">
            <label className="spec">{t('Especialização')}
              <select value={loc.outpost.spec} onChange={e => setSpec(loc.id, e.target.value as Specialization)}>
                {SPECIALIZATIONS.map(sp => <option key={sp.id} value={sp.id}>{t(sp.name)}</option>)}
              </select>
            </label>
            <button className="btn buy" disabled={!canAfford(game, outpostUpgradeCost(loc))} onClick={() => upgrade(loc.id)}>
              {t('Ampliar colônia')} <CostList cost={outpostUpgradeCost(loc)} have={game.resources} />
            </button>
          </div>
          <LinkBox loc={loc} />
          <CrisisBox loc={loc} />
          <RoutesBox loc={loc} />
          <Terraform loc={loc} />
        </>
      ) : (
        <div className="loc-actions">
          <label className="spec">{t('Especialização')}
            <select value={spec} onChange={e => setLocalSpec(e.target.value as Specialization)}>
              {SPECIALIZATIONS.map(sp => <option key={sp.id} value={sp.id}>{t(sp.name)}</option>)}
            </select>
          </label>
          <button className="btn buy" disabled={!canAfford(game, cost)} onClick={() => establish(loc.id, spec)}>
            {disputed ? t('Fundar (disputa)') : t('Fundar colônia')} <CostList cost={cost} have={game.resources} />
          </button>
          {disputed && game.upgrades.embassies && (
            <button className="btn buy" disabled={!canAfford(game, influenceCost)} onClick={() => establish(loc.id, spec, true)}
              title={t('Resolve a disputa na diplomacia: sem taxa extra e sem esfriar a relação.')}>
              {t('Fundar via influência')} <CostList cost={influenceCost} have={game.resources} />
            </button>
          )}
        </div>
      )}
      <p className="hint spec-desc">{t(SPECIALIZATIONS.find(sp => sp.id === (loc.outpost?.spec ?? spec))?.desc ?? '')}</p>
    </article>
  );
}
