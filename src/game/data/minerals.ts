import type { MineralDef } from '../types';

// Catálogo baseado em Assets/minerios.jpg. A prancha não traz nomes: os nomes e usos abaixo são
// provisórios (definidos no código) e podem ser trocados sem tocar nas imagens.
// Hoje só ferro, cobre e ouro existem no asteroide inicial; os demais ficam para a expansão.
const m = (id: string, name: string, use: string, rarity: MineralDef['rarity'], sprite: string): MineralDef =>
  ({ id, name, use, rarity, sprite });

export const MINERALS: MineralDef[] = [
  m('iron', 'Ferro', 'Minério comum', 'comum', 'ore-iron'),
  m('copper', 'Cobre', 'Minério comum', 'comum', 'ore-copper'),
  m('gold', 'Ouro', 'Minério raro', 'raro', 'ore-gold'),
  m('titanium', 'Titânio', 'Ligas leves e perfuratrizes', 'raro', 'ingot-titanium'),
  m('cyan-vein', 'Veio de cianita', 'Energia e eletrônica', 'raro', 'vein-cyan'),
  m('cyan-crystal', 'Cristal de cianita', 'Baterias e reatores', 'raro', 'node-cyan'),
  m('magma-vein', 'Rocha magmática', 'Ligas especiais', 'raro', 'vein-orange-big'),
  m('amber-crystal', 'Cristal âmbar', 'Combustível de fusão', 'raro', 'node-amber'),
  m('violet-vein', 'Veio de violeta', 'Tecnologia avançada', 'exótico', 'vein-violet'),
  m('violet-crystal', 'Cristal violeta', 'Pesquisa', 'exótico', 'node-violet'),
  m('green-crystal', 'Cristal verde', 'Biotecnologia', 'raro', 'node-green'),
  m('red-crystal', 'Cristal rubro', 'Propulsão', 'exótico', 'node-red'),
  m('silver-node', 'Nódulo prateado', 'Condutores avançados', 'exótico', 'node-silver'),
  m('silver', 'Prata', 'Condutores', 'raro', 'raw-silver-ingot'),
];

export const MINERAL_BY_ID = Object.fromEntries(MINERALS.map(x => [x.id, x]));
