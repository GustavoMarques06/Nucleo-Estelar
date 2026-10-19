// Gera marcadores PROVISÓRIOS (formas isométricas simples) para sprites que ainda não existem nas pranchas.
// Só cria arquivos que faltam: ao colocar o sprite real em public/assets/sprites/ com o mesmo nome
// (ou ao incluí-lo no manifesto), o marcador deixa de ser gerado.
// Uso: node scripts/make-placeholders.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/assets/sprites');
fs.mkdirSync(OUT, { recursive: true });

const O = '#0b0f1a'; // contorno
const poly = (pts, fill) => `<polygon points="${pts}" fill="${fill}" stroke="${O}" stroke-width="1" stroke-linejoin="miter"/>`;
const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${O}" stroke-width="1"/>`;

// Cubo isométrico 32×32: topo, face esquerda, face direita.
function cube(x, y, w, h, top, left, right) {
  const hw = w / 2, d = w / 4;
  return [
    poly(`${x},${y + d} ${x + hw},${y} ${x + w},${y + d} ${x + hw},${y + 2 * d}`, top),
    poly(`${x},${y + d} ${x + hw},${y + 2 * d} ${x + hw},${y + 2 * d + h} ${x},${y + d + h}`, left),
    poly(`${x + hw},${y + 2 * d} ${x + w},${y + d} ${x + w},${y + d + h} ${x + hw},${y + 2 * d + h}`, right),
  ].join('');
}

const grey = ['#8693ad', '#5b6784', '#3e485f'];
const SPRITES = {
  'building-miner': cube(4, 12, 24, 10, ...grey) + rect(14, 4, 4, 9, '#ffb347') + poly('13,13 19,13 16,19', '#ffd447'),
  'building-solar': poly('3,18 16,10 29,18 16,26', '#1f4fa8') + poly('3,18 16,26 16,29 3,21', '#16346e') + poly('16,26 29,18 29,21 16,29', '#0f2650') + `<path d="M10 17 L23 22 M16 14 L16 25" stroke="#00e5ff" stroke-width="1" fill="none"/>`,
  'building-refinery': cube(3, 14, 20, 9, ...grey) + rect(20, 4, 4, 14, '#ffb347') + rect(12, 7, 3, 9, '#a0aec0') + rect(19, 2, 6, 2, '#ff4d4d'),
  'building-storage': cube(4, 14, 24, 9, '#a0aec0', '#6d7b96', '#475268') + `<path d="M6 17 Q16 4 26 17 Z" fill="#00e5ff" stroke="${O}" stroke-width="1"/>`,
  'building-factory': cube(2, 14, 28, 9, ...grey) + rect(7, 4, 4, 12, '#ffb347') + rect(14, 6, 4, 10, '#ffb347') + rect(21, 8, 4, 8, '#ffb347'),
  'building-fission': `<ellipse cx="16" cy="25" rx="11" ry="4" fill="#3e485f" stroke="${O}"/>` + rect(8, 11, 16, 14, '#8693ad') + `<ellipse cx="16" cy="11" rx="8" ry="3" fill="#00e5ff" stroke="${O}"/>` + rect(14, 3, 4, 8, '#a0aec0'),
  'ship-cargo': poly('2,18 10,12 28,13 30,17 28,21 10,22', '#8693ad') + rect(10, 14, 14, 5, '#ffb347') + poly('2,18 6,15 6,21', '#00e5ff'),
  'drone-mining': `<ellipse cx="16" cy="15" rx="9" ry="5" fill="#8693ad" stroke="${O}"/>` + rect(13, 12, 6, 4, '#00e5ff') + `<path d="M7 20 L10 24 M25 20 L22 24" stroke="${O}" stroke-width="2"/>`,
};

let made = 0;
for (const [name, body] of Object.entries(SPRITES)) {
  const file = path.join(OUT, name + '.png');
  if (fs.existsSync(file)) continue;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges">${body}</svg>`;
  const small = await sharp(Buffer.from(svg)).png().toBuffer();
  await sharp(small).resize(128, 128, { kernel: 'nearest' }).png().toFile(file);
  made++;
}
console.log(`${made} marcadores provisórios criados`);
