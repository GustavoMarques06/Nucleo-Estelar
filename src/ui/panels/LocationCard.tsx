import { useState } from 'react';
import type { Amounts, Location, ResId, Specialization } from '../../game/types';
import { useGame } from '../../game/store';
import { RESOURCES } from '../../game/data/resources';
import { BALANCE } from '../../game/data/balance';
import { APTITUDE_NAME, LOCATION_BY_TYPE, SPECIALIZATIONS } from '../../game/data/locations';
import { aptitudeOf, civHousing, locationTraits, specFit, specOptions } from '../../game/engine/aptitude';
import { FACTION_BY_ID, TREATY_AT } from '../../game/data/factions';
import { MINERAL_BY_ID } from '../../game/data/minerals';
import { canAfford } from '../../game/engine/costs';
import { getModifiers } from '../../game/engine/modifiers';
import {
  LINK_BONUS, MAX_TERRA, canTerraform, isDisputed, linkCost, linkDemand, linkLoss, linkUnlocked, locationSprite, outpostCost, outpostUpgradeCost, outpostYield,
  reconvertCost, reconvertLevels, terraformCost, terraformDuration, terraformable,
} from '../../game/engine/expansion';
import { fmt, fmtDuration } from '../../game/engine/format';
import { artUrl } from '../../assets';
import { Icon } from '../Icon';
import { Tx } from '../../i18n/Tx';
import { CostList } from './BuildingsPanel';
import { CrisisBox, RoutesBox } from './ColonyExtras';
import { DigBox } from './DigBox';
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

/** Traços do planeta (sorteados pela semente): o que o torna diferente dos outros do mesmo tipo. */
function Traits({ loc }: { loc: Location }) {
  return (
    <p className="traits">
      {locationTraits(loc).map(tr => (
        <span key={tr.id} className="trait" title={t(tr.desc)}>{t(tr.name)} <small>{t(tr.desc)}</small></span>
      ))}
    </p>
  );
}

