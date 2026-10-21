import { useGame } from '../game/store';
import { currentEra, eraIndex, eraProgress, nextEra } from '../game/engine/civilization';
import { fmt } from '../game/engine/format';
import { FACTION_BY_ID } from '../game/data/factions';
import { LOCATION_BY_TYPE } from '../game/data/locations';
import { getModifiers } from '../game/engine/modifiers';
import { outpostYield } from '../game/engine/expansion';
import { Yields } from './panels/LocationCard';
import { MEGA_BY_ID } from '../game/data/megaprojects';
import { LAYERS } from '../game/data/layers';
import { layerIndex } from '../game/engine/deposit';
import { Icon } from './Icon';
import { t } from '../i18n';

/** Troca a cena entre a base de mineração (asteroide), o planeta dos colonos e o planeta escolhido no mapa,
 *  com um resumo por cima de cada planeta. */
export function SceneSwitch() {
  const game = useGame(s => s.game);
  const view = useGame(s => s.sceneView);
  const setView = useGame(s => s.setSceneView);
  const loc = useGame(s => s.game.locations.find(l => l.id === s.selectedLoc) ?? null);
  const megaId = useGame(s => s.selectedMega);
  const mega = megaId ? MEGA_BY_ID[megaId] : undefined;
  const megaDone = megaId ? game.megaprojects[megaId] ?? 0 : 0;
  const civ = !!game.upgrades.habitats || game.resources.population >= 1;
  if (!civ && !loc && !mega) return null;
  const era = currentEra(game), next = nextEra(game);
  return (
    <>
      <div className="scene-switch" role="group" aria-label={t('Vista da cena')}>
        <button className={`btn small ${view === 'base' ? 'active' : ''}`} aria-pressed={view === 'base'} onClick={() => setView('base')}>
          <Icon name={LAYERS[layerIndex(game)].sprite} size={20} /> {t('Base')}
        </button>
        {civ && (
          <button className={`btn small ${view === 'civ' ? 'active' : ''}`} aria-pressed={view === 'civ'} onClick={() => setView('civ')}>
            <Icon name="aurora-3" size={20} /> {t('Aurora')}
          </button>
        )}
      </div>
      {view === 'civ' && (
        <div className="civ-hud">
          <b>{t('Aurora, o mundo dos colonos')}</b>
          {era ? (
            <>
              <span>{t('Era {n} de 7: {nome}', { n: eraIndex(game), nome: t(era.name) })} · {t('{n} pessoas', { n: fmt(game.resources.population) })}</span>
              {next && <span className="dim">{t('Próxima: {nome} com {n} pessoas.', { nome: t(next.name), n: fmt(next.at) })}</span>}
              {next && <div className="bar"><div style={{ width: `${Math.round(eraProgress(game) * 100)}%` }} /></div>}
            </>
          ) : <span className="dim">{t('Ainda vazio: os primeiros colonos chegam com Habitats e comida.')}</span>}
        </div>
      )}
      {view === 'mega' && mega && megaDone > 0 && (
        <div className="civ-hud">
          <b>{t(mega.name)}</b>
          <span>{mega.endless ? t('Estágio {n}', { n: megaDone }) : t('Estágio {n} de {m}', { n: megaDone, m: mega.stages.length })}</span>
          <span className="dim">{t(mega.endless ? mega.endless(megaDone - 1).desc : mega.stages[Math.min(megaDone, mega.stages.length) - 1].desc)}</span>
        </div>
      )}
      {view === 'loc' && loc && (
        <div className="civ-hud">
          <b>{loc.name}</b>
          <span>{t(LOCATION_BY_TYPE[loc.type].name)} · {loc.outpost
            ? t('Colônia nível {n}', { n: loc.outpost.level })
            : loc.claimedBy ? t('reivindicado: {nome}', { nome: t(FACTION_BY_ID[loc.claimedBy].name) }) : t('Livre')}</span>
          {loc.outpost && <span><Yields y={outpostYield(loc, getModifiers(game), game)} /></span>}
        </div>
      )}
    </>
  );
}
