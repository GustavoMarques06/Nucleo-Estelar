import { describe, expect, it } from 'vitest';
import { newGame } from './state';
import { parseSave, serialize } from './save';
import { generateLocation, locationSprite, CAPITAL_LEVEL } from './expansion';

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
    expect(locationSprite(ocean)).toBe('planet-terra-ocean');
    ocean.outpost!.level = CAPITAL_LEVEL;
    expect(locationSprite(ocean)).toBe('planet-capital');
    ocean.outpost!.terra = 2;
    expect(locationSprite(ocean)).toBe(ocean.sprite);
  });
});
