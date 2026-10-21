// Recorta sprites de pranchas com fundo MAGENTA sólido (#FF00FF), como as geradas pelos pedidos em /pedidos-de-arte.
// Uso: node scripts/extract-keyed.mjs
//      node scripts/extract-keyed.mjs --discover <prancha> <saida.png> [areaMinima]   (folha numerada dos objetos)
// Os recortes ficam em scripts/keyed.manifest.json.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/keyed.manifest.json'), 'utf8'));
const OUT = path.join(ROOT, 'public/assets/sprites');
fs.mkdirSync(OUT, { recursive: true });

// ---------- Fundo ----------
// Magenta de qualquer brilho: vermelho e azul altos, verde baixo. O fator controla o quão “quase magenta” conta.
function magentaMask(data, w, h, { bgFactor = 0.3, fringeFactor = 0.55, fringePasses = 2, minRB = 70 } = {}) {
  const bg = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], m = Math.min(r, b);
    if (m >= minRB && g < bgFactor * m) bg[i] = 1;
  }
  // Franja: pixels de borda misturados com magenta (antialias/JPG) ao lado do fundo.
  for (let pass = 0; pass < fringePasses; pass++) {
    const mark = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (bg[i]) continue;
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], m = Math.min(r, b);
      if (m < 90 || g >= fringeFactor * m) continue;
      if (bg[i - 1] || bg[i + 1] || bg[i - w] || bg[i + w]) mark.push(i);
    }
    for (const i of mark) bg[i] = 1;
  }
  return bg;
}

// Componentes conectados (8 vizinhos) dentro de um retângulo [x0, y0, x1, y1) da prancha.
function labelRegion(bg, w, h, rect) {
  const [rx0, ry0, rx1, ry1] = rect;
  const label = new Int32Array(w * h);
  const comps = [null];
  const stack = new Int32Array(w * h);
  for (let y = ry0; y < ry1; y++) for (let x = rx0; x < rx1; x++) {
    const s0 = y * w + x;
    if (bg[s0] || label[s0]) continue;
    const id = comps.length;
    let sp = 0, area = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
    stack[sp++] = s0; label[s0] = id;
    while (sp) {
      const i = stack[--sp], cx = i % w, cy = (i / w) | 0;
      area++;
      if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < rx0 || ny < ry0 || nx >= rx1 || ny >= ry1) continue;
        const j = ny * w + nx;
        if (!bg[j] && !label[j]) { label[j] = id; stack[sp++] = j; }
      }
    }
    comps.push({ id, area, x0, y0, x1, y1 });
  }
  return { label, comps };
}

/** Monta um RGBA com as componentes `ids` (recortado na caixa que as contém). */
function render(data, w, label, comps, ids, box) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  if (box) { [x0, y0, x1, y1] = box; }
  else for (const id of ids) { const c = comps[id]; x0 = Math.min(x0, c.x0); y0 = Math.min(y0, c.y0); x1 = Math.max(x1, c.x1); y1 = Math.max(y1, c.y1); }
  const set = new Set(ids);
  const ow = x1 - x0 + 1, oh = y1 - y0 + 1;
  const out = Buffer.alloc(ow * oh * 4);
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
    const si = (y0 + y) * w + (x0 + x);
    if (!set.has(label[si])) continue;
    const k = (y * ow + x) * 4;
    out[k] = data[si * 4]; out[k + 1] = data[si * 4 + 1]; out[k + 2] = data[si * 4 + 2]; out[k + 3] = 255;
  }
  return { out, w: ow, h: oh };
}

const sheetCache = new Map();
const maskCache = new Map();
async function loadSheet(key) {
  if (sheetCache.has(key)) return sheetCache.get(key);
  const { data, info } = await sharp(path.join(ROOT, 'Assets', man.sheets[key])).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const s = { data, w: info.width, h: info.height };
  sheetCache.set(key, s);
  return s;
}

