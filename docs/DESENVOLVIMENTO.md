# Núcleo Estelar: guia de desenvolvimento

Tycoon espacial idle em pixel art para navegador. Design completo em [nucleo_estelar_gdd.md](../nucleo_estelar_gdd.md).

## Rodando

```bash
npm install
npm run dev        # servidor de desenvolvimento (http://localhost:5173)
npm test           # testes da economia, salvamento e formatação
npm run build      # gera a versão de produção em dist/ (e remove/recomprime os sprites: scripts/optimize-dist.mjs)
npm run preview    # serve dist/ localmente
npm run check      # tsc + testes
npm run audit      # exports sem uso, ciclos de importação, arquivos grandes
```

## Stack

| Camada | Tecnologia |
|---|---|
| Build | Vite + TypeScript |
| Interface (painéis, menus) | React |
| Cena pixel art | PixiJS 8 (carregado sob demanda) |
| Estado | Zustand |
| Testes | Vitest |
| Fontes | VT323 (texto) e Press Start 2P (títulos), empacotadas via Fontsource |

## Estrutura

```
Assets/                    pranchas de arte originais (fonte dos sprites)
scripts/
  extract-sprites.mjs      recorta os sprites das pranchas e remove o fundo
  sprites.manifest.json    coordenadas de cada sprite nas pranchas
public/assets/sprites/     sprites gerados (versionados; o deploy não precisa do sharp)
src/
  game/
    data/                  balanceamento: recursos, estruturas, melhorias, minerais
    engine/                lógica pura (simulação, custos, salvamento, offline, conselheiro)
    store.ts               estado global e loop de simulação (4 Hz, separado da renderização)
    events.ts              eventos para efeitos visuais
  render/GameScene.ts      cena PixiJS (asteroide, estruturas, drones, naves)
  ui/                      componentes React
```

Para adicionar uma estrutura ou melhoria, basta incluir uma entrada em `src/game/data/`: a simulação,
os painéis e o conselheiro funcionam a partir desses dados.

### Sistemas de jogo

| Sistema | Dados | Lógica |
|---|---|---|
| Jazida: crosta infinita + veios de minério (prospecção, foco, titânio e cristais) | `data/deposit.ts` | `engine/deposit.ts`, `ui/panels/DepositSection.tsx` |
| Estruturas (35), receitas alternativas e cadeia de 3 níveis (módulos) | `data/buildings.ts` | `engine/economy.ts` |
| Árvore de pesquisa (47, fases 1–6) | `data/upgrades.ts` | `engine/modifiers.ts` |
| População, comida, mão de obra e impostos | `data/resources.ts` (BALANCE) | `engine/economy.ts` |
| Expedições, locais procedurais e colônias | `data/locations.ts` | `engine/expansion.ts` |
| Megaprojetos (entrega parcial de materiais) | `data/megaprojects.ts` | `engine/progression.ts` |
| Eventos espaciais | `data/events.ts` | `engine/progression.ts` |
| Projeto Ascensão e melhorias permanentes | `data/ascension.ts` | `engine/progression.ts` |
| Mapa estelar (setores de 24 locais) | `ui/mapLayout.ts` | `ui/MapView.tsx` |
| Facções: relação (contato → tratado → aliança → irmandade), pedidos, rivalidade e tensão | `data/factions.ts`, `data/events.ts` | `engine/factions.ts`, `engine/expansion.ts` |
| Terraformação (5 níveis por colônia) | — | `engine/expansion.ts` |
| Crises de colônia (seca, agitação, ataque, praga) | `data/crises.ts` | `engine/crises.ts` |
| Rotas comerciais entre colônias | `data/locations.ts` (ROUTE, `need`) | `engine/routes.ts` |
| Mercado dinâmico: preços que oscilam + demanda que satura ao vender e se recupera | `data/market.ts` | `engine/market.ts` |
| Manutenção, dívida, inflação e custo das colônias | `data/balance.ts` | `engine/upkeep.ts`, `engine/modifiers.ts` |
| Influência (embaixadas), decretos e campanhas diplomáticas | `data/decrees.ts` | `engine/decrees.ts`, `engine/factions.ts` |
| Reputação comercial, contratos urgentes, bloqueio e seguro de rotas | `data/crises.ts` | `engine/contracts.ts`, `engine/routes.ts` |
| Balanço (fluxo por origem e histórico) | — | `economy.ts` (flows), `ui/panels/FinancePanel.tsx` |
| Modo foco (sem cena, atualização lenta) | — | `ui/FocusBoard.tsx`, `store.ts` |
| Drones de logística (5 funções) | `data/drones.ts` | `engine/drones.ts`, `engine/contracts.ts` |
| Singularidade e Transcendência (fim de jogo) | `data/transcendence.ts` | `engine/progression.ts` |
| Pesquisas contínuas (sem nível máximo) | `data/repeatables.ts` | `engine/progression.ts` |
| Contratos comerciais | — | `engine/contracts.ts` |
| Conquistas (+2% de produção cada, permanentes) | `data/achievements.ts` | `engine/progression.ts` |
| Diário de bordo (13 registros de história) | `data/story.ts` | `engine/progression.ts` (checkStory), `ui/Overlays.tsx` |
| Salvamento seguro: backup, exportar/importar, recuperação | — | `engine/save.ts`, `ui/panels/OptionsPanel.tsx` |
| Dicas de primeira vez | `data/tips.ts` | `ui/Tips.tsx` |
| Efeitos sonoros (Web Audio, sem arquivos) | — | `src/audio/` (sfx.ts, music.ts) |

