import type { UpgradeDef } from '../game/types';
// Posição das pesquisas na árvore visual (desenho em camadas, à la Sugiyama).
// Coluna = profundidade: uma pesquisa fica uma coluna depois do seu pré-requisito mais fundo; as que não dependem
// de nada ficam nas colunas da sua fase (1 → 0, 2 → 1, 3+ → 2). Uma ligação que pula colunas ganha pontos de
// passagem nas colunas do meio, que entram na ordenação como nós finos, para a linha contornar as pesquisas.
// A ordem de cada coluna vem da média das posições dos vizinhos (varreduras de ida e volta, fica a com menos
// cruzamentos) e a altura de cada nó, da média dos seus pré-requisitos. Depende só dos dados.

export interface TreeNode { id: string; col: number; row: number }
export interface TreeEdge { from: string; to: string; points: { col: number; row: number }[] }
export interface TreeLayout { nodes: TreeNode[]; byId: Record<string, TreeNode>; edges: TreeEdge[]; cols: number; rows: number; crossings: number }

const SWEEPS = 12;
const GAP = 1, GAP_THIN = 0.5;   // distância mínima entre dois nós; entre um nó e um ponto de passagem

export function layoutTree(upgrades: UpgradeDef[]): TreeLayout {
  const byDef = Object.fromEntries(upgrades.map(u => [u.id, u]));
  const col: Record<string, number> = {};
  const colOf = (u: UpgradeDef): number => col[u.id] ??= (u.requires?.length
    ? Math.max(...u.requires.map(r => colOf(byDef[r]))) + 1
    : Math.min(u.phase - 1, 2));
  upgrades.forEach(colOf);
  const cols = Math.max(...Object.values(col)) + 1;

  // Cada ligação vira uma corrente de segmentos entre colunas vizinhas.
  const dummy = new Set<string>();
  const chains: { from: string; to: string; ids: string[] }[] = [];
  const seg: [string, string][] = [];
  for (const u of upgrades) for (const r of u.requires ?? []) {
    const ids = [r];
    for (let c = col[r] + 1; c < col[u.id]; c++) { const d = `~${r}~${u.id}~${c}`; dummy.add(d); col[d] = c; ids.push(d); }
    ids.push(u.id);
    for (let i = 1; i < ids.length; i++) seg.push([ids[i - 1], ids[i]]);
    chains.push({ from: r, to: u.id, ids });
  }
  const parents: Record<string, string[]> = {}, children: Record<string, string[]> = {};
  for (const [a, b] of seg) { (parents[b] ??= []).push(a); (children[a] ??= []).push(b); }

  const columns: string[][] = Array.from({ length: cols }, () => []);
  for (const u of upgrades) columns[col[u.id]].push(u.id);   // ordem inicial: a dos dados
  for (const d of dummy) columns[col[d]].push(d);

  const pos: Record<string, number> = {};
  const index = () => columns.forEach(c => c.forEach((id, i) => { pos[id] = i - (c.length - 1) / 2; }));
  const reorder = (c: string[], near: (id: string) => string[]) => {
    const key = (id: string) => { const n = near(id); return n.length ? n.reduce((a, x) => a + pos[x], 0) / n.length : pos[id]; };
    const keys = Object.fromEntries(c.map(id => [id, key(id)]));
    c.sort((a, b) => keys[a] - keys[b]);
  };
  const crossings = () => {
    let n = 0;
    for (let i = 0; i < seg.length; i++) for (let j = i + 1; j < seg.length; j++) {
      const [a1, b1] = seg[i], [a2, b2] = seg[j];
      if (col[a1] === col[a2] && (pos[a1] - pos[a2]) * (pos[b1] - pos[b2]) < 0) n++;
    }
    return n;
  };
  index();
  let best = columns.map(c => [...c]), bestN = crossings();
  for (let s = 0; s < SWEEPS; s++) {
    for (let i = 1; i < cols; i++) { reorder(columns[i], id => parents[id] ?? []); index(); }
    for (let i = cols - 2; i >= 0; i--) { reorder(columns[i], id => children[id] ?? []); index(); }
    const n = crossings();
    if (n < bestN) { bestN = n; best = columns.map(c => [...c]); }
  }

  // Alturas: cada coluna, mantendo a ordem, tenta pôr cada nó na altura desejada sem encostar na vizinha,
  // e depois desliza inteira para ficar o mais perto possível do desejado.
  const y: Record<string, number> = {};
  const gap = (a: string, b: string) => (dummy.has(a) || dummy.has(b) ? GAP_THIN : GAP);
  const place = (c: string[], want: number[]) => {
    const got: number[] = [];
    want.forEach((w, i) => got.push(i ? Math.max(w, got[i - 1] + gap(c[i - 1], c[i])) : w));
    const shift = want.reduce((a, w, i) => a + w - got[i], 0) / c.length;
    c.forEach((id, i) => { y[id] = got[i] + shift; });
  };
  const mean = (ids: string[]) => ids.reduce((a, x) => a + y[x], 0) / ids.length;
  // Ida: pela média dos pré-requisitos (as raízes, empilhadas).
  best.forEach(c => place(c, c.map((id, i) => (parents[id] ? mean(parents[id]) : i))));
  // Volta: quem não tem pré-requisito desce/sobe para perto de quem depende dele.
  for (let ci = cols - 2; ci >= 0; ci--) {
    const c = best[ci];
    place(c, c.map(id => (!parents[id] && children[id] ? mean(children[id]) : y[id])));
  }

  const top = Math.min(...Object.values(y));
  const row = (id: string) => y[id] - top;
  const nodes = upgrades.map(u => ({ id: u.id, col: col[u.id], row: row(u.id) }));
  const edges = chains.map(ch => ({ from: ch.from, to: ch.to, points: ch.ids.map(id => ({ col: col[id], row: row(id) })) }));
  const rows = Math.max(...nodes.map(n => n.row)) + 1;
  return { nodes, byId: Object.fromEntries(nodes.map(n => [n.id, n])), edges, cols, rows, crossings: bestN };
}
