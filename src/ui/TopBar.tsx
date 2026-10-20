import { useGame } from '../game/store';
import { RESOURCES, RES_IDS } from '../game/data/resources';
import { batteryCap, capsOf, energyBalance, housingCap } from '../game/engine/modifiers';
import { isDay, nextTurn } from '../game/engine/daylight';
import { fmt, fmtDuration, fmtRate } from '../game/engine/format';
import { Icon } from './Icon';
import { activeChallenge, deadlineLeft } from '../game/engine/challenges';
import { t } from '../i18n';

const HELP: Partial<Record<string, string>> = {
  credits: 'Créditos: a moeda do jogo. Compram estruturas, pesquisas e expansões.',
  science: 'Ciência: paga as pesquisas avançadas. Vem de Observatórios, Universidades e colônias.',
  ships: 'Naves: necessárias para expedições e para fundar colônias. O Estaleiro as monta.',
};

const KEY_RES = ['credits', 'science'];

export function TopBar() {
  const game = useGame(s => s.game);
  const rates = useGame(s => s.rates);
  const report = useGame(s => s.report);
  const setSetting = useGame(s => s.setSetting);
  const caps = capsOf(game);
  const e = energyBalance(game);
  const popCap = housingCap(game);
  const focus = game.settings.focus;
  const challenge = activeChallenge(game);
  const left = deadlineLeft(game);
  const saveError = useGame(s => s.saveError);
  // Baterias: o que elas devolvem agora entra na geração; a barra mostra a carga.
  const chargeCap = batteryCap(game);
  const charge = Math.min(game.energyCharge, chargeCap);
  const fromBattery = report?.energy.fromBattery ?? 0;
  const supply = e.supply + fromBattery;
  const discharging = fromBattery > 0.01;
  const day = isDay(game.stats.playTime);
  const hasSolar = game.buildings.solar > 0;
  // Complexidade gradual: só aparecem recursos que o jogador já produziu.
  const visible = RES_IDS.filter(r => !RESOURCES[r].hidden && (r === 'credits' || (game.stats.produced[r] ?? 0) > 0 || game.resources[r] > 0));
  // Dois níveis de leitura: o que o jogador confere o tempo todo (grande) e os materiais (compactos, com seta de tendência).
  const keyRes = visible.filter(r => KEY_RES.includes(r));
  const materials = visible.filter(r => !KEY_RES.includes(r));
  const trend = (rate: number) => (rate > 0.01 ? 'up' : rate < -0.01 ? 'down' : 'flat');

  return (
    <header className="topbar">
      <div className="brand"><img src={`${import.meta.env.BASE_URL}assets/sprites/logo-wide.png`} alt={t('Núcleo Estelar')} height={46} draggable={false} /></div>
      <div className="chips">
        <div className="chips-key">
        {keyRes.map(r => {
          const def = RESOURCES[r];
          const have = game.resources[r];
          const cap = caps[r];
          const full = def.stored && have >= cap - 0.01;
          const rate = rates[r];
          const pct = def.stored ? Math.min(100, (have / cap) * 100) : 0;
          const title = def.stored
            ? t('{nome}: {a} de {b} guardados ({p}% do armazém).', { nome: t(def.name), a: fmt(have), b: fmt(cap), p: Math.round(pct) }) + ' ' + (full ? t('Armazém cheio: a produção para até você gastar ou vender.') : t('Construa armazéns para guardar mais.'))
            : t(HELP[r] ?? def.name);
          return (
            <div key={r} className={`chip ${full ? 'full' : ''}`} title={title}>
              <Icon name={def.icon} size={28} />
              <div className="chip-body">
                <b>{fmt(have)}{def.stored && <small className="cap">/{fmt(cap)}</small>}</b>
                <small className={rate < -0.01 || (full && Math.abs(rate) <= 0.01) ? 'neg' : rate > 0.01 ? 'pos' : ''}>{Math.abs(rate) > 0.01 ? fmtRate(rate) : full ? t('cheio') : t(def.name)}</small>
              </div>
              {def.stored && <i className="fillbar" style={{ width: `${pct}%` }} />}
            </div>
          );
        })}
        {popCap > 0 && (
          <div className="chip pop" title={t('População / moradia. Colonos pagam impostos, trabalham nas estruturas grandes e precisam de comida.')}>
            <Icon name="icon-astronaut" size={28} />
            <div className="chip-body">
              <b>{fmt(game.resources.population)}<small className="cap">/{fmt(popCap)}</small></b>
              <small className={rates.population < -0.01 ? 'neg' : ''}>{Math.abs(rates.population) > 0.01 ? fmtRate(rates.population) : t('População')}</small>
            </div>
          </div>
        )}
        <div className={`chip energy ${e.demand > supply + 0.01 ? 'deficit' : ''}`}
          title={t('Energia: em uso / gerada. Se o uso passar do que é gerado, todas as máquinas ficam mais lentas. “Sobra” é a folga para ligar mais máquinas.') + (hasSolar ? ' ' + t(day ? 'Dia no asteroide: o pôr do sol em {tempo} (painéis solares rendem mais de dia).' : 'Noite no asteroide: o nascer do sol em {tempo} (painéis solares rendem mais de dia).', { tempo: fmtDuration(nextTurn(game.stats.playTime)) }) : '') + (chargeCap > 0 ? ' ' + t(discharging ? 'Baterias: {a} de {b} de carga, descarregando agora.' : 'Baterias: {a} de {b} de carga.', { a: fmt(charge), b: fmt(chargeCap) }) : '')}>
          <Icon name="icon-energy" size={28} />
          <div className="chip-body">
            <b>{fmt(Math.min(e.demand, supply))}<small className="cap">/{fmt(supply)}</small></b>
            <small>{e.demand > supply + 0.01 ? t('déficit {n}', { n: fmt(e.demand - supply) }) : discharging ? t('baterias') : t('sobra {n}', { n: fmt(supply - e.demand) })}</small>
          </div>
          {hasSolar && <span className={`daynight ${day ? 'day' : 'night'}`} aria-label={day ? t('dia') : t('noite')}>{day ? '☀' : '☾'}</span>}
          {chargeCap > 0 && <i className="fillbar battery" style={{ width: `${Math.min(100, (charge / chargeCap) * 100)}%` }} />}
        </div>
        </div>
        <div className="chips-mini">
          {materials.map(r => {
            const def = RESOURCES[r];
            const have = game.resources[r], cap = caps[r], rate = rates[r];
            const full = def.stored && have >= cap - 0.01;
            const pct = def.stored ? Math.min(100, (have / cap) * 100) : 0;
            const title = `${t(def.name)}: ${fmt(have)}` + (def.stored ? ` / ${fmt(cap)} (${Math.round(pct)}%)` : '') + (Math.abs(rate) > 0.01 ? ` · ${fmtRate(rate)}` : '') + (full ? ' · ' + t('Armazém cheio: a produção para até você gastar ou vender.') : '');
            return (
              <div key={r} className={`chip mini ${full ? 'full' : ''}`} title={title}>
                <Icon name={def.icon} size={20} />
                <b>{fmt(have)}</b>
                <i className={`trend ${full ? 'full' : trend(rate)}`} aria-label={full ? t('cheio') : fmtRate(rate)}>{full ? '■' : rate > 0.01 ? '▲' : rate < -0.01 ? '▼' : '•'}</i>
                {def.stored && <i className="fillbar" style={{ width: `${pct}%` }} />}
              </div>
            );
          })}
        </div>
        {challenge && (
          <div className="chip challenge-chip" title={`${t(challenge.name)}: ${t(challenge.desc)}`}>
            <Icon name={challenge.icon} size={28} />
            <div className="chip-body">
              <b>{t(challenge.name)}</b>
              <small className={left === 0 ? 'neg' : ''}>{left !== null ? fmtDuration(left) : t('Desafio ativo')}</small>
            </div>
          </div>
        )}
        {saveError && <span className="save-warn" role="alert" title={t('O navegador não está salvando. Abra Opções e exporte o save.')}>⚠ {t('Sem salvar')}</span>}
        <button className={`focus-toggle ${focus ? 'on' : ''}`} onClick={() => setSetting('focus', !focus)} aria-pressed={focus}
          title={focus ? t('Sair do modo foco') : t('Modo foco: troca a cena animada por um painel de alertas e gasta menos bateria')}>
          <Icon name="icon-radar" size={24} /><span>{focus ? t('Sair do foco') : t('Modo foco')}</span>
        </button>
      </div>
    </header>
  );
}
