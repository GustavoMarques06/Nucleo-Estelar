import { useGame } from '../game/store';
import { currentEra, eraIndex, eraProgress, nextEra } from '../game/engine/civilization';
import { fmt } from '../game/engine/format';
import { Icon } from './Icon';
import { t } from '../i18n';

/** Troca a cena entre a base de mineração (asteroide) e o planeta dos colonos, com o resumo da era por cima do planeta. */
export function SceneSwitch() {
  const game = useGame(s => s.game);
  const view = useGame(s => s.sceneView);
  const setView = useGame(s => s.setSceneView);
  if (!game.upgrades.habitats && game.resources.population < 1) return null;
  const era = currentEra(game), next = nextEra(game);
  return (
    <>
      <div className="scene-switch" role="group" aria-label={t('Vista da cena')}>
        <button className={`btn small ${view === 'base' ? 'active' : ''}`} aria-pressed={view === 'base'} onClick={() => setView('base')}>
          <Icon name="asteroid-main-big" size={20} /> {t('Base')}
        </button>
        <button className={`btn small ${view === 'civ' ? 'active' : ''}`} aria-pressed={view === 'civ'} onClick={() => setView('civ')}>
          <Icon name="aurora-3" size={20} /> {t('Aurora')}
        </button>
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
    </>
  );
}
