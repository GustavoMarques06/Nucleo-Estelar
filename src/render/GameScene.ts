import { AnimatedSprite, Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { BuildingId, ResId } from '../game/types';
import { useGame } from '../game/store';
import { usePrefs } from '../prefs';
import { events, type GameEvent } from '../game/events';
import { RESOURCES } from '../game/data/resources';
import { BUILDING_BY_ID } from '../game/data/buildings';
import { fmt } from '../game/engine/format';
import { artUrl, spriteUrl } from '../assets';

import {
  BACKDROP, BUILDING_IDS_ART, BUILDING_SPRITE, BUILDING_TIERS, COLONIST_FRAMES, CONSTRUCT_FRAMES, FLASH_FRAMES, GOLDEN_SPRITE, LOADER_SPRITE, LOADER_STOPS,
  OVERLAYS, ROCKCHIP_FRAMES, SLOTS, SMOKE_FRAMES, SPRITES, TEXT_STYLE, TRAFFIC_SHIPS, type Overlay,
} from './sceneConfig';
import { LAYERS } from '../game/data/layers';
import { BALANCE } from '../game/data/balance';
import { layerIndex } from '../game/engine/deposit';

interface Floater { node: Container; vy: number; life: number }
interface Ship { node: Sprite; vx: number; vy?: number }
/** Ponto brilhante no asteroide: posição em frações da largura do asteroide, a partir do centro. */
interface Golden { node: Sprite; u: number; v: number; life: number }
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
    for (const name of SPRITES) {
      const t = loaded[spriteUrl(name)] as Texture;
      // Sprites pequenos (planetas, minérios) ficam nítidos; os grandes, reduzidos dos originais, ficam suaves.
      if (t.width >= 192) {
        // Sprites grandes são reduzidos na cena: mipmaps evitam o serrilhado/borrão da redução direta.
        t.source.scaleMode = 'linear';
        t.source.autoGenerateMipmaps = true;
        t.source.mipmapFilter = 'linear';
      } else t.source.scaleMode = 'nearest';
      this.tex[name] = t;
    }
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
    this.planet2 = new Sprite(this.tex['planet-ringed']);
    this.planet2.anchor.set(0.5);
    this.planet2.alpha = 0.9;
    this.moon = new Sprite(this.tex['moon-grey']);
    this.moon.anchor.set(0.5);
    this.dyson = new Sprite(this.tex['mega-dyson-1']);
    this.dyson.anchor.set(0.5);
    this.dyson.visible = false;
    stage.addChild(this.dyson, this.planet2, this.planet, this.moon, this.world);

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

    // Colonos caminhando pela base quando há população.
    for (let i = 0; i < 6; i++) {
      const c = new AnimatedSprite(COLONIST_FRAMES.map(n => this.tex[n]));
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
    const A = Math.min(W * 0.62, H * 0.82);
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
      const slot = SLOTS[n.id]!;
      const [u, v] = slot.at[n.idx];
      const x = this.asteroid.x + u * A, y = this.asteroid.y + v * A;
      n.sprite.position.set(x, y);
      n.sprite.zIndex = y;
      n.sprite.scale.set((slot.size * A) / n.sprite.texture.width);
      if (n.badge) { n.badge.position.set(x, y + 2); n.badge.zIndex = 10_000; n.badge.style.fontSize = Math.max(16, A * 0.06); }
    }
    for (const o of this.overlays) {
      const [u, v] = SLOTS[o.def.id]!.at[0];
      o.sprite.position.set(this.asteroid.x + (u + o.def.dx) * A, this.asteroid.y + (v + o.def.dy) * A);
      o.sprite.zIndex = this.asteroid.y + (v + o.def.dy) * A + 1;
      o.sprite.scale.set((A * o.def.size) / o.sprite.texture.width);
    }
    for (const d of this.drones) d.scale.set((A * 0.12) / d.texture.width);
    for (const c of this.colonists) c.scale.set((A * 0.045) / c.texture.width);
    this.dyson.position.set(W * 0.13, H * 0.66);
    this.dyson.scale.set((pSize * 0.42) / this.dyson.texture.width);
    for (const s of this.smokes) {
      const [u, v] = SLOTS[s.id]!.at[0];
      s.sprite.position.set(this.asteroid.x + (u + 0.02) * A, this.asteroid.y + (v - SLOTS[s.id]!.size * 0.72) * A);
      s.sprite.zIndex = 9_000;
      s.sprite.scale.set((A * 0.075) / s.sprite.texture.width);
    }
  }

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

    if (this.hold) {
      this.hold.t -= dt;
      if (this.hold.t <= 0) { this.hold.t = 0.18; this.squish = Math.max(this.squish, 0.6); useGame.getState().mine(this.hold.x, this.hold.y); }
    }

    // Asteroide: flutuação leve e “amassado” ao clicar
    const bob = reduce ? 0 : Math.sin(t * 0.8) * this.asteroidWidth * 0.008;
    this.world.y = bob;
    // Aparência do asteroide conforme a camada alcançada
    const tierTex = this.tex[LAYERS[layerIndex(game)].sprite];
    if (this.asteroid.texture !== tierTex) this.asteroid.texture = tierTex;
    const baseScale0 = this.asteroidWidth / this.asteroid.texture.width;
    if (this.squish > 0) {
      this.squish = Math.max(0, this.squish - dt * 6);
      const k = 1 - Math.sin(this.squish * Math.PI) * 0.04;
      this.asteroid.scale.set(baseScale0 * (2 - k), baseScale0 * k);
    } else {
      this.asteroid.scale.set(baseScale0);
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
      const baseScale = (SLOTS[n.id]!.size * (tierDef?.scale ?? 1) * this.asteroidWidth) / n.sprite.texture.width;
      const pulse = working && !reduce ? 1 + Math.sin(t * 5 + n.idx * 1.7) * 0.02 : 1;
      n.sprite.scale.set(baseScale, baseScale * pulse);
      n.sprite.tint = st?.kind === 'power' ? ((t * 2) % 1 < 0.5 ? 0x7a80a8 : 0x9aa0c8) : 0xffffff;
    }

    // Megaprojeto no céu: o Enxame de Dyson aparece conforme os estágios.
    const dysonStage = game.megaprojects.dyson ?? 0;
    this.dyson.visible = dysonStage > 0;
    if (dysonStage > 0) {
      const tex = this.tex[`mega-dyson-${Math.min(4, dysonStage)}`];
      if (this.dyson.texture !== tex) { this.dyson.texture = tex; this.layout(); }
      if (!reduce) this.dyson.rotation = t * 0.02;
    }

    const colonistCount = Math.min(this.colonists.length, Math.ceil(game.resources.population / 10));
    this.colonists.forEach((c, i) => {
      c.visible = i < colonistCount && !reduce;
      if (!c.visible) return;
      const phase = t * 0.12 + i * 1.9;
      const A = this.asteroidWidth;
      c.position.set(this.asteroid.x + Math.sin(phase) * A * 0.22, this.asteroid.y + (-0.14 + (i % 3) * 0.045) * A);
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

  // ---------- Pontos brilhantes ----------
  /** Aparece de tempos em tempos num ponto da superfície; clicar coleta, ignorar deixa sumir. */
  private updateGolden(dt: number, mined: number, reduce: boolean) {
    const A = this.asteroidWidth;
    if (!this.golden) {
      if (mined < 30) return;                               // só depois que o jogador já sabe clicar
      this.goldenTimer -= dt;
      if (this.goldenTimer > 0) return;
      this.goldenTimer = BALANCE.strikeMinGap + Math.random() * (BALANCE.strikeMaxGap - BALANCE.strikeMinGap);
      const node = new Sprite(this.tex[GOLDEN_SPRITE]);
      node.anchor.set(0.5);
      node.eventMode = 'static';
      node.cursor = 'pointer';
      // Ângulo e raio aleatórios dentro da parte de cima do asteroide (onde fica a base).
      const ang = Math.random() * Math.PI * 2, r = 0.12 + Math.random() * 0.18;
      const g: Golden = { node, u: Math.cos(ang) * r * 1.1, v: Math.sin(ang) * r * 0.6 - 0.08, life: BALANCE.strikeLife };
      node.on('pointertap', e => {
        e.stopPropagation();
        useGame.getState().strike(e.global.x, e.global.y);
        this.oneShot(FLASH_FRAMES, node.x, node.y + this.world.y, A * 0.3, 0.3, 0.4);
        this.removeGolden();
      });
      this.world.addChild(node);
      this.golden = g;
    }
    const g = this.golden;
    g.life -= dt;
    if (g.life <= 0) { this.removeGolden(); return; }
    const pulse = reduce ? 1 : 1 + Math.sin(this.time * 6) * 0.12;
    g.node.position.set(this.asteroid.x + g.u * A, this.asteroid.y + g.v * A);
    g.node.scale.set(((A * 0.075) / g.node.texture.width) * pulse);
    g.node.alpha = Math.min(1, g.life / 1.5);                // some aos poucos no último segundo e meio
    g.node.tint = reduce || Math.sin(this.time * 9) > 0 ? 0xffffff : 0xfff1a8;
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
    const stops = LOADER_STOPS.filter(id => game.buildings[id] > 0 && SLOTS[id]);
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
    const at = (id: BuildingId) => { const [u, v] = SLOTS[id]!.at[0]; return { x: this.asteroid.x + u * A, y: this.asteroid.y + (v - SLOTS[id]!.size * 0.5) * A }; };
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
      else this.oneShot(ROCKCHIP_FRAMES, x, y + this.asteroidWidth * 0.02, this.asteroidWidth * 0.07, 0.35, 0.3);
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
      const slot = SLOTS[e.id];
      if (slot) {
        const [u, v] = slot.at[0];
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
