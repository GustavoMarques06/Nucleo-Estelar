import { useGame } from '../../game/store';
import { RESOURCES } from '../../game/data/resources';
import { VEIN_KIND_BY_ID } from '../../game/data/deposit';
import { BUILDINGS, BUILDING_BY_ID } from '../../game/data/buildings';
import { LAYERS } from '../../game/data/layers';
import { depositShares, getModifiers } from '../../game/engine/modifiers';
import {
  activeVein, autoDepositUnlocked, canProspect, crustMix, currentLayer, extractionRate, layerIndex, nextLayer,
  prospectCost, prospectingUnlocked, veinOnly, veinUsable,
} from '../../game/engine/deposit';
import { fmt, fmtDuration, fmtNum } from '../../game/engine/format';
import { Tx } from '../../i18n/Tx';
import { tName } from '../../i18n';
import { Icon } from '../Icon';
import { CostList } from './BuildingsPanel';
import type { Amounts, ResId, Vein } from '../../game/types';
import { t } from '../../i18n';

function Mix({ mix }: { mix: Amounts }) {
  const parts = (Object.entries(mix) as [ResId, number][]).sort((a, b) => b[1] - a[1]);
  return (
    <span className="mix">
      {parts.map(([r, v]) => <span key={r} title={t(RESOURCES[r].name)}><Icon name={RESOURCES[r].icon} size={16} />{Math.round(v * 100)}%</span>)}
    </span>
  );
}

function VeinCard({ v, focused }: { v: Vein; focused: boolean }) {
  const game = useGame(s => s.game);
  const setFocus = useGame(s => s.setFocus);
  const m = getModifiers(game);
  const kind = VEIN_KIND_BY_ID[v.kind];
  const spent = v.reserve <= 0;
  const pct = (v.reserve / v.total) * 100;
  const only = veinOnly(v);
  // Ritmo real de esvaziamento: só as estruturas que alcançam o veio tiram dele.
  const reach = only ? BUILDINGS.filter(b => only.includes(b.id) && b.extract).reduce((a, b) => a + game.buildings[b.id] * b.extract! * (m.output[b.id] ?? 1) * m.outputAll, 0) : extractionRate(game, m);
  const rate = reach * v.yield;
  const usable = veinUsable(game, v);
  return (
    <article className={`card vein ${focused ? 'on' : ''} ${spent ? 'spent' : ''}`}>
      <Icon name={kind?.icon ?? 'ore-iron'} size={48} className="card-art" />
      <div className="card-main">
        <h3>{tName(v.name)} {focused && <span className="count ok">{t('em foco')}</span>}{spent && <span className="count">{t('esgotado')}</span>}</h3>
        <p className="desc">{t(kind?.desc ?? '')}</p>
        <Mix mix={v.mix} />
        <div className="bar" title={t('{a} de {b} unidades', { a: fmt(v.reserve), b: fmt(v.total) })}><div style={{ width: `${pct}%` }} /></div>
        <small className="desc">
          {t('Rende ×{n}', { n: v.yield.toFixed(1) })}
          {!spent && rate > 0 && <> · {t('dura cerca de {tempo} no ritmo atual', { tempo: fmtDuration(v.reserve / rate) })}</>}
        </small>
        {only && !spent && (
          <p className={`status ${usable ? 'sev-ok' : 'sev-warn'}`}>
            {t('Só {nomes} alcança este veio', { nomes: only.map(id => t(BUILDING_BY_ID[id].name)).join(` ${t('e')} `) })}{usable ? '; ' + t('as outras máquinas e os cliques seguem na crosta.') : ': ' + t('construa uma para extrair daqui.')}
          </p>
        )}
      </div>
      {!spent && !focused && <button className="btn buy" onClick={() => setFocus(v.id)}>{t('Perfurar aqui')}</button>}
    </article>
  );
}

