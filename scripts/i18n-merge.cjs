// Junta o dicionário inglês a partir de list.json (chaves em português, na ordem do dump) e dos arquivos "idx|inglês".
// Uso: node scripts/i18n-merge.cjs <pasta-com-list.json-e-tr/> — acrescenta aos arquivos src/i18n/en/{ui,data,content}.ts.
const fs = require('fs'), path = require('path');
const dir = path.resolve(process.argv[2]);
const list = JSON.parse(fs.readFileSync(path.join(dir, 'list.json'), 'utf8'));
const tr = {};
for (const f of fs.readdirSync(path.join(dir, 'tr'))) {
  for (const line of fs.readFileSync(path.join(dir, 'tr', f), 'utf8').split('\n')) {
    const m = line.match(/^(\d+)\|(.*)$/);
    if (m) tr[Number(m[1])] = m[2].replace(/\\n/g, '\n');
  }
}
const CONTENT = /^data:(STORY|GUIDE|CHAIN_EVENTS|EVENTS|TIPS|GOALS)$/;
const out = { ui: {}, data: {}, content: {} };
let missing = 0;
list.forEach(([pt, where], i) => {
  if (tr[i] === undefined) { missing++; return; }
  const bucket = CONTENT.test(where) ? 'content' : where.startsWith('data:') ? 'data' : 'ui';
  out[bucket][pt] = tr[i];
});
const decl = { ui: 'UI', data: 'DATA', content: 'CONTENT' };
for (const b of Object.keys(out)) {
  const file = path.resolve('src/i18n/en', b + '.ts');
  const prev = fs.readFileSync(file, 'utf8');
  const existing = {};
  for (const m of prev.matchAll(/^  (".*?"|'.*?'): (".*"),$/gm)) existing[JSON.parse(m[1].startsWith("'") ? '"' + m[1].slice(1, -1).replace(/"/g, '\\"') + '"' : m[1])] = JSON.parse(m[2]);
  const all = { ...existing, ...out[b] };
  const body = Object.entries(all).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
  fs.writeFileSync(file, `/** Traduções para o inglês (chave = texto em português). */\nexport const ${decl[b]}: Record<string, string> = {\n${body}\n};\n`);
  console.log(b, Object.keys(all).length);
}
console.log('sem tradução:', missing);
