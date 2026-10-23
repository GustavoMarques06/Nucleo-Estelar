# Tela de carregamento — arte nova

> **RESOLVIDO.** As duas ilustrações estão no jogo (as faixas pretas foram cortadas); o logo e a barra entram por código.

## Por que refazer

A tela atual (`public/assets/art/loading-art.jpg`) tem quatro problemas:

1. **Não mostra o jogo:** o asteroide é genérico, sem a base, as plataformas e as estruturas; Aurora e a frota não
   aparecem. Galáxias e planetas soltos pelos cantos poluem a imagem.
2. **Texto desenhado na imagem:** "CARREGANDO SISTEMA..." fica em português mesmo com o jogo em inglês.
3. **Interface desenhada na imagem:** a moldura da barra e a borda cinza em volta da tela são parte do desenho, e a
   barra de verdade precisa ser encaixada por cima, numa posição fixa.
4. **Formato único:** a imagem é 16:9; no celular em pé ela vira uma faixa pequena no meio da tela.

**O que muda:** a IA entrega **só a ilustração de fundo**, sem texto, sem logo e sem interface. O logo (`logo-wide`) e
a barra de carregamento entram por código, traduzidos e ajustados a qualquer tamanho de tela.

---

## Pedido A — ilustração principal (paisagem)  → `loading-paisagem.jpg`

Anexe como referência: `asteroid-layer-6`, `aurora-3`, `building-miner-t2`, `building-refinery`, `ship-freighter`,
`drone-mining` (em `public/assets/sprites/`) e `bg-nebula-blue` (em `public/assets/art/`).

```
Ilustração de tela de carregamento em pixel art 2D de ficção científica para o jogo "Núcleo Estelar", um tycoon
espacial de mineração. Mesmo estilo das imagens anexadas: contorno escuro, sombreado em 3–4 tons, cores saturadas,
pixels nítidos, luz principal vindo da esquerda.

CENA:
- No centro, um pouco à direita: um grande asteroide escavado em camadas (como o anexado), com uma base de mineração
  em cima — plataformas metálicas, mineradoras com brocas, uma refinaria com chaminé, painéis solares e luzes
  laranja e ciano acesas. Um feixe de mineração ciano desce para dentro de uma fenda brilhante na rocha.
- Atrás do asteroide, à esquerda e mais distante: Aurora, um planeta azul e verde com nuvens e luzes de cidade no
  lado escuro (como o anexado).
- Entre os dois: duas ou três naves de carga pequenas e alguns drones indo e voltando, com rastros ciano curtos.
- Fundo: espaço escuro azul-marinho (#0B0F1A) com uma nebulosa azul e violeta suave e estrelas pequenas.
  No máximo um sol distante. NADA de galáxias espirais, planetas extras soltos ou objetos nos cantos.

COMPOSIÇÃO (muito importante):
- Formato paisagem 16:9, no maior tamanho que você conseguir (mínimo 1920 × 1080).
- Tudo o que importa (asteroide, base, Aurora) fica dentro do TERÇO CENTRAL da largura, para a imagem poder ser
  cortada nas laterais em telas estreitas sem perder nada.
- Deixe o TERÇO DE CIMA mais vazio e escuro (só céu e nebulosa): ali entra o logo do jogo.
- Deixe uma FAIXA DE BAIXO (cerca de 18% da altura) escura e limpa: ali entra a barra de carregamento.

REGRAS OBRIGATÓRIAS:
- NENHUM texto, letra, número, logo, título ou legenda em lugar nenhum da imagem.
- NENHUMA interface: sem barra de carregamento, sem moldura, sem botões, sem borda em volta da imagem.
- A cena ocupa a imagem inteira, de borda a borda.
- Sem anti-aliasing exagerado e sem desfoque: pixel art nítida.
```

## Pedido B — ilustração para celular (retrato)  → `loading-retrato.jpg`

Mesma cena e mesmas referências do pedido A, com a composição adaptada à tela em pé. Cole:

```
A MESMA cena da imagem anexada (anexe o resultado do pedido anterior), agora em formato RETRATO 9:16, no maior
tamanho que você conseguir (mínimo 1080 × 1920), mesmo estilo de pixel art.
- O asteroide com a base fica no centro, ocupando cerca de 60% da largura.
- Aurora aparece em cima, menor e mais distante, parcialmente atrás do asteroide.
- Naves e drones em volta do asteroide.
- O QUARTO DE CIMA fica mais vazio e escuro (ali entra o logo); a FAIXA DE BAIXO (cerca de 15% da altura) fica
  escura e limpa (ali entra a barra de carregamento).
REGRAS: nenhum texto, nenhum logo, nenhuma interface, nenhuma moldura; a cena ocupa a imagem inteira.
```

---

## Dicas

- Se a IA insistir em escrever o nome do jogo, repita no fim do pedido: **"sem nenhum texto, sem o nome do jogo"**.
- Se ela desenhar uma barra de carregamento ou uma moldura, peça de novo reforçando: **"só a ilustração, sem
  nenhum elemento de interface"**.
- O pedido B é opcional: sem ele, o celular usa um corte do pedido A (por isso a regra do terço central).

## O que eu faço quando as imagens chegarem

Coloque em `Assets/` com esses nomes e me avise. Eu:
1. Uso a ilustração como fundo da tela inteira (paisagem no computador, retrato no celular).
2. Ponho o logo `logo-wide` no espaço de cima.
3. Refaço a barra de carregamento em código com a moldura do jogo e o texto "Carregando…" traduzido.
