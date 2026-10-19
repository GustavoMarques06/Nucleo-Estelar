import { useState } from 'react';
import type { FlowSource, ResId } from '../../game/types';
import { useGame, HISTORY_MAX, HISTORY_STEP } from '../../game/store';
import { RESOURCES, RES_IDS } from '../../game/data/resources';
import { BALANCE } from '../../game/data/balance';
import { getModifiers, inflation, repLevel } from '../../game/engine/modifiers';
import { upkeepBreakdown } from '../../game/engine/upkeep';
import { fmt, fmtDuration, fmtRate } from '../../game/engine/format';
import { Icon } from '../Icon';

const SOURCE_LABEL: Record<FlowSource, string> = {
  mining: 'Mineração', industry: 'Indústria', energy: 'Geradores', logistics: 'Logística', science: 'Ciência', civilization: 'Civilização',
  commerce: 'Estruturas comerciais', expansion: 'Expansão', diplomacy: 'Diplomacia', population: 'População e impostos', colonies: 'Colônias',
  trade: 'Venda automática', contracts: 'Contratos automáticos', upkeep: 'Manutenção',
};

/** Taxa curta para as células da tabela (a unidade "/s" fica no cabeçalho). */
const short = (n: number) => (n >= 0 ? '+' : '−') + fmt(Math.abs(n));

/** Histórico do saldo por segundo (últimos 30 min): a linha pontilhada é o zero. */
function Chart({ data }: { data: number[] }) {
  if (data.length < 3) return <p className="hint">Coletando dados… o gráfico aparece depois de alguns segundos.</p>;
  const lo = Math.min(0, ...data), hi = Math.max(0, ...data);
  const span = hi - lo || 1;
  const x = (i: number) => ((i + (HISTORY_MAX - data.length)) / (HISTORY_MAX - 1)) * 100;
  const y = (v: number) => 38 - ((v - lo) / span) * 36;
  const d = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <div className="chart">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2="100" y1={y(0)} y2={y(0)} />
        <path d={d} />
      </svg>
      <div className="chart-scale"><span>{fmtRate(hi)}</span><span>últimos {fmtDuration(data.length * HISTORY_STEP)}</span><span>{fmtRate(lo)}</span></div>
    </div>
  );
}

