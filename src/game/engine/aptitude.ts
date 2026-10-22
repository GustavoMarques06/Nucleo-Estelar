import type { Location, Specialization } from '../types';
import { APTITUDES, APTITUDE_MULT, SPECIALIZATIONS, TRAITS, type Aptitude, type TraitDef } from '../data/locations';
import { rng } from './state';

// Propósito das colônias: o que cada mundo aceita, quão bem rende e os traços que tornam cada planeta único.

export const aptitudeOf = (loc: Pick<Location, 'type'>, spec: Specialization): Aptitude | null => APTITUDES[loc.type][spec] ?? null;

/** Propósitos que este mundo aceita, do mais apto para o menos. */
export function specOptions(loc: Pick<Location, 'type'>): Specialization[] {
  const order: Aptitude[] = ['great', 'good', 'poor'];
  return SPECIALIZATIONS.map(sp => sp.id).filter(id => aptitudeOf(loc, id))
    .sort((a, b) => order.indexOf(aptitudeOf(loc, a)!) - order.indexOf(aptitudeOf(loc, b)!));
}

/**
 * Traços do planeta, decididos pela semente (não vão para o save: o mesmo local tem sempre os mesmos).
 * Um traço sempre; 40% de chance de um segundo. Só entram traços que favorecem algum propósito possível aqui.
 */
export function locationTraits(loc: Pick<Location, 'seed' | 'type'>): TraitDef[] {
  const r = rng(loc.seed * 104729 + 17);
  const fits = TRAITS.filter(tr => Object.entries(tr.effects).some(([sp, k]) => (k ?? 1) > 1 && aptitudeOf(loc, sp as Specialization)));
  const first = fits[Math.floor(r() * fits.length)];
  if (r() >= 0.4) return [first];
  const rest = fits.filter(tr => tr !== first);
  return [first, rest[Math.floor(r() * rest.length)]];
}

/** Quanto o propósito rende neste planeta: aptidão do tipo × traços. 0 = propósito indisponível. */
export function specFit(loc: Pick<Location, 'seed' | 'type'>, spec: Specialization): number {
  const apt = aptitudeOf(loc, spec);
  if (!apt) return 0;
  return locationTraits(loc).reduce((k, tr) => k * (tr.effects[spec] ?? 1), APTITUDE_MULT[apt]);
}

/** O propósito que mais rende aqui (a escolha automática do bot e a migração de saves antigos). */
export const bestSpec = (loc: Pick<Location, 'seed' | 'type'>): Specialization =>
  specOptions(loc).reduce((best, sp) => (specFit(loc, sp) > specFit(loc, best) ? sp : best));

/** Moradia que uma colônia de Civilização oferece (entra no limite de população). */
export function civHousing(loc: Location): number {
  const o = loc.outpost;
  if (!o || o.spec !== 'civilization') return 0;
  return 40 * o.level * specFit(loc, 'civilization') * loc.richness;
}
