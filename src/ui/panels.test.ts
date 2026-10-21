import { describe, expect, it } from 'vitest';
import { createElement as h, type FC } from 'react';
import { renderToString } from 'react-dom/server';
import { useGame } from '../game/store';
import { playBot } from '../game/engine/bot';
import { simulate } from '../game/engine/economy';
import { ascend } from '../game/engine/progression';
import { recordTimeline } from '../game/engine/timeline';
import { addDirective, updateDirective } from '../game/engine/directives';
import { hasAnomaly, startDig } from '../game/engine/digs';
import { missingKeys, setLang } from '../i18n';
import { UpgradesPanel } from './panels/UpgradesPanel';
import { DirectivesSection } from './panels/DirectivesSection';
import { CrewSection } from './panels/CrewSection';
import { LocationCard } from './panels/LocationCard';
import { Journeys } from './panels/JourneysSection';
import { Relics } from './panels/DigBox';
import { MegaprojectsPanel } from './panels/MegaprojectsPanel';
import { AscensionPanel } from './panels/AscensionPanel';
import { PlannerSection } from './panels/PlannerSection';
import { CivilizationPanel } from './panels/CivilizationPanel';
import { MapView } from './MapView';
import { SceneSwitch } from './SceneSwitch';

// Renderiza os painéis dos sistemas de fim de jornada (doutrinas, diretivas, conselho, escavações, jornadas, corrida,
// semana e planejador) com um estado de verdade, nos dois idiomas: nenhum pode lançar erro nem pedir texto sem tradução.
describe('painéis com uma partida avançada', () => {
  it('renderizam em português e inglês sem textos faltando', () => {
    let s = playBot(80 * 3600, { stopWhen: x => (x.megaprojects.dyson ?? 0) >= 1 && !!x.race }).state;
    s = addDirective(addDirective(s)!)!;
    s = updateDirective(s, s.directives[1].id, { when: { kind: 'energyShort' }, then: { kind: 'throttle', building: 'refinery', value: 0.5 } })!;
    const site = s.locations.find(l => hasAnomaly(l));
    s.resources.credits = 1e15;
    if (site) s = startDig(s, site.id) ?? s;
    s.relics = ['lens', 'ember'];
    s = recordTimeline(s);
    const next = ascend({ ...s, upgrades: { ...s.upgrades, ascensionProject: true } }, Date.now(), 'weekly')!;
    s = { ...s, timeline: next.timeline, weekly: { active: next.weekly.active, records: [{ week: next.weekly.active! - 1, time: 5000 }] } };
    const { state, report } = simulate(s, 1);
    expect(state.race).not.toBeNull();
    expect(state.crew.active.length).toBeGreaterThan(0);
    // renderToString lê o estado inicial do zustand (o "snapshot do servidor"): a partida entra nele.
    Object.assign(useGame.getInitialState(), { game: state, report, sceneView: 'civ' });
    const panels: FC[] = [UpgradesPanel, DirectivesSection, CrewSection, Journeys, Relics, MegaprojectsPanel, AscensionPanel, PlannerSection, CivilizationPanel, MapView, SceneSwitch];
    missingKeys.clear();
    try {
      for (const lang of ['pt', 'en'] as const) {
        setLang(lang);
        for (const p of panels) expect(renderToString(h(p)), p.name).not.toBe('');
        for (const l of state.locations.slice(0, 30)) renderToString(h(LocationCard, { loc: l }));
      }
      expect(renderToString(h(UpgradesPanel))).toContain('Doctrines');
      expect(renderToString(h(MegaprojectsPanel))).toContain('Race for the Gate');
      expect(renderToString(h(SceneSwitch))).toContain('Aurora, the colonists');
      expect([...missingKeys]).toEqual([]);
    } finally { setLang('pt'); }
  }, 120_000);
});