/** Balanço do império: de onde vem e para onde vai cada recurso, o custo de vida e o histórico. */
export function FinancePanel() {
  const game = useGame(s => s.game);
  const rates = useGame(s => s.rates);
  const flows = useGame(s => s.flows);
  const history = useGame(s => s.history);
  const report = useGame(s => s.report);
  const [sel, setSel] = useState<ResId>('credits');
  const m = getModifiers(game);
  const up = upkeepBreakdown(game, m);

  // Entrada e saída por recurso, somando as origens (compras e vendas manuais não entram: o saldo geral sim).
  const rows = RES_IDS.filter(r => !RESOURCES[r].hidden).map(r => {
    let inn = 0, out = 0;
    if (flows) for (const src of Object.keys(flows) as FlowSource[]) { const v = flows[src][r] ?? 0; if (v > 0) inn += v; else out -= v; }
    return { r, inn, out, net: rates[r] };
  }).filter(x => x.inn > 0.001 || x.out > 0.001 || Math.abs(x.net) > 0.001);

  const credits = rows.find(x => x.r === 'credits');
  const income = credits?.inn ?? 0;
  const spent = credits?.out ?? 0;
  const burden = income > 0 ? up.total / income : 0;
  const sources = flows
    ? (Object.keys(flows) as FlowSource[]).map(src => ({ src, v: flows[src][sel] ?? 0 })).filter(x => Math.abs(x.v) > 0.001).sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    : [];
  const maxAbs = Math.max(1e-9, ...sources.map(x => Math.abs(x.v)));
  const debtInfo = report?.upkeep;

  return (
    <div className="panel-body finance">
      <p className="hint">Balanço em tempo real, vindo das máquinas, colônias e impostos. Compras e vendas manuais aparecem só no saldo geral. Toque numa linha para ver as origens e o histórico.</p>

      <h4 className="section">Créditos</h4>
      <div className="fin-summary">
        <div><small>Entrada</small><b className="sev-ok">{fmtRate(income)}</b></div>
        <div><small>Saída (manutenção)</small><b className={spent > 0 ? 'sev-bad' : ''}>{fmtRate(-spent)}</b></div>
        <div><small>Saldo geral</small><b className={rates.credits < 0 ? 'sev-bad' : 'sev-ok'}>{fmtRate(rates.credits)}</b></div>
      </div>
      <div className="fin-upkeep">
        <b>Custo de vida: {fmt(up.total)} créditos/s</b>
        {income > 0 && <small> ({Math.round(burden * 100)}% da renda automática)</small>}
        <ul className="stats">
          <li>Estruturas: {fmt(up.buildings)}/s</li>
          <li>Colônias: {fmt(up.colonies)}/s</li>
          {up.insurance > 0 && <li>Seguros de rota: {fmt(up.insurance)}/s</li>}
          <li>Inflação: custo das estruturas +{(inflation(game) * 100).toFixed(1)}% (zera na Ascensão)</li>
          {m.upkeep !== 1 && <li>Redutores de manutenção: ×{m.upkeep.toFixed(2)}</li>}
        </ul>
        {game.debt > 0.5 && (
          <p className={`status ${debtInfo && debtInfo.ratio < 0.999 ? 'sev-bad' : 'sev-warn'}`}>
            Manutenção em atraso: {fmt(game.debt)} créditos
            {debtInfo && debtInfo.ratio < 0.999 ? ` — estruturas caras a ${Math.round(debtInfo.ratio * 100)}% do ritmo.` : ` (tolerância de ${fmtDuration(BALANCE.upkeepGrace)} de manutenção antes de punir).`}
          </p>
        )}
        <p className="hint">Reputação comercial nível {repLevel(game)} · Austeridade (decreto) reduz a manutenção em 60%.</p>
      </div>

      <h4 className="section">Balanço por recurso</h4>
      {!flows && <p className="hint">Coletando dados…</p>}
      <div className="fin-table" role="table">
        <div className="fin-row head" role="row"><span /><span>Recurso (por s)</span><span>Entra</span><span>Sai</span><span>Saldo</span></div>
        {rows.map(x => (
          <button key={x.r} className={`fin-row ${sel === x.r ? 'on' : ''}`} onClick={() => setSel(x.r)} role="row" aria-pressed={sel === x.r}>
            <Icon name={RESOURCES[x.r].icon} size={22} />
            <span>{RESOURCES[x.r].name}</span>
            <span className="pos">{x.inn > 0.001 ? short(x.inn) : '—'}</span>
            <span className="neg">{x.out > 0.001 ? short(-x.out) : '—'}</span>
            <b className={x.net < -0.001 ? 'neg' : x.net > 0.001 ? 'pos' : ''}>{short(x.net)}</b>
          </button>
        ))}
      </div>

      <h4 className="section">{RESOURCES[sel].name}: origens</h4>
      {sources.length === 0 && <p className="hint">Sem fluxo automático deste recurso agora.</p>}
      {sources.map(({ src, v }) => (
        <div key={src} className="fin-src">
          <span>{SOURCE_LABEL[src]}</span>
          <i><b className={v < 0 ? 'neg' : ''} style={{ width: `${(Math.abs(v) / maxAbs) * 100}%` }} /></i>
          <span className={v < 0 ? 'neg' : 'pos'}>{fmtRate(v)}</span>
        </div>
      ))}
      <h4 className="section">{RESOURCES[sel].name}: saldo nos últimos minutos</h4>
      <Chart data={history[sel] ?? []} />
    </div>
  );
}
