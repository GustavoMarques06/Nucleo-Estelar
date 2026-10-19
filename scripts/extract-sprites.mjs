// Recorta sprites das pranchas de arte em /Assets e remove o fundo escuro.
// Uso: node scripts/extract-sprites.mjs [--preview caminho.png]
// Os recortes ficam definidos em scripts/sprites.manifest.json (coordenadas em pixels da prancha).
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/sprites.manifest.json'), 'utf8'));
const OUT = path.join(ROOT, 'public/assets/sprites');
fs.mkdirSync(OUT, { recursive: true });

const previewIdx = process.argv.indexOf('--preview');
const previewPath = previewIdx > 0 ? process.argv[previewIdx + 1] : null;

// Flood fill a partir das bordas: remove pixels conectados ao fundo cuja cor varia suavemente
// (gradiente do painel) e que estejam próximos da cor média da borda.
function removeBackground(data, w, h, { step = 14, global = 70 } = {}) {
  const px = i => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
  const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  const border = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
  const avg = [0, 0, 0];
  for (const i of border) { const p = px(i); avg[0] += p[0]; avg[1] += p[1]; avg[2] += p[2]; }
  avg.forEach((_, k) => (avg[k] /= border.length));

  const seen = new Uint8Array(w * h);
  const queue = [];
  for (const i of border) if (!seen[i] && dist(px(i), avg) < global) { seen[i] = 1; queue.push(i); }
  while (queue.length) {
    const i = queue.pop();
    const c = px(i);
    data[i * 4 + 3] = 0;
    const x = i % w, y = (i / w) | 0;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (seen[j]) continue;
      const p = px(j);
      if (dist(p, c) < step && dist(p, avg) < global) { seen[j] = 1; queue.push(j); }
    }
  }
  // Suaviza a borda: pixels opacos muito escuros isolados ao lado do fundo ficam semitransparentes.
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (data[i * 4 + 3] === 0) continue;
    const n = [i - 1, i + 1, i - w, i + w].filter(j => data[j * 4 + 3] === 0).length;
    if (n >= 3) data[i * 4 + 3] = 0;
  }
}

// Remove ilhas opacas pequenas (estrelas do fundo, restos de texto).
function removeSpecks(data, w, h, minArea) {
  const seen = new Uint8Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || data[s * 4 + 3] === 0) continue;
    const comp = [s]; seen[s] = 1;
    for (let k = 0; k < comp.length; k++) {
      const i = comp[k], x = i % w, y = (i / w) | 0;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (!seen[j] && data[j * 4 + 3] > 0) { seen[j] = 1; comp.push(j); }
      }
    }
    if (comp.length < minArea) for (const i of comp) data[i * 4 + 3] = 0;
  }
}

// Fundo xadrez “falso” (transparência impressa no JPG): cinza neutro entre ~65 e ~160,
// incluindo os tons intermediários criados pela compressão JPG.
let CHECKER = { min: 62, max: 165, chroma: 16 };
function checkerMask(data, w, h) {
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const avg = (r + g + b) / 3;
    if (Math.max(r, g, b) - Math.min(r, g, b) <= CHECKER.chroma && (CHECKER.bands ? CHECKER.bands.some(([a, b]) => avg >= a && avg <= b) : avg >= CHECKER.min && avg <= CHECKER.max)) mask[i] = 1;
  }
  return mask;
}

/** Fundo = pixels do xadrez conectados à borda (o cinza dentro de luas não é afetado). */
function floodFromBorder(mask, w, h) {
  const bg = new Uint8Array(w * h);
  const queue = [];
  const seed = i => { if (mask[i] && !bg[i]) { bg[i] = 1; queue.push(i); } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (queue.length) {
    const i = queue.pop(), x = i % w, y = (i / w) | 0;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      seed(ny * w + nx);
    }
  }
  return bg;
}

function largestComponentBox(mask, w, h) {
  const seen = new Uint8Array(w * h);
  let best = null, bestSize = 0;
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || mask[s]) continue;
    const comp = [s]; seen[s] = 1;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let k = 0; k < comp.length; k++) {
      const i = comp[k], x = i % w, y = (i / w) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (!seen[j] && !mask[j]) { seen[j] = 1; comp.push(j); }
      }
    }
    if (comp.length > bestSize) { bestSize = comp.length; best = { x0, y0, x1, y1 }; }
  }
  return best;
}

