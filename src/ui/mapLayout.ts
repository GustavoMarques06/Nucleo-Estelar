// Posição dos locais no mapa estelar: um único sistema solar, com a estrela em (0, 0) e a base numa órbita
// curta, com Aurora (o mundo dos colonos) ao lado dela. Os locais ocupam órbitas elípticas cada vez mais largas (vistas de lado, por isso achatadas), cada uma
// com tantos lugares quantos cabem a uma distância mínima. Depois os lugares se afastam uns dos outros, e da
// estrela, da base, de Aurora e dos megaprojetos, até ninguém ficar em cima de ninguém (planeta mais o nome embaixo).
// Coordenadas em pixels do mapa com zoom 1. A posição depende só do índice: nunca muda quando novos locais
// são descobertos.

export const FLATTEN = 0.62;             // altura/largura das órbitas
const FIRST_ORBIT = 250, ORBIT_STEP = 135;
const MIN_GAP = 120;                     // entre dois locais
const MIN_SUN = 170;                     // entre um local e a estrela
const MIN_BASE = 120;                    // entre um local e a base
const MIN_AURORA = 135;                  // entre um local e Aurora (sobra espaço para o anel orbital em volta dela)
const MIN_MEGA = 100;                    // entre um local e o lugar de um megaprojeto
const RELAXED = 160;                     // quantos lugares passam pelo afastamento (o resto segue só as órbitas)

/** A base: na órbita mais curta, embaixo à esquerda da estrela. */
export const BASE_POS = { x: -118, y: 118 * FLATTEN * 0.9 };
/** Aurora, o mundo dos colonos: ao lado da base, do lado de fora. */
export const AURORA_POS = { x: BASE_POS.x - 125, y: BASE_POS.y };
/** Megaprojetos com lugar próprio no mapa. Só os grandiosos aparecem: o Dyson envolve a estrela, o anel fica em
 *  Aurora, o Núcleo Estelar (a estrela artificial) fica acima do sol e a Singularidade, à direita. Os outros
 *  (portal, estaleiro, propulsor) não entram no mapa. */
export const MEGA_POS: Record<string, { x: number; y: number }> = { core: { x: 0, y: -122 }, singularity: { x: 128, y: 72 } };

/** Onde fica, no mapa, cada megaprojeto que aparece nele. */
export const megaMapPos = (id: string) => (id === 'dyson' ? { x: 0, y: 0 } : id === 'ring' ? AURORA_POS : MEGA_POS[id] ?? null);
export const SUN_RADIUS = 70;

// Perímetro de uma elipse (Ramanujan).
const perimeter = (a: number, b: number) => Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));

export interface Orbit { rx: number; ry: number }
const orbits: Orbit[] = [];

/** Lugares em órbita, sem o afastamento; desliza meia vaga a cada órbita para os vizinhos não se alinharem. */
function orbitSlots(count: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let k = 0; pts.length < count; k++) {
    const rx = FIRST_ORBIT + k * ORBIT_STEP, ry = rx * FLATTEN;
    if (!orbits[k]) orbits[k] = { rx, ry };
    const n = Math.max(4, Math.floor(perimeter(rx, ry) / (MIN_GAP * 1.15)));
    const offset = (k % 2 ? 0.5 : 0) * (2 * Math.PI / n) + k * 0.37;
    for (let j = 0; j < n && pts.length < count; j++) {
      const a = offset + (j / n) * 2 * Math.PI;
      pts.push({ x: Math.cos(a) * rx, y: Math.sin(a) * ry });
    }
  }
  return pts;
}

function relax(pts: { x: number; y: number }[]) {
  const keepAway = (p: { x: number; y: number }, c: { x: number; y: number }, min: number) => {
    const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy) || 0.01;
    if (d >= min) return false;
    p.x = c.x + (dx / d) * min; p.y = c.y + (dy / d) * min;
    return true;
  };
  for (let it = 0; it < 300; it++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < MIN_GAP) {
          const push = (MIN_GAP - d) / 2, ux = dx / d, uy = dy / d;
          pts[i].x -= ux * push; pts[i].y -= uy * push; pts[j].x += ux * push; pts[j].y += uy * push;
          moved = true;
        }
      }
      if (keepAway(pts[i], { x: 0, y: 0 }, MIN_SUN)) moved = true;
      if (keepAway(pts[i], BASE_POS, MIN_BASE)) moved = true;
      if (keepAway(pts[i], AURORA_POS, MIN_AURORA)) moved = true;
      for (const m of Object.values(MEGA_POS)) if (keepAway(pts[i], m, MIN_MEGA)) moved = true;
    }
    if (!moved) break;
  }
  return pts;
}

let cache: { x: number; y: number }[] | null = null;

/** Posição do local de índice `index` (em px do mapa, estrela na origem). */
export function nodePosition(index: number): { x: number; y: number } {
  cache ??= relax(orbitSlots(RELAXED));
  if (index >= cache.length) cache = [...cache, ...orbitSlots(index + 1).slice(cache.length)];
  return cache[index];
}

/** Órbitas a desenhar para mostrar `count` locais (pelo menos uma). */
export function orbitsFor(count: number): Orbit[] {
  orbitSlots(Math.max(1, count));
  const far = Math.max(...Array.from({ length: Math.max(1, count) }, (_, i) => {
    const p = nodePosition(i);
    return Math.hypot(p.x, p.y / FLATTEN);
  }));
  return orbits.filter(o => o.rx <= far + ORBIT_STEP / 2);
}

/** Menor distância entre os `count` primeiros locais: usada pelo teste de espaçamento. */
export function minSpacing(count: number): number {
  let min = Infinity;
  for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) {
    const a = nodePosition(i), b = nodePosition(j);
    min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y));
  }
  return min;
}
