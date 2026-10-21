import type { Location } from '../../game/types';
import { useGame } from '../../game/store';
import { DIG_STAGES, RELICS, RELIC_BY_ID } from '../../game/data/relics';
import { anomalyName, canDig, digCost, digOf, digsUnlocked, hasAnomaly } from '../../game/engine/digs';
import { fmtDuration } from '../../game/engine/format';
import { Icon } from '../Icon';
import { CostList } from './BuildingsPanel';
import { t } from '../../i18n';

/** Sítio de anomalia de um local: três etapas de escavação até uma relíquia (cartão do local, no Mapa). */
export function DigBox({ loc }: { loc: Location }) {
  const game = useGame(s => s.game);
  const start = useGame(s => s.startDig);
  if (!digsUnlocked(game) || !hasAnomaly(loc)) return null;
  const dig = digOf(game, loc.id);
  const done = game.dug.includes(loc.id);
  const stage = dig?.stage ?? 0;
  const can = canDig(game, loc.id);
  const cost = digCost(game, stage);
  return (
    <div className="dig">
      <h4 className="section sub"><Icon name="icon-radar" size={18} /> {t('Sítio de anomalia: {nome}', { nome: t(anomalyName(loc)) })}</h4>
      {done ? (
        <p className="status sev-ok">{t('Sítio escavado.')}</p>
      ) : dig && dig.remaining > 0 ? (
        <>
          <p className="desc">{t('Etapa {n}/{m}: {nome} · {tempo}', { n: stage + 1, m: DIG_STAGES.length, nome: t(DIG_STAGES[stage].name), tempo: fmtDuration(dig.remaining) })}</p>
          <div className="bar"><div style={{ width: `${(1 - dig.remaining / dig.total) * 100}%` }} /></div>
        </>
      ) : (
        <>
          <p className="desc">
            {t('Etapa {n}/{m}: {nome} ({tempo}).', { n: stage + 1, m: DIG_STAGES.length, nome: t(DIG_STAGES[stage].name), tempo: fmtDuration(DIG_STAGES[stage].time) })}
            {' '}{game.relics.length < RELICS.length ? t('No fim, uma relíquia dos Acendedores.') : t('Todas as relíquias já foram achadas: o sítio rende material raro.')}
          </p>
          {!can.ok && can.reason && <p className="status sev-warn">{t(can.reason)}</p>}
          <div className="loc-actions">
            <button className="btn buy" disabled={!can.ok} onClick={() => start(loc.id)}>
              {stage === 0 ? t('Escavar') : t('Continuar escavação')} <CostList cost={cost} have={game.resources} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Coleção de relíquias (aba Registro). */
export function Relics() {
  const got = useGame(s => s.game.relics);
  return (
    <>
      <p className="hint">{t('{a} de {b} relíquias. Elas saem das escavações em sítios de anomalia (cartões do Mapa) e valem para sempre, mesmo depois da Ascensão e da Transcendência.', { a: got.length, b: RELICS.length })}</p>
      <div className="achievements">
        {RELICS.map(r => {
          const done = got.includes(r.id);
          return (
            <div key={r.id} className={`achievement ${done ? 'done' : ''}`} title={done ? t(RELIC_BY_ID[r.id].text) : t('Ainda não encontrada')}>
              <Icon name={r.icon} size={44} />
              <div><b>{done ? t(r.name) : '???'}</b><small>{done ? `${t(r.desc)} ${t(r.text)}` : t('Ainda não encontrada')}</small></div>
            </div>
          );
        })}
      </div>
    </>
  );
}
