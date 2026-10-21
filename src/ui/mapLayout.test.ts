import { describe, expect, it } from 'vitest';
import { AURORA_POS, BASE_POS, MEGA_POS, minSpacing, nodePosition, orbitsFor } from './mapLayout';

describe('mapa: um sistema solar só', () => {
  it('nenhum local fica em cima de outro, mesmo com muitos locais', () => {
    expect(minSpacing(60)).toBeGreaterThan(110);
    expect(minSpacing(150)).toBeGreaterThan(100);
  });
  it('todos longe da estrela, da base e de Aurora', () => {
    for (let i = 0; i < 150; i++) {
      const p = nodePosition(i);
      expect(Math.hypot(p.x, p.y), `local ${i}`).toBeGreaterThan(160);
      expect(Math.hypot(p.x - BASE_POS.x, p.y - BASE_POS.y), `local ${i}`).toBeGreaterThan(110);
      expect(Math.hypot(p.x - AURORA_POS.x, p.y - AURORA_POS.y), `local ${i} × Aurora`).toBeGreaterThan(130);
    }
  });
  it('a posição de um local não muda, nem além dos lugares pré-calculados', () => {
    expect(nodePosition(5)).toEqual(nodePosition(5));
    const far = nodePosition(200);
    expect(nodePosition(200)).toEqual(far);
    expect(Number.isFinite(far.x) && Number.isFinite(far.y)).toBe(true);
  });
  it('as órbitas desenhadas alcançam o local mais distante', () => {
    expect(orbitsFor(0).length).toBeGreaterThanOrEqual(1);
    expect(orbitsFor(40).length).toBeGreaterThan(orbitsFor(5).length);
  });
  it('os megaprojetos não ficam em cima de locais, da base, de Aurora nem uns dos outros', () => {
    const fixed = [BASE_POS, AURORA_POS, ...Object.values(MEGA_POS)];
    for (const [id, m] of Object.entries(MEGA_POS)) {
      expect(Math.hypot(m.x, m.y), `${id} × estrela`).toBeGreaterThan(110);
      for (const o of fixed) if (o !== m) expect(Math.hypot(m.x - o.x, m.y - o.y), `${id} × fixo`).toBeGreaterThan(80);
      for (let i = 0; i < 150; i++) {
        const p = nodePosition(i);
        expect(Math.hypot(p.x - m.x, p.y - m.y), `${id} × local ${i}`).toBeGreaterThan(80);
      }
    }
  });
});
