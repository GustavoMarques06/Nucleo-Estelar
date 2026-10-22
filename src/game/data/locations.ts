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
  { type: 'rocky', name: 'Mundo rochoso', sprites: ['planet-rocky', 'planet-grey', 'planet-dark', 'planet-moon', 'moon-grey',
    'planet-rocky-rust', 'planet-rocky-basalt', 'planet-rocky-strata', 'planet-rocky-impact'],
    terrain: 'terrain-rocky', yields: { iron: 6, copper: 3 }, minerals: ['silver', 'magma-vein'], weight: 5, need: 'water' },
  { type: 'ice', name: 'Mundo gelado', sprites: ['planet-ice', 'planet-ice-peaks', 'moon-snow', 'asteroid-ice',
    'planet-ice-deep', 'planet-ice-geyser', 'planet-ice-dirty', 'planet-ice-aurora'],
    terrain: 'terrain-ice', yields: { water: 6 }, minerals: ['cyan-vein', 'cyan-crystal'], weight: 4, need: 'iron' },
  { type: 'desert', name: 'Deserto', sprites: ['planet-desert', 'planet-desert-canyon', 'planet-desert-dunes',
    'planet-desert-salt', 'planet-desert-red', 'planet-desert-glass', 'planet-desert-dry'],
    terrain: 'terrain-desert', yields: { iron: 3, gold: 0.4 }, minerals: ['amber-crystal', 'silver'], weight: 3, need: 'water' },
  { type: 'ocean', name: 'Mundo oceânico', sprites: ['planet-ocean', 'planet-ocean-islands', 'planet-habitable',
    'planet-ocean-storm', 'planet-ocean-shallow', 'planet-ocean-dark', 'planet-ocean-volcanic'],
    terrain: 'terrain-ocean', yields: { water: 4, food: 3 }, minerals: ['cyan-crystal', 'green-crystal'], weight: 3, need: 'iron' },
  { type: 'jungle', name: 'Selva', sprites: ['planet-jungle', 'planet-jungle-rivers',
    'planet-jungle-wet', 'planet-jungle-swamp', 'planet-jungle-autumn', 'planet-jungle-mountains'],
    terrain: 'terrain-jungle', yields: { food: 6, science: 0.6 }, minerals: ['green-crystal'], weight: 2, need: 'copper' },
  { type: 'volcanic', name: 'Mundo vulcânico', sprites: ['planet-volcanic', 'planet-volcanic-active', 'moon-lava', 'asteroid-volcanic',
    'planet-volcanic-blue', 'planet-volcanic-cooling', 'planet-volcanic-lava-ocean', 'planet-volcanic-sulfur'],
    terrain: 'terrain-volcanic-alien', yields: { gold: 0.5, exotic: 0.03 }, minerals: ['red-crystal', 'magma-vein'], weight: 2, need: 'food' },
  { type: 'alien', name: 'Mundo alienígena', sprites: ['planet-alien', 'planet-alien-glow', 'planet-alien-hex',
    'planet-alien-coral', 'planet-alien-spores', 'planet-alien-circuit', 'planet-alien-eyes'],
    terrain: 'terrain-volcanic-alien', yields: { science: 1.5, exotic: 0.05 }, minerals: ['violet-crystal', 'violet-vein'], weight: 1, need: 'gold' },
  { type: 'gas', name: 'Gigante gasoso', sprites: ['planet-gas', 'planet-neptune', 'planet-ringed',
    'planet-gas-emerald', 'planet-gas-amber', 'planet-gas-pale', 'planet-gas-ringed-violet'],
    terrain: null, yields: { fuel: 3 }, minerals: ['silver-node'], weight: 3, need: 'food' },
  { type: 'metallic', name: 'Asteroide metálico', sprites: ['asteroid-metallic', 'asteroid-metallic-dense', 'asteroid-metallic-split',
    'asteroid-metallic-spiral', 'asteroid-metallic-holed'],
    terrain: null, yields: { iron: 10, copper: 4, gold: 0.2 }, minerals: ['silver'], weight: 3, need: 'fuel' },
  { type: 'crystal', name: 'Asteroide de cristais', sprites: ['asteroid-crystal-large', 'asteroid-crystal-blue', 'asteroid-crystal-pink',
    'asteroid-crystal-green', 'asteroid-crystal-gold'],
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
  { id: 'civilization', name: 'Civilização', desc: 'Cidade: moradia para +40 colonos e +6 créditos/s por nível.', icon: 'nav-civilization' },
];

