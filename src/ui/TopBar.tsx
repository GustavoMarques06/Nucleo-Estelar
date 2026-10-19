import { useGame } from '../game/store';
import { RESOURCES, RES_IDS } from '../game/data/resources';
import { energyBalance, housingCap, storageCap } from '../game/engine/modifiers';
import { fmt, fmtRate } from '../game/engine/format';
import { Icon } from './Icon';

const HELP: Partial<Record<string, string>> = {
  credits: 'Créditos: a moeda do jogo. Compram estruturas, pesquisas e expansões.',
  science: 'Ciência: paga as pesquisas avançadas. Vem de Observatórios, Universidades e colônias.',
  ships: 'Naves: necessárias para expedições e para fundar colônias. O Estaleiro as monta.',
};

export function TopBar() {
  const game = useGame(s => s.game);
  const rates = useGame(s => s.rates);
  const setSetting = useGame(s => s.setSetting);
  const cap = storageCap(game);
  const e = energyBalance(game);
  const popCap = housingCap(game);
  const focus = game.settings.focus;
  const saveError = useGame(s => s.saveError);
  // Complexidade gradual: só aparecem recursos que o jogador já produziu.
  const visible = RES_IDS.filter(r => !RESOURCES[r].hidden && (r === 'credits' || (game.stats.produced[r] ?? 0) > 0 || game.resources[r] > 0));

  return (
    <header className="topbar">
      <div className="brand"><img src={`${import.meta.env.BASE_URL}assets/sprites/logo-wide.png`} alt="Núcleo Estelar" height={46} draggable={false} /></div>
      <div className="chips">
        {visible.map(r => {
          const def = RESOURCES[r];
          const have = game.resources[r];
          const full = def.stored && have >= cap - 0.01;
          const rate = rates[r];
          const pct = def.stored ? Math.min(100, (have / cap) * 100) : 0;
          const title = def.stored
            ? `${def.name}: ${fmt(have)} de ${fmt(cap)} guardados (${Math.round(pct)}% do armazém). ${full ? 'Armazém cheio: a produção para até você gastar ou vender.' : 'Construa armazéns para guardar mais.'}`
            : HELP[r] ?? def.name;
          return (
            <div key={r} className={`chip ${full ? 'full' : ''}`} title={title}>
              <Icon name={def.icon} size={28} />
              <div className="chip-body">
                <b>{fmt(have)}{def.stored && <small className="cap">/{fmt(cap)}</small>}</b>
                <small className={rate < -0.01 || (full && Math.abs(rate) <= 0.01) ? 'neg' : ''}>{Math.abs(rate) > 0.01 ? fmtRate(rate) : full ? 'cheio' : def.name}</small>
              </div>
              {def.stored && <i className="fillbar" style={{ width: `${pct}%` }} />}
            </div>
          );
        })}
        {popCap > 0 && (
          <div className="chip pop" title="População / moradia. Colonos pagam impostos, trabalham nas estruturas grandes e precisam de comida.">
            <Icon name="icon-astronaut" size={28} />
            <div className="chip-body">
              <b>{fmt(game.resources.population)}<small className="cap">/{fmt(popCap)}</small></b>
              <small className={rates.population < -0.01 ? 'neg' : ''}>{Math.abs(rates.population) > 0.01 ? fmtRate(rates.population) : 'População'}</small>
            </div>
          </div>
        )}
        <div className={`chip energy ${e.demand > e.supply ? 'deficit' : ''}`}
          title="Energia: em uso / gerada. Se o uso passar do que é gerado, todas as máquinas ficam mais lentas. “Sobra” é a folga para ligar mais máquinas.">
          <Icon name="icon-energy" size={28} />
          <div className="chip-body">
            <b>{fmt(Math.min(e.demand, e.supply))}<small className="cap">/{fmt(e.supply)}</small></b>
            <small>{e.demand > e.supply ? `déficit ${fmt(e.demand - e.supply)}` : `sobra ${fmt(e.supply - e.demand)}`}</small>
          </div>
        </div>
        {saveError && <span className="save-warn" role="alert" title="O navegador não está salvando. Abra Opções e exporte o save.">⚠ Sem salvar</span>}
        <button className={`focus-toggle ${focus ? 'on' : ''}`} onClick={() => setSetting('focus', !focus)} aria-pressed={focus}
          title={focus ? 'Sair do modo foco' : 'Modo foco: troca a cena animada por um painel de alertas e gasta menos bateria'}>
          <Icon name="icon-radar" size={24} /><span>{focus ? 'Sair do foco' : 'Modo foco'}</span>
        </button>
      </div>
    </header>
  );
}
