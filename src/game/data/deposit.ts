import type { Amounts, BuildingId } from '../types';

/** Um tipo de veio que a prospecção pode encontrar. */
export interface VeinKind {
  id: string;
  name: string;
  icon: string;
  desc: string;
  mix: Amounts;              // composição (soma = 1)
  yield: number;             // multiplicador de extração enquanto o veio durar
  reserve: number;           // tamanho relativo da reserva (1 = padrão)
  weight: number;            // frequência relativa no sorteio
  minFound?: number;         // só aparece depois de tantos veios já encontrados
  requires?: string;         // pesquisa que libera este tipo
  only?: BuildingId[];       // só estas estruturas conseguem extrair dele (as demais e os cliques usam a crosta)
}

/** A crosta do asteroide: infinita, sempre disponível, com a composição de sempre. */
export const CRUST_ID = 'crust';

// Veios: reservas finitas que rendem mais que a crosta e trazem minérios que ela não tem.
// A reserva é calculada na hora da descoberta a partir do ritmo de extração (cerca de 15 min de furo).
export const VEIN_KINDS: VeinKind[] = [
  { id: 'ferrous', name: 'Veio ferroso', icon: 'vein-ferrous', desc: 'Muito ferro, um pouco de cobre.',
    mix: { iron: 0.82, copper: 0.18 }, yield: 1.5, reserve: 1.1, weight: 5 },
  { id: 'cuprous', name: 'Veio cuprífero', icon: 'vein-cuprous', desc: 'Cobre em abundância e vestígios de ouro.',
    mix: { copper: 0.72, iron: 0.23, gold: 0.05 }, yield: 1.5, reserve: 1.0, weight: 4 },
  { id: 'auriferous', name: 'Veio aurífero', icon: 'vein-auriferous', desc: 'Ouro de verdade: o dobro do normal.',
    mix: { gold: 0.14, copper: 0.36, iron: 0.5 }, yield: 1.3, reserve: 0.8, weight: 2, minFound: 2 },
  { id: 'titanic', name: 'Veio de titânio', icon: 'vein-titanic', desc: 'Titânio para ligas leves e perfuratrizes profundas.',
    mix: { titanium: 0.34, iron: 0.56, copper: 0.1 }, yield: 1.3, reserve: 0.9, weight: 3, requires: 'deepProspecting' },
  { id: 'crystalline', name: 'Bolsão de cristais', icon: 'vein-crystalline', desc: 'Cristais que alimentam a ciência.',
    mix: { crystals: 0.3, copper: 0.5, gold: 0.1, iron: 0.1 }, yield: 1.2, reserve: 0.7, weight: 2, requires: 'crystallography' },
  { id: 'motherlode', name: 'Veio mestre', icon: 'vein-motherlode', desc: 'Raro e enorme: de tudo um pouco, com titânio e cristais.',
    mix: { iron: 0.4, copper: 0.2, gold: 0.1, titanium: 0.15, crystals: 0.15 }, yield: 2, reserve: 2, weight: 0.7, minFound: 5, requires: 'crystallography' },
  // Personalidades: o instável rende muito e acaba rápido (vale ficar de olho); o profundo só a Perfuratriz alcança.
  { id: 'unstable', name: 'Veio instável', icon: 'vein-orange-big', desc: 'Rende ×3, mas desmorona em cerca de 3 minutos: aproveite enquanto dura.',
    mix: { iron: 0.55, copper: 0.35, gold: 0.1 }, yield: 3, reserve: 0.6, weight: 2, minFound: 3 },
  { id: 'deep', name: 'Veio profundo', icon: 'vein-violet-big', desc: 'Enorme e rico em titânio e ouro, mas só a Perfuratriz profunda o alcança.',
    mix: { titanium: 0.3, gold: 0.15, iron: 0.4, copper: 0.15 }, yield: 2.5, reserve: 1.6, weight: 2, requires: 'deepDrilling', only: ['deepDrill'] },
];

export const VEIN_KIND_BY_ID = Object.fromEntries(VEIN_KINDS.map(k => [k.id, k]));
