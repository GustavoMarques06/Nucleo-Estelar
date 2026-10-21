import { useGame } from '../../game/store';
import { BALANCE } from '../../game/data/balance';
import { BUILDING_BY_ID } from '../../game/data/buildings';
import { ERAS, LEGACY_GROWTH, LEGACY_TAX, civBonus, currentEra, eraIndex, eraProgress, nextEra, wellbeing } from '../../game/engine/civilization';
import { getModifiers, housingCap, isBuildingUnlocked, workforce } from '../../game/engine/modifiers';
import { fmt, fmtRate } from '../../game/engine/format';
import { Icon } from '../Icon';
import { useSpotlight } from '../spotlight';
import { artUrl } from '../../assets';
import { BuildingList, BuyAmountPicker } from './BuildingsPanel';
import { t } from '../../i18n';
import { CrewSection } from './CrewSection';

const STATUS: Record<string, [string, string]> = {
  none: ['Sem colonos ainda', ''],
  growing: ['Crescendo', 'sev-ok'],
  stable: ['Estável', 'sev-ok'],
  housing: ['Moradia lotada', 'sev-warn'],
  starving: ['Fome: a população está diminuindo', 'sev-bad'],
};

const PART_LABEL: Record<string, string> = { food: 'Comida', housing: 'Moradia', work: 'Trabalho', health: 'Saúde', energy: 'Energia' };
const PART_TIP: Record<string, string> = {
  food: 'Reserva de comida para 1 minuto de consumo. Estufas hidropônicas resolvem.',
  housing: 'Moradia para todos. Habitats e torres residenciais abrigam mais gente.',
  work: 'Pessoas para ocupar as vagas das estruturas. Mais moradia e comida trazem mais colonos.',
  health: 'Um centro médico para cada 500 pessoas.',
  energy: 'A energia da base precisa dar conta da demanda. Veja a aba Energia.',
};

const pct = (n: number) => Math.round(n * 100);

