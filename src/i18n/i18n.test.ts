import { afterEach, describe, expect, it } from 'vitest';
import { getLang, resolveLang, setLang, t, tName, tp } from './index';
import { fmt } from '../game/engine/format';
import { DEFAULT_PREFS, TEXT_SCALES, parsePrefs } from '../prefs';
import { phaseOf } from '../audio/phase';
import { newGame } from '../game/engine/state';

afterEach(() => setLang('pt'));

describe('idioma', () => {
  it('em português devolve o próprio texto e troca os marcadores', () => {
    expect(t('Colônia fundada!')).toBe('Colônia fundada!');
    expect(t('{a} de {b} unidades', { a: 3, b: 9 })).toBe('3 de 9 unidades');
  });

  it('em inglês usa o dicionário e cai para o português se faltar a tradução', () => {
    setLang('en');
    expect(t('Colônia fundada!')).toBe('Colony founded!');
    expect(t('{a} de {b} unidades', { a: 3, b: 9 })).toBe('3 of 9 units');
    expect(t('Texto sem tradução ainda')).toBe('Texto sem tradução ainda');
  });

  it('plural simples', () => {
    expect(tp(1, '{n} rota', '{n} rotas')).toBe('1 rota');
    expect(tp(3, '{n} rota', '{n} rotas')).toBe('3 rotas');
    setLang('en');
    expect(tp(3, '{n} rota', '{n} rotas')).toBe('3 routes');
  });

  it('nomes gerados com número traduzem só o nome', () => {
    setLang('en');
    expect(tName('Veio ferroso 4')).toBe('Ferrous Vein 4');
  });

  it('o idioma automático segue o navegador', () => {
    expect(resolveLang('auto', 'pt-BR')).toBe('pt');
    expect(resolveLang('auto', 'en-GB')).toBe('en');
    expect(resolveLang('en', 'pt-BR')).toBe('en');
    expect(getLang()).toBe('pt');
  });

  it('números seguem o idioma (sufixos e separador decimal)', () => {
    expect(fmt(1500)).toBe('1,5 mil');
    setLang('en');
    expect(fmt(1500)).toBe('1.5K');
  });
});

describe('preferências', () => {
  it('valida tudo o que vem do armazenamento', () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs({ language: 'fr', textScale: 99, colorblind: 'x', highContrast: 'sim', shortcuts: 0, sceneLabels: 'sim' })).toEqual({ ...DEFAULT_PREFS, shortcuts: true });
    expect(parsePrefs({ language: 'en', textScale: TEXT_SCALES[3], colorblind: 'redgreen', highContrast: true, shortcuts: false, sceneLabels: true }))
      .toEqual({ language: 'en', textScale: 1.3, colorblind: 'redgreen', highContrast: true, shortcuts: false, sceneLabels: true });
  });
});

describe('música por fase', () => {
  it('começa na solidão e acompanha o avanço', () => {
    const s = newGame(0);
    expect(phaseOf(s)).toBe('solitude');
    s.buildings.refinery = 1;
    expect(phaseOf(s)).toBe('industry');
    s.upgrades.habitats = true;
    expect(phaseOf(s)).toBe('civilization');
    s.upgrades.exploration = true;
    expect(phaseOf(s)).toBe('expansion');
    s.upgrades.diplomacy = true;
    expect(phaseOf(s)).toBe('empire');
    s.megaprojects.dyson = 1;
    expect(phaseOf(s)).toBe('epic');
    s.megaprojects.singularity = 1;
    expect(phaseOf(s)).toBe('beyond');
  });
});
