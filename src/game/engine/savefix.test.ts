import { describe, expect, it } from 'vitest';
import { newGame } from './state';
import { parseSave, serialize } from './save';
import { generateLocation, locationSprite, CAPITAL_LEVEL, CAPITAL_SPRITES, TERRA_SPRITES } from './expansion';
import { LOCATION_TYPES } from '../data/locations';

const colony = (seed: number, type?: string) => {
  const l = generateLocation(seed);
  if (type) (l as { type: string }).type = type;
  l.outpost = { level: 3, spec: 'mining', terra: 5, terraRemaining: 0, terraTotal: 0 };
  return l;
};

describe('leitura do save: dados impossíveis são consertados', () => {
  it('dois locais com o mesmo nome: o segundo ganha um numeral', () => {
    const s = newGame(0);
    const a = colony(1), b = colony(2);
    b.name = a.name;
    s.locations = [a, b];
    const back = parseSave(serialize(s))!;
    expect(back.locations[0].name).toBe(a.name);
    expect(back.locations[1].name).toBe(`${a.name} II`);
  });

  it('gigante gasoso e asteroides não ficam terraformados', () => {
    const s = newGame(0);
    s.locations = [colony(3, 'gas'), colony(4, 'metallic'), colony(5, 'ocean')];
    const back = parseSave(serialize(s))!;
    expect(back.locations.map(l => l.outpost!.terra)).toEqual([0, 0, 5]);
  });

  it('terraformado mostra o jardim do seu tipo; de nível alto, o mundo-capital', () => {
    const ocean = colony(6, 'ocean');
    expect(TERRA_SPRITES.ocean).toContain(locationSprite(ocean));
    expect(locationSprite(ocean)).toBe(locationSprite(ocean));          // a mesma colônia, sempre a mesma cara
    ocean.outpost!.level = CAPITAL_LEVEL;
    expect(CAPITAL_SPRITES).toContain(locationSprite(ocean));
    ocean.outpost!.terra = 2;
    expect(locationSprite(ocean)).toBe(ocean.sprite);
  });

  it('mapa de save antigo com planetas repetidos ganha as aparências livres', () => {
    const s = newGame(0);
    s.locations = [colony(1, 'jungle'), colony(2, 'jungle'), colony(3, 'jungle')];
    for (const l of s.locations) { l.sprite = 'planet-jungle'; l.outpost = null; }
    const back = parseSave(serialize(s))!;
    expect(back.locations[0].sprite).toBe('planet-jungle');           // o primeiro fica como estava
    expect(new Set(back.locations.map(l => l.sprite)).size).toBe(3);
    expect(parseSave(serialize(back))!.locations.map(l => l.sprite)).toEqual(back.locations.map(l => l.sprite));   // estável
  });

  it('terraformados e capitais variam entre colônias', () => {
    const terra = new Set(Array.from({ length: 20 }, (_, i) => locationSprite(colony(100 + i, 'ocean'))));
    expect(terra.size).toBe(TERRA_SPRITES.ocean!.length);
  });

  it('o mapa só repete a aparência de um tipo depois de usar todas', () => {
    for (const def of LOCATION_TYPES) {
      const taken: string[] = [];
      for (let seed = 1; taken.length < def.sprites.length * 2 && seed < 20000; seed++) {
        const l = generateLocation(seed, 1, 0, taken);
        if (l.type !== def.type) continue;
        taken.push(l.sprite);
        if (taken.length === def.sprites.length) expect(new Set(taken).size, def.type).toBe(def.sprites.length);
      }
      // segunda volta: cada aparência aparece exatamente duas vezes
      expect(def.sprites.every(sp => taken.filter(x => x === sp).length === 2), def.type).toBe(true);
    }
  });
});
