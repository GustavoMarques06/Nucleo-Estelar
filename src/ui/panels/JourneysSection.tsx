import { useGame } from '../../game/store';
import { SAMPLE_EVERY, TIMELINE_MARKS } from '../../game/data/timeline';
import { bestMark, sampleOf } from '../../game/engine/timeline';
import { fmt, fmtDuration } from '../../game/engine/format';
import { t } from '../../i18n';

/** Curva dos créditos ganhos (escala logarítmica) da jornada atual sobre a anterior. */
function Curves({ now, prev }: { now: number[]; prev: number[] | null }) {
  const len = Math.max(now.length, prev?.length ?? 0, 2);
  const hi = Math.max(1, ...now, ...(prev ?? []));
  const x = (i: number) => (i / (len - 1)) * 100;
  const y = (v: number) => 38 - (v / hi) * 36;
  // Amostras −1 (save de antes da linha do tempo) ficam de fora: a curva começa na primeira registrada.
  const path = (xs: number[]) => xs.map((v, i) => [v, i] as const).filter(([v]) => v >= 0)
    .map(([v, i], k) => `${k ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <div className="chart journeys-chart">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        {prev && prev.length > 1 && <path className="prev" d={path(prev)} />}
        {now.length > 1 && <path d={path(now)} />}
      </svg>
      <div className="chart-scale">
        <span>{t('10^{n} créditos', { n: Math.round(hi) })}</span>
        <span>{t('{tempo} de jogo', { tempo: fmtDuration((len - 1) * SAMPLE_EVERY) })}</span>
        <span>0</span>
      </div>
      <p className="chart-legend"><i className="swatch now" /> {t('esta jornada')} {prev && <><i className="swatch prev" /> {t('jornada anterior')}</>}</p>
    </div>
  );
}

/** Linha do tempo: quando cada marco chegou nesta jornada e nas anteriores (aba Registro). */
export function Journeys() {
  const g = useGame(s => s.game);
  const tl = g.timeline;
  const last = tl.past[tl.past.length - 1] ?? null;
  const now = [...tl.samples, sampleOf(g.stats.earned)];
  const cell = (v: number | null | undefined) => (v === undefined || v === null || v < 0 ? '—' : fmtDuration(v));
  return (
    <div className="journeys">
      <p className="hint">{t('A curva mostra os créditos ganhos ao longo do tempo de jogo, em escala logarítmica. Depois da Ascensão, a jornada anterior aparece por baixo para comparar.')}</p>
      <Curves now={now} prev={last?.samples ?? null} />
      <table className="stats-table marks">
        <thead><tr><th>{t('Marco')}</th><td>{t('Agora')}</td><td>{t('Anterior')}</td><td>{t('Melhor')}</td></tr></thead>
        <tbody>
          {TIMELINE_MARKS.map(m => {
            const cur = tl.marks[m.id], best = bestMark(tl, m.id);
            const faster = cur !== undefined && cur >= 0 && best !== null && cur < best;
            return (
              <tr key={m.id}>
                <th>{t(m.name)}</th>
                <td className={faster ? 'sev-ok' : ''}>{cell(cur)}</td>
                <td>{cell(last?.marks[m.id])}</td>
                <td>{cell(best)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {tl.past.length > 0 && (
        <>
          <h4 className="section sub">{t('Jornadas anteriores')}</h4>
          <table className="stats-table">
            <tbody>
              {[...tl.past].reverse().map(j => (
                <tr key={j.n}><th>{t('Jornada {n}', { n: j.n })}</th><td>{fmtDuration(j.time)} · {t('{n} créditos', { n: fmt(j.earned) })}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
