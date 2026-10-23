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
    expect(TERRA_SPRITES.ocean).toContain(locationSprite(ocean, [ocean]));
    expect(locationSprite(ocean, [ocean])).toBe(locationSprite(ocean, [ocean]));          // a mesma colônia, sempre a mesma cara
    ocean.outpost!.level = CAPITAL_LEVEL;
    expect(CAPITAL_SPRITES).toContain(locationSprite(ocean, [ocean]));
    ocean.outpost!.terra = 2;
    expect(locationSprite(ocean, [ocean])).toBe(ocean.sprite);
  });

  it('o império tem uma capital só: a de maior nível (no empate, a mais antiga); as outras ficam com a cara do tipo', () => {
    const all = [colony(10, 'ocean'), colony(11, 'ice'), colony(12, 'jungle'), colony(13, 'rocky')];
    all.forEach(l => { l.outpost!.level = 19; });
    all[2].outpost!.level = 22;
    all[3].outpost!.terra = 2;                                         // ainda não terraformada
    const looks = all.map(l => locationSprite(l, [...all]));
    expect(looks.filter(n => CAPITAL_SPRITES.includes(n))).toHaveLength(1);
    expect(CAPITAL_SPRITES).toContain(looks[2]);
    expect(TERRA_SPRITES.ocean).toContain(looks[0]);
    expect(TERRA_SPRITES.ice).toContain(looks[1]);
    all[2].outpost!.level = 19;                                        // empate: a mais antiga
    expect(CAPITAL_SPRITES).toContain(locationSprite(all[0], [...all]));
    all.forEach(l => { l.outpost!.level = CAPITAL_LEVEL - 1; });      // ninguém chegou ao nível: sem capital
    expect([...all].map(l => locationSprite(l, [...all])).some(n => CAPITAL_SPRITES.includes(n))).toBe(false);
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
    const terra = new Set(Array.from({ length: 20 }, (_, i) => colony(100 + i, 'ocean')).map((l, _, all) => locationSprite(l, all)));
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
