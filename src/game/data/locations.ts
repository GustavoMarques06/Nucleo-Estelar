import type { Amounts, LocationType, ResId, Specialization } from '../types';

export interface LocationTypeDef {
  type: LocationType;
  name: string;
  sprites: string[];         // variações de aparência
  terrain: string | null;    // paisagem em public/assets/art
  yields: Amounts;           // produção por nível por segundo (antes da riqueza)
  minerals: string[];        // minerais do catálogo possíveis aqui
  weight: number;            // frequência relativa na geração
  need: ResId;               // recurso que a colônia "consome": uma rota com quem o produz dá bônus
}

// Cada tipo de local oferece uma escolha econômica diferente (GDD, seção 8).
export const LOCATION_TYPES: LocationTypeDef[] = [
  { type: 'rocky', name: 'Mundo rochoso', sprites: ['planet-rocky', 'planet-grey', 'planet-dark', 'planet-moon', 'moon-grey'],
    terrain: 'terrain-rocky', yields: { iron: 6, copper: 3 }, minerals: ['silver', 'magma-vein'], weight: 5, need: 'water' },
  { type: 'ice', name: 'Mundo gelado', sprites: ['planet-ice', 'planet-ice-peaks', 'moon-snow', 'asteroid-ice'],
    terrain: 'terrain-ice', yields: { water: 6 }, minerals: ['cyan-vein', 'cyan-crystal'], weight: 4, need: 'iron' },
  { type: 'desert', name: 'Deserto', sprites: ['planet-desert', 'planet-desert-canyon', 'planet-desert-dunes'],
    terrain: 'terrain-desert', yields: { iron: 3, gold: 0.4 }, minerals: ['amber-crystal', 'silver'], weight: 3, need: 'water' },
  { type: 'ocean', name: 'Mundo oceânico', sprites: ['planet-ocean', 'planet-ocean-islands', 'planet-habitable'],
    terrain: 'terrain-ocean', yields: { water: 4, food: 3 }, minerals: ['cyan-crystal', 'green-crystal'], weight: 3, need: 'iron' },
  { type: 'jungle', name: 'Selva', sprites: ['planet-jungle', 'planet-jungle-rivers'],
    terrain: 'terrain-jungle', yields: { food: 6, science: 0.6 }, minerals: ['green-crystal'], weight: 2, need: 'copper' },
  { type: 'volcanic', name: 'Mundo vulcânico', sprites: ['planet-volcanic', 'planet-volcanic-active', 'moon-lava', 'asteroid-volcanic'],
    terrain: 'terrain-volcanic-alien', yields: { gold: 0.5, exotic: 0.03 }, minerals: ['red-crystal', 'magma-vein'], weight: 2, need: 'food' },
  { type: 'alien', name: 'Mundo alienígena', sprites: ['planet-alien', 'planet-alien-glow', 'planet-alien-hex'],
    terrain: 'terrain-volcanic-alien', yields: { science: 1.5, exotic: 0.05 }, minerals: ['violet-crystal', 'violet-vein'], weight: 1, need: 'gold' },
  { type: 'gas', name: 'Gigante gasoso', sprites: ['planet-gas', 'planet-neptune', 'planet-ringed'],
    terrain: null, yields: { fuel: 3 }, minerals: ['silver-node'], weight: 3, need: 'food' },
  { type: 'metallic', name: 'Asteroide metálico', sprites: ['asteroid-metallic', 'asteroid-metallic-dense', 'asteroid-metallic-split'],
    terrain: null, yields: { iron: 10, copper: 4, gold: 0.2 }, minerals: ['silver'], weight: 3, need: 'fuel' },
  { type: 'crystal', name: 'Asteroide de cristais', sprites: ['asteroid-crystal-large', 'asteroid-crystal-blue', 'asteroid-crystal-pink'],
    terrain: null, yields: { exotic: 0.08, science: 0.5 }, minerals: ['violet-crystal', 'cyan-crystal', 'silver-node'], weight: 1, need: 'copper' },
];

export const LOCATION_BY_TYPE = Object.fromEntries(LOCATION_TYPES.map(t => [t.type, t])) as Record<LocationType, LocationTypeDef>;

export interface SpecDef { id: Specialization; name: string; desc: string; icon: string }

export const SPECIALIZATIONS: SpecDef[] = [
  { id: 'mining', name: 'Mineração', desc: 'Recursos naturais do local ×1,6.', icon: 'nav-mining' },
  { id: 'agriculture', name: 'Agricultura', desc: '+2 alimentos/s por nível; água ×1,5.', icon: 'icon-sprout' },
  { id: 'science', name: 'Ciência', desc: '+0,8 ciência/s por nível; ciência do local ×1,5.', icon: 'nav-research' },
  { id: 'industry', name: 'Indústria', desc: '+1 liga/s e +0,15 componente/s por nível.', icon: 'nav-industry' },
  { id: 'commerce', name: 'Comércio', desc: '+15 créditos/s por nível.', icon: 'nav-market' },
];

const PREFIX = ['Kepler', 'Vega', 'Orion', 'Lyra', 'Draco', 'Cygnus', 'Altair', 'Rigel', 'Sirius', 'Tau', 'Nova', 'Helix', 'Zeta', 'Aurora', 'Ceres', 'Hydra'];
const SUFFIX = ['Prime', 'b', 'c', 'II', 'III', 'IV', 'Maior', 'Menor', 'Profundo', 'Alfa', 'Beta', 'Gama'];
export const nameFor = (r: () => number) => `${PREFIX[Math.floor(r() * PREFIX.length)]} ${SUFFIX[Math.floor(r() * SUFFIX.length)]}`;

// Rotas comerciais: ligam duas colônias. Quem recebe o que precisa produz mais; quem fornece ganha uma taxa.
export const ROUTE = {
  suppliedBonus: 0.35,       // colônia abastecida: produção +35%
  supplierBonus: 0.10,       // por rota em que ela abastece a parceira: +10%
  baseMax: 2,                // rotas por colônia (+1 a cada 5 Portos de carga, até +3)
  creditsBase: 30000,
  creditsGrowth: 1.5,        // por rota já aberta no império
  fuelBase: 200,
  fuelPerDistance: 60,
};
