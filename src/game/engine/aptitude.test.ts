import { describe, expect, it } from 'vitest';
import { newGame } from './state';
import { establishOutpost, generateLocation, outpostYield, reconvertCost, reconvertLevels, setSpecialization } from './expansion';
import { aptitudeOf, bestSpec, civHousing, locationTraits, specFit, specOptions } from './aptitude';
import { getModifiers, housingCap } from './modifiers';
import { canAfford } from './costs';
import { parseSave, serialize } from './save';
import { APTITUDES, LOCATION_TYPES, TRAITS } from '../data/locations';
import type { GameState, Location, LocationType } from '../types';

const rich = (s: GameState) => {
  Object.assign(s.resources, { credits: 1e12, alloys: 1e9, components: 1e9, ships: 100 });
  return s;
};
const mk = (seed: number, type: LocationType): Location => ({ ...generateLocation(seed), type, richness: 1, claimedBy: null, distance: 2 });
const withLoc = (type: LocationType, seed = 1) => { const s = rich(newGame(0)); s.locations.push(mk(seed, type)); return s; };

describe('propósito de cada mundo', () => {
  it('todo tipo aceita pelo menos 3 propósitos; mineração e comércio existem em todos', () => {
    for (const def of LOCATION_TYPES) {
      expect(specOptions(def).length, def.type).toBeGreaterThanOrEqual(3);
      expect(aptitudeOf(def, 'mining'), def.type).not.toBeNull();
      expect(aptitudeOf(def, 'commerce'), def.type).not.toBeNull();
    }
  });

  it('civilização só em mundos habitáveis (nunca em gás nem asteroides)', () => {
    for (const type of ['gas', 'metallic', 'crystal', 'volcanic'] as LocationType[]) expect(APTITUDES[type].civilization, type).toBeUndefined();
    expect(APTITUDES.ocean.civilization).toBe('great');
  });

  it('a lista vem do mais apto para o menos', () => {
    const order = ['great', 'good', 'poor'];
    for (const def of LOCATION_TYPES) {
      const idx = specOptions(def).map(sp => order.indexOf(aptitudeOf(def, sp)!));
      expect(idx, def.type).toEqual([...idx].sort((a, b) => a - b));
    }
  });

  it('fundar exige um propósito que o mundo aceita', () => {
    const s = withLoc('gas');
    expect(establishOutpost(s, s.locations[0].id, 'civilization')).toBeNull();
    expect(establishOutpost(s, s.locations[0].id, 'mining')!.locations[0].outpost!.spec).toBe('mining');
  });
});

describe('traços do planeta', () => {
  it('cada planeta tem 1 ou 2 traços diferentes, sempre os mesmos, e todos ajudam algum propósito possível ali', () => {
    let two = 0;
    for (let seed = 1; seed <= 300; seed++) {
      for (const def of LOCATION_TYPES) {
        const loc = { seed, type: def.type };
        const tr = locationTraits(loc);
        expect(tr.length).toBeGreaterThanOrEqual(1);
        expect(tr.length).toBeLessThanOrEqual(2);
        expect(new Set(tr).size).toBe(tr.length);
        expect(locationTraits(loc)).toEqual(tr);
        for (const x of tr) expect(Object.entries(x.effects).some(([sp, k]) => (k ?? 1) > 1 && aptitudeOf(loc, sp as never)), `${def.type}/${x.id}`).toBe(true);
        if (tr.length === 2) two++;
      }
    }
    const share = two / (300 * LOCATION_TYPES.length);
    expect(share).toBeGreaterThan(0.3);
    expect(share).toBeLessThan(0.5);
  });

  it('todo traço aparece em algum planeta', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 500; seed++) for (const def of LOCATION_TYPES) for (const tr of locationTraits({ seed, type: def.type })) seen.add(tr.id);
    expect([...seen].sort()).toEqual(TRAITS.map(t => t.id).sort());
  });

  it('a aptidão vezes os traços escala o bônus do propósito', () => {
    // Dois planetas de comércio: os créditos ficam na mesma proporção que o encaixe de cada um.
    const credits = (type: LocationType, seed: number) => {
      const s = establishOutpost(withLoc(type, seed), `loc-${seed}`, 'commerce')!;
      return { c: outpostYield(s.locations[0], getModifiers(s), s).credits!, f: specFit(s.locations[0], 'commerce') };
    };
    const a = credits('rocky', 1), b = credits('volcanic', 2);       // comércio "Bom" e "Fraco"
    expect(a.f).not.toBeCloseTo(b.f);
    expect(a.c / b.c).toBeCloseTo(a.f / b.f);
    expect(specFit({ seed: 1, type: 'gas' }, 'civilization')).toBe(0);
  });
});

describe('civilização', () => {
  it('a colônia vira cidade: aumenta a moradia e rende créditos', () => {
    const s = withLoc('ocean');
    const before = housingCap(s);
    const a = establishOutpost(s, s.locations[0].id, 'civilization')!;
    const loc = a.locations[0];
    expect(civHousing(loc)).toBeGreaterThan(0);
    expect(housingCap(a)).toBeCloseTo(before + civHousing(loc) * getModifiers(a).popCap);
    expect(outpostYield(loc, getModifiers(a), a).credits ?? 0).toBeGreaterThan(0);
  });

  it('outros propósitos não dão moradia', () => {
    const s = withLoc('ocean');
    const a = establishOutpost(s, s.locations[0].id, 'agriculture')!;
    expect(civHousing(a.locations[0])).toBe(0);
  });
});

describe('reconversão', () => {
  it('cobra caro, perde um quarto dos níveis e troca o propósito', () => {
    let s = establishOutpost(withLoc('rocky'), 'loc-1', 'mining')!;
    s.locations[0].outpost!.level = 8;
    const loc = s.locations[0];
    expect(reconvertLevels(loc)).toBe(2);
    const credits = s.resources.credits;
    s = setSpecialization(s, loc.id, 'industry')!;
    expect(s.locations[0].outpost!.spec).toBe('industry');
    expect(s.locations[0].outpost!.level).toBe(6);
    expect(s.resources.credits).toBe(credits - (reconvertCost(loc).credits ?? 0));
  });

  it('no nível 1 não perde nível; recusa propósito impossível, o mesmo de antes e falta de recursos', () => {
    const s = establishOutpost(withLoc('gas'), 'loc-1', 'mining')!;
    expect(reconvertLevels(s.locations[0])).toBe(0);
    expect(setSpecialization(s, 'loc-1', 'civilization')).toBeNull();
    expect(setSpecialization(s, 'loc-1', 'mining')).toBeNull();
    const poor = { ...s, resources: { ...s.resources, credits: 0 } };
    expect(canAfford(poor, reconvertCost(s.locations[0]))).toBe(false);
    expect(setSpecialization(poor, 'loc-1', 'industry')).toBeNull();
  });
});

describe('saves antigos', () => {
  it('colônia com um propósito que o mundo não aceita mais passa para o mais apto dali', () => {
    const s = establishOutpost(withLoc('gas'), 'loc-1', 'mining')!;
    s.locations[0].outpost!.spec = 'agriculture';          // gás não aceita agricultura
    const back = parseSave(serialize(s))!;
    expect(back.locations[0].outpost!.spec).toBe(bestSpec(back.locations[0]));
    expect(aptitudeOf(back.locations[0], back.locations[0].outpost!.spec)).not.toBeNull();
  });
});
