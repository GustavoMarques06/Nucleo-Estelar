// Desenha os botões da interface pixel a pixel, numa grade exata (sem recorte de prancha).
// Cada sprite é um 9-slice de 16×16 com bordas de 5 px e miolo de cor lisa: o CSS usa
// `border-image: ... 5 fill / 10px` com `image-rendering: pixelated`, ou seja, escala 2× inteira,
// e o miolo pode esticar à vontade sem borrar.
// Uso: node scripts/make-buttons.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/assets/sprites');
fs.mkdirSync(OUT, { recursive: true });

const S = 16; // lado do sprite; as fatias de 5 px ficam com 6 px de miolo liso

// Anéis a partir da borda (r = 0 é o contorno), com os cantos chanfrados em 45°:
//   0 contorno · 1 brilho em cima/esquerda, sombra embaixo/direita · 2 lábio inferior (sombra)
//   3 filete interno (destaque) · 4+ miolo liso
// pressed inverte a luz: brilho embaixo, sombra em cima, sem lábio (o botão "afunda").
function paint(p, { pressed = false } = {}) {
  const px = Buffer.alloc(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = Math.min(x, S - 1 - x), dy = Math.min(y, S - 1 - y);
    if (dx + dy < 3) continue; // fora do chanfro: transparente
    const r = Math.min(dx, dy, dx + dy - 3);
    const top = y < S / 2, left = x < S / 2;
    const lit = dy <= dx ? top : left; // de que lado da diagonal o pixel está
    let c;
    if (r === 0) c = p.line;
    else if (r === 1) c = (lit !== pressed) ? p.hi : p.lo;
    else if (r === 2 && !top && !pressed) c = p.lo;
    else if (r === 3) c = p.accent;
    else c = p.base;
    const i = (y * S + x) * 4;
    px[i] = parseInt(c.slice(1, 3), 16); px[i + 1] = parseInt(c.slice(3, 5), 16); px[i + 2] = parseInt(c.slice(5, 7), 16); px[i + 3] = 255;
  }
  return px;
}

const LINE = '#0a0d1f';
const BUTTONS = {
  'ui-btn-normal':    [{ line: LINE, hi: '#86bcff', lo: '#1c418a', accent: '#4a86e0', base: '#2f6bc9' }],
  'ui-btn-hover':     [{ line: LINE, hi: '#b0d6ff', lo: '#21509f', accent: '#3ff0ff', base: '#3a7ddc' }],
  'ui-btn-active':    [{ line: LINE, hi: '#4a86e0', lo: '#122f66', accent: '#24519e', base: '#1f4c99' }, { pressed: true }],
  'ui-btn-disabled':  [{ line: LINE, hi: '#7e879f', lo: '#3c4357', accent: '#5c6580', base: '#535c75' }],
  'ui-btn-buy':       [{ line: LINE, hi: '#8ff09b', lo: '#17602c', accent: '#45bd5e', base: '#2e9f47' }],
  'ui-btn-buy-hover': [{ line: LINE, hi: '#c0ffc6', lo: '#1b7233', accent: '#9dffc0', base: '#38b955' }],
  'ui-btn-danger':    [{ line: LINE, hi: '#ff9a92', lo: '#6e1c1c', accent: '#cf4b45', base: '#b03a36' }],
  'ui-btn-danger-hover': [{ line: LINE, hi: '#ffc4bd', lo: '#802222', accent: '#ffb0a0', base: '#c84541' }],
};

for (const [name, [pal, opts]] of Object.entries(BUTTONS)) {
  await sharp(paint(pal, opts), { raw: { width: S, height: S, channels: 4 } }).png().toFile(path.join(OUT, `${name}.png`));
  console.log(`${name}.png`);
}
