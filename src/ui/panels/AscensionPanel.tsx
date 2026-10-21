import { useState } from 'react';
import { useGame } from '../../game/store';
import { PERKS, perkCost } from '../../game/data/ascension';
import { CHALLENGES } from '../../game/data/challenges';
import { canAscend, pendingAscension } from '../../game/engine/progression';
import { activeChallenge, challengeMet, challengesUnlocked, deadlineLeft } from '../../game/engine/challenges';
import { fmt, fmtDuration } from '../../game/engine/format';
import { locale, t } from '../../i18n';
import { weekOf, weekStart, weeklyRule } from '../../game/engine/weekly';
import { WEEKLY_BONUS } from '../../game/data/weekly';
import { Tx } from '../../i18n/Tx';
import { Icon } from '../Icon';
import { useDialog } from '../useDialog';

/** Segunda-feira da semana, no formato curto do idioma (dd/mm ou mm/dd). */
const weekLabel = (week: number) => weekStart(week).toLocaleDateString(locale(), { day: '2-digit', month: '2-digit', timeZone: 'UTC' });

function ConfirmAscend({ gain, onCancel, onGo }: { gain: number; onCancel: () => void; onGo: (next: string | null) => void }) {
  const game = useGame(s => s.game);
  const [next, setNext] = useState<string | null>(null);
  const ref = useDialog<HTMLDivElement>(onCancel);
  const active = activeChallenge(game);
  const options = CHALLENGES.filter(c => !game.challenges.done.includes(c.id));
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="asc-title">
      <div className="modal-box" ref={ref} tabIndex={-1}>
        <h2 id="asc-title">{t('Projeto Ascensão')}</h2>
        <p><Tx k="Você recebe <b>{n} Dados de Ascensão</b> e começa uma nova jornada." v={{ n: fmt(gain) }} /></p>
        <p><b className="sev-bad">{t('Será perdido:')}</b> {t('recursos, estruturas, pesquisas, colônias, locais descobertos e megaprojetos desta jornada.')}</p>
        <p><b className="sev-ok">{t('Será mantido:')}</b> {t('Dados de Ascensão, melhorias permanentes, catálogo de minerais, opções e estatísticas totais.')}</p>
        {active && (
          <p className={challengeMet(game) ? 'sev-ok' : 'sev-warn'}>
            {challengeMet(game) ? t('Desafio “{nome}” cumprido: a recompensa permanente é sua ao ascender.', { nome: t(active.name) }) : t('O desafio “{nome}” não foi cumprido a tempo: ele termina sem recompensa.', { nome: t(active.name) })}
          </p>
        )}
        {challengesUnlocked(game) && (
          <label className="field">
            <span>{t('Próxima jornada')}</span>
            <select value={next ?? ''} onChange={e => setNext(e.target.value || null)}>
              <option value="">{t('Normal (sem desafio)')}</option>
              <option value="weekly">{t('Desafio da semana: {a} e {b}', { a: t(weeklyRule(weekOf(Date.now())).boon.name), b: t(weeklyRule(weekOf(Date.now())).bane.name) })}</option>
              {options.map(c => <option key={c.id} value={c.id}>{t('Desafio: {nome}', { nome: t(c.name) })}</option>)}
            </select>
          </label>
        )}
        {next && next !== 'weekly' && <p className="hint">{t(CHALLENGES.find(c => c.id === next)!.desc)} <b>{t(CHALLENGES.find(c => c.id === next)!.rewardText)}</b></p>}
        {next === 'weekly' && <WeeklyRule week={weekOf(Date.now())} />}
        <div className="row">
          <button className="btn" onClick={onCancel}>{t('Cancelar')}</button>
          <button className="btn primary" onClick={() => onGo(next)}>{t('Ascender')}</button>
        </div>
      </div>
    </div>
  );
}

function WeeklyRule({ week }: { week: number }) {
  const { boon, bane } = weeklyRule(week);
  return (
    <p className="desc">
      <b className="sev-ok">{t(boon.name)}</b>: {t(boon.desc)} · <b className="sev-bad">{t(bane.name)}</b>: {t(bane.desc)}
      {' '}<b>{t('Recompensa: +{n}% de Dados de Ascensão.', { n: Math.round((WEEKLY_BONUS - 1) * 100) })}</b>
    </p>
  );
}

/** Desafio da semana: a regra desta semana, a jornada em andamento e os melhores tempos. */
function Weekly() {
  const game = useGame(s => s.game);
  const abandon = useGame(s => s.abandonWeekly);
  if (!challengesUnlocked(game)) return null;
  const week = weekOf(Date.now());
  const active = game.weekly.active;
  return (
    <>
      <h4 className="section">{t('Desafio da semana')}</h4>
      <p className="hint">{t('Toda segunda-feira a semana sorteia uma vantagem e um revés, iguais para todo mundo. Escolha a jornada da semana ao ascender: chegando de novo à Ascensão, ela rende mais Dados e o seu tempo fica guardado.')}</p>
      <article className={`card challenge ${active !== null ? 'on' : ''}`}>
        <Icon name="icon-clock" size={48} className="card-art" />
        <div className="card-main">
          <h3>{t('Semana de {data}', { data: weekLabel(week) })} {active === week && <span className="count warn">{t('ativo')}</span>}</h3>
          <WeeklyRule week={week} />
          {active !== null && active !== week && <p className="status sev-warn">{t('Sua jornada segue a regra da semana de {data}.', { data: weekLabel(active) })}</p>}
          {active !== null && <p className="desc">{t('Tempo nesta jornada: {tempo}.', { tempo: fmtDuration(game.stats.playTime) })}</p>}
        </div>
        {active !== null && <button className="btn buy" onClick={abandon}>{t('Abandonar')}</button>}
      </article>
      {game.weekly.records.length > 0 && (
        <table className="stats-table">
          <tbody>{[...game.weekly.records].reverse().map(r => <tr key={r.week}><th>{t('Semana de {data}', { data: weekLabel(r.week) })}</th><td>{fmtDuration(r.time)}</td></tr>)}</tbody>
        </table>
      )}
    </>
  );
}

