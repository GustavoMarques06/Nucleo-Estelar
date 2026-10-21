import { describe, expect, it } from 'vitest';
import { newGame, SAVE_VERSION, SIGNED_SINCE } from './state';
import { parseSave, saveSignature, serialize } from './save';
import { ascend } from './progression';

const game = () => { const s = newGame(0); s.resources.credits = 500; s.buildings.miner = 3; return s; };

describe('integridade do save', () => {
  it('um save do próprio jogo sai assinado e volta sem marca', () => {
    const raw = serialize(game());
    expect(JSON.parse(raw).sig).toMatch(/^[0-9a-f]{28}$/);
    expect(saveSignature(raw)).toBe('ok');
    const back = parseSave(raw)!;
    expect(back.integrity.tampered).toBe(false);
    expect(back.resources.credits).toBe(500);
  });

  it('editar qualquer valor no texto quebra a assinatura e marca o progresso', () => {
    const raw = serialize(game()).replace('"credits":500', '"credits":999999999');
    expect(saveSignature(raw)).toBe('bad');
    const back = parseSave(raw)!;
    expect(back).not.toBeNull();                           // o jogo não apaga o progresso de ninguém…
    expect(back.integrity.tampered).toBe(true);            // …mas deixa marcado
    expect(back.integrity.since).toBeGreaterThan(0);
  });

  it('tirar a assinatura de um save novo também conta como modificação', () => {
    const d = JSON.parse(serialize(game()));
    delete d.sig;
    expect(saveSignature(JSON.stringify(d))).toBe('bad');
    expect(parseSave(JSON.stringify(d))!.integrity.tampered).toBe(true);
  });

  it('saves antigos, de antes da assinatura, são aceitos sem marca', () => {
    const d = JSON.parse(serialize(game()));
    delete d.sig;
    d.version = SIGNED_SINCE - 1;
    expect(saveSignature(JSON.stringify(d))).toBe('legacy');
    expect(parseSave(JSON.stringify(d))!.integrity.tampered).toBe(false);
  });

  it('a marca é permanente: não some ao salvar de novo nem ao ascender', () => {
    const marked = parseSave(serialize(game()).replace('"credits":500', '"credits":7'))!;
    const again = parseSave(serialize(marked))!;            // re-salvo pelo jogo: assinatura válida, marca mantida
    expect(saveSignature(serialize(marked))).toBe('ok');
    expect(again.integrity.tampered).toBe(true);
    again.upgrades.ascensionProject = true;
    again.stats.earned = 1e12;
    expect(ascend(again, 0)!.integrity.tampered).toBe(true);
  });

  it('tirar a marca à mão também quebra a assinatura', () => {
    const marked = parseSave(serialize(game()).replace('"credits":500', '"credits":7'))!;
    const raw = serialize(marked).replace('"tampered":true', '"tampered":false');
    expect(parseSave(raw)!.integrity.tampered).toBe(true);
  });

  it('texto que não é save é inválido', () => {
    expect(saveSignature('isso não é json')).toBe('invalid');
    expect(saveSignature(JSON.stringify({ version: SAVE_VERSION + 1 }))).toBe('invalid');
  });
});
