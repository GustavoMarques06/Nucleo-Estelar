import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { useGame } from '../game/store';
import { FACTION_BY_ID } from '../game/data/factions';
import { isDisputed, locationSprite } from '../game/engine/expansion';
import { getModifiers } from '../game/engine/modifiers';
import { fmtDuration } from '../game/engine/format';
import { crisisOf } from '../game/engine/crises';
import { routeInfo } from '../game/engine/routes';
import { digOf, digsUnlocked, hasAnomaly } from '../game/engine/digs';
import { artUrl, spriteUrl } from '../assets';
import { eraIndex } from '../game/engine/civilization';
import { CIV_PLANETS } from '../render/sceneConfig';
import { MEGA_BY_ID, builtMegaSprite } from '../game/data/megaprojects';
import { LAYERS } from '../game/data/layers';
import { layerIndex } from '../game/engine/deposit';
import { AURORA_POS, BASE_POS, MEGA_POS, SUN_RADIUS, nodePosition, orbitsFor } from './mapLayout';
import { Icon } from './Icon';
import { t } from '../i18n';

// Câmera: a tela mostra o ponto do mapa p em (p × k + x, p × k + y). O zoom vai de um pouco além do sistema inteiro
// enquadrado (FIT_MARGIN do zoom que enquadra tudo) até K_MAX.
interface Cam { x: number; y: number; k: number }
const K_MIN = 0.25, K_MAX = 2.5, FIT_MARGIN = 0.7;
const clampK = (k: number, min = K_MIN) => Math.min(K_MAX, Math.max(min, k));

// Arte do anel orbital (mega-ring-empty, 512 × 272): o buraco tem o centro a 45,6% da altura; Aurora ocupa 30% da
// largura, um pouco mais alta que o buraco, para a faixa da frente cruzar a parte de baixo dela.
const RING_ASPECT = 272 / 512, RING_HOLE_Y = 0.456, RING_PLANET = 0.3;

/** Mapa estelar: um sistema solar com todos os locais, que se arrasta e aproxima com o mouse (ou com os dedos).
 *  Escolher um planeta chama onPick, que fecha a janela e mostra o local no painel e na cena; escolher Aurora
 *  (o mundo dos colonos, ao lado da base) chama onAurora, e um megaprojeto já construído, onMega com o id dele. */
