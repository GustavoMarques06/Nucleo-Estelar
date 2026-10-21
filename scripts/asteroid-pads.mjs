// Lê o "mapa de encaixe" do asteroide (Assets/asteroide-encaixe.jpg: as mesmas 6 camadas de asteroide-camadas.jpg com
// as plataformas pintadas de ciano) e grava em src/render/asteroidPads.ts onde fica cada plataforma de cada camada,
// em frações da largura do sprite recortado e a partir do centro dele (o mesmo sistema dos SLOTS da cena).
// Uso: node scripts/asteroid-pads.mjs   (roda junto com `npm run sprites`)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COLS = 3, ROWS = 2;
const load = async f => {
  const { data, info } = await sharp(path.join(ROOT, 'Assets', f)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
const sheet = await load('asteroide-camadas.jpg');
const map = await load('asteroide-encaixe.jpg');
const { w, h } = sheet;

const isBg = i => { const r = sheet.data[i * 3], g = sheet.data[i * 3 + 1], b = sheet.data[i * 3 + 2], m = Math.min(r, b); return m >= 70 && g < 0.3 * m; };
const cyanAt = (img, i) => img.data[i * 3] < 110 && img.data[i * 3 + 1] > 180 && img.data[i * 3 + 2] > 180;
// Plataforma = ciano no mapa que NÃO é ciano na arte (os cristais da camada 5 e 6 já são ciano nas duas imagens).
const isCyan = i => cyanAt(map, i) && !cyanAt(sheet, i);

/** Componentes conectadas (4 vizinhos) de `test` dentro do retângulo. */
function components(test, x0, y0, x1, y1) {
  const seen = new Uint8Array(w * h), out = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const s = y * w + x;
    if (seen[s] || !test(s)) continue;
    const stack = [s]; seen[s] = 1;
    let area = 0, sx = 0, sy = 0, bx0 = x, by0 = y, bx1 = x, by1 = y;
    while (stack.length) {
      const i = stack.pop(), cx = i % w, cy = (i / w) | 0;
      area++; sx += cx; sy += cy;
      if (cx < bx0) bx0 = cx; if (cx > bx1) bx1 = cx; if (cy < by0) by0 = cy; if (cy > by1) by1 = cy;
      for (const j of [i - 1, i + 1, i - w, i + w]) {
        const jx = j % w, jy = (j / w) | 0;
        if (jx < x0 || jx >= x1 || jy < y0 || jy >= y1 || seen[j] || !test(j)) continue;
        seen[j] = 1; stack.push(j);
      }
    }
    out.push({ area, cx: sx / area, cy: sy / area, x0: bx0, y0: by0, x1: bx1, y1: by1 });
  }
  return out;
}

const layers = [];
for (let k = 0; k < COLS * ROWS; k++) {
  const cx0 = Math.round((k % COLS) * w / COLS), cx1 = Math.round(((k % COLS) + 1) * w / COLS);
  const cy0 = Math.round(Math.floor(k / COLS) * h / ROWS), cy1 = Math.round((Math.floor(k / COLS) + 1) * h / ROWS);
  // Caixa do asteroide: as mesmas peças que o recorte (extract-keyed) guarda, as que têm ao menos 4% da maior.
  const rock = components(i => !isBg(i), cx0 + 2, cy0 + 2, cx1 - 2, cy1 - 2);
  const big = Math.max(...rock.map(c => c.area));
  const kept = rock.filter(c => c.area >= big * 0.04);
  const bx0 = Math.min(...kept.map(c => c.x0)), bx1 = Math.max(...kept.map(c => c.x1));
  const by0 = Math.min(...kept.map(c => c.y0)), by1 = Math.max(...kept.map(c => c.y1));
  const bw = bx1 - bx0 + 1, mx = (bx0 + bx1) / 2, my = (by0 + by1) / 2;
  const pads = components(isCyan, cx0, cy0, cx1, cy1).filter(c => c.area >= 300)
    .map(c => [Math.round(((c.cx - mx) / bw) * 1000) / 1000, Math.round(((c.cy - my) / bw) * 1000) / 1000])
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  layers.push({ pads, aspect: Math.round(((by1 - by0 + 1) / bw) * 1000) / 1000 });
}

const body = `// Gerado por scripts/asteroid-pads.mjs a partir de Assets/asteroide-encaixe.jpg — não edite à mão.
// Plataformas de cada camada do asteroide (de cima para baixo), em frações da largura do sprite, a partir do centro.
export const ASTEROID_PADS: [number, number][][] = ${JSON.stringify(layers.map(l => l.pads))};
/** Altura ÷ largura de cada sprite de camada. */
export const ASTEROID_ASPECT: number[] = ${JSON.stringify(layers.map(l => l.aspect))};
`;
fs.writeFileSync(path.join(ROOT, 'src/render/asteroidPads.ts'), body);
console.log(layers.map((l, i) => `camada ${i + 1}: ${l.pads.length} plataformas`).join(' · '));
