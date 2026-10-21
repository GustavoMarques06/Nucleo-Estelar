import { useGame } from '../../game/store';
import { CREW, CREW_MAX_LEVEL, crewXpFor } from '../../game/data/crew';
import { crewAvailable, crewLevel, crewSeats } from '../../game/engine/crew';
import { fmtDuration } from '../../game/engine/format';
import { Portrait } from '../Portrait';
import { t } from '../../i18n';

/** Conselho: as vozes do Arquivo como conselheiros, com poucas vagas na ativa (aba Civilização). */
export function CrewSection() {
  const game = useGame(s => s.game);
  const toggle = useGame(s => s.toggleCrew);
  const joined = crewAvailable(game);
  if (!joined.length) return null;
  const seats = crewSeats(game);
  const full = game.crew.active.length >= seats;
  return (
    <>
      <h4 className="section">{t('Conselho · {a}/{b} vagas', { a: game.crew.active.length, b: seats })}</h4>
      <p className="hint">{t('Só quem está na ativa ajuda e ganha experiência (também com o jogo fechado). O nível nunca se perde, nem na Ascensão.')}{seats < 3 ? ' ' + t('A primeira Ascensão abre uma terceira vaga.') : ''}</p>
      {CREW.map(c => {
        if (!joined.includes(c)) return <div key={c.id} className="diary-locked">??? <small>{t(c.joinsText)}</small></div>;
        const xp = game.crew.xp[c.id] ?? 0;
        const level = crewLevel(xp);
        const on = game.crew.active.includes(c.id);
        const maxed = level >= CREW_MAX_LEVEL;
        const from = crewXpFor(level), to = crewXpFor(level + 1);
        return (
          <article key={c.id} className={`card crew ${on ? 'on' : ''}`}>
            <Portrait speaker={c.name} />
            <div className="card-main">
              <h3>{t(c.name)} <span className="count">{t('nível {n}', { n: level })}/{CREW_MAX_LEVEL}</span> {on && <span className="count ok">{t('na ativa')}</span>}</h3>
              <p className="desc">{t(c.role)}</p>
              <p className="desc">{c.desc(level)}</p>
              {!maxed && (
                <>
                  <div className="bar" role="progressbar" aria-valuenow={Math.round(((xp - from) / (to - from)) * 100)} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${((xp - from) / (to - from)) * 100}%` }} /></div>
                  <small className="dim">{t('Próximo nível: {tempo} na ativa.', { tempo: fmtDuration(to - xp) })}</small>
                </>
              )}
            </div>
            <button className="btn buy" disabled={!on && full} onClick={() => toggle(c.id)} title={!on && full ? t('Todas as vagas ocupadas: dispense alguém primeiro.') : undefined}>
              {on ? t('Dispensar') : t('Convocar')}
            </button>
          </article>
        );
      })}
    </>
  );
}