export function MapView({ onPick, onAurora, onMega }: { onPick?: () => void; onAurora?: () => void; onMega?: (id: string) => void }) {
  const game = useGame(s => s.game);
  const selected = useGame(s => s.selectedLoc);
  const select = useGame(s => s.selectLoc);
  const m = getModifiers(game);
  const total = game.locations.length + game.expeditions.length;
  // Aurora aparece quando a civilização começa (como o botão Aurora da cena).
  const aurora = !!game.upgrades.habitats || game.resources.population >= 1;
  // Megaprojetos aparecem no mapa a partir do primeiro estágio, com a arte do estágio mais recente.
  const mega = (id: string) => {
    const sprite = builtMegaSprite(game, id);
    if (!sprite) return null;
    const name = t(MEGA_BY_ID[id].name);
    return { sprite, name, title: t('{nome} · estágio {n}', { nome: name, n: game.megaprojects[id] }) };
  };
  const dyson = mega('dyson'), ring = mega('ring');
  const placed = Object.keys(MEGA_POS).flatMap(id => { const m = mega(id); return m ? [{ id, ...m, pos: MEGA_POS[id] }] : []; });
  const box = useRef<HTMLDivElement>(null);
  const [cam, setCam] = useState<Cam | null>(null);
  const kMin = useRef(K_MIN);
  const camRef = useRef(cam);
  camRef.current = cam;

  // Enquadra o sistema inteiro (estrela, base e todos os locais) no espaço disponível.
  const fit = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const pts = [{ x: 0, y: 0 }, BASE_POS, AURORA_POS, ...Object.values(MEGA_POS), ...Array.from({ length: total }, (_, i) => nodePosition(i))];
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const minX = Math.min(...xs) - 90, maxX = Math.max(...xs) + 90, minY = Math.min(...ys) - 70, maxY = Math.max(...ys) + 90;
    const W = el.clientWidth, H = el.clientHeight;
    const k = clampK(Math.min(W / (maxX - minX), H / (maxY - minY), 1.4));
    kMin.current = Math.max(K_MIN, Math.min(1, k * FIT_MARGIN));
    setCam({ k, x: W / 2 - ((minX + maxX) / 2) * k, y: H / 2 - ((minY + maxY) / 2) * k });
  }, [total]);
  useLayoutEffect(() => { if (!camRef.current) fit(); }, [fit]);

  // Aproxima mantendo parado o ponto da tela (sx, sy) — o cursor ou o meio dos dedos.
  const zoomAt = (sx: number, sy: number, factor: number) => setCam(c => {
    if (!c) return c;
    const k = clampK(c.k * factor, kMin.current), f = k / c.k;
    return { k, x: sx - (sx - c.x) * f, y: sy - (sy - c.y) * f };
  });
  const local = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onWheel = (e: WheelEvent) => { const p = local(e); zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015)); };
  // A roda rola a página por padrão; o React registra wheel como passivo, então o bloqueio vai direto no elemento.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const stop = (e: globalThis.WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', stop, { passive: false });
    return () => el.removeEventListener('wheel', stop);
  }, []);

  // Arrastar move o mapa; dois dedos aproximam. Um arraste não conta como clique no planeta embaixo.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; dist: number }>({ moved: false, dist: 0 });
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.current.set(e.pointerId, local(e));
    if (pointers.current.size === 1) gesture.current = { moved: false, dist: 0 };
    if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; gesture.current.dist = Math.hypot(a.x - b.x, a.y - b.y); }
  };
  const onPointerMove = (e: PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const p = local(e);
    if (!gesture.current.moved && Math.hypot(p.x - prev.x, p.y - prev.y) < 4) return;
    if (!gesture.current.moved) { gesture.current.moved = true; box.current!.setPointerCapture(e.pointerId); box.current!.classList.add('dragging'); }
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesture.current.dist > 0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, dist / gesture.current.dist);
      gesture.current.dist = dist;
      return;
    }
    setCam(c => (c ? { ...c, x: c.x + p.x - prev.x, y: c.y + p.y - prev.y } : c));
  };
  const onPointerUp = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) gesture.current.dist = 0;
    if (pointers.current.size > 0) return;
    box.current?.classList.remove('dragging');
    if (gesture.current.moved) {
      const stop = (ev: Event) => ev.stopPropagation();
      window.addEventListener('click', stop, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0);
    }
  };
  const zoomButton = (factor: number) => { const el = box.current; if (el) zoomAt(el.clientWidth / 2, el.clientHeight / 2, factor); };

  const c = cam ?? { x: 0, y: 0, k: 1 };
  const sx = (p: { x: number }) => p.x * c.k + c.x;
  const sy = (p: { y: number }) => p.y * c.k + c.y;
  // Tudo cresce na mesma proporção do mapa (planetas, Aurora e o anel, a base, as estrelas); só os nomes têm tamanho
  // fixo. Um piso evita que os ícones virem pontinhos com o mapa bem afastado.
  const px = (size: number, min: number) => Math.max(min, Math.round(size * c.k));
  const icon = px(44, 18);
  // Aurora e o anel seguem o zoom sem o piso dos planetas. O anel (meia largura 87 no mapa) cabe no espaço livre em
  // volta de Aurora (vizinhos a 135 ou mais, mapLayout.ts) e não encosta neles nem no zoom mínimo.
  const auroraSize = px(52, 12);
  const ringW = Math.round(auroraSize / RING_PLANET), ringH = Math.round(ringW * RING_ASPECT);
  const labels = c.k >= 0.8;   // abaixo disso os nomes (de tamanho fixo) começam a se encostar
  const sun = { x: 0, y: 0 };
  const layer = layerIndex(game);

  return (
    <div ref={box} className={`map-view ${labels ? '' : 'no-labels'}`} role="region" aria-label={t('Mapa estelar')}
      onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      {/* Fundo de estrelas com paralaxe: anda mais devagar que o mapa. */}
      <div className="map-bg" style={{ backgroundImage: `url(${artUrl('bg-stars-far')})`, backgroundPosition: `${c.x * 0.15}px ${c.y * 0.15}px` }} />
      {cam && (
        <>
          <svg className="map-lines" aria-hidden="true">
            {orbitsFor(total).map(o => (
              <ellipse key={o.rx} className="map-orbit" cx={sx(sun)} cy={sy(sun)} rx={o.rx * c.k} ry={o.ry * c.k} />
            ))}
          </svg>
          <svg className="map-lines routes" aria-hidden="true">
            {game.routes.map(r => {
              const ia = game.locations.findIndex(l => l.id === r.a), ib = game.locations.findIndex(l => l.id === r.b);
              if (ia < 0 || ib < 0) return null;
              const pa = nodePosition(ia), pb = nodePosition(ib);
              const good = routeInfo(game, game.locations[ia]).supplied || routeInfo(game, game.locations[ib]).supplied;
              return <line key={r.id} x1={sx(pa)} y1={sy(pa)} x2={sx(pb)} y2={sy(pb)} className={good ? 'route-good' : 'route-idle'} />;
            })}
          </svg>

          {dyson ? (
            // O Enxame de Dyson envolve a própria estrela: a arte de cada estágio já traz o sol dentro.
            <button className="map-node map-mega map-dyson" style={{ left: sx(sun), top: sy(sun) }} onClick={() => onMega?.('dyson')} title={dyson.title}>
              <Icon name={dyson.sprite} size={px(SUN_RADIUS * 1.75, 44)} />
            </button>
          ) : (
            <div className="map-sun" style={{ left: sx(sun), top: sy(sun) }} aria-hidden="true">
              <Icon name="star-orange" size={px(SUN_RADIUS * 1.5, 38)} />
            </div>
          )}
          {placed.map(p => (
            <button key={p.id} className="map-node map-mega" style={{ left: sx(p.pos), top: sy(p.pos) }} onClick={() => onMega?.(p.id)} title={p.title}>
              <Icon name={p.sprite} size={Math.round(icon * 1.1)} />
              <span className="map-label">{p.name}</span>
            </button>
          ))}
          <div className="map-home" style={{ left: sx(BASE_POS), top: sy(BASE_POS) }} title={t('Sua base')}>
            {/* A base acompanha a escavação: a arte da camada alcançada (a mesma da cena) e um pouco maior a cada uma. */}
            <Icon name={LAYERS[layer].sprite} size={Math.round(icon * (1.2 + 0.05 * layer))} /><span>{t('Base')}</span>
          </div>
          {aurora && ring && (
            // Anel orbital, metade de trás: fica atrás de Aurora e abre o megaprojeto. Clicar em Aurora abre a civilização.
            <button className="map-ring map-ring-back" style={{ left: sx(AURORA_POS), top: sy(AURORA_POS) }} title={ring.title} onClick={() => onMega?.('ring')}>
              <img src={spriteUrl(ring.sprite)} width={ringW} height={ringH} alt={ring.name} draggable={false}
                style={{ clipPath: `inset(0 0 ${(1 - RING_HOLE_Y) * 100}% 0)` }} />
            </button>
          )}
          {aurora && (
            <button className={`map-node map-aurora ${ring ? 'ringed' : ''}`} style={{ left: sx(AURORA_POS), top: sy(AURORA_POS) }}
              onClick={() => onAurora?.()} title={t('Aurora, o mundo dos colonos')}>
              <Icon name={CIV_PLANETS[Math.max(0, eraIndex(game) - 1)]} size={auroraSize} />
              <span className="map-label">{t('Aurora')}</span>
            </button>
          )}
          {aurora && ring && (
            <>
              {/* Metade da frente: passa por cima de Aurora; o nome vai embaixo do anel. */}
              <div className="map-ring map-ring-front" style={{ left: sx(AURORA_POS), top: sy(AURORA_POS) }} aria-hidden="true">
                <img src={spriteUrl(ring.sprite)} width={ringW} height={ringH} alt="" draggable={false}
                  style={{ clipPath: `inset(${RING_HOLE_Y * 100}% 0 0 0)` }} />
              </div>
              <span className="map-label map-aurora-label" style={{ left: sx(AURORA_POS), top: sy(AURORA_POS) + ringH * (1 - RING_HOLE_Y) }}>{t('Aurora')}</span>
            </>
          )}

          {game.locations.map((l, i) => {
            const p = nodePosition(i);
            const claim = l.claimedBy ? FACTION_BY_ID[l.claimedBy] : null;
            const crisis = crisisOf(game, l.id);
            const cls = ['map-node', crisis ? 'crisis' : '', l.outpost ? 'colony' : '', selected === l.id ? 'sel' : '', isDisputed(game, l) ? 'disputed' : '',
              (l.outpost?.terra ?? 0) > 0 ? 'terra' : '', (l.outpost?.terraRemaining ?? 0) > 0 ? 'working' : ''].join(' ');
            return (
              <button key={l.id} className={cls} style={{ left: sx(p), top: sy(p), ['--faction' as string]: claim?.color ?? 'transparent' }}
                onClick={() => { select(l.id); onPick?.(); }} title={`${l.name}${claim ? ` · ${t('reivindicado: {nome}', { nome: t(claim.name) })}` : ''}`}>
                {/* Os selos (nível, crise, sítio) ficam presos ao ícone, não à largura do nome. */}
                <span className="map-icon">
                  <Icon name={locationSprite(l, game.locations)} size={icon} />
                  {l.outpost && <span className="map-badge">{l.outpost.level}</span>}
                  {crisis && <span className="map-alert" aria-label={t('crise ativa')}>!</span>}
                  {digsUnlocked(game) && hasAnomaly(l) && !game.dug.includes(l.id) && (
                    <span className={`map-site ${(digOf(game, l.id)?.remaining ?? 0) > 0 ? 'working' : ''}`} title={t('Sítio de anomalia')} aria-label={t('Sítio de anomalia')}>✦</span>
                  )}
                </span>
                <span className="map-label">{l.name}</span>
              </button>
            );
          })}

          {game.expeditions.map((e, k) => {
            const p = nodePosition(game.locations.length + k);
            return (
              <div key={e.id} className="map-node pending" style={{ left: sx(p), top: sy(p) }}>
                <span className="map-q" style={{ width: icon * 0.86, height: icon * 0.86, fontSize: Math.max(9, icon * 0.36) }}>?</span>
                <span className="map-label">{fmtDuration(Math.max(0, e.remaining) / m.expeditionSpeed)}</span>
              </div>
            );
          })}
        </>
      )}

      <div className="map-zoom" onPointerDown={e => e.stopPropagation()}>
        <button className="btn small" onClick={() => zoomButton(1.3)} aria-label={t('Aproximar')}>+</button>
        <button className="btn small" onClick={() => zoomButton(1 / 1.3)} aria-label={t('Afastar')}>−</button>
        <button className="btn small" onClick={fit} aria-label={t('Ver o sistema inteiro')} title={t('Ver o sistema inteiro')}>⌂</button>
      </div>
      <div className="map-legend" onPointerDown={e => e.stopPropagation()}>
        <span><i className="lg colony" />{t('Colônia')}</span>
        <span><i className="lg free" />{t('Livre')}</span>
        <span><i className="lg claim" />{t('Reivindicado')}</span>
        <span><i className="lg garden" />{t('Terraformado')}</span>
        <span><i className="lg route" />{t('Rota')}</span>
        <span><i className="lg alert" />{t('Crise')}</span>
        {digsUnlocked(game) && <span><i className="lg site">✦</i>{t('Sítio de anomalia')}</span>}
      </div>
      {total === 0 && <p className="map-empty">{t('Nenhum local descoberto ainda. Lance uma expedição na aba Expansão.')}</p>}
      <small className="map-cap">{t('Arraste para mover · roda ou pinça para aproximar')}</small>
    </div>
  );
}
