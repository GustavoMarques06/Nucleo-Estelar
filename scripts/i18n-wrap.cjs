// Aplica trocas exatas em vários arquivos e garante o import de t (e de Tx, se usado). Uso: node scripts/i18n-wrap.cjs spec.cjs
// spec.cjs exporta { 'src/ui/Arquivo.tsx': [[antigo, novo], ...], ... }
const fs = require('fs'), path = require('path');
const spec = require(path.resolve(process.argv[2]));
let failed = 0;
for (const [file, pairs] of Object.entries(spec)) {
  let c = fs.readFileSync(file, 'utf8');
  for (const [a, b] of pairs) {
    if (!c.includes(a)) { console.error(`${file}: não achei: ${a.slice(0, 90)}`); failed++; continue; }
    c = c.split(a).join(b);
  }
  const rel = p => { const r = path.relative(path.dirname(file), p).split(path.sep).join('/'); return r.startsWith('.') ? r : './' + r; };
  const addImport = (name, from, isType) => {
    if (new RegExp(`import[^;]*\\b${name}\\b[^;]*from '${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`).test(c)) return;
    const lines = c.split('\n');
    let last = -1;
    lines.forEach((l, i) => { if (/^import /.test(l) || /^} from /.test(l)) last = i; });
    lines.splice(last + 1, 0, `import { ${name} } from '${from}';`);
    c = lines.join('\n');
  };
  if (/\bt\(/.test(c) && !/function t\(/.test(c)) addImport('t', rel('src/i18n/index.ts').replace(/\/index\.ts$/, ''));
  if (/<Tx\b/.test(c)) addImport('Tx', rel('src/i18n/Tx.tsx').replace(/\.tsx$/, ''));
  if (/\btp\(/.test(c) && !/\bimport[^;]*\btp\b/.test(c)) { c = c.replace(/import \{ t \} from '([^']+)';/, "import { t, tp } from '$1';"); }
  fs.writeFileSync(file, c);
}
console.log(failed ? `${failed} troca(s) não aplicada(s)` : 'ok');
