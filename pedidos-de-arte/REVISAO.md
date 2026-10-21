# Revisão de arte — 3 pedidos

Uma varredura nos sprites do jogo achou itens com defeito ou que não funcionam no tamanho em que aparecem.
Cole as **regras** no início de cada pedido e anexe 2–3 imagens que já existem como referência de estilo
(indicadas em cada pedido).

## Regras (cole no início de TODO pedido)

```
Pixel art 2D de ficção científica para o jogo "Núcleo Estelar", no mesmo estilo das imagens anexadas:
contorno escuro grosso, sombreado em 3–4 tons, cores saturadas, luz do alto-esquerda.
REGRAS OBRIGATÓRIAS:
- Fundo: UMA cor sólida #FF00FF (magenta puro), sem degradê, sem quadriculado, sem textura, sem estrelas,
  sem cenário e sem moldura. Nada de quadro ou retângulo de fundo atrás do objeto.
- NENHUM texto, letra, número, legenda ou rótulo em lugar nenhum da imagem.
- Cada item isolado, com pelo menos 32 px de espaço magenta ao redor, sem encostar em outro item nem na borda
  da imagem (nada pode ser cortado pela borda).
- Brilhos e rastros ficam colados ao objeto (no máximo 8 px para fora), nunca espalhados pelo fundo.
- Não use magenta, rosa ou roxo-avermelhado no objeto (o fundo magenta é removido por cor).
- Sem sombra projetada. Sem anti-aliasing: pixels nítidos.
- Todos os itens do pedido com o MESMO tamanho, numa única linha, na ordem pedida (esquerda para a direita).
  Sem repetir nem acrescentar.
```

Dica: se a IA errar a ordem, a quantidade ou fizer duas fileiras, peça **um item por imagem**.

---

## Pedido A — ícones de recurso  → `revisao-recursos.jpg`

Aparecem **o tempo todo** na barra de recursos, em tamanho pequeno (16–28 px) e sobre fundo azul-marinho escuro.
Por isso: **silhueta simples e reconhecível, cores claras e contrastadas, poucos detalhes**, cada um com uma cor
dominante diferente dos outros. Cerca de 256 × 256 px cada. Anexe `icon-credits`, `icon-fuel` e `item-module`.

1. **Água** — uma gota d'água grande, azul-claro brilhante, com reflexo branco. (Hoje a água usa um cristal
   ciano e se confunde com o ícone de Cristais.)
2. **Ferro** — um pedaço de minério cinza-claro com faces metálicas e veios prateados brilhantes. (O atual é
   uma mancha escura que some no fundo.)
3. **Cobre** — uma pepita de cobre alaranjado-avermelhado bem viva, com brilho metálico e pontos verde-água de
   oxidação. (O atual parece uma pedra marrom.)
4. **Ligas** — três barras de metal empilhadas, azul-acinzentadas e brilhantes, com uma faixa ciano na lateral.
   (O atual é um quadrado cinza liso que parece um espaço vazio.)
5. **Prata** — um lingote de prata branco-azulado muito brilhante, com reflexo forte. (O atual tem 20 px e
   vira um borrão.)
6. **Escória** — um montinho de resíduo cinza-escuro e marrom com fumaça clara saindo, bem diferente das
   pedras de minério. (O atual é uma mancha escura.)

Nomes dos sprites: `icon-water`, `ore-iron`, `ore-copper`, `item-alloy`, `ore-silver`, `icon-slag`.

## Pedido B — era, prédio e eventos  → `revisao-cenas.jpg`

Cerca de 384 × 384 px cada. Anexe `era-ecumene`, `building-storage` e `event-comet`.

1. **Civilização Estelar** (última era da civilização) — uma estação-cidade flutuante em forma de estrela de
   quatro pontas, com torres douradas, luzes ciano e pequenas naves em volta. **Recortada como as outras eras**
   (o `era-stellar` atual veio com um quadrado de fundo roxo-escuro).
2. **Tanque de fluidos** (prédio, vista isométrica como os outros prédios) — dois tanques cilíndricos de metal
   ligados por canos, um com faixa azul (água) e outro com faixa laranja (combustível), válvulas e uma escada.
   (Hoje o prédio usa uma válvula solta, cortada no alto.)
3. **Chuva de meteoros** (evento) — 4 ou 5 meteoros de rocha com rastro ciano e laranja, **sem céu e sem
   fundo** atrás. (O atual é uma pintura retangular com céu, diferente dos outros eventos.)
4. **Explosão solar** (evento) — uma labareda solar em arco, laranja e amarela, saindo de um pedaço curvo da
   superfície da estrela, **sem céu e sem fundo** atrás. (O atual é uma pintura retangular.)

Nomes dos sprites: `era-stellar`, `building-tank`, `event-meteor-shower`, `event-solar-flare`.

## Pedido C (opcional) — evento "Greve na base"  → `revisao-greve.jpg`

**Um item só**, mesmo tamanho do Pedido B. Hoje esse evento usa a arte da chuva de meteoros, que não tem nada a
ver. Anexe `char-colonist` e `event-trader`.

1. **Greve** — três trabalhadores de macacão laranja e capacete, de braços cruzados, na frente de uma esteira
   industrial parada, com uma placa em branco levantada (a placa **sem texto**).

Nome do sprite: `event-strike`.

---

## Depois de gerar (para quem integrar)

1. Salve as imagens em `Assets/`, registre as pranchas em `scripts/keyed.manifest.json` (como as de
   megaprojetos) e rode `node scripts/extract-keyed.mjs --only "<nomes>"`. Os sprites `ore-iron`, `ore-copper`,
   `item-alloy`, `era-stellar`, `event-meteor-shower` e `event-solar-flare` **já existem** em outras pranchas:
   ponha `null` no lugar desses nomes nas grades antigas, senão `npm run sprites` volta a arte velha.
2. `src/game/data/resources.ts`: água → `icon-water`; escória → `icon-slag`.
3. `src/game/data/minerals.ts`: prata → `ore-silver`.
4. `src/game/data/buildings.ts`: o `tank` passa a usar `building-tank`.
5. `src/game/data/chains.ts`: os dois passos da greve (`strike`, `strikeRiot`) passam a usar `event-strike`.
6. A pesquisa **Extração de gelo** (`src/game/data/upgrades.ts`, `iceMining`) também usa `node-cyan`; vale
   trocar para `icon-water`.
7. Depois de trocar, `deco-valve` e `raw-silver-ingot` sobram sem uso e podem ser apagados (também das grades
   do manifesto). **Não apague** `node-cyan` (ícone do mineral cianita) nem `raw-brown-chunk` (usado na cena da base).
