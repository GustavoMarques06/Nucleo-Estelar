import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useGame } from '../../game/store';
import { UPGRADES, UPGRADE_BY_ID } from '../../game/data/upgrades';
import { canAfford } from '../../game/engine/costs';
import { isUpgradeVisible, upgradeRequirementsMet } from '../../game/engine/modifiers';
import { fmtDuration } from '../../game/engine/format';
import type { GameState, ResId, UpgradeDef } from '../../game/types';
import { Icon } from '../Icon';
import { CostList } from './BuildingsPanel';
import { t } from '../../i18n';
import { useSpotTarget } from '../spotlight';
import { layoutTree } from '../researchLayout';

// Árvore de pesquisa visual: colunas por profundidade (researchLayout.ts), ligações em SVG por trás dos nós.
// Tocar num nó abre o detalhe embaixo, com custo, requisitos, o que ele libera e o botão de pesquisar.

const PHASES: Record<number, string> = {
  1: 'Fase 1 · Sobrevivência industrial', 2: 'Fase 2 · Autossuficiência energética', 3: 'Fase 3 · Indústria avançada',
  4: 'Fase 4 · Civilização', 5: 'Fase 5 · Expansão interestelar', 6: 'Fase 6 · Megaprojetos',
};

const TREE = layoutTree(UPGRADES);
const CHILDREN: Record<string, string[]> = {};
for (const e of TREE.edges) (CHILDREN[e.from] ??= []).push(e.to);

// Tamanho da grade em px: passo de coluna e de linha, tamanho do nó, margem.
const CW = 156, RH = 62, NW = 128, NH = 46, PAD = 14;
const nx = (col: number) => PAD + col * CW;
const ny = (row: number) => PAD + row * RH;

/** done concluída · ready dá para pagar · open liberada, falta recurso · cond requisitos ok, falta a condição
 *  · near falta algum requisito, mas já se sabe o nome · unknown longe demais (???). */
type NodeState = 'done' | 'ready' | 'open' | 'cond' | 'near' | 'unknown';

function stateOf(u: UpgradeDef, s: GameState): NodeState {
  if (s.upgrades[u.id]) return 'done';
  if (isUpgradeVisible(u, s)) return canAfford(s, u.cost) ? 'ready' : 'open';
  if (upgradeRequirementsMet(u, s)) return 'cond';
  return (u.requires ?? []).some(r => s.upgrades[r] || isUpgradeVisible(UPGRADE_BY_ID[r], s)) ? 'near' : 'unknown';
}

/** Tempo até pagar no ritmo atual, ou null se algum recurso que falta não está subindo. */
function etaOf(u: UpgradeDef, s: GameState, rates: Record<ResId, number>): number | null {
  let worst = 0;
  for (const [r, v] of Object.entries(u.cost) as [ResId, number][]) {
    const missing = v - s.resources[r];
    if (missing <= 0) continue;
    if (!(rates[r] > 0)) return null;
    worst = Math.max(worst, missing / rates[r]);
  }
  return worst;
}

// Ligação: curva entre colunas vizinhas, reta sobre os pontos de passagem.
function edgePath(points: { col: number; row: number }[]) {
  const p = points.map((q, i) => ({ x: nx(q.col) + (i === 0 ? NW : 0), y: ny(q.row) + NH / 2 }));
  let d = `M${p[0].x} ${p[0].y}`;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i];
    const ax = i > 1 ? a.x + NW : a.x;   // atravessa a coluna do ponto de passagem em linha reta
    if (i > 1) d += `L${ax} ${a.y}`;
    const m = (ax + b.x) / 2;
    d += `C${m} ${a.y} ${m} ${b.y} ${b.x} ${b.y}`;
  }
  return d;
}