/** Lista dos propósitos que este mundo aceita, com aptidão e prévia da produção no nível atual (ou 1). */
function PurposePicker({ loc, value, onPick, exclude }: { loc: Location; value: Specialization | null; onPick: (sp: Specialization) => void; exclude?: Specialization }) {
  const game = useGame(s => s.game);
  const m = getModifiers(game);
  const level = loc.outpost?.level ?? 1;
  return (
    <div className="purposes" role="radiogroup" aria-label={t('Propósito')}>
      {specOptions(loc).filter(sp => sp !== exclude).map(sp => {
        const def = SPECIALIZATIONS.find(d => d.id === sp)!;
        const apt = aptitudeOf(loc, sp)!;
        const outpost = { level, spec: sp, terra: loc.outpost?.terra ?? 0, terraRemaining: 0, terraTotal: 0 };
        const y = outpostYield({ ...loc, outpost }, m, game);
        const housing = civHousing({ ...loc, outpost });
        return (
          <button key={sp} type="button" role="radio" aria-checked={value === sp} className={`purpose ${value === sp ? 'sel' : ''}`} onClick={() => onPick(sp)}>
            <span className="purpose-head">
              <Icon name={def.icon} size={22} /> {t(def.name)}
              <span className={`apt apt-${apt}`} title={t('Aptidão deste mundo')}>{t(APTITUDE_NAME[apt])} ×{fmt(specFit(loc, sp))}</span>
            </span>
            <Yields y={y} />
            {housing > 0 && <span className="hint">{t('Moradia +{n}', { n: fmt(housing) })}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Reconversão: muda o propósito pagando caro e perdendo parte dos níveis. */
function Reconvert({ loc }: { loc: Location }) {
  const game = useGame(s => s.game);
  const setSpec = useGame(s => s.setSpecialization);
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<Specialization | null>(null);
  const o = loc.outpost!;
  const cost = reconvertCost(loc);
  const lose = reconvertLevels(loc);
  if (specOptions(loc).length < 2) return null;
  if (!open) return <button className="btn" onClick={() => setOpen(true)}>{t('Reconverter colônia…')}</button>;
  return (
    <div className="reconvert">
      <h4 className="section sub">{t('Reconverter colônia')}</h4>
      <p className="hint">{lose > 0 ? t('Mudar de propósito custa caro e a colônia volta {n} nível(is) (para o nível {l}).', { n: lose, l: o.level - lose }) : t('Mudar de propósito custa caro.')}</p>
      <PurposePicker loc={loc} value={pick} onPick={setPick} exclude={o.spec} />
      <div className="loc-actions">
        <button className="btn buy" disabled={!pick || !canAfford(game, cost)} onClick={() => { if (pick) { setSpec(loc.id, pick); setOpen(false); setPick(null); } }}>
          {t('Reconverter')} <CostList cost={cost} have={game.resources} />
        </button>
        <button className="btn" onClick={() => { setOpen(false); setPick(null); }}>{t('Cancelar')}</button>
      </div>
    </div>
  );
}

export function LocationCard({ loc }: { loc: Location }) {
  const game = useGame(s => s.game);
  const establish = useGame(s => s.establishOutpost);
  const upgrade = useGame(s => s.upgradeOutpost);
  // Sem escolha prévia: o jogador decide o propósito antes de fundar.
  const [spec, setLocalSpec] = useState<Specialization | null>(null);
  const def = LOCATION_BY_TYPE[loc.type];
  const m = getModifiers(game);
  const mineral = MINERAL_BY_ID[loc.mineral];
  const claim = loc.claimedBy ? FACTION_BY_ID[loc.claimedBy] : null;
  const disputed = isDisputed(game, loc);
  const cost = outpostCost(game, loc);
  const influenceCost = outpostCost(game, loc, true);
  // Colônia fundada: a produção real. Antes de fundar: só o que o mundo rende sozinho (cada propósito mostra a sua prévia).
  const preview = loc.outpost ? outpostYield(loc, m, game) : {};
  const current = loc.outpost ? SPECIALIZATIONS.find(sp => sp.id === loc.outpost!.spec) : null;
  const currentApt = loc.outpost ? aptitudeOf(loc, loc.outpost.spec) : null;

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
      <Traits loc={loc} />
      {claim && !loc.outpost && (
        <p className={`status ${disputed ? 'sev-warn' : 'sev-ok'} claim`} style={{ borderColor: claim.color }}>
          {disputed
            ? t(claim.masc ? 'Reivindicado pelo {faccao}. Sem tratado (relação {r}), fundar custa ×{m} e esfria a relação em {p}.' : 'Reivindicado pela {faccao}. Sem tratado (relação {r}), fundar custa ×{m} e esfria a relação em {p}.', { faccao: t(claim.name), r: TREATY_AT, m: BALANCE.disputeMult, p: BALANCE.disputePenalty })
            : t(claim.masc ? 'Reivindicado pelo {faccao} — o tratado libera a fundação sem taxa.' : 'Reivindicado pela {faccao} — o tratado libera a fundação sem taxa.', { faccao: t(claim.name) })}
        </p>
      )}
      {loc.outpost ? (
        <>
          {current && currentApt && (
            <p className="purpose-now">
              <Icon name={current.icon} size={22} /> {t('Propósito')}: <b>{t(current.name)}</b>
              <span className={`apt apt-${currentApt}`}>{t(APTITUDE_NAME[currentApt])} ×{fmt(specFit(loc, current.id))}</span>
              {civHousing(loc) > 0 && <span className="hint"> · {t('Moradia +{n}', { n: fmt(civHousing(loc)) })}</span>}
            </p>
          )}
          <div className="loc-actions">
            <button className="btn buy" disabled={!canAfford(game, outpostUpgradeCost(loc))} onClick={() => upgrade(loc.id)}>
              {t('Ampliar colônia')} <CostList cost={outpostUpgradeCost(loc)} have={game.resources} />
            </button>
            <Reconvert loc={loc} />
          </div>
          <LinkBox loc={loc} />
          <CrisisBox loc={loc} />
          <RoutesBox loc={loc} />
          <Terraform loc={loc} />
        </>
      ) : (
        <>
          <h4 className="section sub">{t('O que este planeta será?')}</h4>
          <p className="hint">{t('Escolha o propósito antes de fundar. Depois, só dá para mudar com uma reconversão cara.')}</p>
          <PurposePicker loc={loc} value={spec} onPick={setLocalSpec} />
          <div className="loc-actions">
            <button className="btn buy" disabled={!spec || !canAfford(game, cost)} onClick={() => spec && establish(loc.id, spec)}
              title={spec ? undefined : t('Escolha um propósito primeiro.')}>
              {disputed ? t('Fundar (disputa)') : t('Fundar colônia')} <CostList cost={cost} have={game.resources} />
            </button>
            {disputed && game.upgrades.embassies && (
              <button className="btn buy" disabled={!spec || !canAfford(game, influenceCost)} onClick={() => spec && establish(loc.id, spec, true)}
                title={t('Resolve a disputa na diplomacia: sem taxa extra e sem esfriar a relação.')}>
                {t('Fundar via influência')} <CostList cost={influenceCost} have={game.resources} />
              </button>
            )}
          </div>
        </>
      )}
      {(loc.outpost?.spec ?? spec) && <p className="hint spec-desc">{t(SPECIALIZATIONS.find(sp => sp.id === (loc.outpost?.spec ?? spec))?.desc ?? '')}</p>}
      <DigBox loc={loc} />
    </article>
  );
}