// Planeta redondo: acha o maior objeto fora do xadrez e aplica máscara elíptica inscrita.
// `fixed` = [cx, cy, r] relativo ao recorte, para planetas cinza que se confundem com o xadrez.
function circleCutout(data, w, h, fixed) {
  const box = fixed
    ? { x0: fixed[0] - fixed[2], y0: fixed[1] - fixed[2], x1: fixed[0] + fixed[2] - 1, y1: fixed[1] + fixed[2] - 1 }
    : largestComponentBox(floodFromBorder(checkerMask(data, w, h), w, h), w, h);
  if (!box) return;
  const cx = (box.x0 + box.x1 + 1) / 2, cy = (box.y0 + box.y1 + 1) / 2;
  const rx = (box.x1 - box.x0 + 1) / 2, ry = (box.y1 - box.y0 + 1) / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy > 1) data[(y * w + x) * 4 + 3] = 0;
  }
}

// Formas irregulares sobre xadrez: remove o xadrez conectado à borda.
function checkerKey(data, w, h) {
  const bg = floodFromBorder(checkerMask(data, w, h), w, h);
  for (let i = 0; i < w * h; i++) if (bg[i]) data[i * 4 + 3] = 0;
}

function trimBox(data, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 0) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

// Grades: expande células regulares (ex.: catálogo de minerais) em sprites individuais.
for (const g of manifest.grids || []) {
  g.names.forEach((name, k) => {
    const col = k % g.cols, row = Math.floor(k / g.cols);
    const cx = g.colCenters[col], top = g.rowTops[row];
    manifest.sprites.push({
      name: g.prefix + name, sheet: g.sheet,
      rect: [Math.round(cx - g.cellWidth / 2), top, g.cellWidth, g.cellHeight],
      bg: g.bg, minArea: g.minArea,
    });
  });
}

// ---------- Componentes conectados (pranchas densas, sem grade regular) ----------
const sheetCache = new Map();
async function loadSheet(key) {
  if (sheetCache.has(key)) return sheetCache.get(key);
  CHECKER = { min: 62, max: 165, chroma: 16, ...(manifest.checker?.[key] || {}) };
  const { data, info } = await sharp(path.join(ROOT, 'Assets', manifest.sheets[key])).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const bg = floodFromBorder(checkerMask(data, w, h), w, h);
  // “Núcleo” do objeto: contornos escuros ou pixels coloridos. O resíduo cinza do xadrez (JPG) fica de fora
  // e não costura objetos vizinhos; o interior claro é recuperado depois por preenchimento de buracos.
  const core = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (bg[i]) continue;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const avg = (r + g + b) / 3, chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (avg < (CHECKER.coreDark ?? 78) || chroma > (CHECKER.coreChroma ?? 22)) core[i] = 1;
  }
  const label = new Int32Array(w * h);
  const comps = [null];
  const stack = new Int32Array(w * h);
  for (let s0 = 0; s0 < w * h; s0++) {
    if (!core[s0] || label[s0]) continue;
    const id = comps.length;
    let sp = 0, area = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
    stack[sp++] = s0; label[s0] = id;
    while (sp) {
      const i = stack[--sp], x = i % w, y = (i / w) | 0;
      area++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (core[j] && !label[j]) { label[j] = id; stack[sp++] = j; }
      }
    }
    comps.push({ id, area, x0, y0, x1, y1, seed: [s0 % w, (s0 / w) | 0] });
  }
  const sheet = { data, w, h, label, comps };
  sheetCache.set(key, sheet);
  return sheet;
}

function cropComponent(sheet, c) {
  const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1;
  const inside = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (sheet.label[(c.y0 + y) * sheet.w + (c.x0 + x)] === c.id) inside[y * w + x] = 1;
  // Exterior = o que alcança a borda da caixa sem cruzar o objeto; o resto é interior (buracos preenchidos).
  const ext = new Uint8Array(w * h);
  const st = [];
  const seed = i => { if (!inside[i] && !ext[i]) { ext[i] = 1; st.push(i); } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (st.length) {
    const i = st.pop(), x = i % w, y = (i / w) | 0;
    if (x > 0) seed(i - 1); if (x < w - 1) seed(i + 1); if (y > 0) seed(i - w); if (y < h - 1) seed(i + w);
  }
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x;
    if (ext[k]) continue;
    const si = (c.y0 + y) * sheet.w + (c.x0 + x);
    out.set(sheet.data.subarray(si * 4, si * 4 + 3), k * 4);
    out[k * 4 + 3] = 255;
  }
  return { out, w, h };
}