export function ResearchTree() {
  const game = useGame(s => s.game);
  const rates = useGame(s => s.rates);
  const upgrade = useGame(s => s.upgrade);
  const spotId = useSpotTarget('upgrade');
  const box = useRef<HTMLDivElement>(null);
  const state = Object.fromEntries(UPGRADES.map(u => [u.id, stateOf(u, game)])) as Record<string, NodeState>;
  const frontier = UPGRADES.filter(u => state[u.id] === 'ready' || state[u.id] === 'open')
    .sort((a, b) => Number(state[b.id] === 'ready') - Number(state[a.id] === 'ready'));
  const [picked, setPicked] = useState<string | null>(null);
  const sel = spotId ?? picked ?? frontier[0]?.id ?? null;

  // Centra o nó escolhido na área rolável (ao abrir a aba, ao trocar de nó ou quando o holofote aponta um).
  const center = (id: string, smooth = true) => {
    const el = box.current, n = TREE.byId[id];
    if (!el || !n) return;
    el.scrollTo({ left: nx(n.col) + NW / 2 - el.clientWidth / 2, top: ny(n.row) + NH / 2 - el.clientHeight / 2, behavior: smooth ? 'smooth' : 'auto' });
  };
  useEffect(() => { if (sel) center(sel, false); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (spotId) { setPicked(spotId); center(spotId); } }, [spotId]);
  const pick = (id: string) => { setPicked(id); center(id); };

  // Arrastar com o mouse rola a árvore (no toque, a rolagem nativa já faz isso).
  const drag = useRef<{ x: number; y: number; l: number; t: number; moved: boolean } | null>(null);
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !box.current) return;
    drag.current = { x: e.clientX, y: e.clientY, l: box.current.scrollLeft, t: box.current.scrollTop, moved: false };
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current, el = box.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    if (!d.moved) { d.moved = true; el.setPointerCapture(e.pointerId); el.classList.add('dragging'); }
    el.scrollLeft = d.l - dx; el.scrollTop = d.t - dy;
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    box.current?.classList.remove('dragging');
    if (d?.moved) { const stop = (ev: Event) => { ev.stopPropagation(); }; window.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0); }
  };

  const done = UPGRADES.filter(u => state[u.id] === 'done').length;
  const known = (id: string) => state[id] !== 'unknown';
  const u = sel ? UPGRADE_BY_ID[sel] : null;

  return (
    <>
      <h4 className="section">{t('Árvore de pesquisa')} · {done}/{UPGRADES.length}</h4>
      {frontier.length > 0 ? (
        <div className="rtree-frontier">
          {frontier.map(f => (
            <button key={f.id} className={`rtree-chip ${state[f.id]} ${sel === f.id ? 'on' : ''}`} onClick={() => pick(f.id)}>
              <Icon name={f.icon} size={18} />{t(f.name)}
            </button>
          ))}
        </div>
      ) : <p className="hint">{t('Nenhuma pesquisa disponível agora. Expanda a operação para liberar novas.')}</p>}

      <div ref={box} className="rtree" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <div className="rtree-canvas" style={{ width: nx(TREE.cols) - CW + NW + PAD, height: ny(TREE.rows) - RH + NH + PAD }}>
          <svg className="rtree-edges" width="100%" height="100%" aria-hidden="true">
            {TREE.edges.map(e => {
              const cls = state[e.from] === 'done' ? (state[e.to] === 'done' ? 'done' : 'next') : '';
              const lit = sel === e.from || sel === e.to ? 'lit' : '';
              return <path key={`${e.from}>${e.to}`} className={`${cls} ${lit}`} d={edgePath(e.points)} />;
            })}
          </svg>
          {TREE.nodes.map(n => {
            const def = UPGRADE_BY_ID[n.id], st = state[n.id];
            return (
              <button key={n.id} data-spot={`upgrade:${n.id}`} className={`rtree-node ${st} ${sel === n.id ? 'sel' : ''} ${spotId === n.id ? 'spot' : ''}`}
                style={{ left: nx(n.col), top: ny(n.row), width: NW, height: NH }}
                aria-pressed={sel === n.id} aria-label={known(n.id) ? t(def.name) : t('Pesquisa desconhecida')}
                onClick={() => pick(n.id)}>
                <Icon name={def.icon} size={28} className={st === 'unknown' ? 'silhouette' : ''} />
                <span>{known(n.id) ? t(def.name) : '???'}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="rtree-legend">
        <span className="lg-done">{t('concluída')}</span><span className="lg-ready">{t('pode pesquisar')}</span>
        <span className="lg-open">{t('falta recurso')}</span><span className="lg-cond">{t('ainda bloqueada')}</span>
      </div>

      {u && <ResearchDetail u={u} st={state[u.id]} state={state} eta={state[u.id] === 'open' ? etaOf(u, game, rates) : null}
        spot={spotId === u.id} onPick={pick} onBuy={() => upgrade(u.id)} />}
    </>
  );
}

function ResearchDetail({ u, st, state, eta, spot, onPick, onBuy }: {
  u: UpgradeDef; st: NodeState; state: Record<string, NodeState>; eta: number | null; spot: boolean;
  onPick: (id: string) => void; onBuy: () => void;
}) {
  const game = useGame(s => s.game);
  const known = st !== 'unknown';
  const req = u.requires ?? [];
  const missing = req.filter(r => state[r] !== 'done');
  const unlocks = CHILDREN[u.id] ?? [];
  const link = (id: string) => {
    const d = UPGRADE_BY_ID[id];
    return (
      <button key={id} className={`rtree-chip ${state[id]}`} onClick={() => onPick(id)}>
        <Icon name={d.icon} size={16} className={state[id] === 'unknown' ? 'silhouette' : ''} />{state[id] === 'unknown' ? '???' : t(d.name)}
      </button>
    );
  };
  return (
    <article className={`card rtree-detail ${st} ${spot ? 'spot' : ''}`}>
      <Icon name={u.icon} size={56} className={`card-art ${known ? '' : 'silhouette'}`} />
      <div className="card-main">
        <h3>{known ? t(u.name) : '???'} {st === 'done' && <span className="count ok">{t('concluída')}</span>}</h3>
        <p className="hint">{t(PHASES[u.phase])}</p>
        {known && <p className="desc">{t(u.desc)}</p>}
        {req.length > 0 && <div className="rtree-links"><b>{t('Requer')}</b>{req.map(link)}</div>}
        {unlocks.length > 0 && <div className="rtree-links"><b>{t('Libera')}</b>{unlocks.map(link)}</div>}
        {st === 'cond' && <p className="hint">{t('Os requisitos estão prontos: ela aparece quando a operação crescer um pouco mais.')}</p>}
        {(st === 'near' || st === 'unknown') && missing.length > 0 && (
          <p className="hint">{t('Pesquise antes: {lista}.', { lista: missing.map(r => (state[r] === 'unknown' ? '???' : t(UPGRADE_BY_ID[r].name))).join(', ') })}</p>
        )}
        {st === 'open' && <p className="hint">{eta !== null ? t('No ritmo atual, dá para pagar em ~{tempo}.', { tempo: fmtDuration(eta) }) : t('Falta um recurso que não está sendo produzido agora.')}</p>}
      </div>
      {(st === 'ready' || st === 'open') && (
        <button className="btn buy" disabled={st !== 'ready'} onClick={onBuy}>
          {t('Pesquisar')}
          <CostList cost={u.cost} have={game.resources} />
        </button>
      )}
    </article>
  );
}
