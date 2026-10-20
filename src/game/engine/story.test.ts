import { describe, expect, it } from 'vitest';
import { newGame } from './state';
import { checkStory } from './progression';
import { parseSave, serialize } from './save';
import { applyOffline } from './offline';
import { STORY, STORY_BY_ID } from '../data/story';
import { ascend } from './progression';

describe('diário de bordo', () => {
  it('ids únicos, textos curtos e condições seguras em um jogo novo', () => {
    expect(new Set(STORY.map(e => e.id)).size).toBe(STORY.length);
    for (const e of STORY) {
      expect(e.text.length, e.id).toBeGreaterThanOrEqual(1);
      expect(e.text.join(' ').length, e.id).toBeLessThan(1000);
      expect(typeof e.when(newGame(0)), e.id).toBe('boolean');
    }
    expect(STORY.filter(e => e.when(newGame(0))).map(e => e.id)).toEqual(['start']);   // só a abertura vale de início
  });

  it('cada registro aparece uma vez, na ordem, quando o marco chega', () => {
    let s = newGame(0);
    let r = checkStory(s);
    expect(r.fresh).toEqual(['start']);
    s = r.state;
    expect(checkStory(s).fresh).toEqual([]);
    s.buildings.observatory = 1; s.resources.population = 12;
    r = checkStory(s);
    expect(r.fresh).toEqual(['lab', 'life']);
    expect(checkStory(r.state).fresh).toEqual([]);
  });

  it('salva, e quem vem de uma versão anterior não recebe a história de uma vez', () => {
    let s = checkStory(newGame(0)).state;
    expect(parseSave(serialize(s))!.story).toEqual(['start']);
    const old = JSON.parse(serialize(s));
    old.version = 7; delete old.story;
    old.buildings.observatory = 3; old.upgrades = { exploration: true };
    const back = parseSave(JSON.stringify(old))!;
    expect(back.story).toEqual(expect.arrayContaining(['start', 'lab', 'stars']));
    expect(checkStory(back).fresh).toEqual([]);
    // lixo é descartado
    old.story = ['start', 'nao-existe', 5];
    old.version = 14;
    expect(parseSave(JSON.stringify(old))!.story).toEqual(['start']);
  });

  it('o diário sobrevive à Ascensão', () => {
    const s = checkStory(newGame(0)).state;
    s.upgrades.ascensionProject = true; s.stats.earned = 1e12;
    const next = ascend(s, 0)!;
    expect(next.story).toContain('start');
    expect(STORY_BY_ID.ascension.when(next)).toBe(true);
    expect(checkStory(next).fresh).toContain('ascension');
  });
});

describe('resumo da ausência', () => {
  it('conta o que mudou: crises limpas, armazém cheio e terraformação', () => {
    const s = newGame(0);
    s.upgrades.lab = true;
    Object.assign(s.buildings, { miner: 20, solar: 10 });
    s.savedAt = 0;
    s.crises = [];
    const r = applyOffline(s, 3600 * 1000)!;
    expect(r.summary).not.toBeNull();
    expect(r.summary!.fullStorage.length).toBeGreaterThan(0);          // 1 h de mineração enche o armazém inicial
    expect(r.summary!.fullStorage.every(x => ['iron', 'copper', 'gold'].includes(x))).toBe(true);
    expect(r.summary!.crisesCleared).toBe(0);
    expect(r.summary!.terraforms).toBe(0);
  });
});

describe('arte do diário', () => {
  it('toda ilustração referenciada existe em public/assets/art', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    for (const e of STORY) expect(fs.existsSync(path.resolve(__dirname, '../../../public/assets/art', e.art + '.jpg')), e.art).toBe(true);
  });
});