### O jogo é infinito

Dentro de uma jornada, o **Núcleo Estelar** (megaprojeto liberado após o Enxame de Dyson) não tem último estágio,
as pesquisas contínuas não têm nível máximo e cada local descoberto é mais rico que o anterior (espaço profundo).
Entre jornadas, a Ascensão dá melhorias permanentes, várias sem limite de nível.

### Balanceamento

O ritmo geral fica em `src/game/data/balance.ts` (crescimento de custos, custo de ciência por fase, megaprojetos,
contratos). 
`engine/bot.ts` é um jogador automático usado só nos testes. `engine/progression.test.ts` faz o bot jogar a
jornada inteira e falha se a progressão travar ou sair do ritmo esperado (primeira Ascensão entre 18 h e 60 h de jogo
ativo do bot — uma pessoa leva mais; a segunda jornada, com melhorias permanentes, mais rápida). Rode `npm test` depois de mexer em números.

`engine/pacing.test.ts` repete a jornada com três perfis de jogador (ideal, casual e ocioso) e mostra o tempo de cada marco:
hoje a primeira Ascensão leva ~20 h (ideal), ~28 h (casual, algumas visitas por hora) e ~50 h (ocioso, uma visita por hora).
O jogo recompensa a atenção, mas não a exige.

## Sprites

A arte vem de duas pranchas em `Assets/`: `planetas.jpg` e `minerios.jpg` (as pranchas anteriores foram
arquivadas em `Assets/_antigos/`, fora do jogo). Elas trazem o quadriculado de transparência desenhado dentro
da imagem, então o script remove o fundo. Os recortes são descritos em `scripts/sprites.manifest.json`:

- `mode: circle`: planetas redondos (`circle: [cx, cy, r]` fixa o círculo à mão);
- `mode: checker`: formas irregulares dentro de um retângulo;
- `mode: component`: detecta o objeto que contém o pixel `seed: [x, y]` (usado em `minerios.jpg`).

```bash
npm run sprites                                                  # regenera public/assets/sprites (as duas fontes abaixo) e cria marcadores provisórios
node scripts/extract-sprites.mjs --discover minerios out.png 80  # folha numerada de todos os objetos de uma prancha
```

Pranchas de **fundo magenta** (`pedido*.jpg`; o que precisa ser refeito está em `../pedidos-de-arte/REFAZER.md`) usam outro script,
`scripts/extract-keyed.mjs`, com `scripts/keyed.manifest.json`: recortes por grade (`grids`), por região (`items`),
por ponto dentro do objeto (`at`) e faixas de quadros de animação (`strips`).
`node scripts/extract-keyed.mjs --discover <prancha> out.png` lista os objetos de uma prancha.

Se algum sprite do jogo ainda não existir em nenhuma prancha, `scripts/make-placeholders.mjs` cria formas simples
para eles. Ao colocar o sprite real em `public/assets/sprites/` com o mesmo nome, ele substitui o marcador.
A lista do que falta gerar está em [ASSETS_FALTANDO.md](../ASSETS_FALTANDO.md).

## Publicação

`npm run build` gera um site estático em `dist/` com caminhos relativos, então ele funciona em
qualquer hospedagem estática:

- **Vercel / Netlify / Cloudflare Pages:** comando de build `npm run build`, pasta de saída `dist`.
- **GitHub Pages:** publique o conteúdo de `dist/` (por exemplo, com a action `actions/deploy-pages`).
- **itch.io:** compacte o conteúdo de `dist/` em um .zip e envie como jogo HTML.

O progresso fica salvo no `localStorage` do navegador do jogador. Nenhum servidor é necessário.

## Idiomas (tradução)

O texto-fonte do jogo é o **português**: ele é a própria chave do dicionário. No código:

- `t('Texto {n}', { n: 3 })` devolve o texto no idioma atual; `tp(n, '{n} rota', '{n} rotas')` faz plural;
  `<Tx k="Texto com <b>negrito</b>" v={{ ... }} />` traduz texto com marcação simples.
- Campos de dados (`name`, `desc`, `text`…) ficam em português nos arquivos de `game/data/` e são traduzidos **na tela**:
  `t(def.name)`. Descrições que dependem de nível ou de números usam `t()` dentro da própria função.
- Os marcadores `{nome}` precisam ser ASCII (`\w+`) e iguais no inglês.
- O inglês fica em `src/i18n/en/{ui,data,content}.ts`. Textos que chegam ao `t()` por variável (tabelas) entram em `src/i18n/extra.ts`.

`npm test` roda `src/i18n/coverage.test.ts`: ele varre o código e os dados e **falha se algum texto não tiver tradução**,
se os marcadores divergirem ou se sobrarem traduções órfãs. Para listar o que falta:
`I18N_DUMP=falta.json npx vitest run src/i18n`. As ferramentas `scripts/i18n-scan.cjs` (acha texto ainda sem `t()`),
`scripts/i18n-wrap.cjs` (trocas exatas em vários arquivos) e `scripts/i18n-merge.cjs` (junta traduções ao dicionário) ajudam na rotina.
Jogando em inglês, `window.__i18nMissing` lista os textos que ainda cairam para o português.

As preferências de idioma, tamanho do texto, daltonismo, contraste e atalhos ficam em `localStorage` (`nucleo-estelar/prefs`),
fora do save do jogo.
