<div align="center">

<img src="docs/img/logo.png" alt="Núcleo Estelar" width="420" />

### A pixel-art idle space tycoon, right in your browser.

Start with a drill on a cold asteroid. End with an artificial star at the heart of an empire.

![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![PixiJS](https://img.shields.io/badge/PixiJS-8-E72264?logo=pixijs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-5-433e38)
![Vitest](https://img.shields.io/badge/Vitest-5-6E9F18?logo=vitest&logoColor=white)
![No backend](https://img.shields.io/badge/backend-none-00e5ff)

[Português](README.md) · English

<br />

<img src="docs/img/mineracao.png" alt="Núcleo Estelar: the asteroid base and the Mining tab with ore veins" width="900" />

</div>

---

## ✨ The game

**Núcleo Estelar** ("Stellar Core") is an incremental (idle) space-empire builder. You mine ore, build production chains, discover worlds, negotiate with rival factions and finally build an artificial star that never stops growing.

- **Truly infinite:** the *Stellar Core* megaproject has no last stage, continuous research has no max level, and every newly explored location is richer than the last.
- **Slow by design:** the first Ascension takes about a day of play. Attention is rewarded, never required.
- **Works offline:** with the tab closed your base keeps producing for up to 8 hours, but at a much reduced pace (3% of normal).
- **All in the browser:** no server, no account. Progress lives in your `localStorage`, with automatic backup and file export.

---

## 🎮 How to play

1. **Extract** ore by clicking (or holding) on the asteroid, and sell the iron.
2. **Automate** with miners, power and refineries. The *Telemetry* panel always tells you what limits you and what to do next.
3. **Grow in layers:** science and research → population and civilization → expeditions and colonies → factions and trade → megaprojects.
4. **Ascend** to restart stronger with permanent upgrades. Later, **transcend** and start over one level higher.

Guided goals, the in-game guide and the logbook accompany every stage. If you just want to leave it running, turn on **focus mode**: the animated scene goes away, an alerts panel comes in, and the game uses far less battery.

---

## 🛰️ What's in the game

- **⛏️ Mining and deposits.** The asteroid crust is infinite but poor. With **Geology** you prospect **veins**: finite reserves that pay more and yield **titanium** and **crystals**. Pick which to drill, let **autonomous probes** handle it, or exhaust everything at once.
- **🏭 Production chains.** 43 structures in 9 categories, three chain tiers (ore → alloy → component → module), alternative recipes, and a clear status for what blocks each machine: power, labor, input or full storage.
- **🌌 Expansion.** Expeditions with ships and fuel, **procedural worlds** of 10 types, specialized colonies, 5-level **terraforming**, trade routes between colonies (with blockades and insurance), and crises that never destroy progress.
- **🤝 Factions.** Three rival factions with **requests**, treaties, alliances and **brotherhood**. Allying with one cools relations with its rival. Embassy **influence** buys decrees and settles territory disputes. Borders shift over time, allies receive **honor missions**, and each faction has its own story in the Logbook.
- **💰 Living economy.** Market prices fluctuate and **demand saturates** when you oversell. Upkeep, debt, inflation, **trade reputation**, urgent contracts, and a **Finance** tab with per-resource balance and history.
- **♾️ An endgame that restarts.** Dyson swarm, infinite Stellar Core, the **Singularity** (the story's ending), **Ascension** and **Transcendence**: two restart layers with permanent upgrades, achievements that are never lost and a mineral catalog. On Ascension you can pick a **challenge** (no trade, no colonies, rationed power…) and earn a permanent upgrade for beating it.

<details>
<summary><b>Game numbers</b></summary>

<br />

| | |
|---|---|
| Structures | 43 |
| Research (6-phase tree) | 54, plus endless continuous research |
| World types | 10 |
| Factions | 3, each with requests and four relation levels |
| Space events | 27, 13 of them in chained stories that remember your choices |
| Achievements | 51 (+2% production each, permanent) |
| Guided goals | 33 |
| Logbook entries | 28 (16 from the journey, in five acts, + 12 from the factions), plus 19 in the Archive (11 fragments and 8 transmissions) |
| Ascension challenges | 8, each with a special rule and a permanent upgrade |
| Languages | Portuguese and English (automatic from the browser, or pick in Options) |
| Sprites | about 380, cropped from the original art sheets |

</details>

---

## 🚀 Running it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
git clone https://github.com/GustavoMarques06/Nucleo-Estelar.git
cd Nucleo-Estelar
npm install
npm run dev          # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | development server |
| `npm run build` | production build in `dist/` (drops unused sprites and recompresses the rest: ~5 MB) |
| `npm run preview` | serves `dist/` locally |
| `npm test` | all tests (economy, save, progression, simulations) |
| `npm run check` | type check + tests |
| `npm run audit` | unused exports, import cycles, large files |
| `npm run soak` | full endurance test: the whole campaign up to Transcendence (takes several minutes) |
| `npm run sprites` | regenerates sprites from the sheets in `Assets/` |

---

## 🔧 Under the hood

| Layer | Technology |
|---|---|
| Build and dev server | Vite + TypeScript |
| UI (panels, menus) | React |
| Pixel-art scene | PixiJS 8, loaded on demand |
| State | Zustand |
| Tests | Vitest |
| Audio | Web Audio: effects and ambient music generated in code, no files |
| Fonts | VT323 and Press Start 2P (Fontsource) |

The game is **data-driven**: adding a structure, research, event or faction means adding an entry in `src/game/data/`. The simulation, the panels and the advisor (Telemetry) all work from it.

```
src/
├─ game/
│  ├─ data/        balance and content (structures, research, factions, veins, events, logbook...)
│  ├─ engine/      pure logic: simulate(state, dt) returns a new state, no side effects
│  ├─ store.ts     global state (Zustand) and player actions
│  └─ loop.ts      4 Hz simulation, separate from rendering, plus autosave
├─ render/         PixiJS scene (asteroid, animated structures, ships, drones)
├─ audio/          effects and music (per journey phase) generated with Web Audio
├─ i18n/           t(), <Tx> and the English dictionary (en/), with a coverage test
└─ ui/             React components and panels
```

### Quality: the game plays itself in the tests

- **Automatic player.** `engine/bot.ts` plays the whole campaign with three profiles (ideal, casual, idle); tests fail if progression stalls or drifts off pace.
- **Soak test.** `engine/soak.test.ts` plays several Ascensions, checking at every step that state stays valid (finite numbers, storage within limits, no duplicate routes, save → load without loss), an 8 h offline return in each phase, and hundreds of random actions.
- **Crash-proof saves.** Stored data is never trusted: `parseSave` validates and normalizes everything. There is a backup every ~10 minutes, corrupt-save recovery, and file export/import.

### Pace

Time to first Ascension, measured with the automatic player (a human takes longer):

| Profile | How much it plays | First Ascension |
|---|---|---|
| Ideal | attentive the whole time | ~21 h |
| Casual | a few visits per hour | ~26 h |
| Idle | one visit per hour | ~65 h |

Later runs, with permanent upgrades, are much faster.

### Art

All sprites come from AI-generated sheets (in `Assets/`) and are cropped by scripts, with no manual editing. Crops are described in `scripts/*.manifest.json`, and `npm run build` discards sprites the code doesn't use.

---

## ♿ Accessibility and languages

- **Portuguese and English**, switchable instantly in Options (the source text is Portuguese; English is a dictionary in `src/i18n/en`, covered by a test).
- **Text size** from 90% to 150%, **color-blind modes** (red-green and blue-yellow), **high contrast** and **reduced motion**.
- **Keyboard shortcuts** (`1`–`0` switch tabs, `E` extracts, `V` sells, `F` focus mode, `M` sound, `?` help), visible focus, dialogs that trap focus and close with `Esc`, and a skip-to-content link.
- **Music changes with the journey phase**, and there are dedicated sound effects for building, researching, colonizing and more.

## 📚 Documentation

- [Development guide](docs/DESENVOLVIMENTO.md) (Portuguese): systems, balance, sprites and publishing in detail.
- [Design document (GDD)](nucleo_estelar_gdd.md) (Portuguese): the original vision.

## 🌐 Publishing

`npm run build` produces a static site with relative paths that runs on any static host (GitHub Pages, Vercel, Netlify, Cloudflare Pages, itch.io). There is no server to maintain.

---

<div align="center">

Made by [**Gustavo Marques**](https://github.com/GustavoMarques06) · [MIT](LICENSE) license.

</div>
