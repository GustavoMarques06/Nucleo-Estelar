import { describe, expect, it } from 'vitest';
import { UPGRADES } from '../game/data/upgrades';
import { layoutTree } from './researchLayout';

const tree = layoutTree(UPGRADES);

describe('árvore de pesquisa: layout', () => {
  it('toda pesquisa tem lugar, sem encostar em outra da mesma coluna', () => {
    expect(tree.nodes).toHaveLength(UPGRADES.length);
    for (const a of tree.nodes) for (const b of tree.nodes) {
      if (a !== b && a.col === b.col) expect(Math.abs(a.row - b.row), `${a.id} × ${b.id}`).toBeGreaterThanOrEqual(1 - 1e-9);
    }
  });
  it('cada pré-requisito vira uma ligação que anda uma coluna por vez, da esquerda para a direita', () => {
    expect(tree.edges).toHaveLength(UPGRADES.reduce((a, u) => a + (u.requires?.length ?? 0), 0));
    for (const e of tree.edges) {
      expect(e.points[0]).toEqual({ col: tree.byId[e.from].col, row: tree.byId[e.from].row });
      e.points.slice(1).forEach((p, i) => expect(p.col, `${e.from} → ${e.to}`).toBe(e.points[i].col + 1));
    }
  });
  it('a ordenação deixa poucas ligações cruzadas', () => {
    expect(tree.crossings).toBeLessThanOrEqual(35);
  });
});
