// Varredura de saúde do código: exports sem uso, ciclos de importação, arquivos grandes, nomes duplicados e gambiarras.
// Uso: npm run audit
const fs = require('fs'), path = require('path');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const norm = p => p.split(path.sep).join('/');
const files = walk('src').map(norm).filter(f => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(files.map(f => [f, fs.readFileSync(f, 'utf8')]));
const prod = files.filter(f => !/\.test\./.test(f));

// 1) exports sem uso fora do próprio arquivo
const unused = [], testOnly = [];
for (const f of prod) {
  for (const m of src[f].matchAll(/export\s+(?:async\s+)?(?:const|function|class|let)\s+([A-Za-z0-9_]+)/g)) {   // tipos exportados são API de propósito: não entram
    const name = m[1];
    const re = new RegExp('\\b' + name + '\\b');
    const others = files.filter(o => o !== f && re.test(src[o]));
    const inProd = others.some(o => !/\.test\./.test(o));
    const inSelf = (src[f].match(new RegExp('\\b' + name + '\\b', 'g')) || []).length > 1;
    if (!others.length) unused.push(f.replace('src/', '') + ': ' + name + (inSelf ? '  (só dentro do próprio arquivo: tirar o export)' : '  (sem nenhum uso: remover)'));
    else if (!inProd) testOnly.push(f.replace('src/', '') + ': ' + name);
  }
}
console.log('== exports sem uso fora do arquivo:\n' + (unused.join('\n') || '(nenhum)'));
console.log('\n== exports usados só em testes:\n' + (testOnly.join('\n') || '(nenhum)'));

// 2) ciclos de importação
const graph = {};
for (const f of prod) {
  graph[f] = [];
  for (const m of src[f].matchAll(/from\s+'(\.[^']+)'/g)) {
    const base = norm(path.join(path.dirname(f), m[1]));
    const t = [base + '.ts', base + '.tsx', base + '/index.ts'].find(x => src[x]);
    if (t) graph[f].push(t);
  }
}
const cycles = new Set();
const visit = (n, stack) => {
  if (stack.includes(n)) { cycles.add(stack.slice(stack.indexOf(n)).concat(n).map(x => x.replace('src/', '')).join(' -> ')); return; }
  for (const t of graph[n] || []) visit(t, [...stack, n]);
};
Object.keys(graph).forEach(f => visit(f, []));
console.log('\n== ciclos de importação:\n' + ([...cycles].slice(0, 8).join('\n') || '(nenhum)'));

// 3) arquivos grandes
console.log('\n== maiores arquivos:');
prod.map(f => [f, src[f].split('\n').length]).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([f, n]) => console.log(n + '\t' + f));

// 4) nomes definidos em mais de um módulo
const defs = {};
for (const f of prod) for (const m of src[f].matchAll(/(?:^|\n)(?:export\s+)?(?:const|function)\s+([a-zA-Z0-9_]+)\s*(?:=|\()/g)) (defs[m[1]] ||= []).push(f.replace('src/', ''));
console.log('\n== nomes definidos em mais de um módulo:');
const dup = Object.entries(defs).filter(([, v]) => v.length > 1);
console.log(dup.map(([k, v]) => k + ' -> ' + v.join(', ')).join('\n') || '(nenhum)');

// 5) cheiros
console.log('\n== cheiros:');
for (const [pat, label] of [[/as never|as any|: any\b/g, 'any/never'], [/@ts-ignore|@ts-expect-error/g, 'ts-ignore'], [/require_\w+/g, 'gambiarra require_']]) {
  const hits = prod.flatMap(f => (src[f].match(pat) || []).map(() => f.replace('src/', '')));
  console.log(label + ': ' + (hits.length ? [...new Set(hits)].join(', ') : '(nenhum)'));
}
