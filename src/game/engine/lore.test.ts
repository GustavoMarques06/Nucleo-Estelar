import { describe, expect, it } from 'vitest';
import { newGame } from './state';
import { chooseEvent, checkStory, spawnEvent, ascend } from './progression';
import { parseSave, serialize } from './save';
import { LORE } from '../data/lore';
import { STORY, STORY_BY_ID } from '../data/story';
import { EVENT_BY_ID } from '../data/events';

describe('arquivo: fragmentos e transmissões', () => {
  it('ids únicos (inclusive contra o diário) e nada vale num jogo novo', () => {
    const ids = [...STORY, ...LORE].map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of LORE) {
      expect(e.text.length, e.id).toBeGreaterThanOrEqual(1);
      expect(e.when(newGame(0)), e.id).toBe(false);
      expect(e.kind === 'transmission' ? !!e.speaker : true, e.id).toBe(true);
    }
  });

  it('chegam em silêncio: vão para a lista do arquivo, não para a fila do diário', () => {
    let s = newGame(0);
    s.story = ['start', 'life'];                       // o diário dessas condições já foi lido
    s.resources.population = 12;
    const r = checkStory(s);
    expect(r.fresh).toEqual([]);                       // o diário não é interrompido
    expect(r.lore).toEqual(['tx-eco-1']);
    expect(r.state.story).toContain('tx-eco-1');
    expect(checkStory(r.state).lore).toEqual([]);      // aparece uma vez só
    s = { ...r.state, deposit: { ...r.state.deposit, found: 3 } };
    expect(checkStory(s).lore).toEqual(['frag-miner']);
  });

  it('sobrevivem ao salvamento', () => {
    const s = newGame(0);
    s.story = ['start', 'tx-eco-1', 'frag-plate'];
    expect(parseSave(serialize(s))!.story).toEqual(['start', 'tx-eco-1', 'frag-plate']);
  });
});

describe('a escolha final e os epílogos', () => {
  const core3 = () => { const s = newGame(0); s.megaprojects.core = 3; return s; };

  it('o evento só aparece com o Núcleo no estágio 3 e tem preferência no sorteio', () => {
    const def = EVENT_BY_ID.coreChoice;
    expect(def.minPhase(newGame(0))).toBe(false);
    expect(def.minPhase(core3())).toBe(true);
    const s = core3();
    s.upgrades.lab = true; s.buildings.solar = 5; s.buildings.miner = 9;
    for (let i = 0; i < 20; i++) expect(spawnEvent({ ...s, event: null }, () => i / 20).event?.id).toBe('coreChoice');
  });

  it('cada resposta guarda uma flag permanente e o evento não volta', () => {
    for (const [i, flag] of ['ending-keeper', 'ending-free', 'ending-share'].entries()) {
      const s = core3();
      s.event = { id: 'coreChoice', remaining: 100, seed: 5 };
      const r = chooseEvent(s, i)!;
      expect(r.state.flags).toContain(flag);
      expect(EVENT_BY_ID.coreChoice.minPhase(r.state)).toBe(false);
    }
  });

  it('a escolha atravessa Ascensão e Transcendência, e define o epílogo', () => {
    const s = core3();
    s.flags = ['ending-free', 'chain-signal'];
    s.upgrades.ascensionProject = true;
    s.stats.earned = 1e12;                                      // o suficiente para ter Dados de Ascensão a ganhar
    const asc = ascend(s, 0)!;
    expect(asc).not.toBeNull();
    expect(asc.flags).toEqual(['ending-free']);                 // as outras flags reiniciam; a escolha final fica
    const t = newGame(0);
    t.transcendence.count = 1; t.flags = ['ending-free'];
    expect(STORY_BY_ID['epilogue-free'].when(t)).toBe(true);
    expect(STORY_BY_ID['epilogue-keeper'].when(t)).toBe(false);
    expect(STORY_BY_ID.transcend.when(t)).toBe(false);          // com escolha, o final genérico não vale
    t.flags = [];
    expect(STORY_BY_ID.transcend.when(t)).toBe(true);
  });
});