/** Camada atual do asteroide e quanto falta para a próxima (mais rica, mas exige broca mais pesada). */
function LayerCard() {
  const game = useGame(s => s.game);
  const idx = layerIndex(game);
  const L = currentLayer(game);
  const next = nextLayer(game);
  const mined = game.stats.totalMined;
  const pct = next ? Math.min(100, ((mined - L.minMined) / (next.minMined - L.minMined)) * 100) : 100;
  const blocked = next?.needs && game.buildings[next.needs] <= 0;
  return (
    <article className="card vein layer">
      <Icon name={L.sprite} size={48} className="card-art" />
      <div className="card-main">
        <h3>{t('Camada {a}/{b}: {nome}', { a: idx + 1, b: LAYERS.length, nome: t(L.name) })}</h3>
        <p className="desc">{t(L.desc)}</p>
        <small className="desc">{t('A crosta rende ×{n} nesta camada.', { n: fmtNum(L.yield) })}</small>
        {next ? (
          <>
            <div className="bar" title={t('{a} de {b} de minério extraído', { a: fmt(mined), b: fmt(next.minMined) })}><div style={{ width: `${pct}%` }} /></div>
            <small className={blocked && mined >= next.minMined ? 'sev-warn' : 'desc'}>
              {t('Próxima: {nome} (×{n}) com {m} de minério extraído', { nome: t(next.name), n: fmtNum(next.yield), m: fmt(next.minMined) })}
              {next.needs ? ' ' + t('e um(a) {nome}', { nome: t(BUILDING_BY_ID[next.needs].name) }) : ''}{blocked && mined >= next.minMined ? ' — ' + t('falta a broca!') : ''}.
            </small>
          </>
        ) : <small className="sev-ok">{t('Você chegou ao coração do asteroide.')}</small>}
      </div>
    </article>
  );
}

/** A jazida do asteroide: crosta infinita e veios que se esgotam, com prospecção para achar novos. */
export function DepositSection() {
  const game = useGame(s => s.game);
  const prospect = useGame(s => s.prospect);
  const setFocus = useGame(s => s.setFocus);
  const setAuto = useGame(s => s.setAutoDeposit);
  const m = getModifiers(game);
  if (!prospectingUnlocked(game)) {
    // Complexidade gradual: as camadas aparecem quando a primeira já está à vista.
    if (game.stats.totalMined < LAYERS[1].minMined / 4) return null;
    return <div className="deposit"><h4 className="section">{t('Jazida')}</h4><LayerCard /></div>;
  }
  const vein = activeVein(game);
  const can = canProspect(game);
  const cost: Amounts = prospectCost(game, m);
  const veins = game.deposit.veins;
  const crustShares = depositShares(m, crustMix(game));
  return (
    <div className="deposit">
      <h4 className="section">{t('Jazida')}</h4>
      <p className="hint">
        <Tx k="A <b>crosta</b> do asteroide é infinita, e fica mais rica conforme você desce de camada. <b>Veios</b> rendem mais e trazem minérios novos, porém se esgotam (cada um dura cerca de 15 minutos de extração). Prospecte para encontrar veios e escolha de qual perfurar; esgotado, a extração volta à crosta." />
      </p>
      <LayerCard />
      <article className={`card vein ${vein ? '' : 'on'}`}>
        <Icon name="asteroid-main" size={48} className="card-art" />
        <div className="card-main">
          <h3>{t('Crosta')} {!vein && <span className="count ok">{t('em foco')}</span>}</h3>
          <p className="desc">{t('Infinita. Rende ×{n} na camada atual.', { n: fmtNum(currentLayer(game).yield) })}</p>
          <Mix mix={crustShares} />
        </div>
        {vein && <button className="btn buy" onClick={() => setFocus('crust')}>{t('Perfurar a crosta')}</button>}
      </article>
      {veins.map(v => <VeinCard key={v.id} v={v} focused={v.id === vein?.id} />)}
      <div className="prospect-row">
        <button className="btn buy" disabled={!can.ok} onClick={() => prospect()} title={can.reason ? t(can.reason) : undefined}>
          {t('Prospectar veio')} <CostList cost={cost} have={game.resources} />
        </button>
        {autoDepositUnlocked(game) && (
          <label className="toggle" title={t('Escolhe o melhor veio e prospecta sozinho quando o último acaba (precisa de créditos de sobra).')}>
            <input type="checkbox" checked={game.deposit.auto} onChange={e => setAuto(e.target.checked)} />
            {t('Sondas autônomas')}
          </label>
        )}
      </div>
      {!can.ok && can.reason && <p className="status sev-warn">{t(can.reason)}</p>}
    </div>
  );
}