async function save(name, { out, w, h }, opts) {
  let img = sharp(out, { raw: { width: w, height: h, channels: 4 } });
  const max = opts.maxSize;
  if (max) img = img.resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true, kernel: opts.kernel || 'lanczos3' });
  if (opts.negate) img = img.negate({ alpha: false });
  const names = Array.isArray(name) ? name : [name];
  const buf = await img.png().toBuffer();
  for (const n of names) fs.writeFileSync(path.join(OUT, n + '.png'), buf);
  return names;
}

// Gera um sprite a partir de uma região da prancha.
async function extractItem(item) {
  const sh = await loadSheet(item.sheet);
  if (item.crop) {
    // Recorte simples de uma cena/fundo (sem remover fundo), salvo em JPEG em public/assets/art.
    const [cx, cy, cw, ch] = item.crop;
    const dir = path.join(ROOT, 'public/assets/art');
    fs.mkdirSync(dir, { recursive: true });
    let img = sharp(path.join(ROOT, 'Assets', man.sheets[item.sheet])).extract({ left: cx, top: cy, width: cw, height: ch });
    if (item.maxSize) img = img.resize({ width: item.maxSize, withoutEnlargement: !item.upscale, kernel: 'lanczos3' });
    await img.jpeg({ quality: 88 }).toFile(path.join(dir, item.name + '.jpg'));
    return [item.name];
  }
  // Limitado à prancha: um retângulo que passa da borda fazia o preenchimento girar para sempre fora da imagem.
  const rect = item.rect
    ? [Math.max(0, item.rect[0]), Math.max(0, item.rect[1]), Math.min(sh.w, item.rect[0] + item.rect[2]), Math.min(sh.h, item.rect[1] + item.rect[3])]
    : [0, 0, sh.w, sh.h];
  // A máscara do fundo é a mesma para todos os itens de uma prancha: calculada uma vez só (antes era por item, e demorava minutos).
  const maskKey = `${item.sheet}|${JSON.stringify(item.key || man.key || {})}`;
  let bg = maskCache.get(maskKey);
  if (!bg) { bg = magentaMask(sh.data, sh.w, sh.h, item.key || man.key || {}); maskCache.set(maskKey, bg); }
  if (item.silhouette) { bg = new Uint8Array(sh.w * sh.h); }
  if (item.silhouette) for (let i = 0; i < sh.w * sh.h; i++) {
    const avg = (sh.data[i * 4] + sh.data[i * 4 + 1] + sh.data[i * 4 + 2]) / 3;
    bg[i] = avg > 70 ? 1 : 0;           // só o preto da silhueta conta
  }
  const { label, comps } = labelRegion(bg, sh.w, sh.h, rect);
  const all = comps.filter(Boolean);
  if (!all.length) throw new Error(`Nada encontrado: ${item.name}`);
  let ids;
  if (item.at) {
    const [px, py] = item.at;
    const hit = all.filter(c => px >= c.x0 && px <= c.x1 && py >= c.y0 && py <= c.y1).sort((a, b) => b.area - a.area)[0];
    if (!hit) throw new Error(`Ponto fora de qualquer objeto: ${item.name}`);
    ids = [hit.id];
  } else {
    const biggest = Math.max(...all.map(c => c.area));
    const frac = item.minFrac ?? 0.04;
    ids = all.filter(c => c.area >= biggest * frac).map(c => c.id);
  }
  const r = render(sh.data, sh.w, label, comps, ids, item.keepSize ? [rect[0], rect[1], rect[2] - 1, rect[3] - 1] : null);
  if (item.silhouette) for (let k = 0; k < r.out.length; k += 4) if (r.out[k + 3]) { r.out[k] = r.out[k + 1] = r.out[k + 2] = 255; }
  return save(item.name, r, item);
}