// Descoberta: lista todos os componentes da prancha numa folha numerada (para escolher nomes no manifesto).
const discIdx = process.argv.indexOf('--discover');
if (discIdx > 0) {
  const key = process.argv[discIdx + 1];
  const outPng = process.argv[discIdx + 2];
  const minArea = Number(process.argv[discIdx + 3] || 120);
  const sheet = await loadSheet(key);
  const list = sheet.comps.filter(c => c && c.area >= minArea)
    .sort((a, b) => (Math.round(a.y0 / 60) - Math.round(b.y0 / 60)) || a.x0 - b.x0);
  const cell = 120, cols = 12, rows = Math.ceil(list.length / cols);
  const tiles = [];
  for (const [k, c] of list.entries()) {
    const { out, w, h } = cropComponent(sheet, c);
    const buf = await sharp(out, { raw: { width: w, height: h, channels: 4 } }).resize(cell - 10, cell - 26, { fit: 'inside', kernel: 'nearest' }).png().toBuffer();
    tiles.push({ input: buf, left: (k % cols) * cell + 5, top: Math.floor(k / cols) * cell + 2 });
    tiles.push({ input: Buffer.from(`<svg width="${cell}" height="20"><text x="4" y="14" font-size="12" fill="#fff" font-family="monospace">${k} @${c.seed[0]},${c.seed[1]}</text></svg>`), left: (k % cols) * cell, top: Math.floor(k / cols) * cell + cell - 22 });
  }
  await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: '#2a2a40' } }).composite(tiles).png().toFile(outPng);
  fs.writeFileSync(outPng + '.json', JSON.stringify(list.map((c, k) => ({ k, seed: c.seed, area: c.area, box: [c.x0, c.y0, c.x1, c.y1] }))));
  console.log(`${list.length} componentes em ${outPng}`);
  process.exit(0);
}

const results = [];
for (const [sheetKey, sheetFile] of Object.entries(manifest.sheets)) {
  const src = path.join(ROOT, 'Assets', sheetFile);
  const base = sharp(src).ensureAlpha();
  for (const s of manifest.sprites.filter(s => s.sheet === sheetKey)) {
    if (s.mode === 'component') {
      const sheet = await loadSheet(sheetKey);
      const id = sheet.label[s.seed[1] * sheet.w + s.seed[0]];
      if (!id) throw new Error(`Semente fora de qualquer objeto: ${s.name}`);
      const { out, w, h } = cropComponent(sheet, sheet.comps[id]);
      const file = path.join(OUT, s.name + '.png');
      await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile(file);
      results.push({ name: s.name, file });
      continue;
    }
    const [left, top, width, height] = s.rect;
    const { data, info } = await base.clone().extract({ left, top, width, height }).raw().toBuffer({ resolveWithObject: true });
    if (s.mode === 'circle') {
      circleCutout(data, info.width, info.height, s.circle && [s.circle[0] - left, s.circle[1] - top, s.circle[2]]);
    } else if (s.mode === 'checker') {
      checkerKey(data, info.width, info.height);
      removeSpecks(data, info.width, info.height, s.minArea ?? 60);
    } else if (!s.keepBackground) {
      removeBackground(data, info.width, info.height, s.bg || {});
      removeSpecks(data, info.width, info.height, s.minArea ?? 60);
    }
    const box = s.keepBackground ? null : trimBox(data, info.width, info.height);
    let img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
    if (box) img = sharp(await img.extract(box).png().toBuffer());
    const file = path.join(OUT, s.name + '.png');
    await img.png().toFile(file);
    results.push({ name: s.name, file });
  }
}
console.log(`${results.length} sprites extraídos para public/assets/sprites`);

// Folha de conferência: todos os sprites lado a lado sobre fundo xadrez.
if (previewPath) {
  const cell = 160, cols = 8, rows = Math.ceil(results.length / cols);
  const tiles = [];
  for (const [k, r] of results.entries()) {
    const buf = await sharp(r.file).resize(cell - 20, cell - 36, { fit: 'inside', kernel: 'nearest' }).png().toBuffer();
    const label = Buffer.from(`<svg width="${cell}" height="20"><text x="4" y="14" font-size="12" fill="#fff" font-family="monospace">${r.name}</text></svg>`);
    tiles.push({ input: buf, left: (k % cols) * cell + 10, top: Math.floor(k / cols) * cell + 6 });
    tiles.push({ input: label, left: (k % cols) * cell, top: Math.floor(k / cols) * cell + cell - 22 });
  }
  await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: '#c03ab0' } })
    .composite(tiles).png().toFile(previewPath);
  console.log('Prévia em', previewPath);
}
