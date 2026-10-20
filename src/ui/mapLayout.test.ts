import { describe, expect, it } from 'vitest';
import { SECTOR_SIZE, minSpacing, nodePosition } from './mapLayout';

describe('mapa: locais espalhados', () => {
  it('nenhum local fica em cima de outro, em vários setores', () => {
    for (let sector = 0; sector < 6; sector++) expect(minSpacing(sector), `setor ${sector}`).toBeGreaterThan(105);
  });
  it('todos dentro do mapa e longe da base', () => {
    for (let i = 0; i < SECTOR_SIZE * 3; i++) {
      const p = nodePosition(i);
      expect(p.x).toBeGreaterThanOrEqual(5); expect(p.x).toBeLessThanOrEqual(95);
      expect(p.y).toBeGreaterThanOrEqual(21); expect(p.y).toBeLessThanOrEqual(81);
      expect(Math.hypot((p.x - 50) * 9.4, (p.y - 50) * 4.3)).toBeGreaterThan(120);
    }
  });
  it('a posição de um local não muda', () => {
    expect(nodePosition(5)).toEqual(nodePosition(5));
  });
});
