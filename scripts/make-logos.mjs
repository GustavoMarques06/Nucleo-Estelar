// Monta a identidade do jogo a partir das peças recortadas por extract-keyed (logo-symbol, logo-letters,
// logo-favicon-src) e da ilustração do carregamento: o letreiro, os ícones da aba, os ícones de app e a imagem de
// compartilhamento. Um só símbolo em tudo.
// Uso: node scripts/make-logos.mjs (roda depois de extract-keyed)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES = path.join(ROOT, 'public/assets/sprites');
const ICONS = path.join(ROOT, 'public/assets/icons');
const ART = path.join(ROOT, 'public/assets/art');
fs.mkdirSync(ICONS, { recursive: true });

const sprite = n => path.join(SPRITES, n + '.png');
const fit = async (file, opts) => sharp(file).resize(opts).png().toBuffer({ resolveWithObject: true });

// ---------- Letreiro horizontal: símbolo + "NÚCLEO ESTELAR" ----------
// Altura final 240 px (a barra do topo mostra com 46 px; o resto é nitidez em tela de alta densidade).
const H = 240;
const sym = await fit(sprite('logo-symbol'), { height: Math.round(H * 1.0), kernel: 'lanczos3' });
const txt = await fit(sprite('logo-letters'), { height: Math.round(H * 0.86), kernel: 'lanczos3' });
const gap = Math.round(H * 0.06);
const wideW = sym.info.width + gap + txt.info.width;
const wide = await sharp({ create: { width: wideW, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([
    { input: sym.data, left: 0, top: Math.round((H - sym.info.height) / 2) },
    { input: txt.data, left: sym.info.width + gap, top: Math.round((H - txt.info.height) / 2) },
  ]).png().toBuffer();
fs.writeFileSync(sprite('logo-wide'), wide);
fs.writeFileSync(path.join(ROOT, 'docs/img/logo.png'), wide);

// ---------- Ícones da aba: a versão em grade de 32 pixels ----------
// A fonte é uma grade de 32 × 32 blocos de 32 px: o vizinho mais próximo reduz sem borrar.
const fav32 = await sharp(sprite('logo-favicon-src')).resize(32, 32, { kernel: 'nearest' }).png().toBuffer();
fs.writeFileSync(path.join(ICONS, 'favicon-32.png'), fav32);
fs.writeFileSync(path.join(ICONS, 'favicon-16.png'), await sharp(fav32).resize(16, 16, { kernel: 'lanczos3' }).png().toBuffer());
fs.writeFileSync(path.join(ICONS, 'favicon-64.png'), await sharp(fav32).resize(64, 64, { kernel: 'nearest' }).png().toBuffer());

// ---------- Ícones de app: o símbolo sobre o espaço, com fundo (o sistema arredonda os cantos) ----------
const appIcon = async size => {
  const stars = Array.from({ length: 14 }, (_, i) => {
    const x = (i * 337 + 91) % 1000 / 1000, y = (i * 613 + 157) % 1000 / 1000;
    const r = i % 4 === 0 ? 2.2 : 1.2;
    return `<rect x="${(x * size).toFixed(1)}" y="${(y * size).toFixed(1)}" width="${(r * size / 512).toFixed(1)}" height="${(r * size / 512).toFixed(1)}" fill="#cfe8ff" opacity="${i % 3 ? 0.7 : 1}"/>`;
  }).join('');
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs><radialGradient id="g" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#0f5a78"/><stop offset="0.45" stop-color="#11203b"/><stop offset="1" stop-color="#0b0f1a"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>${stars}</svg>`);
  // 72% do quadrado: fica dentro da área segura que o celular não corta.
  const s = await fit(sprite('logo-symbol'), { width: Math.round(size * 0.72), height: Math.round(size * 0.72), fit: 'inside', kernel: 'lanczos3' });
  return sharp(bg).composite([{ input: s.data, left: Math.round((size - s.info.width) / 2), top: Math.round((size - s.info.height) / 2) }]).png().toBuffer();
};
for (const [name, size] of [['icon-512', 512], ['icon-192', 192], ['apple-touch-icon', 180]]) fs.writeFileSync(path.join(ICONS, name + '.png'), await appIcon(size));

// ---------- Compartilhamento (1200 × 630): ilustração do carregamento + letreiro ----------
const SW = 1200, SH = 630;
const scene = await fit(path.join(ART, 'loading-art.jpg'), { width: SW, kernel: 'lanczos3' });
const logo = await fit(sprite('logo-wide'), { height: 150, kernel: 'lanczos3' });
const fade = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}">
  <defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070f" stop-opacity="1"/>
  <stop offset="${((SH - scene.info.height) / SH).toFixed(3)}" stop-color="#05070f" stop-opacity="0.95"/>
  <stop offset="${((SH - scene.info.height) / SH + 0.12).toFixed(3)}" stop-color="#05070f" stop-opacity="0"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#f)"/></svg>`);
await sharp({ create: { width: SW, height: SH, channels: 3, background: '#05070f' } })
  .composite([
    { input: scene.data, left: 0, top: SH - scene.info.height },
    { input: fade, left: 0, top: 0 },
    { input: logo.data, left: Math.round((SW - logo.info.width) / 2), top: 14 },
  ]).jpeg({ quality: 86 }).toFile(path.join(ART, 'social-preview.jpg'));

console.log(`logo-wide ${wideW}×${H}, ícones da aba (16/32/64), ícones de app (180/192/512) e social-preview gerados`);
