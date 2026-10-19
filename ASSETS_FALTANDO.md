# Núcleo Estelar — sprites que faltam

Lista para enviar à IA geradora de imagens. Os nomes de arquivo (em `código`) são os que o projeto vai esperar em `public/assets/sprites/`.

## Antes de tudo: regras para a IA (cole no início de cada pedido)

```
Pixel art 2D de ficção científica industrial para um tycoon espacial chamado "Núcleo Estelar".
Estilo idêntico ao de planetas.jpg e minerios.jpg: pixel art com contorno escuro grosso, sombreado em 3 tons,
cores vivas, brilho ciano/laranja/violeta nos elementos de energia e raros,
construções em vista isométrica. Paleta: fundo #0B0F1A, azul-escuro #1E2A44, ciano #00E5FF, laranja #FFB347,
vermelho #FF4D4D, verde #4CAF50, cinza-azulado #A0AEC0.
Cada sprite isolado, em PNG com TRANSPARÊNCIA REAL (canal alfa). NÃO desenhar quadriculado, fundo, legenda,
texto ou sombra projetada no chão. Um item por arquivo, centralizado, com 4 px de margem.
Sem anti-aliasing: bordas nítidas, pixels visíveis.
```

Se a IA só consegue entregar pranchas (várias imagens numa folha), tudo bem: eu recorto com o script, mas
peça **fundo cinza liso ou escuro, sem quadriculado, e espaço de pelo menos 16 px entre os itens**.

---

## A. Já extraído das duas pranchas atuais (planetas.jpg e minerios.jpg)

Em uso no jogo: 21 planetas/luas, asteroides, minérios (ferro, cobre, ouro), veios brilhantes, cristais e minerais brutos.
**Ainda não usados** (dá para recortar quando precisar, sem gerar nada): luas e planetas extras de `planetas.jpg`,
as galáxias/nebulosas/buraco negro/explosão da última linha de `planetas.jpg`, e mais ~140 rochas de tamanhos
variados de `minerios.jpg`. Os “nódulos brilhantes” da `minerios.jpg` vieram com o quadriculado preso ao brilho
e precisam ser regenerados com transparência real.

### Hoje o jogo usa marcadores provisórios (formas simples) para estes itens
`building-miner`, `building-solar`, `building-refinery`, `building-storage`, `building-factory`, `building-fission`,
`ship-cargo`, `drone-mining`. Basta colocar o sprite real em `public/assets/sprites/` com o mesmo nome para substituir.
Os ícones de recursos (créditos, ligas, energia, ciência, componentes) usam minerais brutos da `minerios.jpg`
e também podem ser trocados por ícones próprios.

---

## B. Precisa gerar — prioridade alta (primeira versão publicável)

### B1. Animação de mineração (a ação mais repetida do jogo)
Cada animação em **folha horizontal de quadros iguais** (ex.: 6 quadros de 64×64 lado a lado), em loop.

| Arquivo | Descrição | Quadros |
|---|---|---|
| `anim-drill` | Broca da mineradora girando/oscilando com faíscas | 6 |
| `anim-mining-beam` | Raio de mineração de um drone batendo no asteroide | 6 |
| `anim-sparks` | Faíscas de fundição | 6 |
| `anim-smoke` | Fumaça de chaminé subindo e dissolvendo | 8 |
| `anim-reactor-pulse` | Núcleo luminoso pulsando (reator) | 6 |
| `anim-solar-glint` | Brilho passando pelo painel solar | 6 |
| `anim-construct` | Estrutura sendo construída (andaime + faíscas) | 6 |
| `anim-rock-chip` | Fragmentos de rocha saltando ao clicar | 6 |
| `anim-upgrade-flash` | Clarão curto ao concluir pesquisa | 8 |

### B2. Asteroide jogável (hoje o sprite é pequeno e fica pixelado ao ampliar)
Pedir em **tamanho grande: 512×512**, para ser a peça central da tela.

