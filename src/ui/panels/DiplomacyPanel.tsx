import { useGame } from '../../game/store';
import { ALLIANCE_AT, BOND_AT, FACTIONS, FACTION_BY_ID, QUEST_RELATION, RIVAL_PENALTY, TIER_NAME, TREATY_AT, tierOf } from '../../game/data/factions';
import { RESOURCES } from '../../game/data/resources';
import { DECREES } from '../../game/data/decrees';
import { LOBBY_GAIN, canGift, canLobby, diplomacyUnlocked, giftCost, giftGain, lobbyCost } from '../../game/engine/factions';
import { activeDecree, canEnact, decreeCost, decreesUnlocked } from '../../game/engine/decrees';
import { fmt, fmtDuration, fmtRate } from '../../game/engine/format';
import { canFulfillQuest } from '../../game/engine/factions';
import { Icon } from '../Icon';
import { BuildingList, BuyAmountPicker, CostList } from './BuildingsPanel';
import { t } from '../../i18n';
import { Tx } from '../../i18n/Tx';

/** Influência: gerada por embaixadas e tratados; compra decretos, campanhas e resolve disputas. */
function Influence() {
  const game = useGame(s => s.game);
  const rate = useGame(s => s.rates.influence);
  const enact = useGame(s => s.enactDecree);
  if (!decreesUnlocked(game) && game.resources.influence <= 0) {
    return <p className="hint"><Tx k="Pesquise <b>Corpo diplomático</b> para construir Embaixadas: elas geram <b>influência</b>, que compra decretos e resolve disputas por locais." /></p>;
  }
  return (
    <>
      <h4 className="section">{t('Influência')}</h4>
      <p className="hint">
        <Icon name="icon-influence" size={18} /> <b>{fmt(game.resources.influence)}</b> {Math.abs(rate) > 0.001 && <>({fmtRate(rate)})</>} · {t('tratados e alianças rendem um fio constante; embaixadas geram o resto.')}
        {' '}{t('Gaste em decretos, em campanhas diplomáticas (cartões abaixo) ou para fundar colônias em locais disputados sem taxa.')}
      </p>
      <BuyAmountPicker />
      <BuildingList category="diplomacy" title={t('Embaixadas')} />
      {decreesUnlocked(game) && (
        <>
          <h4 className="section">{t('Decretos')}</h4>
          <p className="hint">{t('Governar um império grande custa mais: +6% por colônia no custo de cada decreto.')}</p>
          {DECREES.map(d => {
            const act = activeDecree(game, d.id);
            const can = canEnact(game, d.id);
            return (
              <article key={d.id} className={`card decree ${act ? 'on' : ''}`}>
                <Icon name={d.icon} size={48} className="card-art" />
                <div className="card-main">
                  <h3>{t(d.name)} {act && <span className="count ok">{t('ativo · {tempo}', { tempo: fmtDuration(act.remaining) })}</span>}</h3>
                  <p className="desc">{t(d.desc)}</p>
                </div>
                <button className="btn buy" disabled={!can.ok} onClick={() => enact(d.id)}>
                  {act ? t('Renovar') : t('Decretar')}
                  <CostList cost={{ influence: decreeCost(game, d.id) }} have={game.resources} />
                </button>
              </article>
            );
          })}
        </>
      )}
    </>
  );
}