// ---------- Descoberta ----------
const di = process.argv.indexOf('--discover');
if (di > 0) {
  const [key, outPng, minArea] = [process.argv[di + 1], process.argv[di + 2], Number(process.argv[di + 3] || 150)];
  const sh = await loadSheet(key);
  const bg = magentaMask(sh.data, sh.w, sh.h, man.key || {});
  const { label, comps } = labelRegion(bg, sh.w, sh.h, [0, 0, sh.w, sh.h]);
  const list = comps.filter(c => c && c.area >= minArea).sort((a, b) => (Math.round(a.y0 / 50) - Math.round(b.y0 / 50)) || a.x0 - b.x0);
  const cell = 130, cols = 10, rows = Math.ceil(list.length / cols);
  const tiles = [];
  for (const [k, c] of list.entries()) {
    const r = render(sh.data, sh.w, label, comps, [c.id]);
    const buf = await sharp(r.out, { raw: { width: r.w, height: r.h, channels: 4 } }).resize(cell - 10, cell - 28, { fit: 'inside' }).png().toBuffer();
    tiles.push({ input: buf, left: (k % cols) * cell + 5, top: Math.floor(k / cols) * cell + 2 });
    const cx = Math.round((c.x0 + c.x1) / 2), cy = Math.round((c.y0 + c.y1) / 2);
    tiles.push({ input: Buffer.from(`<svg width="${cell}" height="22"><text x="3" y="14" font-size="12" fill="#fff" font-family="monospace">${k} @${cx},${cy}</text></svg>`), left: (k % cols) * cell, top: Math.floor(k / cols) * cell + cell - 24 });
  }
  await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: '#2a2a40' } }).composite(tiles).png().toFile(outPng);
  console.log(`${list.length} objetos em ${outPng}`);
  process.exit(0);
}

// ---------- Execução ----------
// --only <regex>: recorta só os sprites cujo nome casa (ex.: --only "^(base-|fx-)"), sem refazer o resto.
const oi = process.argv.indexOf('--only');
const only = oi > 0 ? new RegExp(process.argv[oi + 1]) : null;
const wanted = (name) => !only || [name].flat().some(n => n && only.test(n));
let count = 0;
for (const item of man.items || []) { if (wanted(item.name)) count += (await extractItem(item)).length; }
for (const g of man.grids || []) {
  const sh = await loadSheet(g.sheet);
  const [ax, ay, aw, ah] = g.area || [0, 0, sh.w, sh.h];
  const cw = aw / g.cols, ch = ah / g.rows, ins = g.inset ?? 0;
  for (const [k, name] of g.names.entries()) {
    if (!name || !wanted(name)) continue;
    const col = k % g.cols, row = Math.floor(k / g.cols);
    const insB = Array.isArray(g.insetB) ? g.insetB[row] : (g.insetB ?? ins);
    const rect = [Math.round(ax + col * cw + ins), Math.round(ay + row * ch + ins), Math.round(cw - 2 * ins), Math.round(ch - ins - insB)];
    if (g.rowY) { rect[1] = g.rowY[row][0]; rect[3] = g.rowY[row][1] - g.rowY[row][0]; }
    const nm = Array.isArray(name) ? name[0] : name;
    count += (await extractItem({ ...g, name, rect, key: g.keyByName?.[nm] ?? g.key })).length;
  }
}
// Faixas de quadros: cada centro x gera um quadro  <prefix>-1, <prefix>-2, …
for (const s of man.strips || []) {
  for (const [k, cx] of s.xCenters.entries()) {
    if (!wanted(`${s.prefix}-${k + 1}`)) continue;
    const rect = [Math.round(cx - s.cellW / 2), s.y[0], s.cellW, s.y[1] - s.y[0]];
    count += (await extractItem({ ...s, name: `${s.prefix}-${k + 1}`, rect })).length;
  }
}
// Imagens inteiras (cenas sem fundo magenta): só reduzidas e salvas em JPEG.
const ART = path.join(ROOT, 'public/assets/art');
fs.mkdirSync(ART, { recursive: true });
for (const p of man.photos || []) {
  if (only) continue;
  await sharp(path.join(ROOT, 'Assets', p.file)).resize({ width: p.width, height: p.height, fit: 'cover', position: 'center' }).jpeg({ quality: 86 }).toFile(path.join(ART, p.out));
}
console.log(`${count} sprites (fundo magenta) extraídos para public/assets/sprites`);
