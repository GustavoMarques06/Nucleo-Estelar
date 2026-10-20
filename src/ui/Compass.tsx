import { useGame } from '../game/store';
import { GOALS, currentGoal } from '../game/data/goals';
import { phaseOf, type MusicPhase } from '../audio/phase';
import { Icon } from './Icon';
import type { TabId } from './tabs';
import { useSpotlight, type SpotKind } from './spotlight';
import { t } from '../i18n';

// A bússola do jogo: em que fase da jornada você está, qual é a meta dela e qual o próximo passo concreto.

const PHASES: { id: MusicPhase; name: string; goal: string }[] = [
  { id: 'solitude', name: 'Base', goal: 'Monte uma base que trabalha sozinha: mineradoras, energia e uma refinaria.' },
  { id: 'industry', name: 'Indústria', goal: 'Faça a base crescer: ciência, fábricas e os primeiros colonos (pesquise Habitats pressurizados).' },
  { id: 'civilization', name: 'Sociedade', goal: 'Olhe para fora: pesquise Exploração estelar e mande a primeira expedição.' },
  { id: 'expansion', name: 'Expansão', goal: 'Funde colônias e conheça as facções: pesquise Diplomacia estelar.' },
  { id: 'empire', name: 'Império', goal: 'Ligue colônias por rotas, cresça em influência e pesquise Fusão nuclear para chegar aos megaprojetos.' },
  { id: 'epic', name: 'Megaprojetos', goal: 'Construa o Enxame de Dyson e o Núcleo Estelar até a Singularidade; depois Ascenda para recomeçar mais forte.' },
  { id: 'beyond', name: 'Além', goal: 'Transcenda: recomece num nível acima, com melhorias permanentes, e vá mais longe.' },
];

/** Aba onde cada objetivo guiado se cumpre (o botão "Ir" leva até lá). Sem entrada = não há aba específica. */
const GOAL_TAB: Record<string, TabId> = {
  click10: 'mining', miner1: 'mining', solar1: 'energy', miner5: 'mining', drills: 'research', refinery1: 'industry', alloys50: 'industry',
  lab: 'research', observatory1: 'research', vein1: 'mining', factory1: 'industry', habitats: 'research', pop10: 'civilization',
  commerce: 'research', titanium1: 'mining', exploration: 'research', location1: 'expansion', colony1: 'map', treaty: 'diplomacy',
  quest1: 'diplomacy', route1: 'map', embassy1: 'diplomacy', crisis1: 'map', terra1: 'map', modules1: 'industry', rep3: 'commerce',
  drones10: 'logistics', colony10: 'expansion', dyson1: 'megaprojects', ascension1: 'ascension', challenge1: 'ascension', singularity: 'megaprojects',
};

/** Estrutura ou pesquisa exata que cumpre o objetivo: o "Ir" destaca o card certo. */
const GOAL_SPOT: Record<string, [SpotKind, string]> = {
  miner1: ['building', 'miner'], miner5: ['building', 'miner'], solar1: ['building', 'solar'], drills: ['upgrade', 'drills'],
  refinery1: ['building', 'refinery'], alloys50: ['building', 'refinery'], lab: ['upgrade', 'lab'], observatory1: ['building', 'observatory'],
  factory1: ['building', 'factory'], habitats: ['upgrade', 'habitats'], commerce: ['upgrade', 'commerce'], titanium1: ['upgrade', 'deepProspecting'],
  exploration: ['upgrade', 'exploration'], embassy1: ['building', 'embassy'], modules1: ['upgrade', 'modularProduction'],
  drones10: ['building', 'maintenance'], ascension1: ['upgrade', 'ascensionProject'],
};

export function Compass({ goTo, available }: { goTo: (tab: TabId) => void; available: TabId[] }) {
  const game = useGame(s => s.game);
  const spot = useSpotlight(s => s.show);
  const phase = phaseOf(game);
  const idx = PHASES.findIndex(p => p.id === phase);
  const goal = currentGoal(game);
  const progress = goal?.progress(game);
  const tab = goal ? GOAL_TAB[goal.id] : undefined;
  const canGo = !!tab && available.includes(tab);
  return (
    <section className="compass" id="compass" aria-label={t('Rumo da jornada')}>
      <ol className="compass-steps" aria-label={t('Fases da jornada')}>
        {PHASES.map((p, i) => (
          <li key={p.id} className={i < idx ? 'done' : i === idx ? 'now' : ''} aria-current={i === idx ? 'step' : undefined}>
            <i />{t(p.name)}
          </li>
        ))}
      </ol>
      <div className="compass-body">
        <p className="compass-phase"><span>{t('Meta da fase {n}/{m}', { n: idx + 1, m: PHASES.length })}</span> {t(PHASES[idx].goal)}</p>
        {goal && progress ? (
          <div className="compass-goal">
            <Icon name={goal.icon} size={36} />
            <div className="compass-goal-text">
              <b>{t('Agora:')} {t(goal.title)} <small>({game.goals.length + 1}/{GOALS.length})</small></b>
              <small>{t(goal.hint)}</small>
              <div className="bar"><div style={{ width: `${(progress.cur / progress.target) * 100}%` }} /></div>
            </div>
            {canGo && <button className="btn small" onClick={() => { goTo(tab!); const sp = GOAL_SPOT[goal.id]; if (sp) spot(sp[0], sp[1]); }}>{t('Ir')}</button>}
            {goal.reward && <span className="reward">{t('+{n} cr', { n: goal.reward.credits ?? 0 })}</span>}
          </div>
        ) : (
          <p className="compass-goal-text"><b>{t('Todos os objetivos guiados concluídos.')}</b> <small>{t('Siga a meta da fase: o jogo não tem fim, cada volta fica mais rápida.')}</small></p>
        )}
      </div>
    </section>
  );
}