| Arquivo | Descrição |
|---|---|
| `asteroid-main` | Asteroide inicial grande, com veios de ferro (cinza-laranja), cobre (verde-azulado) e ouro (amarelo) visíveis |
| `asteroid-main-damaged-1` … `-3` | O mesmo asteroide cada vez mais escavado (3 níveis) |
| `asteroid-ice` | Asteroide gelado (para extrator de gelo) |
| `asteroid-metallic` | Asteroide metálico denso (fase 2) |
| `asteroid-crystal-large` | Asteroide de cristais exóticos (fase 5) |

### B3. Ícones da interface
Todos 32×32, vista frontal, mesmo estilo dos ícones de recursos existentes.

| Arquivo | Descrição |
|---|---|
| `nav-overview`, `nav-mining`, `nav-industry`, `nav-energy`, `nav-market`, `nav-research`, `nav-civilization`, `nav-expansion`, `nav-catalog`, `nav-options` | Ícones do menu lateral (hoje reaproveito desenhos de prédios) |
| `icon-fuel`, `icon-oxygen`, `icon-exotic` | Combustível, oxigênio, material exótico |
| `icon-lock`, `icon-star`, `icon-arrow-up`, `icon-check`, `icon-warning`, `icon-error`, `icon-info` | Estados e alertas |
| `icon-sell`, `icon-buy`, `icon-automation`, `icon-storage-full`, `icon-no-power` | Ações e problemas de produção |
| `icon-ascension` | Dados de Ascensão (Projeto Ascensão) |

### B4. Peças de interface (UI)
| Arquivo | Descrição |
|---|---|
| `ui-panel-9slice` | Moldura de painel que pode esticar (48×48, bordas de 12 px) |
| `ui-card-9slice` | Cartão de item (48×48) |
| `ui-button-normal` / `-hover` / `-active` / `-disabled` | Botão em 4 estados, esticável (48×32, 9-slice) |
| `ui-button-buy` | Botão verde de compra (mesmos 4 estados) |
| `ui-tab-normal` / `-active` | Aba |
| `ui-progress-frame` / `ui-progress-fill` | Barra de progresso (pesquisa, offline) |
| `ui-tooltip-9slice` | Balão de dica |
| `ui-toast-info`, `-warn`, `-bad` | Fundo de notificações |
| `ui-divider`, `ui-scrollbar` | Detalhes |

### B5. Identidade e publicação na web
| Arquivo | Tamanho | Descrição |
|---|---|---|
| `logo-wide` | 512×128 | Logo horizontal "Núcleo Estelar" sem fundo |
| `favicon-32`, `favicon-192`, `favicon-512` | quadrados | Ícone do jogo (núcleo estelar estilizado) |
| `social-preview` | 1200×630 | Imagem de compartilhamento (arte principal + logo) |
| `loading-art` | 960×540 | Tela de carregamento |

---

## C. Precisa gerar — prioridade média (fases 2 a 4: energia, indústria, civilização)

### C1. Estruturas que o GDD cita e ainda não têm desenho
Isométricas, **128×128**, base em losango, mesma iluminação das existentes (luz vinda do alto-esquerda).

| Arquivo | GDD |
|---|---|
| `building-ice-extractor` | Extrator de gelo |
| `building-foundry` | Fundição de ligas (diferente da refinaria: fornalha e moldes) |
| `building-shipyard` | Estaleiro de drones e naves |
| `building-industrial-complex` | Complexo industrial automatizado (grande, 192×192) |
| `building-battery` | Baterias e armazenamento de energia |
| `building-orbital-collector` | Coletor solar orbital (painel flutuante com raio) |
| `building-power-grid` | Rede energética planetária (torre de transmissão) |
| `building-hospital` | Centro médico |
| `building-university` | Universidade |
| `building-market` | Entreposto comercial (para o mercado) |
| `building-comms` | Antena / centro de comunicação (expansão) |
| `building-maintenance` | Doca de drones de manutenção |

### C2. Evolução visual (princípio 5 do GDD: "a base muda de aparência ao crescer")
Para as **6 estruturas já em uso** (mineradora, painel solar, refinaria, armazém, fábrica, reator de fissão),
uma versão **nível 2** (maior, mais luzes) e **nível 3** (monumental, com detalhes dourados/ciano):
`building-miner-t2`, `building-miner-t3`, `building-solar-t2`, `building-solar-t3`, … (12 sprites).