/** A era da civilização: ilustração, progresso até a próxima, bônus e o legado que atravessa as jornadas. */
function EraHero() {
  const game = useGame(s => s.game);
  const era = currentEra(game);
  const next = nextEra(game);
  const idx = eraIndex(game);
  const bonus = civBonus(game);
  const best = game.civ.best;
  const bestEra = ERAS[best - 1];
  return (
    <article className="card civ-hero" aria-label={t('Era da civilização')}>
      {era && <div className="civ-scene" role="img" aria-label={t(era.name)} style={{ backgroundImage: `url(${artUrl(`era-scene-${era.id}`)})` }} />}
      <div className="civ-hero-row">
      <Icon name={era?.sprite ?? 'era-camp'} size={96} className={`card-art ${era?.id === 'stellar' ? 'round' : ''}`} />
      <div className="card-main">
        <p className="civ-kicker">{t('Era {n} de {m}', { n: Math.max(1, idx), m: ERAS.length })}</p>
        <h3>{t(era?.name ?? 'Acampamento')}</h3>
        <p className="desc">{t(era?.desc ?? ERAS[0].desc)}</p>
        {next ? (
          <>
            <div className="bar" role="progressbar" aria-valuenow={pct(eraProgress(game))} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${pct(eraProgress(game))}%` }} /></div>
            <p className="hint">
              {t('Próxima: {nome} com {n} pessoas.', { nome: t(next.name), n: fmt(next.at) })}
              {next.extra && !next.extra(game) ? ' ' + t('Exige ter transcendido ao menos uma vez.') : ''}
            </p>
          </>
        ) : <p className="hint">{t('Era máxima alcançada. A civilização só cresce daqui em diante.')}</p>}
        <ul className="stats">
          <li>{t('Nesta era: +{a}% de impostos e +{b}% de crescimento da população.', { a: Math.round((bonus.tax - 1 - LEGACY_TAX * best) * 100), b: Math.round((bonus.growth - 1 - LEGACY_GROWTH * best) * 100) })}</li>
          <li className={best > 0 ? 'sev-ok' : 'dim'}>
            {bestEra
              ? t('Legado: sua melhor era foi {nome}. Em toda jornada isso rende +{a}% de impostos e +{b}% de crescimento.', { nome: t(bestEra.name), a: Math.round(LEGACY_TAX * best * 100), b: Math.round(LEGACY_GROWTH * best * 100) })
              : t('Legado: a melhor era que sua civilização alcançar fica para sempre e fortalece todas as jornadas seguintes.')}
          </li>
        </ul>
        <Crowd count={Math.min(PEOPLE.length, idx)} />
      </div>
      </div>
    </article>
  );
}

/** A gente da sociedade: mais rostos conforme a civilização avança. */
const PEOPLE = ['colonist-miner', 'colonist-doctor', 'colonist-kid', 'colonist-engineer', 'colonist-elder', 'colonist-farmer'];
function Crowd({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <div className="civ-crowd" aria-hidden="true">
      {PEOPLE.slice(0, count).map(p => <Icon key={p} name={p} size={56} />)}
    </div>
  );
}

/** Escada das eras: o que já foi, onde está e o que falta. */
function Ladder() {
  const game = useGame(s => s.game);
  const idx = eraIndex(game);
  return (
    <ol className="civ-ladder" aria-label={t('Eras da civilização')}>
      {ERAS.map((e, i) => (
        <li key={e.id} className={i < idx - 1 ? 'done' : i === idx - 1 ? 'now' : game.civ.best > i ? 'legacy' : ''} title={t(e.desc)}>
          <Icon name={e.sprite} size={28} className={e.id === 'stellar' ? 'round' : ''} />
          <b>{t(e.name)}</b>
          <small>{t('a partir de {n}', { n: fmt(e.at) })}</small>
        </li>
      ))}
    </ol>
  );
}

/** Bem-estar: cinco medidas, cada uma com o que fazer quando está baixa. */
function Wellbeing() {
  const game = useGame(s => s.game);
  const report = useGame(s => s.report);
  const spot = useSpotlight(s => s.show);
  const m = getModifiers(game);
  const pop = game.resources.population;
  const w = wellbeing(game, {
    foodNeed: pop * BALANCE.foodPerPerson, cap: housingCap(game, m), workRatio: workforce(game).ratio,
    energyRatio: report?.energy.ratio ?? 1, healthUnlocked: isBuildingUnlocked(BUILDING_BY_ID.hospital, game),
  });
  const fixes: Record<string, string | null> = {
    food: 'hydroponics', health: 'hospital', energy: null,
    housing: isBuildingUnlocked(BUILDING_BY_ID.residential, game) ? 'residential' : 'habitat',
    work: isBuildingUnlocked(BUILDING_BY_ID.residential, game) ? 'residential' : 'habitat',
  };
  const tone = w.score >= 0.85 ? 'sev-ok' : w.score >= 0.6 ? 'sev-warn' : 'sev-bad';
  return (
    <article className="card civ-wellbeing">
      <Icon name="char-colonist-wave" size={64} className="card-art" />
      <div className="card-main">
        <h3>{t('Bem-estar')} <span className={`count ${tone}`}>{pct(w.score)}%</span></h3>
        <p className="desc">{t('Impostos e crescimento da população ×{f}. Cada medida vale um quinto.', { f: w.factor.toFixed(2) })}</p>
        {w.parts.map(p => {
          const fix = fixes[p.id];
          return (
            <div key={p.id} className="wb-row" title={t(PART_TIP[p.id])}>
              <span className="wb-name">{t(PART_LABEL[p.id])}</span>
              <div className="bar"><div style={{ width: `${pct(p.value)}%`, background: p.value >= 0.95 ? undefined : p.value >= 0.6 ? 'var(--c-warm)' : 'var(--c-bad)' }} /></div>
              <span className="wb-val">{pct(p.value)}%</span>
              {p.value < 0.95 && fix && <button className="btn small" onClick={() => spot('building', fix)}>{t('Ir')}</button>}
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function CivilizationPanel() {
  const game = useGame(s => s.game);
  const report = useGame(s => s.report);
  const rates = useGame(s => s.rates);
  const m = getModifiers(game);
  const pop = game.resources.population;
  const cap = housingCap(game, m);
  const work = workforce(game);
  const [label0, cls] = STATUS[report?.population.status ?? 'none'];
  const label = t(label0);
  const wb = wellbeing(game, {
    foodNeed: pop * BALANCE.foodPerPerson, cap, workRatio: work.ratio,
    energyRatio: report?.energy.ratio ?? 1, healthUnlocked: isBuildingUnlocked(BUILDING_BY_ID.hospital, game),
  });
  const taxes = pop * BALANCE.taxPerPerson * m.tax * wb.factor * m.outputAll;

  return (
    <div className="panel-body">
      {game.upgrades.habitats && (
        <>
          <EraHero />
          <Ladder />
          <Wellbeing />
          <article className="card">
            <Icon name="colonist-miner" size={64} className="card-art" />
            <div className="card-main">
              <h3>{t('População')} {fmt(pop)} / {fmt(cap)}</h3>
              <p className={`status ${cls}`}>{label}</p>
              <ul className="stats">
                <li>{t('Alimentos: {a} ({b}) · consumo {c}/s', { a: fmt(game.resources.food), b: fmtRate(rates.food), c: fmt(pop * BALANCE.foodPerPerson) })}</li>
                <li>{t('Mão de obra: {a} vagas para {b} pessoas', { a: fmt(work.demand), b: fmt(work.supply) })}{work.ratio < 1 ? ' — ' + t('estruturas a {n}%', { n: Math.round(work.ratio * 100) }) : ''}</li>
                <li>{t('Impostos: +{n} créditos/s', { n: fmt(taxes) })}</li>
              </ul>
            </div>
          </article>
        </>
      )}
      <CrewSection />
      <BuyAmountPicker />
      <BuildingList category="civilization" title={t('Moradia, alimento e saúde')} />
    </div>
  );
}