// ---------- Propósito de cada mundo ----------
// O tipo do mundo decide quais propósitos existem nele e quão bem cada um rende. "Bom" rende o valor da descrição;
// "Ótimo" multiplica o bônus por 1,5 e "Fraco" por 0,6. Propósito ausente da lista não pode ser escolhido.
export type Aptitude = 'great' | 'good' | 'poor';
export const APTITUDE_MULT: Record<Aptitude, number> = { great: 1.5, good: 1, poor: 0.6 };
export const APTITUDE_NAME: Record<Aptitude, string> = { great: 'Ótimo', good: 'Bom', poor: 'Fraco' };

export const APTITUDES: Record<LocationType, Partial<Record<Specialization, Aptitude>>> = {
  rocky: { mining: 'great', industry: 'good', commerce: 'good', civilization: 'good', agriculture: 'poor', science: 'poor' },
  ice: { science: 'great', mining: 'good', commerce: 'good', civilization: 'poor', agriculture: 'poor' },
  desert: { mining: 'great', industry: 'good', science: 'good', commerce: 'good', civilization: 'poor' },
  ocean: { agriculture: 'great', civilization: 'great', science: 'good', commerce: 'good', mining: 'poor' },
  jungle: { agriculture: 'great', science: 'great', civilization: 'good', commerce: 'good', mining: 'poor' },
  volcanic: { mining: 'great', industry: 'great', science: 'good', commerce: 'poor' },
  alien: { science: 'great', agriculture: 'good', commerce: 'good', civilization: 'poor', mining: 'poor' },
  gas: { mining: 'great', industry: 'good', science: 'good', commerce: 'good' },
  metallic: { mining: 'great', industry: 'great', commerce: 'good' },
  crystal: { science: 'great', mining: 'good', industry: 'good', commerce: 'good' },
};

/** Traço de um planeta: sorteado pela semente, muda o quanto cada propósito rende ali. */
export interface TraitDef { id: string; name: string; desc: string; effects: Partial<Record<Specialization, number>> }

export const TRAITS: TraitDef[] = [
  { id: 'fertile', name: 'Solo fértil', desc: 'Agricultura ×1,4.', effects: { agriculture: 1.4 } },
  { id: 'deepVeins', name: 'Veios profundos', desc: 'Mineração ×1,4.', effects: { mining: 1.4 } },
  { id: 'ruins', name: 'Ruínas antigas', desc: 'Ciência ×1,5.', effects: { science: 1.5 } },
  { id: 'crossroads', name: 'Encruzilhada estelar', desc: 'Comércio ×1,5.', effects: { commerce: 1.5 } },
  { id: 'mild', name: 'Clima ameno', desc: 'Civilização ×1,4 e agricultura ×1,2.', effects: { civilization: 1.4, agriculture: 1.2 } },
  { id: 'geothermal', name: 'Calor geotérmico', desc: 'Indústria ×1,4.', effects: { industry: 1.4 } },
  { id: 'lowGravity', name: 'Gravidade baixa', desc: 'Indústria e comércio ×1,2.', effects: { industry: 1.2, commerce: 1.2 } },
  { id: 'unstable', name: 'Crosta instável', desc: 'Mineração ×1,2, mas civilização ×0,6.', effects: { mining: 1.2, civilization: 0.6 } },
  { id: 'toxic', name: 'Atmosfera tóxica', desc: 'Ciência ×1,2, mas civilização ×0,5 e agricultura ×0,6.', effects: { science: 1.2, civilization: 0.5, agriculture: 0.6 } },
];
export const TRAIT_BY_ID = Object.fromEntries(TRAITS.map(t => [t.id, t])) as Record<string, TraitDef>;

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
