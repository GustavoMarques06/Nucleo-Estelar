// Pós-build: deixa em dist/ só os sprites que o código realmente usa e recomprime os PNGs (paleta indexada, ideal para pixel art).
// Os sprites não usados continuam em public/assets/sprites (e nas pranchas em Assets/): só não vão para o site publicado.
// Uso: node scripts/optimize-dist.mjs [--dry]      (--dry apenas lista o que seria removido)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist/assets/sprites');
const dry = process.argv.includes('--dry');

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const source = walk(path.join(ROOT, 'src')).filter(f => /\.(ts|tsx|css)$/.test(f) && !/\.test\./.test(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n')
  + fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Nomes montados em tempo de execução: quadros de animação (prefixo-N), níveis (-t2/-t3) e variações numeradas.
const mentioned = name => new RegExp(`(?<![A-Za-z0-9-])${name.replace(/[-]/g, '\\-')}(?![A-Za-z0-9])`).test(source);
function used(name) {
  if (mentioned(name)) return true;
  const stripped = name.replace(/-(t[23]|\d+)$/, '');
  return stripped !== name && used(stripped);
}

const files = fs.readdirSync(DIST).filter(f => f.endsWith('.png'));
const unused = files.filter(f => !used(f.replace(/\.png$/, '')));
if (dry) { console.log(`${unused.length} de ${files.length} sprites sem uso:\n` + unused.join('\n')); process.exit(0); }

let before = 0, after = 0;
for (const f of files) {
  const p = path.join(DIST, f);
  before += fs.statSync(p).size;
  if (unused.includes(f)) { fs.unlinkSync(p); continue; }
  const buf = await sharp(p).png({ palette: true, quality: 92, effort: 10, colours: 256, dither: 0 }).toBuffer();
  const out = buf.length < fs.statSync(p).size ? buf : fs.readFileSync(p);
  fs.writeFileSync(p, out);
  after += out.length;
}
console.log(`sprites: ${files.length} → ${files.length - unused.length} (removidos ${unused.length}); ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB`);