/** Relações com as três facções: tratados, alianças e disputas por locais. */
export function DiplomacyPanel() {
  const game = useGame(s => s.game);
  const gift = useGame(s => s.giveGift);
  const lobby = useGame(s => s.lobby);
  const fulfill = useGame(s => s.fulfillQuest);
  if (!diplomacyUnlocked(game)) {
    return <div className="panel-body"><p className="hint"><Tx k="Pesquise <b>Diplomacia estelar</b> para estabelecer contato com as facções." /></p></div>;
  }
  return (
    <div className="panel-body">
      <Influence />
      <h4 className="section">{t('Facções')}</h4>
      <p className="hint">
        <Tx k="Três facções disputam o espaço com você. Presentes elevam a relação; com <b>{t}</b> há tratado comercial e os locais que elas reivindicam são liberados; com <b>{a}</b>, aliança; com <b>{b}</b>, irmandade. Presentes esfriam a rival em {r}, e quem é aliado de uma facção esfria a rival dela aos poucos. Os <b>pedidos</b> abaixo são a forma mais barata de subir a relação." v={{ t: TREATY_AT, a: ALLIANCE_AT, b: BOND_AT, r: RIVAL_PENALTY }} />
      </p>
      {FACTIONS.map(f => {
        const st = game.factions[f.id];
        const tier = tierOf(st.relation);
        const can = canGift(game, f.id);
        const lob = canLobby(game, f.id);
        const claimed = game.locations.filter(l => l.claimedBy === f.id);
        const quest = game.quests.find(q => q.faction === f.id);
        const rivalAllied = (game.factions[f.rival]?.relation ?? 0) >= ALLIANCE_AT;
        return (
          <article key={f.id} className="card faction" style={{ ['--faction' as string]: f.color }}>
            <Icon name={f.sprite} size={72} className="card-art" />
            <div className="card-main">
              <h3>{t(f.name)} <span className="count">{t(TIER_NAME[tier])}</span></h3>
              <p className="desc">{t(f.tagline)}. {t(f.desc)}</p>
              <div className="rel-bar" title={t('Relação {n} de 100', { n: Math.round(st.relation) })}>
                <div style={{ width: `${st.relation}%`, background: f.color }} />
                <i style={{ left: `${TREATY_AT}%` }} /><i style={{ left: `${ALLIANCE_AT}%` }} /><i style={{ left: `${BOND_AT}%` }} />
              </div>
              <ul className="stats">
                <li className={tier >= 1 ? 'sev-ok' : 'dim'}>{t('Tratado')} ({TREATY_AT}): {t(f.treatyText)}</li>
                <li className={tier >= 2 ? 'sev-ok' : 'dim'}>{t('Aliança')} ({ALLIANCE_AT}): {t(f.allianceText)}</li>
                <li className={tier >= 3 ? 'sev-ok' : 'dim'}>{t('Irmandade')} ({BOND_AT}): {t(f.bondText)}</li>
                <li>{t('Rival: {nome} · reivindica {n} dos seus locais', { nome: t(FACTION_BY_ID[f.rival].name), n: claimed.length })}</li>
              </ul>
              {claimed.length > 0 && (
                <p className="status sev-warn">
                  {t('Fronteira: {locais}', { locais: claimed.map(l => l.name).join(', ') })}
                  {tier >= 1 ? ' ' + t('(o tratado libera esses locais para colonizar)') : ''}
                </p>
              )}
              {rivalAllied && st.relation > 0 && <p className="status sev-warn">{t(FACTION_BY_ID[f.rival].masc ? 'Tensão: você é aliado do {nome}, rival desta facção. A relação esfria aos poucos.' : 'Tensão: você é aliado da {nome}, rival desta facção. A relação esfria aos poucos.', { nome: t(FACTION_BY_ID[f.rival].name) })}</p>}
              {quest && (
                <div className="quest" style={{ borderColor: f.color }}>
                  <b>{quest.honor ? t('Missão de honra: {titulo}', { titulo: t(f.quest.title) }) : t('Pedido: {titulo}', { titulo: t(f.quest.title) })}</b>
                  <p className="desc">
                    <Tx k="Entregar <b>{n}</b> {recurso} (você tem {tem}). Paga +{rel} de relação, {premio}. Expira em {tempo}." v={{ n: fmt(quest.amount), recurso: t(RESOURCES[quest.res].name).toLowerCase(), tem: fmt(game.resources[quest.res]), rel: QUEST_RELATION, premio: t(f.quest.rewardText), tempo: fmtDuration(quest.remaining) }} />
                  </p>
                  <div className="bar"><div style={{ width: `${(quest.remaining / quest.total) * 100}%` }} /></div>
                  <button className="btn buy" disabled={!canFulfillQuest(game, quest.id)} onClick={() => fulfill(quest.id)}>
                    {t('Entregar')} <CostList cost={{ [quest.res]: quest.amount }} have={game.resources} />
                  </button>
                </div>
              )}
              {!can.ok && can.reason && <p className="status sev-warn">{t(can.reason)}{st.cooldown > 0 && ` (${fmtDuration(st.cooldown)})`}</p>}
            </div>
            <div className="buy-col">
              <button className="btn buy" disabled={!can.ok} onClick={() => gift(f.id)}>
                {t('Presentear')} +{giftGain(st.relation)}
                <CostList cost={giftCost(game, f.id)} have={game.resources} />
              </button>
              {(game.upgrades.embassies || game.resources.influence > 0) && (
                <button className="btn buy" disabled={!lob.ok} onClick={() => lobby(f.id)}
                  title={t('Campanha diplomática: a influência compra relação sem presentes e sem esfriar a rival.')}>
                  {t('Campanha')} +{LOBBY_GAIN}
                  <CostList cost={lobbyCost(game, f.id)} have={game.resources} />
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
