import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '../game/data/buildings';
import { BUILDING_IDS_ART, CIV_BUILDINGS, CIV_SLOTS, SLOTS } from './sceneConfig';

describe('evolução visual da base e de Aurora', () => {
  it('toda estrutura tem lugar no asteroide ou no planeta (e nunca nos dois)', () => {
    const missing = BUILDINGS.filter(b => !SLOTS[b.id] && !CIV_SLOTS[b.id]).map(b => b.id);
    expect(missing).toEqual([]);
    expect(Object.keys(CIV_SLOTS).filter(id => id in SLOTS)).toEqual([]);
  });

  it('as estruturas da civilização ficam no planeta', () => {
    expect(CIV_BUILDINGS.filter(id => !CIV_SLOTS[id])).toEqual([]);
  });

  it('a arte de níveis maiores só existe para quem aparece em alguma cena', () => {
    expect(BUILDING_IDS_ART.filter(id => !SLOTS[id] && !CIV_SLOTS[id])).toEqual([]);
  });

  it('cada instância visual aparece numa quantidade crescente, começando em 1', () => {
    for (const [id, slot] of Object.entries({ ...SLOTS, ...CIV_SLOTS })) {
      expect(slot!.thresholds[0], id).toBe(1);
      expect(slot!.thresholds.length, id).toBe(slot!.at.length);
      for (let i = 1; i < slot!.thresholds.length; i++) expect(slot!.thresholds[i], id).toBeGreaterThan(slot!.thresholds[i - 1]);
    }
  });

  it('Aurora: prédios dentro do disco e sem um em cima do outro', () => {
    const pts = Object.entries(CIV_SLOTS).flatMap(([id, slot]) => slot!.at.map((p, i) => ({ k: `${id}#${i}`, p })));
    for (const { k, p } of pts) expect(Math.hypot(p[0], p[1]), k).toBeLessThan(0.45);
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i].p[0] - pts[j].p[0], pts[i].p[1] - pts[j].p[1]);
      expect(d, `${pts[i].k} ~ ${pts[j].k}`).toBeGreaterThan(0.07);
    }
  });
});
