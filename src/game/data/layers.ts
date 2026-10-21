import type { Amounts, BuildingId, UpgradeId } from '../types';

/** Uma camada do asteroide: quanto mais fundo, mais rica a crosta (e mais pesada a broca exigida). */
export interface LayerDef {
  name: string;
  desc: string;
  minMined: number;          // minério extraído nesta jornada para chegar aqui
  needs?: BuildingId;        // estrutura que precisa existir para perfurar até aqui
  mix: Amounts;              // composição da crosta nesta camada (pesos relativos)
  yield: number;             // multiplicador de extração da crosta
  sprite: string;            // aparência do asteroide na cena
}

// Os minérios que dependem de pesquisa só aparecem na crosta depois dela (titânio e cristais).
export const LAYER_GATES: Partial<Record<string, UpgradeId>> = { titanium: 'deepProspecting', crystals: 'crystallography' };

export const LAYERS: LayerDef[] = [
  { name: 'Regolito', desc: 'Poeira e cascalho da superfície: ferro, cobre e um pouco de ouro.', minMined: 0,
    mix: { iron: 0.68, copper: 0.3, gold: 0.02 }, yield: 1, sprite: 'asteroid-layer-1' },
  { name: 'Crosta fraturada', desc: 'Rocha rachada pelos impactos: mais ouro e extração mais fácil.', minMined: 2e4,
    mix: { iron: 0.62, copper: 0.33, gold: 0.05 }, yield: 1.1, sprite: 'asteroid-layer-2' },
  { name: 'Manto metálico', desc: 'Metal denso: exige o Britador de asteroide.', minMined: 5e5, needs: 'crusher',
    mix: { iron: 0.58, copper: 0.34, gold: 0.08 }, yield: 1.25, sprite: 'asteroid-layer-3' },
  { name: 'Veios profundos', desc: 'O titânio começa a aparecer na própria crosta (com Prospecção profunda).', minMined: 2e7, needs: 'crusher',
    mix: { iron: 0.5, copper: 0.32, gold: 0.09, titanium: 0.09 }, yield: 1.4, sprite: 'asteroid-layer-4' },
  { name: 'Núcleo externo', desc: 'Pressão extrema: só a Perfuratriz profunda chega. Cristais na crosta (com Cristalografia).', minMined: 2e8, needs: 'deepDrill',
    mix: { iron: 0.45, copper: 0.3, gold: 0.1, titanium: 0.12, crystals: 0.03 }, yield: 1.6, sprite: 'asteroid-layer-5' },
  { name: 'Núcleo', desc: 'O coração do asteroide: a crosta mais rica de todas.', minMined: 1e9, needs: 'deepDrill',
    mix: { iron: 0.4, copper: 0.28, gold: 0.12, titanium: 0.14, crystals: 0.06 }, yield: 1.8, sprite: 'asteroid-layer-6' },
];
