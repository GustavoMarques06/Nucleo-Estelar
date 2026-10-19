import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { newGame } from './state';
import { ascend, checkGoals, transcend } from './progression';
import { parseSave, serialize } from './save';
import { useGame } from '../store';
import { GOALS, currentGoal } from '../data/goals';
import { GUIDE } from '../data/guide';
import { ACHIEVEMENTS } from '../data/achievements';
import { UPGRADES } from '../data/upgrades';
import { BUILDINGS } from '../data/buildings';
import { RESOURCES } from '../data/resources';
import { FACTIONS } from '../data/factions';
import { CRISES } from '../data/crises';
import { DRONE_ROLES } from '../data/drones';
import { EVENTS } from '../data/events';
import { MEGAPROJECTS } from '../data/megaprojects';
import { LOCATION_TYPES } from '../data/locations';
import { STAR_PERKS } from '../data/transcendence';
import { PERKS } from '../data/ascension';
import { MINERALS } from '../data/minerals';
import { REPEATABLES } from '../data/repeatables';
import { TIPS } from '../data/tips';
import type { GameState } from '../types';

const SPRITES = path.resolve(__dirname, '../../../public/assets/sprites');
const ART = path.resolve(__dirname, '../../../public/assets/art');

describe('objetivos guiados', () => {
  it('ids únicos; progresso sempre finito, com meta positiva e nunca acima dela', () => {
    expect(new Set(GOALS.map(g => g.id)).size).toBe(GOALS.length);
    const s = newGame(0);
    for (const g of GOALS) {
      const p = g.progress(s);
      expect(Number.isFinite(p.cur) && p.cur >= 0, g.id).toBe(true);
      expect(p.target, g.id).toBeGreaterThan(0);
      expect(p.cur, g.id).toBeLessThanOrEqual(p.target);
    }
  });

  it('só os primeiros objetivos pagam, e pagam só créditos pequenos', () => {
    const paying = GOALS.filter(g => g.reward);
    expect(paying.length).toBeGreaterThan(3);
    expect(paying.length).toBeLessThan(10);
    for (const g of paying) {
      expect(Object.keys(g.reward!)).toEqual(['credits']);
      expect(g.reward!.credits!).toBeLessThanOrEqual(250);
    }
    expect(GOALS.indexOf(paying[paying.length - 1])).toBeLessThan(8);   // o resto do jogo não paga
  });

  it('o objetivo atual avança em ordem; concluir paga uma vez só', () => {
    let s = newGame(0);
    expect(currentGoal(s)!.id).toBe('click10');
    s.stats.totalMined = 10;
    let r = checkGoals(s);
    expect(r.done).toEqual(['click10']);
    expect(r.state.resources.credits).toBe(8);
    expect(currentGoal(r.state)!.id).toBe('miner1');
    r = checkGoals(r.state);
    expect(r.done).toEqual([]);
    expect(r.state.resources.credits).toBe(8);
  });

  it('conclui também os objetivos que já valem fora de ordem', () => {
    const s = newGame(0);
    s.stats.totalMined = 50; s.buildings.miner = 5; s.buildings.solar = 1; s.upgrades.drills = true;
    const { state, done } = checkGoals(s);
    expect(done).toEqual(expect.arrayContaining(['click10', 'miner1', 'solar1', 'miner5', 'drills']));
    expect(state.resources.credits).toBe(8 + 15 + 25 + 60 + 50);
    expect(currentGoal(state)!.id).toBe('refinery1');
  });

  it('são permanentes: sobrevivem à Ascensão e à Transcendência', () => {
    const s = newGame(0);
    s.goals = ['click10', 'miner1'];
    s.upgrades.ascensionProject = true; s.stats.earned = 5e9;
    expect(ascend(s, 0)!.goals).toEqual(['click10', 'miner1']);
    s.transcendence.unlocked = true; s.ascension.total = 50;
    expect(transcend(s, 0)!.goals).toEqual(['click10', 'miner1']);
  });

  it('salvamento antigo: marca como feito o que a partida já cumpre (sem tutorial repetido nem pagamento)', () => {
    const v5 = JSON.stringify({ version: 5, resources: { credits: 77 }, buildings: { miner: 6, solar: 2 }, stats: { totalMined: 400 } });
    const s = parseSave(v5)!;
    expect(s.goals).toEqual(expect.arrayContaining(['click10', 'miner1', 'solar1', 'miner5']));
    expect(s.resources.credits).toBe(77);
    expect(parseSave(serialize({ ...newGame(0), goals: ['miner1', 'inexistente'] } as GameState))!.goals).toEqual(['miner1']);
    expect(parseSave(serialize(newGame(0)))!.goals).toEqual([]);
  });
});