### C3. Instâncias para a cena
| Arquivo | Descrição |
|---|---|
| `drone-mining-b`, `drone-transport`, `drone-maintenance` | Variações de drones (cada um 64×40) |
| `conveyor-h`, `conveyor-v` | Esteira entre refinaria e armazém (tile repetível, 32×16, 4 quadros) |
| `pipe-energy-h`, `pipe-energy-v`, `pipe-energy-corner` | Cabos de energia pulsando (tile repetível, 4 quadros) |
| `deco-antenna`, `deco-crates`, `deco-lamp`, `deco-flag` | Enfeites para a superfície do asteroide |
| `person-walk-*` | Colonista andando (4 direções × 4 quadros, 32×32) para as colônias |

---

## D. Precisa gerar — prioridade baixa (fases 5 e 6: expansão e megaprojetos)

### D1. Mundo procedural (seção 8 do GDD)
Planetas sozinhos não bastam para gerar variedade. Peça:
| Arquivo | Descrição |
|---|---|
| `planet-atmosphere-*` (azul, laranja, verde, roxo) | Halo de atmosfera para sobrepor (256×256, translúcido) |
| `planet-clouds-1`, `-2`, `-3` | Camadas de nuvens translúcidas |
| `planet-ring-*` (2 estilos) | Anéis separados, para combinar com qualquer planeta |
| `star-red-dwarf`, `star-yellow`, `star-blue-giant`, `star-white-dwarf`, `star-neutron` | Estrelas por tipo (o Sol já existe) |
| `planet-terrain-*` (rochoso, gelo, deserto, oceano, selva, vulcânico, alienígena) | Cena de superfície (512×288) como fundo da tela de cada planeta |
| `region-icon-*` | Ícone por tipo de local (asteroide, planeta, estação, nebulosa, anel) para o mapa |

### D2. Megaprojetos e cenas de fim de jogo
| Arquivo | Descrição |
|---|---|
| `mega-dyson-swarm-1` … `-4` | Enxame de Dyson em 4 estágios ao redor de uma estrela (512×512) |
| `mega-gate` | Portal / propulsão avançada |
| `mega-orbital-ring` | Anel orbital planetário |
| `scene-system-map` | Mapa do sistema solar para a tela de expansão |
| `scene-galaxy-map` | Mapa galáctico (para o fim do jogo) |

### D3. Eventos espaciais (seção 15 do GDD)
`event-comet`, `event-meteor-shower`, `event-solar-flare`, `event-derelict-ship`, `event-trader`
(cartões 128×128 para a notificação do evento).

### D4. Minerais — o que falta
Os minerais brutos já existem em `minerios.jpg`. Faltam os **lingotes/produtos processados** (32×32, para as cadeias de produção):
`ingot-iron`, `ingot-copper`, `ingot-gold`, `ingot-aluminum`, `ingot-titanium`, `ingot-steel`, `ingot-alloy`,
`item-circuit`, `item-battery`, `item-motor`, `item-robot-part`.

---

## E. Planos de fundo (parallax)
Três camadas que se repetem lado a lado (tile horizontal, 1024×512):
`bg-stars-far`, `bg-stars-near`, `bg-nebula-blue`, `bg-nebula-purple`, `bg-nebula-orange`, `bg-dust`.
As galáxias e nebulosas do `planetas.jpg` podem servir como base; me avise se quiser aproveitá-las.

---

## Ordem sugerida (o que refazer está em pedidos-de-arte/REFAZER.md)

Peça primeiro **as 6 estruturas atuais (hoje provisórias) + B2 (asteroide grande) + B1 (animações) + B4 (UI) + B5 (logo e favicon)**.
São os grupos que mais mudam a aparência do jogo e os exigidos para publicar na web. As naves, personagens e
estruturas de civilização, que antes existiam nas pranchas antigas, agora também precisam ser geradas.
