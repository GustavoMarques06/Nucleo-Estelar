import { AnimatedSprite, Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import type { BuildingId, ResId } from '../game/types';
import { useGame } from '../game/store';
import { usePrefs } from '../prefs';
import { events, type GameEvent } from '../game/events';
import { RESOURCES } from '../game/data/resources';
import { BUILDING_BY_ID } from '../game/data/buildings';
import { fmt } from '../game/engine/format';
import { artUrl, spriteUrl } from '../assets';

import {
  BACKDROP, BUILDING_IDS_ART, BUILDING_SPRITE, BUILDING_TIERS, CIV_PLANETS, CIV_SHIP, CIV_SLOTS, COLONIST_FRAMES, CONSTRUCT_FRAMES, DISTRICT_ALT, DISTRICT_SPRITES, FLASH_FRAMES, ORBITALS, PLANET_GLOBE,
  GOLDEN_SPRITE, LOADER_SPRITE, LOADER_STOPS, OVERLAYS, ROCKCHIP_FRAMES, SLOTS, SMOKE_FRAMES, SPRITES, TEXT_STYLE, TRAFFIC_SHIPS, type Overlay,
  CONVEYORS, CRATERS_AT, DECOR, TOP_FACE, VEIN_FX, VEIN_FX_AT, slotLayout, type SlotPos,
} from './sceneConfig';
import { eraIndex } from '../game/engine/civilization';
import { LAYERS } from '../game/data/layers';
import { BALANCE } from '../game/data/balance';
import { activeVein, layerIndex } from '../game/engine/deposit';
import { locationSprite } from '../game/engine/expansion';
import { AURORA_POS, megaMapPos, nodePosition } from '../ui/mapLayout';
import { builtMegaSprite } from '../game/data/megaprojects';
import { t } from '../i18n';

const CRACK_SPRITE = 'crystal-cyan';

// Lugares do céu nas vistas de planeta (fração da cena): longe do planeta do meio, do asteroide no canto de
// cima à esquerda, dos botões de vista (em cima à direita) e do resumo (embaixo à esquerda).
// Arte do anel orbital: o centro do buraco fica a 45,6% da altura.
const RING_SPRITE = 'mega-ring-empty', RING_HOLE_Y = 0.456;
// Linha do meio da faixa do anel em volta de Aurora (anel com 2,6× o planeta), em unidades do diâmetro do planeta:
// entre o buraco (meia-largura 26,8%, meia-altura 19,1% da arte) e a borda de fora (50% e 45,6%).
const RING_TRACK_X = 1.0, RING_TRACK_Y = 0.44;

const SKY_SLOTS: [number, number][] = [[0.86, 0.27], [0.9, 0.72], [0.1, 0.5], [0.6, 0.1], [0.73, 0.9]];

/** Sprites pequenos (planetas, minérios) ficam nítidos; os grandes, reduzidos dos originais, ficam suaves. */
function prepTexture(t: Texture) {
  if (t.width >= 192) {
    // Sprites grandes são reduzidos na cena: mipmaps evitam o serrilhado/borrão da redução direta.
    t.source.scaleMode = 'linear';
    t.source.autoGenerateMipmaps = true;
    t.source.mipmapFilter = 'linear';
  } else t.source.scaleMode = 'nearest';
  return t;
}

interface Floater { node: Container; vy: number; life: number }
interface Ship { node: Sprite; vx: number; vy?: number }
/**
 * Ponto brilhante no asteroide: posição em frações da largura do asteroide, a partir do centro. `crack` = rachadura
 * de uma fissura (0, 1, 2), que se abre às vezes depois de um ponto brilhante e fica pouco tempo.
 */
interface Golden { node: Sprite; u: number; v: number; life: number; crack?: number }
/** Drone carregador voando entre duas indústrias (`t` de 0 a 1 no trecho atual). */
interface Loader { node: Sprite; from: BuildingId; to: BuildingId; t: number; speed: number }

export class GameScene {
  private app = new Application();
  private tex: Record<string, Texture> = {};
  private ready = false;
  private disposed = false;
  private time = 0;

  private backdrop!: Sprite;
  private stars = new Graphics();
  private world = new Container();
  private planet!: Sprite;
  private planet2!: Sprite;
  private moon!: Sprite;
  private dyson!: Sprite;
  private colonists: AnimatedSprite[] = [];
  private asteroid!: Sprite;
  private base = new Container();
  private buildingNodes: { id: BuildingId; idx: number; sprite: Sprite; badge?: Text }[] = [];
  private drones: Sprite[] = [];
  private smokes: { id: BuildingId; sprite: AnimatedSprite }[] = [];
  private fx = new Container();
  private overlays: { def: Overlay; sprite: AnimatedSprite }[] = [];
  private oneShots: { sprite: AnimatedSprite; life: number }[] = [];
  private trafficTimer = 4;
  private starClock = 0;
  private resizeObserver?: ResizeObserver;
  private hold: { x: number; y: number; t: number } | null = null;
  private starsDirty = true;
  private floaters: Floater[] = [];
  private ships: Ship[] = [];
  private starData: { x: number; y: number; s: number; p: number }[] = [];
  private squish = 0;
  private unsub?: () => void;
  private asteroidWidth = 300;
  private golden: Golden | null = null;
  private goldenTimer = 25;               // o primeiro aparece logo, para o jogador descobrir a mecânica
  private loaders: Loader[] = [];
  // Encaixe das estruturas na camada atual do asteroide (as plataformas mudam um pouco de lugar a cada camada).
  private layer = 0;
  private slots: Partial<Record<BuildingId, SlotPos[]>> = slotLayout(0);
  private decor: Sprite[] = [];
  private conveyors: Sprite[] = [];
  private veinFx!: Sprite;
  private craters: Sprite[] = [];
  private sparks!: Sprite;
  private puffs: { node: Sprite; life: number; total: number }[] = [];
  // Planeta dos colonos: uma segunda vista da cena, com a civilização separada da base de mineração.
  private view: 'base' | 'civ' | 'loc' | 'mega' = 'base';
  // Megaprojeto escolhido no mapa: a obra no meio da cena (o anel orbital vem com Aurora dentro dele).
  private megaView = new Container();
  private megaMain!: Sprite;
  private megaPlanet!: Sprite;
  private megaFront!: Sprite;     // anel orbital: a metade da frente, por cima de Aurora
  private megaKey = '';
  private megaWidth = 300;
  private civ = new Container();
  private civPlanet!: Sprite;
  private civPlanetName = CIV_PLANETS[0];
  private civNodes: { id: BuildingId; idx: number; sprite: Sprite }[] = [];
  private districts: Sprite[] = [];
  private orbitals: Sprite[] = [];
  private civShips: Sprite[] = [];
  private skyAsteroid!: Sprite;
  // Anel orbital construído: gigante em volta de Aurora (metade de trás atrás de tudo, a da frente sobre o planeta).
  private civRingBack!: Sprite;
  private civRingFront!: Sprite;
  private ringHalvesCache: { src: Texture; back: Texture; front: Texture } | null = null;
  // O mesmo anel em volta de Aurora no céu da base.
  // Retrato da base (asteroide com tudo o que foi construído), tirado ao sair da vista da base: é o asteroide que
  // aparece no céu das vistas de planeta, em vez da rocha sem construções.
  private baseSnap: Texture | null = null;
  private skyRingBack!: Sprite;
  private skyRingFront!: Sprite;
  private planetWidth = 300;
  // Planeta escolhido no mapa: terceira vista, só o planeta (e as naves da colônia, se houver uma).
  private locView = new Container();
  private locPlanet!: Sprite;
  private locSprite = '';
  private locShips: Sprite[] = [];
  private locSky!: Sprite;
  private locWidth = 300;
  private loading = new Set<string>();
  // Céu das vistas de planeta: o sol e os vizinhos mais próximos no mapa, cada um do lado em que fica.
  private sky = new Container();
  private skySprites: Sprite[] = [];
  private skyKey = '';
  private skyBodies: { name: string; slot: number; size: number; sun: boolean }[] = [];

  async init(host: HTMLElement) {
    await this.app.init({
      resizeTo: host, backgroundAlpha: 0, antialias: false,
      autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    if (this.disposed) { this.app.destroy(true); return; }
    host.appendChild(this.app.canvas);
    // O Pixi só reage ao redimensionar a janela; aqui o espaço da cena também muda quando uma dica ou painel some/aparece.
    this.resizeObserver = new ResizeObserver(() => { if (this.ready) this.app.resize(); });
    this.resizeObserver.observe(host);

    const loaded = await Assets.load([...SPRITES.map(spriteUrl), artUrl(BACKDROP)]);
    if (this.disposed) { this.app.destroy(true); return; }
    for (const name of SPRITES) this.tex[name] = prepTexture(loaded[spriteUrl(name)] as Texture);
    this.tex[BACKDROP] = loaded[artUrl(BACKDROP)] as Texture;
    await Promise.all([document.fonts?.load('22px "VT323"'), document.fonts?.load('22px "Mul"', '×')]).catch(() => undefined);
    if (this.disposed) { this.app.destroy(true); return; }

    this.build();
    this.layout();
    this.app.renderer.on('resize', () => { this.layout(); this.starsDirty = true; });
    // Jogo idle: 30 quadros por segundo bastam e gastam metade da CPU/GPU e da bateria.
    this.app.ticker.maxFPS = 30;
    this.app.ticker.add(t => this.update(t.deltaMS / 1000));
    this.unsub = events.on(e => this.onEvent(e));
    this.ready = true;
  }

  destroy() {
    this.disposed = true;
    this.unsub?.();
    this.resizeObserver?.disconnect();
    if (this.ready) this.app.destroy(true, { children: true });
  }

  private build() {
    const stage = this.app.stage;
    for (let i = 0; i < 160; i++) this.starData.push({ x: Math.random(), y: Math.random(), s: Math.random() < 0.15 ? 3 : 2, p: Math.random() * 10 });
    this.backdrop = new Sprite(this.tex[BACKDROP]);
    this.backdrop.alpha = 0.5;
    stage.addChild(this.backdrop, this.stars);

    this.planet = new Sprite(this.tex['planet-habitable']);
    this.planet.anchor.set(0.5);
    // O planeta no céu da base é o mundo dos colonos: clicar nele leva até lá.
    this.planet.eventMode = 'static';
    this.planet.cursor = 'pointer';
    this.planet.on('pointertap', () => useGame.getState().setSceneView('civ'));
    this.planet2 = new Sprite(this.tex['planet-ringed']);
    this.planet2.anchor.set(0.5);
    this.planet2.alpha = 0.9;
    this.moon = new Sprite(this.tex['moon-grey']);
    this.moon.anchor.set(0.5);
    this.dyson = new Sprite(this.tex['mega-dyson-1']);
    this.dyson.anchor.set(0.5);
    this.dyson.visible = false;
    stage.addChild(this.dyson, this.planet2, this.planet, this.moon, this.world, this.sky, this.civ, this.locView, this.megaView);
    // Anel orbital em volta de Aurora no céu: a metade de trás logo atrás do planeta, a da frente logo à frente dele
    // (e ainda atrás do asteroide). Não recebem clique: o toque no planeta continua levando a Aurora.
    this.skyRingBack = new Sprite(Texture.EMPTY);
    this.skyRingFront = new Sprite(Texture.EMPTY);
    this.skyRingBack.anchor.set(0.5, 1);
    this.skyRingFront.anchor.set(0.5, 0);
    this.skyRingBack.tint = 0x8f98b0;
    this.skyRingFront.tint = 0xbcc4d6;
    for (const r of [this.skyRingBack, this.skyRingFront]) { r.eventMode = 'none'; r.visible = false; }
    stage.addChildAt(this.skyRingBack, stage.getChildIndex(this.planet));
    stage.addChildAt(this.skyRingFront, stage.getChildIndex(this.planet) + 1);
    this.buildCiv();
    this.buildLoc();
    this.buildSky();
    this.buildMega();

    this.asteroid = new Sprite(this.tex[LAYERS[0].sprite]);
    this.asteroid.anchor.set(0.5);
    this.asteroid.eventMode = 'static';
    this.asteroid.cursor = 'pointer';
    // Segurar o dedo/botão no asteroide repete a extração.
    this.asteroid.on('pointerdown', e => { this.hold = { x: e.global.x, y: e.global.y, t: 0.18 }; });
    const release = () => { this.hold = null; };
    this.asteroid.on('pointerup', release);
    this.asteroid.on('pointerupoutside', release);
    this.asteroid.on('pointerleave', release);
    this.asteroid.on('pointertap', e => {
      this.squish = 1;
      useGame.getState().mine(e.global.x, e.global.y);
    });
    this.base.sortableChildren = true;
    this.world.addChild(this.asteroid, this.base, this.fx);

    for (const id of Object.keys(SLOTS) as BuildingId[]) {
      SLOTS[id]!.at.forEach((_, idx) => {
        const sprite = new Sprite(this.tex[BUILDING_SPRITE[id]]);
        sprite.anchor.set(0.5, 0.9);
        sprite.visible = false;
        sprite.eventMode = 'none';
        this.base.addChild(sprite);
        let badge: Text | undefined;
        if (idx === 0) {
          badge = new Text({ text: '', style: { ...TEXT_STYLE, fontSize: 18, fill: 0xffb347 } });
          badge.anchor.set(0.5, 0);
          badge.visible = false;
          this.base.addChild(badge);
        }
        this.buildingNodes.push({ id, idx, sprite, badge });
      });
    }

    // Turno de trabalho na base: alguns mineradores e engenheiros (a população mora no planeta dos colonos).
    for (let i = 0; i < 6; i++) {
      const frames = i % 3 === 0 ? COLONIST_FRAMES : [i % 2 ? 'colonist-miner' : 'colonist-engineer'];
      const c = new AnimatedSprite(frames.map(n => this.tex[n]));
      c.anchor.set(0.5, 1);
      c.animationSpeed = 0.06;
      c.visible = false;
      c.eventMode = 'none';
      c.play();
      this.colonists.push(c);
      this.base.addChild(c);
    }

    // Fumaça animada nas chaminés das indústrias em operação.
    for (const id of ['refinery', 'factory'] as const) {
      const s = new AnimatedSprite(SMOKE_FRAMES.map(n => this.tex[n]));
      s.anchor.set(0.5, 1);
      s.animationSpeed = 0.1;
      s.alpha = 0.85;
      s.visible = false;
      s.eventMode = 'none';
      s.play();
      this.smokes.push({ id, sprite: s });
      this.base.addChild(s);
    }

    // Animações sobre as estruturas em operação (britador, forjas, reatores, chaminés).
    for (const def of OVERLAYS) {
      const s = new AnimatedSprite(Array.from({ length: def.frames }, (_, i) => this.tex[`${def.prefix}-${i + 1}`]));
      s.anchor.set(...(def.anchor ?? [0.5, 0.9]));
      s.animationSpeed = def.speed;
      s.visible = false;
      s.eventMode = 'none';
      s.play();
      this.overlays.push({ def, sprite: s });
      this.base.addChild(s);
    }

    // Infraestrutura, esteiras, veio em foco, crateras e fagulhas: aparecem conforme a base cresce.
    const piece = (name: string, anchor: [number, number] = [0.5, 0.85]) => {
      const sp = new Sprite(this.tex[name]);
      sp.anchor.set(...anchor);
      sp.visible = false;
      sp.eventMode = 'none';
      this.base.addChild(sp);
      return sp;
    };
    this.decor = DECOR.map(d => piece(d.sprite));
    this.conveyors = CONVEYORS.map(() => piece('base-conveyor', [0.5, 0.5]));
    this.veinFx = piece('fx-vein-iron', [0.5, 0.5]);
    this.craters = CRATERS_AT.map(() => piece('fx-crater', [0.5, 0.5]));
    this.sparks = piece('fx-sparks', [0.5, 1]);

    for (let i = 0; i < 6; i++) {
      const d = new Sprite(this.tex['drone-mining']);
      d.anchor.set(0.5);
      d.visible = false;
      this.drones.push(d);
      this.world.addChild(d);
    }
  }

  private layout() {
    const { width: W, height: H } = this.app.screen;
    // Fundo de nebulosa cobrindo a cena, com folga para o deslizamento lento.
    const cover = Math.max((W * 1.15) / this.backdrop.texture.width, (H * 1.15) / this.backdrop.texture.height);
    this.backdrop.scale.set(cover);
    const A = Math.min(W * 0.66, H * 0.95);
    this.asteroidWidth = A;
    this.asteroid.position.set(W * 0.5, H * 0.55);
    this.asteroid.scale.set(A / this.asteroid.texture.width);

    const pSize = Math.min(W, H) * 0.55;
    this.planet.position.set(W * 0.92, H * 0.12);
    this.planet.scale.set(pSize / this.planet.texture.width);
    this.planet2.position.set(W * 0.12, H * 0.16);
    this.planet2.scale.set((pSize * 0.45) / this.planet2.texture.width);
    this.moon.position.set(W * 0.7, H * 0.08);
    this.moon.scale.set((pSize * 0.12) / this.moon.texture.width);

    for (const n of this.buildingNodes) {
      const { at: [u, v], size } = this.slot(n.id, n.idx);
      const x = this.asteroid.x + u * A, y = this.asteroid.y + v * A;
      n.sprite.position.set(x, y);
      n.sprite.zIndex = y;
      n.sprite.scale.set((size * A) / n.sprite.texture.width);
      if (n.badge) { n.badge.position.set(x, y + 2); n.badge.zIndex = 10_000; n.badge.style.fontSize = Math.max(16, A * 0.06); }
    }
    for (const o of this.overlays) {
      const [u, v] = this.slot(o.def.id).at;
      o.sprite.position.set(this.asteroid.x + (u + o.def.dx) * A, this.asteroid.y + (v + o.def.dy) * A);
      o.sprite.zIndex = this.asteroid.y + (v + o.def.dy) * A + 1;
      o.sprite.scale.set((A * o.def.size) / o.sprite.texture.width);
    }
    for (const d of this.drones) d.scale.set((A * 0.12) / d.texture.width);
    for (const c of this.colonists) c.scale.set((A * 0.062) / c.texture.height);     // todos da mesma altura
    this.layoutCiv();
    this.layoutLoc();
    this.megaKey = '';   // refaz o tamanho da obra na próxima atualização
    // O Enxame de Dyson envolve a estrela do sistema: maior que Aurora, meio para fora da borda esquerda (o outro lado
    // do céu) e atrás de tudo, como algo enorme e distante.
    this.dyson.position.set(W * 0.03, H * 0.42);
    this.dyson.scale.set((pSize * 1.15) / this.dyson.texture.width);
    for (const s of this.smokes) {
      const { at: [u, v], size } = this.slot(s.id);
      s.sprite.position.set(this.asteroid.x + (u + 0.02) * A, this.asteroid.y + (v - size * 0.72) * A);
      s.sprite.zIndex = 9_000;
      s.sprite.scale.set((A * 0.11) / s.sprite.texture.width);      // o quadro é mais largo que o puff de fumaça
    }
    this.layoutBaseDecor();
  }

  /** Peças fixas da base (infraestrutura, veio em foco, crateras): posição e escala. */
  private layoutBaseDecor() {
    const A = this.asteroidWidth;
    const put = (sp: Sprite, [u, v]: [number, number], size: number) => {
      sp.position.set(this.asteroid.x + u * A, this.asteroid.y + v * A);
      sp.scale.set((size * A) / sp.texture.width);
      sp.zIndex = sp.y - 1;
    };
    DECOR.forEach((d, i) => put(this.decor[i], d.at, d.size));
    put(this.veinFx, VEIN_FX_AT, 0.12);
    this.craters.forEach((c, i) => put(c, CRATERS_AT[i], 0.1));
    CONVEYORS.forEach(([a, b], i) => {
      const [ua, va] = this.slot(a).at, [ub, vb] = this.slot(b).at;
      const c = this.conveyors[i];
      // A esteira desenhada sobe para a direita; no outro sentido, espelha.
      const k = (Math.hypot((ub - ua) * A, (vb - va) * A) * 0.55) / c.texture.width;
      c.position.set(this.asteroid.x + ((ua + ub) / 2) * A, this.asteroid.y + ((va + vb) / 2) * A);
      c.scale.set((ub - ua) * (vb - va) < 0 ? k : -k, k);
      c.zIndex = c.y - 30;
    });
  }

  /** Posição e tamanho de uma unidade de estrutura na camada atual. */
  private slot(id: BuildingId, idx = 0): SlotPos { return this.slots[id]![idx]; }

  private update(dt: number) {
    const { game, report } = useGame.getState();
    const reduce = game.settings.reduceMotion;
    this.time += dt;
    const t = this.time;
    const { width: W, height: H } = this.app.screen;

    // Nebulosa ao fundo (desliza devagar)
    this.backdrop.position.set(-(this.backdrop.width - W) / 2 + (reduce ? 0 : Math.sin(t * 0.05) * (this.backdrop.width - W) * 0.4), -(this.backdrop.height - H) / 2);

    // Estrelas: o cintilar é lento, então redesenha só ~8 vezes por segundo (redesenhar 160 retângulos por quadro é caro).
    this.starClock -= dt;
    if (this.starClock <= 0 || this.starsDirty) {
      this.starClock = reduce ? 1 : 0.12;
      this.starsDirty = false;
      const g = this.stars.clear();
      for (const s of this.starData) {
        const tw = reduce ? 1 : 0.55 + 0.45 * Math.sin(t * 1.5 + s.p);
        g.rect(Math.floor(s.x * W), Math.floor(s.y * H), s.s, s.s).fill({ color: s.s > 2 ? 0xc9b6ff : 0xdfe7ff, alpha: tw });
      }
    }

    // Vista: o asteroide (mineração) ou o planeta dos colonos.
    const view = useGame.getState().sceneView;
    if (view !== this.view) {
      if (this.view === 'base') this.snapBase();
      this.view = view;
      const base = view === 'base';
      this.world.visible = this.planet.visible = this.planet2.visible = this.moon.visible = base;
      this.skyRingBack.visible = this.skyRingFront.visible = false;   // a vista da base volta a mostrá-lo abaixo
      this.civ.visible = view === 'civ';
      this.sky.visible = !base;
      this.locView.visible = view === 'loc';
      this.megaView.visible = view === 'mega';
      this.hold = null;
    }
    if (this.view === 'civ') { this.dyson.visible = false; this.updateCiv(); this.updateSky(AURORA_POS, null, this.planetWidth); return; }
    if (this.view === 'loc') { this.dyson.visible = false; this.updateLoc(); return; }
    if (this.view === 'mega') { this.dyson.visible = false; this.updateMega(); return; }
    // O planeta do céu acompanha o crescimento da civilização.
    const skyTex = this.tex[CIV_PLANETS[Math.max(0, eraIndex(game) - 1)]];
    if (this.planet.texture !== skyTex) { this.planet.texture = skyTex; this.layout(); }
    // Anel orbital construído: em volta do planeta do céu, 1,9× o globo (menor que na vista de Aurora, para não
    // invadir o asteroide).
    const skyRing = (game.megaprojects.ring ?? 0) > 0 ? this.tex[RING_SPRITE] : undefined;
    if ((game.megaprojects.ring ?? 0) > 0 && !skyRing) this.loadTexture(RING_SPRITE);
    this.skyRingBack.visible = this.skyRingFront.visible = !!skyRing;
    if (skyRing) {
      const { back, front } = this.ringHalves(skyRing);
      if (this.skyRingBack.texture !== back) { this.skyRingBack.texture = back; this.skyRingFront.texture = front; }
      const globe = this.planet.width * (PLANET_GLOBE[CIV_PLANETS[Math.max(0, eraIndex(game) - 1)]] ?? 1);
      const s = (globe * 1.9) / skyRing.width;
      for (const r of [this.skyRingBack, this.skyRingFront]) { r.scale.set(s); r.position.set(this.planet.x, this.planet.y); }
    }

    if (this.hold) {
      this.hold.t -= dt;
      if (this.hold.t <= 0) { this.hold.t = 0.18; this.squish = Math.max(this.squish, 0.6); useGame.getState().mine(this.hold.x, this.hold.y); }
    }

    // Asteroide: flutuação leve e “amassado” ao clicar
    const bob = reduce ? 0 : Math.sin(t * 0.8) * this.asteroidWidth * 0.008;
    this.world.y = bob;
    // Aparência do asteroide conforme a camada alcançada
    const layer = layerIndex(game);
    const tierTex = this.tex[LAYERS[layer].sprite];
    if (this.asteroid.texture !== tierTex) this.asteroid.texture = tierTex;
    if (layer !== this.layer) { this.layer = layer; this.slots = slotLayout(layer); this.layout(); }
    const baseScale0 = this.asteroidWidth / this.asteroid.texture.width;
    // O clique amassa o asteroide e tudo que está em cima dele (estruturas, colonos, animações): mesmo centro, mesma escala.
    this.base.pivot.set(this.asteroid.x, this.asteroid.y);
    this.base.position.set(this.asteroid.x, this.asteroid.y);
    if (this.squish > 0) {
      this.squish = Math.max(0, this.squish - dt * 6);
      const k = 1 - Math.sin(this.squish * Math.PI) * 0.04;
      this.asteroid.scale.set(baseScale0 * (2 - k), baseScale0 * k);
      this.base.scale.set(2 - k, k);
    } else {
      this.asteroid.scale.set(baseScale0);
      this.base.scale.set(1);
    }
    if (!reduce) {
      this.planet.rotation = Math.sin(t * 0.05) * 0.02;
      // Lua em órbita lenta ao redor do planeta
      const ang = t * 0.12;
      const r = this.planet.width * 0.62;
      this.moon.position.set(this.planet.x + Math.cos(ang) * r, this.planet.y + Math.sin(ang) * r * 0.35);
      // Atrás do planeta na metade superior da órbita. setChildIndex remove antes de inserir,
      // então o índice atual do planeta serve para os dois lados.
      const moonBehind = Math.sin(ang) < 0;
      const stage = this.app.stage;
      if (moonBehind !== stage.getChildIndex(this.moon) < stage.getChildIndex(this.planet)) {
        stage.setChildIndex(this.moon, stage.getChildIndex(this.planet));
      }
    }

    // Estruturas visíveis conforme a quantidade e animadas conforme o status
    for (const n of this.buildingNodes) {
      const count = game.buildings[n.id];
      const visible = count >= SLOTS[n.id]!.thresholds[n.idx];
      n.sprite.visible = visible;
      const labels = usePrefs.getState().sceneLabels;
      if (n.badge) { n.badge.visible = labels && count > 1; if (count > 1) n.badge.text = `×${count}`; }   // contadores: opcionais (ruído visual); ×1 nunca aparece
      if (!visible) continue;
      const st = report?.status[n.id];
      const working = st?.kind === 'ok';
      const tierDef = BUILDING_IDS_ART.includes(n.id) ? BUILDING_TIERS.find(x => count >= x.min) : undefined;
      const want = this.tex[tierDef ? `${BUILDING_SPRITE[n.id]}${tierDef.suffix}` : BUILDING_SPRITE[n.id]];
      if (n.sprite.texture !== want) n.sprite.texture = want;
      const baseScale = (this.slot(n.id, n.idx).size * (tierDef?.scale ?? 1) * this.asteroidWidth) / n.sprite.texture.width;
      const pulse = working && !reduce ? 1 + Math.sin(t * 5 + n.idx * 1.7) * 0.02 : 1;
      n.sprite.scale.set(baseScale, baseScale * pulse);
      n.sprite.tint = st?.kind === 'power' ? ((t * 2) % 1 < 0.5 ? 0x7a80a8 : 0x9aa0c8) : 0xffffff;
    }

    this.updateBaseDecor(t, reduce);

    // Megaprojeto no céu: o Enxame de Dyson aparece conforme os estágios.
    const dysonStage = game.megaprojects.dyson ?? 0;
    this.dyson.visible = dysonStage > 0;
    // O Dyson ocupa aquele lado do céu: o planeta gasoso decorativo sai para não ficar na frente dele.
    this.planet2.visible = dysonStage === 0;
    if (dysonStage > 0) {
      const tex = this.tex[`mega-dyson-${Math.min(4, dysonStage)}`];
      if (this.dyson.texture !== tex) { this.dyson.texture = tex; this.layout(); }
      if (!reduce) this.dyson.rotation = t * 0.02;
    }

    // A multidão cresce com a população, em escala logarítmica: 10 pessoas = 2 colonos, 1 mil = 10, 1 milhão = 23.
    const colonistCount = Math.min(this.colonists.length, Math.ceil(1.2 * Math.log(1 + game.resources.population / 4)));
    this.colonists.forEach((c, i) => {
      c.visible = i < colonistCount && !reduce;
      if (!c.visible) return;
      const phase = t * 0.12 + i * 1.9;
      const A = this.asteroidWidth;
      const step = i % 3 === 0 ? 0 : Math.abs(Math.sin(t * 5 + i)) * A * 0.004;      // quem não tem quadros de caminhada balança a cada passo
      c.position.set(this.asteroid.x + Math.sin(phase) * A * (0.1 + (i % 4) * 0.04), this.asteroid.y + (-0.14 + (i % 5) * 0.05) * A - step);
      c.scale.x = Math.abs(c.scale.x) * (Math.cos(phase) >= 0 ? 1 : -1);
      c.zIndex = c.y;
    });

    for (const o of this.overlays) {
      const count = game.buildings[o.def.id];
      o.sprite.visible = !reduce && count >= SLOTS[o.def.id]!.thresholds[0] && report?.status[o.def.id]?.kind === 'ok';
    }

    // Tráfego: com rotas abertas, cargueiros cruzam o céu de tempos em tempos (mais rotas, mais tráfego).
    this.trafficTimer -= dt;
    if (this.trafficTimer <= 0) {
      const routes = game.routes.length;
      this.trafficTimer = routes > 0 ? Math.max(3, 16 - routes * 1.2) * (0.7 + Math.random() * 0.6) : 12;
      if (routes > 0 && !reduce && this.ships.length < 5) this.spawnTraffic();
    }
    for (let i = this.oneShots.length - 1; i >= 0; i--) {
      const o = this.oneShots[i];
      o.life -= dt;
      if (o.life <= 0) { o.sprite.destroy(); this.oneShots.splice(i, 1); }
    }

    for (const s of this.smokes) {
      const running = !reduce && game.buildings[s.id] > 0 && report?.status[s.id]?.kind === 'ok';
      s.sprite.visible = running;
    }

    // Drones orbitando o asteroide
    const droneCount = Math.min(6, Math.ceil(game.buildings.miner / 2));
    this.drones.forEach((d, i) => {
      d.visible = i < droneCount;
      if (!d.visible) return;
      const speed = report?.status.miner?.kind === 'ok' ? 0.5 : 0.15;
      const ang = (reduce ? 0 : t * speed) + (i / Math.max(1, droneCount)) * Math.PI * 2;
      const rx = this.asteroidWidth * 0.62, ry = this.asteroidWidth * 0.2;
      d.position.set(this.asteroid.x + Math.cos(ang) * rx, this.asteroid.y - this.asteroidWidth * 0.08 + Math.sin(ang) * ry);
      const dir = -Math.sin(ang) >= 0 ? 1 : -1;
      d.scale.x = Math.abs(d.scale.x) * dir;
      // Atrás do asteroide na metade superior da órbita
      const behind = Math.sin(ang) < 0;
      if (behind && d.parent === this.world && this.world.getChildIndex(d) > this.world.getChildIndex(this.asteroid)) {
        this.world.setChildIndex(d, 0);
      } else if (!behind && this.world.getChildIndex(d) < this.world.getChildIndex(this.asteroid)) {
        this.world.setChildIndex(d, this.world.children.length - 1);
      }
    });

    this.updateGolden(dt, game.stats.totalMined, reduce);
    this.updateLoaders(dt, reduce);

    // Textos flutuantes
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      f.node.y += f.vy * dt;
      f.node.alpha = Math.min(1, f.life * 2);
      if (f.life <= 0) { f.node.destroy({ children: true }); this.floaters.splice(i, 1); }
    }

    // Naves de carga
    for (let i = this.ships.length - 1; i >= 0; i--) {
      const s = this.ships[i];
      s.node.x += s.vx * dt;
      s.node.y += (s.vy ?? 0) * dt;
      if (s.node.x > W + 200 || s.node.y < -200) { s.node.destroy(); this.ships.splice(i, 1); }
    }
  }

  /** Infraestrutura conforme o que existe, o veio em foco na encosta, crateras dos veios esgotados e fagulhas da fábrica. */
  private updateBaseDecor(t: number, reduce: boolean) {
    const { game, report } = useGame.getState();
    DECOR.forEach((d, i) => { this.decor[i].visible = d.when(game, this.layer); });
    CONVEYORS.forEach(([a, b], i) => { this.conveyors[i].visible = game.buildings[a] > 0 && game.buildings[b] > 0; });
    const vein = activeVein(game);
    // O minério que dá a cara do veio: o de maior fração, com o ferro (presente em quase todos) valendo a metade.
    const main = vein ? (Object.entries(vein.mix) as [string, number][]).filter(([r]) => VEIN_FX[r])
      .sort((x, y) => y[1] * (y[0] === 'iron' ? 0.5 : 1) - x[1] * (x[0] === 'iron' ? 0.5 : 1))[0]?.[0] : undefined;
    this.veinFx.visible = !!main;
    if (main) {
      const tex = this.tex[VEIN_FX[main]!];
      if (this.veinFx.texture !== tex) { this.veinFx.texture = tex; this.layoutBaseDecor(); }
      this.veinFx.alpha = reduce ? 1 : 0.85 + Math.sin(t * 3) * 0.15;
    }
    const spent = game.deposit.veins.filter(v => v.reserve <= 0).length;
    this.craters.forEach((c, i) => { c.visible = i < Math.min(spent, this.craters.length); });
    // Fagulhas em cima da fábrica em operação, piscando.
    const factory = game.buildings.factory > 0 && report?.status.factory?.kind === 'ok' && !reduce;
    this.sparks.visible = factory && Math.sin(t * 7) > -0.2;
    if (this.sparks.visible) {
      const { at: [u, v], size } = this.slot('factory');
      const A = this.asteroidWidth;
      this.sparks.position.set(this.asteroid.x + u * A, this.asteroid.y + (v - size * 0.45) * A);
      this.sparks.scale.set((A * 0.07) / this.sparks.texture.width);
      this.sparks.zIndex = this.sparks.y + 500;
    }
    // Nuvens de poeira dos cliques: somem sozinhas.
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.life -= 1 / 30;
      p.node.alpha = Math.max(0, p.life / p.total);
      p.node.y -= this.asteroidWidth * 0.0015;
      if (p.life <= 0) { p.node.destroy(); this.puffs.splice(i, 1); }
    }
  }

  /** Poeira (clique) ou rachadura (ponto brilhante) que aparece e some num ponto da rocha. */
  private puff(name: 'fx-dust' | 'fx-crack', x: number, y: number) {
    if (useGame.getState().game.settings.reduceMotion || this.puffs.length > 8) return;
    const node = new Sprite(this.tex[name]);
    node.anchor.set(0.5, name === 'fx-dust' ? 0.8 : 0.5);
    node.eventMode = 'none';
    node.position.set(x, y - this.world.y);
    node.scale.set((this.asteroidWidth * (name === 'fx-dust' ? 0.09 : 0.08)) / node.texture.width);
    node.zIndex = 20_000;
    this.base.addChild(node);
    this.puffs.push({ node, life: name === 'fx-dust' ? 0.6 : 1.2, total: name === 'fx-dust' ? 0.6 : 1.2 });
  }

  // ---------- Planeta dos colonos ----------
  private buildCiv() {
    this.civ.visible = false;
    this.civ.sortableChildren = true;
    this.civPlanet = new Sprite(this.tex[CIV_PLANETS[0]]);
    this.civPlanet.anchor.set(0.5);
    this.civPlanet.zIndex = 0;
    // Anel: a metade de trás fica atrás até dos distritos de trás; a da frente, sobre o planeta mas abaixo das
    // construções (zIndex 1 + v), que continuam à vista.
    this.civRingBack = new Sprite(Texture.EMPTY);
    this.civRingFront = new Sprite(Texture.EMPTY);
    this.civRingBack.anchor.set(0.5, 1);
    this.civRingFront.anchor.set(0.5, 0);
    this.civRingBack.zIndex = -30;
    this.civRingFront.zIndex = 0.4;
    for (const r of [this.civRingBack, this.civRingFront]) { r.eventMode = 'none'; r.visible = false; }
    // Mais escuro atrás (longe) e um pouco menos na frente: o anel é fundo, os distritos e construções ficam em destaque.
    this.civRingBack.tint = 0x8f98b0;
    this.civRingFront.tint = 0xbcc4d6;
    this.civ.addChild(this.civRingBack, this.civRingFront);
    this.civ.addChild(this.civPlanet);
    for (const id of Object.keys(CIV_SLOTS) as BuildingId[]) {
      CIV_SLOTS[id]!.at.forEach((_, idx) => {
        const sprite = new Sprite(this.tex[BUILDING_SPRITE[id]]);
        sprite.anchor.set(0.5, 0.9);
        sprite.visible = false;
        sprite.eventMode = 'none';
        this.civ.addChild(sprite);
        this.civNodes.push({ id, idx, sprite });
      });
    }
    // Distritos: pedaços de cidade flutuando em volta do planeta; os mais antigos guardam a cara das eras passadas.
    for (let i = 0; i < 10; i++) {
      const d = new Sprite(this.tex[DISTRICT_SPRITES[0]]);
      d.anchor.set(0.5);
      d.visible = false;
      d.eventMode = 'none';
      this.districts.push(d);
      this.civ.addChild(d);
    }
    for (const o of ORBITALS) {
      const sp = new Sprite(this.tex[o.sprite]);
      sp.anchor.set(0.5, o.sprite === 'orbit-elevator' ? 1 : 0.5);    // o elevador sobe a partir da superfície
      sp.visible = false;
      sp.eventMode = 'none';
      sp.zIndex = o.at[1] < 0 ? -2 : 12;
      this.orbitals.push(sp);
      this.civ.addChild(sp);
    }
    for (let i = 0; i < 6; i++) {
      const sh = new Sprite(this.tex[CIV_SHIP]);
      sh.anchor.set(0.5);
      sh.visible = false;
      sh.eventMode = 'none';
      this.civShips.push(sh);
      this.civ.addChild(sh);
    }
    // O asteroide no céu do planeta: clicar volta para a base.
    this.skyAsteroid = new Sprite(this.tex['asteroid-main-big']);
    this.skyAsteroid.anchor.set(0.5);
    this.skyAsteroid.eventMode = 'static';
    this.skyAsteroid.cursor = 'pointer';
    this.skyAsteroid.zIndex = 20;
    this.skyAsteroid.on('pointertap', () => useGame.getState().setSceneView('base'));
    this.civ.addChild(this.skyAsteroid);
  }

  private layoutCiv() {
    const { width: W, height: H } = this.app.screen;
    const P = Math.min(W * 0.5, H * 0.74);
    this.planetWidth = P;
    this.civPlanet.position.set(W * 0.5, H * 0.54);
    // O diâmetro do globo fica igual em todas as fases (as com anel têm imagem mais larga).
    this.civPlanet.scale.set(P / (this.civPlanet.texture.width * (PLANET_GLOBE[this.civPlanetName] ?? 1)));
    this.skyAsteroid.position.set(W * 0.1, H * 0.16);
    this.skyAsteroid.scale.set((P * 0.28) / this.skyAsteroid.texture.width);
  }

  private updateCiv() {
    const { game } = useGame.getState();
    const reduce = game.settings.reduceMotion;
    const t = this.time;
    const P = this.planetWidth;
    const era = eraIndex(game);
    const planetName = CIV_PLANETS[Math.max(0, era - 1)];
    if (planetName !== this.civPlanetName) { this.civPlanetName = planetName; this.civPlanet.texture = this.tex[planetName]; this.layoutCiv(); }
    const cx = this.civPlanet.x, cy = this.civPlanet.y + (reduce ? 0 : Math.sin(t * 0.6) * P * 0.006);
    if (!reduce) this.skyAsteroid.rotation = Math.sin(t * 0.3) * 0.08;
    if (!this.baseSnap) this.snapBase();   // a vista pode abrir sem passar pela base (ex.: direto pelo mapa)
    const rockTex = this.baseSnap ?? this.tex[LAYERS[layerIndex(game)].sprite];
    if (this.skyAsteroid.texture !== rockTex) { this.skyAsteroid.texture = rockTex; this.layoutCiv(); }

    // Anel orbital: 2,6× o diâmetro do planeta, para parecer uma obra gigantesca (passa das bordas da cena).
    const ringTex = (game.megaprojects.ring ?? 0) > 0 ? this.tex[RING_SPRITE] : undefined;
    if ((game.megaprojects.ring ?? 0) > 0 && !ringTex) this.loadTexture(RING_SPRITE);
    this.civRingBack.visible = this.civRingFront.visible = !!ringTex;
    if (ringTex) {
      const { back, front } = this.ringHalves(ringTex);
      if (this.civRingBack.texture !== back) { this.civRingBack.texture = back; this.civRingFront.texture = front; }
      const s = (P * 2.6) / ringTex.width;
      this.civRingBack.scale.set(s);
      this.civRingFront.scale.set(s);
      this.civRingBack.position.set(this.civPlanet.x, this.civPlanet.y);
      this.civRingFront.position.set(this.civPlanet.x, this.civPlanet.y);
    }

    // Estruturas da civilização sobre o planeta, com as versões maiores conforme a quantidade.
    for (const n of this.civNodes) {
      const slot = CIV_SLOTS[n.id]!;
      const count = game.buildings[n.id];
      n.sprite.visible = count >= slot.thresholds[n.idx];
      if (!n.sprite.visible) continue;
      const tierDef = BUILDING_IDS_ART.includes(n.id) ? BUILDING_TIERS.find(x => count >= x.min) : undefined;
      const want = this.tex[tierDef ? `${BUILDING_SPRITE[n.id]}${tierDef.suffix}` : BUILDING_SPRITE[n.id]];
      if (n.sprite.texture !== want) n.sprite.texture = want;
      const [u, v] = slot.at[n.idx];
      n.sprite.position.set(cx + u * P, cy + v * P);
      n.sprite.scale.set((slot.size * (tierDef?.scale ?? 1) * P) / n.sprite.texture.width);
      n.sprite.zIndex = 1 + v;
    }

    // A quantidade de distritos cresce com a população (escala logarítmica): 10 pessoas = 2, mil = 5, um milhão = 10.
    const pop = game.resources.population;
    const shown = pop < 1 ? 0 : Math.min(this.districts.length, 1 + Math.floor(Math.log10(1 + pop) * 1.5));
    this.districts.forEach((d, i) => {
      d.visible = i < shown;
      if (!d.visible) return;
      const e = Math.max(1, era - Math.floor(i / 2));
      const name = DISTRICT_SPRITES[e - 1];
      const want = this.tex[i % 2 && DISTRICT_ALT[name] ? DISTRICT_ALT[name] : name];
      if (d.texture !== want) d.texture = want;
      const ring = i % 3;
      const bob = reduce ? 0 : Math.sin(t * 0.8 + i) * P * 0.01;
      if (this.civRingBack.visible) {
        // Com o anel orbital, os distritos andam SOBRE ele (é uma cidade-anel), pela linha do meio da faixa, em vez de
        // cruzar a estrutura. Todos na mesma velocidade, para manterem a distância entre si. A metade de trás fica
        // atrás do planeta, mas por cima da faixa de trás.
        const ang = i * 2.399 + (reduce ? 0 : t * 0.03);
        d.position.set(cx + Math.cos(ang) * P * RING_TRACK_X, this.civPlanet.y + Math.sin(ang) * P * RING_TRACK_Y + bob);
        d.scale.set((P * 0.17) / d.texture.width);
        d.zIndex = Math.sin(ang) > 0 ? 10 : -20;
        return;
      }
      const ang = i * 2.399 + (reduce ? 0 : t * 0.035 * (1 + ring * 0.25));
      const rx = P * (0.74 + ring * 0.08), ry = P * (0.2 + ring * 0.05);
      d.position.set(cx + Math.cos(ang) * rx, cy + Math.sin(ang) * ry + bob);
      d.scale.set((P * (0.2 + 0.02 * (2 - ring))) / d.texture.width);
      d.zIndex = Math.sin(ang) > 0 ? 10 : -10;           // atrás do planeta na metade de cima da órbita
    });

    // Estruturas em órbita, conforme o que foi construído.
    ORBITALS.forEach((o, i) => {
      const sp = this.orbitals[i];
      sp.visible = o.when(game);
      if (!sp.visible) return;
      const bob = reduce || o.sprite === 'orbit-elevator' ? 0 : Math.sin(t * 0.7 + i * 1.3) * P * 0.012;
      sp.position.set(cx + o.at[0] * P, cy + o.at[1] * P + bob);
      sp.scale.set((o.size * P) / sp.texture.width);
    });

    // Tráfego em órbita: mais gente, mais naves.
    const ships = reduce ? 0 : Math.min(this.civShips.length, Math.floor(shown / 2));
    this.civShips.forEach((sh, i) => {
      sh.visible = i < ships;
      if (!sh.visible) return;
      const ang = t * (0.18 + i * 0.03) + i * 1.7;
      sh.position.set(cx + Math.cos(ang) * P * 0.62, cy + Math.sin(ang) * P * 0.12 - P * 0.04);
      const size = (P * 0.07) / sh.texture.width;
      sh.scale.set(-Math.sin(ang) >= 0 ? size : -size, size);
      sh.zIndex = Math.sin(ang) > 0 ? 11 : -11;
    });
  }

  // ---------- Planeta escolhido no mapa ----------
  private buildLoc() {
    this.locView.visible = false;
    this.locView.sortableChildren = true;
    this.locPlanet = new Sprite(Texture.EMPTY);
    this.locPlanet.anchor.set(0.5);
    this.locPlanet.eventMode = 'none';
    this.locView.addChild(this.locPlanet);
    for (let i = 0; i < 4; i++) {
      const sh = new Sprite(this.tex[CIV_SHIP]);
      sh.anchor.set(0.5);
      sh.visible = false;
      sh.eventMode = 'none';
      this.locShips.push(sh);
      this.locView.addChild(sh);
    }
    // Como na vista dos colonos, o asteroide no céu volta para a base.
    this.locSky = new Sprite(this.tex['asteroid-main-big']);
    this.locSky.anchor.set(0.5);
    this.locSky.eventMode = 'static';
    this.locSky.cursor = 'pointer';
    this.locSky.zIndex = 20;
    this.locSky.on('pointertap', () => useGame.getState().setSceneView('base'));
    this.locView.addChild(this.locSky);
  }

  private layoutLoc() {
    const { width: W, height: H } = this.app.screen;
    const P = Math.min(W * 0.46, H * 0.66);
    const tex = this.locPlanet.texture;
    // Os sprites de planeta são pequenos: ampliar por um fator inteiro mantém os pixels iguais.
    const s = tex === Texture.EMPTY ? 1 : tex.width < 192 ? Math.max(1, Math.floor(P / tex.width)) : P / tex.width;
    this.locPlanet.scale.set(s);
    this.locPlanet.position.set(Math.round(W * 0.5), Math.round(H * 0.52));
    this.locWidth = tex === Texture.EMPTY ? P : tex.width * s;
    this.locSky.position.set(W * 0.1, H * 0.16);
    this.locSky.scale.set((P * 0.28) / this.locSky.texture.width);
  }

  /** Sprite que não está na carga inicial (os planetas do mapa são muitos): carrega na primeira vez que aparece. */
  private loadTexture(name: string) {
    if (this.loading.has(name)) return;
    this.loading.add(name);
    Assets.load(spriteUrl(name))
      .then((t: Texture) => { if (!this.disposed) this.tex[name] = prepTexture(t); })
      .catch(err => console.error('Falha ao carregar', name, err));
  }

  private updateLoc() {
    const { game, selectedLoc } = useGame.getState();
    const loc = game.locations.find(l => l.id === selectedLoc);
    if (!loc) { useGame.getState().setSceneView('base'); return; }
    const reduce = game.settings.reduceMotion;
    const t = this.time;
    const name = locationSprite(loc, game.locations);
    if (name !== this.locSprite) {
      const tex = this.tex[name];
      if (tex) { this.locSprite = name; this.locPlanet.texture = tex; this.locPlanet.visible = true; this.layoutLoc(); }
      else { this.locPlanet.visible = false; this.loadTexture(name); }
    }
    const cx = this.locPlanet.x, cy = Math.round(this.app.screen.height * 0.52 + (reduce ? 0 : Math.sin(t * 0.6) * this.locWidth * 0.01));
    this.locPlanet.y = cy;
    if (!reduce) this.locSky.rotation = Math.sin(t * 0.3) * 0.08;
    // O asteroide do céu é a base: mostra a camada já escavada, como na vista dos colonos e no mapa.
    if (!this.baseSnap) this.snapBase();   // a vista pode abrir sem passar pela base (ex.: direto pelo mapa)
    const rockTex = this.baseSnap ?? this.tex[LAYERS[layerIndex(game)].sprite];
    if (this.locSky.texture !== rockTex) { this.locSky.texture = rockTex; this.layoutLoc(); }

    // Colônia: naves em órbita, uma a mais a cada dois níveis.
    const P = this.locWidth;
    const index = game.locations.indexOf(loc);
    this.updateSky(nodePosition(index), loc.id, P);
    const ships = reduce || !loc.outpost ? 0 : Math.min(this.locShips.length, 1 + Math.floor(loc.outpost.level / 2));
    this.locShips.forEach((sh, i) => {
      sh.visible = i < ships;
      if (!sh.visible) return;
      const ang = t * (0.22 + i * 0.04) + i * 1.9;
      sh.position.set(cx + Math.cos(ang) * P * 0.66, cy + Math.sin(ang) * P * 0.14 - P * 0.04);
      const size = (P * 0.08) / sh.texture.width;
      sh.scale.set(-Math.sin(ang) >= 0 ? size : -size, size);
      sh.zIndex = Math.sin(ang) > 0 ? 11 : -11;
    });
  }

  /** Fotografa a base como está agora (o contêiner do asteroide, com prédios e decoração) numa textura reduzida. */
  private snapBase() {
    const was = this.world.visible;
    this.world.visible = true;
    const tex = this.app.renderer.generateTexture({ target: this.world, resolution: 0.6 });
    this.world.visible = was;
    this.baseSnap?.destroy(true);   // os sprites que usavam o retrato antigo trocam de textura antes do próximo desenho
    this.baseSnap = tex;
  }

  // ---------- Megaprojeto escolhido no mapa ----------
  private buildMega() {
    this.megaView.visible = false;
    this.megaView.sortableChildren = true;
    this.megaMain = new Sprite(Texture.EMPTY);
    this.megaMain.eventMode = 'none';
    this.megaPlanet = new Sprite(Texture.EMPTY);
    this.megaPlanet.anchor.set(0.5);
    this.megaPlanet.eventMode = 'none';
    this.megaPlanet.zIndex = 1;
    this.megaFront = new Sprite(Texture.EMPTY);
    this.megaFront.eventMode = 'none';
    this.megaFront.zIndex = 2;
    this.megaView.addChild(this.megaMain, this.megaPlanet, this.megaFront);
  }

  /** O anel orbital cortado na linha do meio do buraco: a metade de trás e a da frente (usadas na vista do megaprojeto
   *  e em volta de Aurora). As sub-texturas são criadas uma vez só. */
  private ringHalves(tex: Texture) {
    if (this.ringHalvesCache?.src !== tex) {
      const hy = Math.round(tex.height * RING_HOLE_Y);
      this.ringHalvesCache = {
        src: tex,
        back: new Texture({ source: tex.source, frame: new Rectangle(0, 0, tex.width, hy) }),
        front: new Texture({ source: tex.source, frame: new Rectangle(0, hy, tex.width, tex.height - hy) }),
      };
    }
    return this.ringHalvesCache;
  }

  /** Tamanho na tela: sprites pequenos crescem por um fator inteiro (pixels iguais), os grandes, no tamanho pedido. */
  private fitScale(tex: Texture, target: number) {
    return tex.width < 192 ? Math.max(1, Math.round(target / tex.width)) : target / tex.width;
  }

  private updateMega() {
    const { game, selectedMega } = useGame.getState();
    const name = selectedMega ? builtMegaSprite(game, selectedMega) : null;
    const pos = selectedMega ? megaMapPos(selectedMega) : null;
    if (!name || !pos) { useGame.getState().setSceneView('base'); return; }
    const ring = selectedMega === 'ring';
    const planetName = CIV_PLANETS[Math.max(0, eraIndex(game) - 1)];
    const tex = this.tex[name];
    if (!tex) { this.loadTexture(name); this.megaMain.visible = this.megaPlanet.visible = this.megaFront.visible = false; return; }
    const { width: W, height: H } = this.app.screen;
    const key = `${selectedMega}|${name}|${planetName}|${W}x${H}`;
    if (key !== this.megaKey) {
      this.megaKey = key;
      const P = Math.min(W * 0.5, H * 0.7);
      if (ring) {
        // O anel é cortado na linha do meio do buraco (45,6% da altura): a metade de trás fica atrás de Aurora e a da
        // frente passa por cima. Aurora ocupa 30% da largura, um pouco mais alta que o buraco (como no mapa).
        const { back, front } = this.ringHalves(tex);
        this.megaMain.texture = back;
        this.megaFront.texture = front;
        const s = this.fitScale(tex, P * 1.3);
        this.megaMain.scale.set(s);
        this.megaFront.scale.set(s);
        this.megaMain.anchor.set(0.5, 1);
        this.megaFront.anchor.set(0.5, 0);
        this.megaPlanet.texture = this.tex[planetName];
        this.megaPlanet.scale.set((tex.width * s * 0.3) / (this.megaPlanet.texture.width * (PLANET_GLOBE[planetName] ?? 1)));
        this.megaWidth = tex.width * s;
      } else {
        this.megaMain.texture = tex;
        this.megaMain.anchor.set(0.5);
        this.megaMain.scale.set(this.fitScale(tex, P));
        this.megaWidth = tex.width * this.megaMain.scale.x;
      }
    }
    this.megaMain.visible = true;
    this.megaPlanet.visible = this.megaFront.visible = ring;
    const reduce = game.settings.reduceMotion;
    const cx = Math.round(W * 0.5), cy = Math.round(H * 0.52 + (reduce ? 0 : Math.sin(this.time * 0.5) * this.megaWidth * 0.008));
    this.megaMain.position.set(cx, cy);
    this.megaPlanet.position.set(cx, cy);
    this.megaFront.position.set(cx, cy);
    // O Dyson envolve a própria estrela e o Núcleo fica colado nela: sem sol no fundo.
    this.updateSky(pos, null, this.megaWidth * 0.8, selectedMega !== 'dyson' && selectedMega !== 'core');
  }

  // ---------- Céu das vistas de planeta ----------
  private buildSky() {
    this.sky.visible = false;
    for (let i = 0; i < 4; i++) {
      const sp = new Sprite(Texture.EMPTY);
      sp.anchor.set(0.5);
      sp.eventMode = 'none';
      sp.visible = false;
      this.skySprites.push(sp);
      this.sky.addChild(sp);
    }
  }

  /** Sol e os três vizinhos mais próximos de `from` (posição no mapa), cada um no lugar da tela que mais
   *  combina com a direção em que fica; os mais perto aparecem maiores. */
  private updateSky(from: { x: number; y: number }, selfId: string | null, P: number, withSun = true) {
    const { game } = useGame.getState();
    const auroraName = CIV_PLANETS[Math.max(0, eraIndex(game) - 1)];
    // O sol do fundo é o Enxame de Dyson quando ele já existe (a estrela está dentro dele).
    const sunName = builtMegaSprite(game, 'dyson') ?? 'star-orange';
    const key = `${selfId}|${game.locations.length}|${auroraName}|${withSun}|${from.x},${from.y}|${sunName}`;
    if (key !== this.skyKey) {
      this.skyKey = key;
      const civ = !!game.upgrades.habitats || game.resources.population >= 1;
      const dist = (p: { x: number; y: number }) => Math.hypot(p.x - from.x, p.y - from.y);
      const cands = game.locations.map((l, i) => ({ name: locationSprite(l, game.locations), pos: nodePosition(i), id: l.id })).filter(c => c.id !== selfId);
      if (selfId !== null && civ) cands.push({ name: auroraName, pos: AURORA_POS, id: 'aurora' });
      const near = cands.sort((a, b) => dist(a.pos) - dist(b.pos)).slice(0, 3);
      const bodies = [...(withSun ? [{ name: sunName, pos: { x: 0, y: 0 }, sun: true }] : []), ...near.map(c => ({ name: c.name, pos: c.pos, sun: false }))];
      const free = SKY_SLOTS.map((_, i) => i);
      this.skyBodies = bodies.map(b => {
        const ang = Math.atan2(b.pos.y - from.y, b.pos.x - from.x);
        let slot = free[0], best = Infinity;
        for (const s of free) {
          const a = Math.atan2(SKY_SLOTS[s][1] - 0.52, SKY_SLOTS[s][0] - 0.5);
          const d = Math.abs(Math.atan2(Math.sin(a - ang), Math.cos(a - ang)));
          if (d < best) { best = d; slot = s; }
        }
        free.splice(free.indexOf(slot), 1);
        const size = b.sun ? (sunName === 'star-orange' ? 0.22 : 0.3) : 0.14 - 0.07 * Math.min(1, Math.max(0, (dist(b.pos) - 120) / 600));
        return { name: b.name, slot, size, sun: b.sun };
      });
    }

    const { width: W, height: H } = this.app.screen;
    const reduce = game.settings.reduceMotion, t = this.time;
    this.skySprites.forEach((sp, i) => {
      const b = this.skyBodies[i];
      const tex = b ? this.tex[b.name] : undefined;
      if (b && !tex) this.loadTexture(b.name);
      sp.visible = !!tex;
      if (!b || !tex) return;
      if (sp.texture !== tex) sp.texture = tex;
      const [u, v] = SKY_SLOTS[b.slot];
      sp.position.set(u * W, v * H + (reduce ? 0 : Math.sin(t * 0.4 + i * 1.7) * P * 0.01));
      sp.scale.set((b.size * P) / tex.width);
      // Os planetas de fundo ficam um pouco apagados, para o da frente continuar o centro das atenções.
      sp.alpha = b.sun ? 0.95 : 0.8;
      sp.tint = b.sun ? 0xffffff : 0xc4cadd;
    });
  }

  // ---------- Pontos brilhantes ----------
  /** Aparece de tempos em tempos num ponto da superfície; clicar coleta, ignorar deixa sumir. */
  private updateGolden(dt: number, mined: number, reduce: boolean) {
    const A = this.asteroidWidth;
    if (!this.golden) {
      if (mined < 30) return;                               // só depois que o jogador já sabe clicar
      this.goldenTimer -= dt;
      if (this.goldenTimer > 0) return;
      this.goldenTimer = BALANCE.strikeMinGap + Math.random() * (BALANCE.strikeMaxGap - BALANCE.strikeMinGap);
      this.spawnPoint();
    }
    const g = this.golden!;
    g.life -= dt;
    if (g.life <= 0) {
      if (g.crack !== undefined) this.floatText(t('A fissura se fechou'), null, g.node.x, g.node.y + this.world.y, 0x9fe8ff);
      this.removeGolden();
      return;
    }
    const crack = g.crack !== undefined;
    const pulse = reduce ? 1 : 1 + Math.sin(this.time * (crack ? 12 : 6)) * (crack ? 0.18 : 0.12);
    g.node.position.set(this.asteroid.x + g.u * A, this.asteroid.y + g.v * A);
    g.node.scale.set(((A * (crack ? 0.06 : 0.075)) / g.node.texture.width) * pulse);
    g.node.alpha = Math.min(1, g.life / (crack ? 0.6 : 1.5));      // some aos poucos no fim
    g.node.tint = crack ? (reduce || Math.sin(this.time * 14) > 0 ? 0xffffff : 0x9fe8ff) : reduce || Math.sin(this.time * 9) > 0 ? 0xffffff : 0xfff1a8;
  }

  /** Cria um ponto brilhante, ou a rachadura `crack` de uma fissura perto de (u, v). */
  private spawnPoint(crack?: number, near?: { u: number; v: number }) {
    const A = this.asteroidWidth;
    const node = new Sprite(this.tex[crack === undefined ? GOLDEN_SPRITE : CRACK_SPRITE]);
    node.anchor.set(0.5);
    node.eventMode = 'static';
    node.cursor = 'pointer';
    // Ângulo e raio aleatórios dentro da parte de cima do asteroide (onde fica a base); a rachadura seguinte abre ao lado.
    const ang = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 0.6;
    const F = TOP_FACE;
    const u = near ? Math.max(F.cx - F.rx * 0.85, Math.min(F.cx + F.rx * 0.85, near.u + Math.cos(ang) * 0.12)) : F.cx + Math.cos(ang) * F.rx * r;
    const v = near ? Math.max(F.cy - F.ry * 0.85, Math.min(F.cy + F.ry * 0.85, near.v + Math.sin(ang) * 0.07)) : F.cy + Math.sin(ang) * F.ry * r;
    const g: Golden = { node, u, v, life: crack === undefined ? BALANCE.strikeLife : BALANCE.fissureLife, crack };
    node.on('pointertap', e => {
      e.stopPropagation();
      const x = e.global.x, y = e.global.y;
      this.oneShot(FLASH_FRAMES, node.x, node.y + this.world.y, A * (crack === undefined ? 0.3 : 0.2), 0.3, 0.4);
      this.removeGolden();
      const store = useGame.getState();
      if (crack === undefined) {
        store.strike(x, y);
        this.puff('fx-crack', x, y);
        if (Math.random() < BALANCE.fissureChance) { this.floatText(t('Fissura!'), null, x, y - 30, 0x9fe8ff); this.spawnPoint(0, { u, v }); }
      } else if (store.fissure(crack, x, y)) {
        if (crack < 2) this.spawnPoint(crack + 1, { u, v });
        else store.fissureFinale(x, y);
      }
    });
    this.world.addChild(node);
    this.golden = g;
  }

  private removeGolden() {
    if (!this.golden) return;
    this.golden.node.destroy();
    this.golden = null;
  }

  // ---------- Drones carregadores ----------
  /** Com Carregadores designados, até 4 drones voam entre as indústrias construídas. */
  private updateLoaders(dt: number, reduce: boolean) {
    const { game } = useGame.getState();
    const stops = LOADER_STOPS.filter(id => game.buildings[id] > 0 && this.slots[id]);
    const want = reduce || stops.length < 2 ? 0 : Math.min(4, Math.ceil((game.drones.loader ?? 0) / 10));
    while (this.loaders.length > want) this.loaders.pop()!.node.destroy();
    const pick = (not?: BuildingId) => { const opts = stops.filter(x => x !== not); return opts[Math.floor(Math.random() * opts.length)]; };
    while (this.loaders.length < want) {
      const node = new Sprite(this.tex[LOADER_SPRITE]);
      node.anchor.set(0.5);
      node.eventMode = 'none';
      this.world.addChild(node);
      const from = pick();
      this.loaders.push({ node, from, to: pick(from), t: Math.random(), speed: 0.35 + Math.random() * 0.2 });
    }
    const A = this.asteroidWidth;
    const at = (id: BuildingId) => { const { at: [u, v], size } = this.slot(id); return { x: this.asteroid.x + u * A, y: this.asteroid.y + (v - size * 0.5) * A }; };
    for (const l of this.loaders) {
      if (!stops.includes(l.from) || !stops.includes(l.to)) { l.from = pick(); l.to = pick(l.from); l.t = 0; }
      l.t += dt * l.speed;
      if (l.t >= 1) { l.from = l.to; l.to = pick(l.from); l.t = 0; }
      const a = at(l.from), b = at(l.to);
      // Arco: sobe no meio do trecho, como quem passa por cima das estruturas.
      const lift = Math.sin(l.t * Math.PI) * A * 0.12;
      l.node.position.set(a.x + (b.x - a.x) * l.t, a.y + (b.y - a.y) * l.t - lift);
      l.node.scale.set(((A * 0.07) / l.node.texture.width) * (b.x >= a.x ? 1 : -1), (A * 0.07) / l.node.texture.width);
    }
  }

  /** Animação curta (andaime, faíscas) que some sozinha. */
  private oneShot(frames: string[], x: number, y: number, size: number, speed: number, life: number, anchor: [number, number] = [0.5, 0.5], loop = false) {
    if (useGame.getState().game.settings.reduceMotion || this.oneShots.length > 10) return;
    const s = new AnimatedSprite(frames.map(n => this.tex[n]));
    s.anchor.set(...anchor);
    s.animationSpeed = speed;
    s.loop = loop;
    s.eventMode = 'none';
    s.scale.set(size / s.texture.width);
    s.position.set(x, y - this.world.y);
    this.fx.addChild(s);
    s.play();
    this.oneShots.push({ sprite: s, life });
  }

  private spawnShip(name: string, size: number, vx: number, vy: number, rotation = 0, from: [number, number] = [0, -0.25]) {
    const ship = new Sprite(this.tex[name]);
    ship.anchor.set(0.5);
    ship.scale.set((this.asteroidWidth * size) / ship.texture.width);
    ship.rotation = rotation;
    ship.position.set(this.asteroid.x + from[0] * this.asteroidWidth, this.asteroid.y + from[1] * this.asteroidWidth);
    this.world.addChild(ship);
    this.ships.push({ node: ship, vx, vy });
  }

  /** Cargueiro que atravessa a cena da esquerda para a direita, em altura aleatória. */
  private spawnTraffic() {
    const { width: W, height: H } = this.app.screen;
    const ship = new Sprite(this.tex[TRAFFIC_SHIPS[Math.floor(Math.random() * TRAFFIC_SHIPS.length)]]);
    ship.anchor.set(0.5);
    ship.scale.set((this.asteroidWidth * 0.17) / ship.texture.width);
    ship.alpha = 0.92;
    ship.position.set(-80, H * (0.12 + Math.random() * 0.25));
    this.world.addChild(ship);
    this.ships.push({ node: ship, vx: W * (0.1 + Math.random() * 0.08), vy: H * 0.015 });
  }

  private floatText(text: string, icon: string | null, x: number, y: number, color = 0xffd447) {
    if (useGame.getState().game.settings.reduceMotion) return;
    if (this.floaters.length > 24) { const old = this.floaters.shift()!; old.node.destroy({ children: true }); }
    const node = new Container();
    const label = new Text({ text, style: { ...TEXT_STYLE, fill: color } });
    label.anchor.set(0, 0.5);
    if (icon && this.tex[icon]) {
      const s = new Sprite(this.tex[icon]);
      s.anchor.set(1, 0.5);
      s.scale.set(22 / s.texture.width);
      s.x = -2;
      node.addChild(s);
    }
    node.addChild(label);
    node.position.set(x + (Math.random() * 30 - 15), y - this.world.y);
    this.fx.addChild(node);
    this.floaters.push({ node, vy: -50, life: 1.1 });
  }

  private onEvent(e: GameEvent) {
    const { width: W, height: H } = this.app.screen;
    if (e.type === 'mined') {
      const x = e.x ?? this.asteroid.x, y = e.y ?? this.asteroid.y - this.asteroidWidth * 0.2;
      let k = 0;
      for (const [r, v] of Object.entries(e.gained) as [ResId, number][]) {
        if (v < 0.05) continue;
        this.floatText(`+${fmt(v)}`, RESOURCES[r].icon, x, y - k * 22, r === 'gold' ? 0xffd447 : 0xffb347);
        k++;
      }
      if (e.x === undefined) this.squish = 1;
      else { this.oneShot(ROCKCHIP_FRAMES, x, y + this.asteroidWidth * 0.02, this.asteroidWidth * 0.09, 0.35, 0.3); if (Math.random() < 0.35) this.puff('fx-dust', x, y); }
    } else if (e.type === 'sold') {
      this.floatText(`+${fmt(e.earned)}`, 'icon-credits', W * 0.5, H * 0.25);
      if (!useGame.getState().game.settings.reduceMotion && this.ships.length < 3) {
        const ship = new Sprite(this.tex['ship-cargo']);
        ship.anchor.set(0.5);
        ship.scale.set((this.asteroidWidth * 0.2) / ship.texture.width);
        ship.position.set(this.asteroid.x, this.asteroid.y - this.asteroidWidth * 0.3);
        this.world.addChild(ship);
        this.ships.push({ node: ship, vx: W * 0.6 });
      }
    } else if (e.type === 'built') {
      this.floatText(`+${e.amount}`, BUILDING_BY_ID[e.id].sprite, this.asteroid.x, this.asteroid.y - this.asteroidWidth * 0.35, 0x00e5ff);
      // Andaime animado no lugar onde a estrutura aparece.
      const slot = this.slots[e.id]?.[0];
      if (slot) {
        const [u, v] = slot.at;
        const A = this.asteroidWidth;
        this.oneShot(CONSTRUCT_FRAMES, this.asteroid.x + u * A, this.asteroid.y + v * A, A * Math.max(0.11, slot.size * 0.9), 0.14, 1.6, [0.5, 0.92], true);
      }
    } else if (e.type === 'outpost' && !useGame.getState().game.settings.reduceMotion) {
      this.spawnShip('ship-colony', 0.2, W * 0.4, -H * 0.3, -0.6);
    } else if (e.type === 'expeditionLaunched' && !useGame.getState().game.settings.reduceMotion) {
      const ship = new Sprite(this.tex['ship-explorer']);
      ship.anchor.set(0.5);
      ship.scale.set((this.asteroidWidth * 0.18) / ship.texture.width);
      ship.rotation = -0.5;
      ship.position.set(this.asteroid.x, this.asteroid.y - this.asteroidWidth * 0.25);
      this.world.addChild(ship);
      this.ships.push({ node: ship, vx: W * 0.45, vy: -H * 0.25 });
    } else if (e.type === 'upgraded' && !useGame.getState().game.settings.reduceMotion) {
      // Anel de luz ao concluir uma pesquisa
      const ring = new AnimatedSprite(FLASH_FRAMES.map(n => this.tex[n]));
      ring.anchor.set(0.5);
      ring.loop = false;
      ring.animationSpeed = 0.22;
      ring.scale.set((this.asteroidWidth * 0.9) / ring.texture.width);
      ring.position.set(this.asteroid.x, this.asteroid.y - this.world.y);
      ring.onComplete = () => ring.destroy();
      this.fx.addChild(ring);
      ring.play();
    }
  }
}