function Challenges() {
  const game = useGame(s => s.game);
  const abandon = useGame(s => s.abandonChallenge);
  const active = activeChallenge(game);
  const left = deadlineLeft(game);
  if (!challengesUnlocked(game)) return <p className="hint">{t('Depois da primeira Ascensão você poderá começar jornadas com regras especiais e ganhar melhorias permanentes.')}</p>;
  return (
    <>
      <h4 className="section">{t('Desafios')}</h4>
      <p className="hint">{t('Ao ascender, escolha uma regra especial para a jornada seguinte. Chegue de novo à Ascensão com ela valendo para ganhar a recompensa (uma vez por desafio). Abandonar não custa nada.')}</p>
      {CHALLENGES.map(c => {
        const done = game.challenges.done.includes(c.id);
        const on = game.challenges.active === c.id;
        return (
          <article key={c.id} className={`card challenge ${on ? 'on' : ''} ${done ? 'done' : ''}`}>
            <Icon name={c.icon} size={48} className="card-art" />
            <div className="card-main">
              <h3>{t(c.name)} {done && <span className="count ok">{t('concluído')}</span>}{on && <span className="count warn">{t('ativo')}</span>}</h3>
              <p className="desc">{t(c.desc)}</p>
              <p className="desc"><b>{t('Recompensa:')}</b> {t(c.rewardText)}</p>
              {on && left !== null && <p className={`status ${left > 0 ? 'sev-warn' : 'sev-bad'}`}>{left > 0 ? t('Prazo: faltam {tempo} de jogo.', { tempo: fmtDuration(left) }) : t('Prazo esgotado: a recompensa não vale mais nesta jornada.')}</p>}
            </div>
            {on && <button className="btn buy" onClick={abandon}>{t('Abandonar')}</button>}
          </article>
        );
      })}
      {active && <p className="hint">{t('Escolha um desafio novo na janela do Projeto Ascensão.')}</p>}
    </>
  );
}

export function AscensionPanel() {
  const game = useGame(s => s.game);
  const ascend = useGame(s => s.ascend);
  const buyPerk = useGame(s => s.buyPerk);
  const [confirming, setConfirming] = useState(false);
  const gain = pendingAscension(game);
  const a = game.ascension;

  return (
    <div className="panel-body">
      <article className="card">
        <Icon name="icon-star" size={64} className="card-art" />
        <div className="card-main">
          <h3>{t('Dados de Ascensão: {n}', { n: fmt(a.points) })}</h3>
          <p className="desc">{t('Recebidos ao todo: {total} · Ascensões: {n}', { total: fmt(a.total), n: a.count })}</p>
          <p className="desc"><Tx k="Ao ascender agora você recebe <b>{n}</b> dados (cresce com os créditos ganhos nesta jornada: {ganhos})." v={{ n: fmt(gain), ganhos: fmt(game.stats.earned) }} /></p>
        </div>
      </article>

      {game.upgrades.ascensionProject ? (
        <button className="btn big primary" disabled={!canAscend(game)} onClick={() => setConfirming(true)}>
          {canAscend(game) ? t('Iniciar Projeto Ascensão (+{n})', { n: fmt(gain) }) : t('Ganhe mais créditos para receber dados')}
        </button>
      ) : (
        <p className="hint"><Tx k="Pesquise <b>Projeto Ascensão</b> (fase 6) para poder recomeçar com bônus permanentes." /></p>
      )}

      <Challenges />
      <Weekly />

      <h4 className="section">{t('Melhorias permanentes')}</h4>
      {PERKS.map(p => {
        const level = a.perks[p.id] ?? 0;
        const maxed = p.max !== undefined && level >= p.max;
        const cost = perkCost(p, level);
        return (
          <article key={p.id} className="card">
            <Icon name={p.icon} size={48} className="card-art" />
            <div className="card-main">
              <h3>{t(p.name)} <span className="count">{t('nível {n}', { n: level })}{p.max ? `/${p.max}` : ''}</span></h3>
              <p className="desc">{p.desc(level)}</p>
            </div>
            <button className="btn buy" disabled={maxed || a.points < cost} onClick={() => buyPerk(p.id)}>
              {maxed ? t('Máximo') : <>{t('Melhorar')}<span className="cost"><span><Icon name="icon-star" size={16} />{cost}</span></span></>}
            </button>
          </article>
        );
      })}

      {confirming && <ConfirmAscend gain={gain} onCancel={() => setConfirming(false)} onGo={next => { setConfirming(false); ascend(next); }} />}
    </div>
  );
}