describe('configurações de áudio', () => {
  it('volume e música persistem, com limites e valores padrão', () => {
    const s = newGame(0);
    s.settings.volume = 0.25; s.settings.music = false;
    const back = parseSave(serialize(s))!;
    expect(back.settings).toMatchObject({ volume: 0.25, music: false });
    expect(parseSave(JSON.stringify({ version: 6, settings: { volume: 9 } }))!.settings.volume).toBe(1);
    expect(parseSave(JSON.stringify({ version: 6, settings: { volume: -3 } }))!.settings.volume).toBe(0);   // mudo continua mudo
    expect(parseSave(JSON.stringify({ version: 6, settings: { volume: 'alto' } }))!.settings.volume).toBe(0.6);
    expect(parseSave(JSON.stringify({ version: 4 }))!.settings).toMatchObject({ volume: 0.6, music: true, sound: true });
  });
});

describe('avisos', () => {
  afterEach(() => useGame.setState({ toasts: [] }));

  it('mensagens iguais se agrupam com contador; diferentes ficam separadas; limite de 4', () => {
    const { toast, dismissToast } = useGame.getState();
    toast('A'); toast('A'); toast('A');
    expect(useGame.getState().toasts).toHaveLength(1);
    expect(useGame.getState().toasts[0].count).toBe(3);
    toast('B'); toast('C'); toast('D'); toast('E');
    const list = useGame.getState().toasts;
    expect(list).toHaveLength(4);
    expect(list.map(t => t.text)).toEqual(['B', 'C', 'D', 'E']);
    dismissToast(list[0].id);
    expect(useGame.getState().toasts).toHaveLength(3);
  });
});

describe('integridade dos dados', () => {
  const sprites: [string, string][] = [
    ...GOALS.map(g => ['objetivo ' + g.id, g.icon] as [string, string]),
    ...GUIDE.map(g => ['guia ' + g.id, g.icon] as [string, string]),
    ...ACHIEVEMENTS.map(a => ['conquista ' + a.id, a.icon] as [string, string]),
    ...UPGRADES.map(u => ['pesquisa ' + u.id, u.icon] as [string, string]),
    ...REPEATABLES.map(r => ['contínua ' + r.id, r.icon] as [string, string]),
    ...TIPS.map(t => ['dica ' + t.id, t.icon] as [string, string]),
    ...BUILDINGS.map(b => ['estrutura ' + b.id, b.sprite] as [string, string]),
    ...Object.values(RESOURCES).map(r => ['recurso ' + r.id, r.icon] as [string, string]),
    ...FACTIONS.map(f => ['facção ' + f.id, f.sprite] as [string, string]),
    ...CRISES.map(c => ['crise ' + c.kind, c.icon] as [string, string]),
    ...DRONE_ROLES.map(d => ['drone ' + d.id, d.icon] as [string, string]),
    ...EVENTS.map(e => ['evento ' + e.id, e.sprite] as [string, string]),
    ...MEGAPROJECTS.flatMap(m => (m.endless ? [m.endless(0), m.endless(30)] : m.stages).map((st, i) => [`mega ${m.id}#${i}`, st.sprite] as [string, string])),
    ...LOCATION_TYPES.flatMap(t => t.sprites.map(sp => ['local ' + t.type, sp] as [string, string])),
    ...STAR_PERKS.map(p => ['semente ' + p.id, p.icon] as [string, string]),
    ...PERKS.map(p => ['ascensão ' + p.id, p.icon] as [string, string]),
    ...MINERALS.map(m => ['mineral ' + m.id, m.sprite] as [string, string]),
  ];

  it('todo sprite citado nos dados existe em public/assets/sprites', () => {
    const missing = sprites.filter(([, name]) => !fs.existsSync(path.join(SPRITES, name + '.png'))).map(([who, name]) => `${who} → ${name}`);
    expect(missing).toEqual([]);
  });

  it('todas as paisagens e fundos citados existem em public/assets/art', () => {
    const arts = [...LOCATION_TYPES.map(t => t.terrain).filter((x): x is string => !!x), 'bg-nebula-blue', 'scene-system-map', 'scene-system-map-b', 'scene-galaxy-map', 'loading-art', 'social-preview'];
    for (const a of arts) expect(fs.existsSync(path.join(ART, a + '.jpg')), a).toBe(true);
  });

  it('o guia cobre todos os sistemas principais e não tem texto vazio', () => {
    expect(new Set(GUIDE.map(g => g.id)).size).toBe(GUIDE.length);
    for (const g of GUIDE) { expect(g.text.length, g.id).toBeGreaterThan(0); for (const t of g.text) expect(t.length, g.id).toBeGreaterThan(20); }
    const all = GUIDE.map(g => g.id).join(' ');
    for (const k of ['energy', 'storage', 'research', 'people', 'trade', 'colonies', 'drones', 'legacy', 'focus']) expect(all).toContain(k);
  });
});
