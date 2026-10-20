import type { Category } from '../../game/types';
import { useGame } from '../../game/store';
import { BALANCE } from '../../game/data/balance';
import { BUILDINGS } from '../../game/data/buildings';
import { PROTECTABLE } from '../../game/engine/energy';
import { energyBalance, energyOutOf, getModifiers } from '../../game/engine/modifiers';
import { fmt } from '../../game/engine/format';
import { t } from '../../i18n';
import { Tx } from '../../i18n/Tx';

const W = 320, H = 90, PAD = 4;

/** Gráfico de uma volta do asteroide: geração prevista (sobe de dia, cai à noite) contra a demanda atual. */
function DayChart() {
  const game = useGame(s => s.game);
  const m = getModifiers(game);
  const now = game.stats.playTime;
  const e = energyBalance(game, m);
  const solarAt = (tm: number) => BUILDINGS.reduce((a, b) => (b.daylight && game.buildings[b.id] > 0 ? a + energyOutOf({ ...game, stats: { ...game.stats, playTime: tm } }, b, m) : a), 0);
  const fixed = e.supply - solarAt(now);
  const N = 60, P = BALANCE.dayPeriod;
  const pts = Array.from({ length: N + 1 }, (_, i) => { const tm = now + (i / N) * P; return fixed + solarAt(tm); });
  const top = Math.max(e.demand, ...pts, 1) * 1.1;
  const y = (v: number) => H - PAD - (v / top) * (H - 2 * PAD);
  const path = pts.map((v, i) => `${i ? 'L' : 'M'}${(i / N) * W},${y(v)}`).join(' ');
  const night = pts.some(v => v < e.demand - 1e-6);
  return (
    <div className="energy-chart" role="img" aria-label={t('Geração prevista para a próxima volta do asteroide contra a demanda atual')}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        <line x1="0" x2={W} y1={y(e.demand)} y2={y(e.demand)} stroke="var(--c-gold)" strokeDasharray="4 3" strokeWidth="1.5" />
        <path d={path} fill="none" stroke="var(--cyan, #00e5ff)" strokeWidth="2" />
        <line x1="0" x2="0" y1="0" y2={H} stroke="#fff" strokeOpacity=".6" />
      </svg>
      <p className="hint">
        <Tx k="<b>Linha azul:</b> geração nos próximos {s} min · <b>tracejado:</b> demanda atual ({d})." v={{ s: Math.round(P / 60), d: fmt(e.demand) }} />
        {' '}{night ? t('A geração cai abaixo da demanda em algum momento: baterias ou fontes constantes resolvem.') : t('A geração cobre a demanda durante toda a volta.')}
      </p>
    </div>
  );
}

const LABEL: Record<string, string> = {
  mining: 'Mineração', industry: 'Indústria', science: 'Ciência', civilization: 'Civilização',
  logistics: 'Logística', commerce: 'Comércio', expansion: 'Expansão',
};

/** Painel de energia: balanço, previsão do dia e racionamento por categoria. */
export function EnergySection() {
  const game = useGame(s => s.game);
  const report = useGame(s => s.report);
  const toggle = useGame(s => s.toggleProtect);
  const e = report?.energy;
  return (
    <section className="energy-section">
      <h4 className="section">{t('Rede de energia')}</h4>
      {e && (
        <p className="hint">
          <Tx k="Geração <b>{a}</b> · demanda <b>{b}</b> · atendimento <b>{r}%</b> · baterias {c} de {d}." v={{ a: fmt(e.supply), b: fmt(e.demand), r: Math.round(e.ratio * 100), c: fmt(e.charge), d: fmt(e.chargeCap) }} />
        </p>
      )}
      <DayChart />
      <h4 className="section sub">{t('Racionamento')}</h4>
      <p className="hint">{t('Com falta de energia, as categorias protegidas são atendidas primeiro; as outras dividem o que sobrar.')}</p>
      <div className="ration">
        {PROTECTABLE.map((c: Category) => {
          const on = game.protect.includes(c);
          return (
            <button key={c} className={`btn small ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(c)}>
              {on ? '🛡 ' : ''}{t(LABEL[c])}
            </button>
          );
        })}
      </div>
    </section>
  );
}
