// Procura textos em português que ainda não passam por t() / <Tx>: ajuda a varrer o código na tradução.
// Uso: node scripts/i18n-scan.cjs [pasta-ou-arquivo ...]      (sem argumentos varre src/ui, src/App.tsx e src/game)
const fs = require('fs'), path = require('path');
const roots = process.argv.slice(2).length ? process.argv.slice(2) : ['src/ui', 'src/App.tsx', 'src/game', 'src/render'];
const files = [];
const walk = p => {
  if (!fs.existsSync(p)) return;
  if (fs.statSync(p).isDirectory()) fs.readdirSync(p).forEach(x => walk(path.join(p, x)));
  else if (/\.(ts|tsx)$/.test(p) && !/\.test\./.test(p) && !/[\\/]i18n[\\/]/.test(p)) files.push(p);
};
roots.forEach(walk);

// Indícios de português: letras acentuadas ou palavras comuns.
const PT = /[áàâãéêíóôõúüç]|\b(de|do|da|dos|das|para|com|uma?|que|não|por|em|no|na|os|as|ao|mais|menos|ou|e|se|já|seu|sua|ser|ter)\b/i;
const looksVisible = s => /[A-Za-zÀ-ÿ]{3,}/.test(s) && PT.test(s) && !/^[\w./#:-]+$/.test(s) && !/^(https?:|\/|\.\/|assets)/.test(s);

let total = 0;
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const hits = [];
  lines.forEach((ln, i) => {
    if (/^\s*(import|\/\/|\*|\/\*)/.test(ln)) return;
    const noComment = ln.replace(/\/\/.*$/, '');
    // literais entre aspas/crases que não estão dentro de t('...') ou Tx k="..."
    for (const m of noComment.matchAll(/(['"`])((?:\\.|(?!\1).)+)\1/g)) {
      const before = noComment.slice(0, m.index);
      if (/\bt\(\s*$|\btp\([^,]*,\s*$|\bk=\s*$|\btp\([^)]*,\s*$/.test(before)) continue;
      if (/(className|id|key|type|kind|role|src|href|name|sprite|icon|art|prefix|from|import|case)\s*[=:(]\s*$/.test(before)) continue;
      if (looksVisible(m[2])) hits.push(`${i + 1}: ${m[2].slice(0, 110)}`);
    }
    // texto solto em JSX: >texto< ou linha só de texto
    const jsx = noComment.match(/>([^<>{}]*[A-Za-zÀ-ÿ]{3,}[^<>{}]*)</);
    if (jsx && looksVisible(jsx[1])) hits.push(`${i + 1}: [jsx] ${jsx[1].trim().slice(0, 110)}`);
    else if (/^\s*[A-Za-zÀ-ÿ][^<>{}=;()]*[A-Za-zÀ-ÿ.:!?,]\s*$/.test(ln) && looksVisible(ln) && /tsx$/.test(f) && !/^\s*(return|const|let|if|else|case|export|function|type|interface|default)/.test(ln)) hits.push(`${i + 1}: [jsx-linha] ${ln.trim().slice(0, 110)}`);
  });
  if (hits.length) { total += hits.length; console.log(`\n${f} (${hits.length})\n  ${hits.join('\n  ')}`); }
}
console.log(`\n${total} textos em ${files.length} arquivos ainda sem t().`);
