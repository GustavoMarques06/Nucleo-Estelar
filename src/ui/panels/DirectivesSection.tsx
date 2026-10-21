import type { BuildingId, Directive, DirectiveDo, DirectiveWhen, ResId } from '../../game/types';
import { useGame } from '../../game/store';
import { RESOURCES } from '../../game/data/resources';
import { BUILDING_BY_ID } from '../../game/data/buildings';
import { THROTTLE_STEPS } from '../../game/engine/energy';
import { capsOf, energyBalance, isBuildingUnlocked } from '../../game/engine/modifiers';
import {
  DIRECTIVE_FRACS, DIRECTIVE_MAX, SELL_DOWN_TO, conditionMet, directivesUnlocked, sellableByDirective, throttleTargets, watchable,
} from '../../game/engine/directives';
import { fmt } from '../../game/engine/format';
import { Icon } from '../Icon';
import { t } from '../../i18n';

const WHEN_LABEL: Record<DirectiveWhen['kind'], string> = {
  above: 'estoque acima de', below: 'estoque abaixo de', energyShort: 'falta energia', energySpare: 'sobra energia (20% ou mais)',
};
const DO_LABEL: Record<DirectiveDo['kind'], string> = { sell: 'vender o excedente de', throttle: 'mudar o ritmo de' };
const pct = (x: number) => `${Math.round(x * 100)}%`;

function defaultWhen(kind: DirectiveWhen['kind'], prev: DirectiveWhen): DirectiveWhen {
  if (kind === 'above' || kind === 'below') return { kind, res: 'res' in prev ? prev.res : 'iron', frac: 'frac' in prev ? prev.frac : kind === 'above' ? 0.9 : 0.25 };
  return { kind };
}

function Rule({ d }: { d: Directive }) {
  const game = useGame(s => s.game);
  const report = useGame(s => s.report);
  const update = useGame(s => s.updateDirective);
  const remove = useGame(s => s.removeDirective);
  const e = energyBalance(game);
  const active = d.on && conditionMet(game, d.when, { caps: capsOf(game), energy: { ratio: report?.energy.ratio ?? e.ratio, supply: report?.energy.supply ?? e.supply, demand: e.demand } });
  // Só as estruturas liberadas aparecem na lista (mais a escolhida, se for o caso).
  const targets = throttleTargets().filter(b => isBuildingUnlocked(BUILDING_BY_ID[b], game) || (d.then.kind === 'throttle' && d.then.building === b));
  const resName = (r: ResId) => t(RESOURCES[r].name);
  return (
    <article className={`card directive ${d.on ? '' : 'off'} ${active ? 'live' : ''}`}>
      <label className="toggle" title={t('Ligar ou desligar esta diretiva')}>
        <input type="checkbox" checked={d.on} onChange={ev => update(d.id, { on: ev.target.checked })} />
      </label>
      <div className="card-main directive-rule">
        <span className="kw">{t('Se')}</span>
        <select aria-label={t('Condição')} value={d.when.kind} onChange={ev => update(d.id, { when: defaultWhen(ev.target.value as DirectiveWhen['kind'], d.when) })}>
          {(Object.keys(WHEN_LABEL) as DirectiveWhen['kind'][]).map(k => <option key={k} value={k}>{t(WHEN_LABEL[k])}</option>)}
        </select>
        {(d.when.kind === 'above' || d.when.kind === 'below') && (() => {
          const w = d.when;
          return (
            <>
              <select aria-label={t('Recurso')} value={w.res} onChange={ev => update(d.id, { when: { ...w, res: ev.target.value as ResId } })}>
                {watchable().map(r => <option key={r} value={r}>{resName(r)}</option>)}
              </select>
              <select aria-label={t('Limite')} value={w.frac} onChange={ev => update(d.id, { when: { ...w, frac: Number(ev.target.value) } })}>
                {DIRECTIVE_FRACS.map(f => <option key={f} value={f}>{t('{n} do armazém', { n: pct(f) })}</option>)}
              </select>
            </>
          );
        })()}
        <span className="kw">{t('então')}</span>
        <select aria-label={t('Ação')} value={d.then.kind} onChange={ev => update(d.id, { then: ev.target.value === 'sell' ? { kind: 'sell', res: sellableByDirective()[0] } : { kind: 'throttle', building: (targets.includes('refinery') ? 'refinery' : targets[0]) as BuildingId, value: 0.5 } })}>
          {(Object.keys(DO_LABEL) as DirectiveDo['kind'][]).map(k => <option key={k} value={k}>{t(DO_LABEL[k])}</option>)}
        </select>
        {d.then.kind === 'sell' && (() => {
          const a = d.then;
          return (
            <select aria-label={t('Recurso')} value={a.res} onChange={ev => update(d.id, { then: { ...a, res: ev.target.value as ResId } })}>
              {sellableByDirective().map(r => <option key={r} value={r}>{resName(r)}</option>)}
            </select>
          );
        })()}
        {d.then.kind === 'throttle' && (() => {
          const a = d.then;
          return (
            <>
              <select aria-label={t('Estrutura')} value={a.building} onChange={ev => update(d.id, { then: { ...a, building: ev.target.value as BuildingId } })}>
                {targets.map(b => <option key={b} value={b}>{t(BUILDING_BY_ID[b].name)}</option>)}
              </select>
              <select aria-label={t('Ritmo')} value={a.value} onChange={ev => update(d.id, { then: { ...a, value: Number(ev.target.value) } })}>
                {THROTTLE_STEPS.map(v => <option key={v} value={v}>{v === 0 ? t('Pausada') : pct(v)}</option>)}
              </select>
            </>
          );
        })()}
        <small className="dim directive-foot">
          {active ? <b className="sev-ok">{t('valendo agora')}</b> : t('em espera')} · {t('cumprida {n} vezes', { n: fmt(d.fired) })}
          {d.then.kind === 'sell' && ' · ' + t('vende até sobrar {n} do armazém', { n: pct(SELL_DOWN_TO) })}
        </small>
      </div>
      <button className="btn small" onClick={() => remove(d.id)} aria-label={t('Apagar diretiva')} title={t('Apagar diretiva')}>×</button>
    </article>
  );
}

/** Diretivas: regras "se … então …" que a base cumpre sozinha (aba Logística). */
export function DirectivesSection() {
  const game = useGame(s => s.game);
  const add = useGame(s => s.addDirective);
  if (!directivesUnlocked(game)) {
    return game.upgrades.automation ? <p className="hint"><Icon name="icon-chip" size={20} /> {t('Pesquise IA operacional para criar diretivas: regras que a base cumpre sozinha.')}</p> : null;
  }
  return (
    <>
      <h4 className="section">{t('Diretivas · {a}/{b}', { a: game.directives.length, b: DIRECTIVE_MAX })}</h4>
      <p className="hint">{t('Regras que a base cumpre sozinha a cada segundo, também com o jogo fechado. Elas ficam entre as jornadas.')}</p>
      {game.directives.map(d => <Rule key={d.id} d={d} />)}
      {game.directives.length < DIRECTIVE_MAX && <button className="btn" onClick={add}>{t('+ Nova diretiva')}</button>}
    </>
  );
}
