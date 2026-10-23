# Logos do jogo — identidade nova

> **RESOLVIDO.** Usados: o símbolo (A), as letras do letreiro (B, sem o emblema, que veio errado) e o favicon (E). O letreiro, o ícone do app e a imagem de compartilhamento são montados por `scripts/make-logos.mjs` a partir do símbolo; C e D não foram usados (emblema diferente do A).

## Por que refazer

Hoje o jogo usa duas imagens:
- `logo-wide` (barra do topo, README, tela de carregamento): uma bola de fogo genérica ao lado de "NÚCLEO ESTELAR"
  numa fonte reta ciano, sem nada que lembre mineração, asteroide ou estrela.
- `favicon-core` (ícone da aba do navegador): uma engrenagem azul com 64 px que, no tamanho real da aba (16 px),
  vira uma mancha.

Os dois são **desenhos diferentes**, então o jogo não tem um símbolo reconhecível. E faltam ícones de app (tela
inicial do celular, atalho), que precisam de fundo próprio e de um desenho legível pequeno.

**A ideia:** um **símbolo único** usado em tudo — no letreiro, no ícone do app e no ícone da aba.

### O conceito do símbolo

"Núcleo Estelar" é o coração de uma estrela escondido dentro de um asteroide que o jogador escava. O símbolo junta
as duas coisas: **um asteroide facetado, aberto ao meio por uma fenda, com um núcleo estelar brilhando lá dentro**
(branco no centro, ciano e laranja em volta), cortado por **um anel orbital fino** em diagonal. Silhueta simples e
forte, que funcione até em 16 px.

---

## Regras (cole no início de TODO pedido)

```
Pixel art 2D de ficção científica para a identidade visual do jogo "Núcleo Estelar", um tycoon espacial de mineração.
Mesmo estilo das imagens anexadas: contorno escuro grosso, sombreado em 3–4 tons, cores saturadas, pixels nítidos.
Paleta: azul-marinho #0B0F1A, azul-escuro #1E2A44, ciano #00E5FF, laranja #FFB347, dourado #FFD447, branco.
REGRAS OBRIGATÓRIAS:
- Fundo: UMA cor sólida #FF00FF (magenta puro), sem degradê, sem quadriculado, sem textura, sem estrelas
  (exceto onde o pedido disser "com fundo").
- Brilhos e halos ficam colados ao desenho (no máximo 8 px para fora), nunca espalhados pelo fundo.
- Não use magenta, rosa ou roxo-avermelhado no desenho (o fundo magenta é removido por cor).
- Um item por imagem, centralizado, com pelo menos 48 px de folga em todos os lados (nada encostando na borda).
- Sem sombra projetada. Sem anti-aliasing: pixels nítidos.
```

Anexe como referência de estilo: `asteroid-layer-6`, `mega-core-3` e `star-orange` (em `public/assets/sprites/`).

---

## Pedido A — o símbolo  → `logo-simbolo.jpg`

```
O SÍMBOLO do jogo, sozinho, sem nenhum texto, num quadrado de 1024 × 1024 px:
um asteroide facetado cinza-azulado, rachado ao meio por uma fenda irregular; de dentro da fenda escapa a luz de um
núcleo estelar (branco no centro, ciano e laranja nas bordas), com raios curtos saindo pela rachadura. Um anel
orbital fino, dourado, atravessa o asteroide na diagonal (passa por trás no alto e pela frente embaixo).
Formas grandes e poucas: precisa continuar reconhecível reduzido a 32 × 32 px.
NENHUM texto, letra ou número.
```

## Pedido B — letreiro horizontal  → `logo-horizontal.jpg`

Anexe também o resultado do pedido A.

```
O LETREIRO do jogo: o símbolo anexado à esquerda e, à direita, o nome escrito EXATAMENTE assim, em duas linhas:
NÚCLEO
ESTELAR
(atenção ao acento agudo no Ú; não troque letras, não acrescente nada).
Letras em pixel art grossas e largas, com cara de metal industrial: face ciano-clara com reflexo branco no alto,
lateral azul-escura dando volume (bisel), contorno escuro grosso; pequenos rebites ou cortes de chapa nas letras.
A palavra NÚCLEO um pouco maior que ESTELAR. O brilho do núcleo do símbolo ilumina levemente a borda das letras.
Formato bem largo, cerca de 3 : 1 (por exemplo 1536 × 512 px). Nada além do símbolo e das duas palavras.
```

## Pedido C — letreiro empilhado  → `logo-vertical.jpg`

Anexe o resultado dos pedidos A e B.

```
A MESMA identidade dos anexos, empilhada: o símbolo grande em cima, centralizado, e embaixo o nome em duas linhas
centralizadas, EXATAMENTE "NÚCLEO" e "ESTELAR" (com o acento no Ú), com as mesmas letras do letreiro anexado.
Formato quase quadrado, cerca de 1024 × 1152 px. Nada além do símbolo e das duas palavras.
```

## Pedido D — ícone do app (com fundo)  → `logo-icone-app.jpg`

```
O ÍCONE DO APP do jogo, num quadrado de 1024 × 1024 px, COM FUNDO (este pedido não usa magenta):
o símbolo anexado grande e centralizado, ocupando cerca de 70% do quadrado, sobre um fundo de espaço azul-marinho
(#0B0F1A) com um brilho ciano suave atrás do símbolo e algumas estrelas pequenas.
O fundo ocupa o quadrado inteiro, de borda a borda, sem moldura e sem cantos arredondados (o sistema arredonda).
Nada importante a menos de 10% da borda (o celular corta os cantos). NENHUM texto.
```

## Pedido E — ícone pequeno da aba  → `logo-favicon.jpg`

```
Versão SIMPLIFICADA do símbolo anexado para ícone de navegador: um quadrado de 512 × 512 px desenhado como se fosse
uma grade de 32 × 32 pixels grandes (cada pixel do desenho = um bloco de 16 × 16 px).
Só o essencial: a silhueta do asteroide, a fenda com o núcleo brilhante (branco e ciano) e o anel dourado.
Contorno escuro de 1 pixel da grade, no máximo 6 cores. Fundo #FF00FF (magenta puro). NENHUM texto.
```

---

## Dicas

- A IA costuma errar o texto: se vier "NUCLEO" sem acento, letras trocadas ou palavras a mais, repita o pedido B
  colando de novo **"exatamente NÚCLEO e ESTELAR, com acento no Ú"**.
- Se o símbolo sair muito detalhado, peça: **"menos detalhes, formas maiores, legível em 32 px"**.
- Faça o A primeiro e só siga para os outros quando o símbolo estiver bom: todos dependem dele.

## O que eu faço quando as imagens chegarem

Coloque em `Assets/` com esses nomes e me avise. Eu:
1. Recorto o letreiro para a barra do topo (`logo-wide`), o README e a tela de carregamento.
2. Gero o ícone da aba em 16, 32 e 48 px a partir do pedido E.
3. Gero os ícones de app (180 px para iPhone, 192 e 512 px para Android e atalhos) a partir do pedido D e coloco no
   `index.html`, para o jogo poder ser instalado na tela inicial com o ícone certo.
