import type { CSSProperties } from 'react';
import type { ResId } from '../../game/types';
import { useGame } from '../../game/store';
import { FACTION_BY_ID } from '../../game/data/factions';
import { RACE_DELAY, RACE_LOSE_TEXT, RACE_TIME, RACE_WIN_TEXT } from '../../game/data/race';
import { MEGA_BY_ID } from '../../game/data/megaprojects';
import { canDelayRival, delayCost } from '../../game/engine/race';
import { getModifiers } from '../../game/engine/modifiers';
import { fmtDuration } from '../../game/engine/format';
import { Icon } from '../Icon';
import { CostList } from './BuildingsPanel';
import { t } from '../../i18n';

/** Quanto do Portal estelar o jogador já entregou (média das frações de cada material). */
function gateShare(game: ReturnType<typeof useGame.getState>['game']): number {
  if ((game.megaprojects.gate ?? 0) >= 1) return 1;
  const k = getModifiers(game).megaCost;
  const cost = MEGA_BY_ID.gate.stages[0].cost;
  const got = game.megaprogress.gate ?? {};
  const parts = (Object.entries(cost) as [ResId, number][]).map(([r, v]) => Math.min(1, (got[r] ?? 0) / (v * k)));
  return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
}

/** Corrida pelo Portal estelar contra a facção mais fria (aba Megaprojetos). */
export function RaceCard() {
  const game = useGame(s => s.game);
  const delay = useGame(s => s.delayRival);
  const race = game.race;
  if (!race) return null;
  const f = FACTION_BY_ID[race.faction];
  const name = t(f.name);
  const mine = gateShare(game);
  const can = canDelayRival(game);
  return (
    <article className={`card faction race ${race.result ?? ''}`} style={{ '--faction': f.color } as CSSProperties}>
      <Icon name="mega-gate" size={64} className="card-art" />
      <div className="card-main">
        <h3>{t('Corrida pelo Portal')} {race.result === 'won' && <span className="count ok">{t('vitória')}</span>}{race.result === 'lost' && <span className="count warn">{t('derrota')}</span>}</h3>
        <p className="desc">{t(f.masc ? 'O {faccao} também constrói um portal. Termine o seu Portal estelar primeiro.' : 'A {faccao} também constrói um portal. Termine o seu Portal estelar primeiro.', { faccao: name })}</p>
        <div className="race-bars">
          <span>{t('Seu portal')}</span><div className="bar"><div style={{ width: `${mine * 100}%` }} /></div><small>{Math.round(mine * 100)}%</small>
          <span style={{ color: f.color }}>{name}</span><div className="bar rival"><div style={{ width: `${race.progress * 100}%`, background: f.color }} /></div><small>{Math.round(race.progress * 100)}%</small>
        </div>
        {race.result === 'won' && <p className="status sev-ok">{t(RACE_WIN_TEXT)}</p>}
        {race.result === 'lost' && <p className="status sev-warn">{t(RACE_LOSE_TEXT)}</p>}
        {!race.result && (
          <>
            <p className="hint">{t('No ritmo de agora, a rival termina em {tempo} de jogo.', { tempo: fmtDuration((1 - race.progress) * RACE_TIME) })} <b>{t('Vitória')}:</b> {t(RACE_WIN_TEXT)} <b>{t('Derrota')}:</b> {t(RACE_LOSE_TEXT)}</p>
            {!can.ok && can.reason && <p className="status sev-warn">{t(can.reason)}</p>}
          </>
        )}
      </div>
      {!race.result && (
        <button className="btn buy" disabled={!can.ok} onClick={delay} title={t('A influência atrasa a obra rival, mas a relação com ela cai.')}>
          {t('Atrasar a rival (−{n}%)', { n: Math.round(RACE_DELAY * 100) })} <CostList cost={delayCost(game)} have={game.resources} />
        </button>
      )}
    </article>
  );
}
