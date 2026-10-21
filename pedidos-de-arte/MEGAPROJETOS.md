# Arte dos megaprojetos — 5 pedidos

Os megaprojetos grandiosos agora aparecem no **mapa estelar** e, ao clicar, ocupam o **centro da cena** (como os
planetas do mapa e o Aurora). Isso expôs três problemas da arte atual:

- os sprites são pequenos (o primeiro estágio do Dyson tem 100 × 51 px) e ficam quadriculados quando ampliados na cena;
- o **Núcleo Estelar** usa estrelas comuns (`star-orange`, `star-yellow`, `star-blue-giant`, `star-white-dwarf`),
  sem nada de artificial, e a `star-yellow` veio **cortada** do lado direito;
- a **Singularidade** não tem arte própria: cada estágio pega emprestado o sprite de outro megaprojeto
  (portal, propulsor, anel, estrela de nêutrons, Dyson);
- o **Anel orbital** traz um planeta azul desenhado no meio, que hoje é apagado com uma máscara para o Aurora
  ocupar o lugar.

Cole as **regras** no início de cada pedido e anexe 2–3 imagens que já existem (ex.: `mega-dyson-4`, `aurora-5`,
`mega-orbital-ring`) para a IA copiar o estilo.

## Regras (cole no início de TODO pedido)

```
Pixel art 2D de ficção científica para o jogo "Núcleo Estelar", no mesmo estilo das imagens anexadas:
contorno escuro grosso, sombreado em 3–4 tons, cores saturadas, luz do alto-esquerda.
REGRAS OBRIGATÓRIAS:
- Fundo: UMA cor sólida #FF00FF (magenta puro), sem degradê, sem quadriculado, sem textura, sem estrelas, sem nebulosa.
- NENHUM texto, letra, número, legenda, nome ou rótulo em lugar nenhum da imagem.
- Cada item isolado, com pelo menos 32 px de espaço magenta ao redor, sem encostar em outro item nem na borda.
- Brilhos, halos e raios de luz ficam colados ao objeto (no máximo 8 px para fora), nunca espalhados pelo fundo.
- Sem sombra projetada. Sem anti-aliasing: pixels nítidos.
- Todos os itens do pedido com o MESMO tamanho (cerca de 512 × 512 px cada), centralizados no seu quadro,
  vistos do MESMO ângulo, numa única linha, na ordem pedida (esquerda para a direita). Sem repetir nem acrescentar.
```

Dica: se a IA errar a ordem ou a quantidade, peça **um item por imagem**. Para as sequências (Dyson, Núcleo,
Singularidade), anexe o item anterior ao pedir o próximo, para manter tamanho e ângulo.

---

## Pedido A — Enxame de Dyson em 4 estágios  → `mega-dyson.jpg`

A **mesma estrela amarela** no centro, sempre do mesmo tamanho e na mesma posição; o que muda é a estrutura em volta.
A estrela ocupa cerca de 40% da largura do quadro. A troca de um estágio para o seguinte deve parecer obra avançando.

1. **Primeiros coletores** — a estrela quase nua, com 6 a 8 painéis coletores pequenos (placas azul-ciano com moldura
   cinza) flutuando em volta dela, em órbitas diferentes.
2. **Anéis de coletores** — os painéis se juntam em 2 anéis finos inclinados que cruzam a frente e as costas da estrela.
3. **Casca parcial** — metade da esfera coberta por placas hexagonais azuis com moldura dourada; a outra metade ainda
   aberta, mostrando a estrela brilhando pelos buracos.
4. **Esfera completa** — esfera inteira de anéis dourados e placas azuis, a estrela visível só pelas frestas, com um
   módulo de controle redondo preso na borda direita.

Nomes dos sprites: `mega-dyson-1` … `mega-dyson-4` (substituem os atuais).

## Pedido B — Núcleo Estelar em 4 eras  → `mega-core.jpg`

Uma **estrela artificial**: um núcleo de energia preso dentro de uma estrutura de contenção metálica, que cresce a
cada era. Mesmo tamanho e ângulo nos quatro. O brilho do núcleo muda de cor conforme fica mais poderoso.

1. **Ignição** — um núcleo laranja do tamanho de uma bola, dentro de uma gaiola simples de 3 vigas cinza com
   luzes azuis.
2. **Estrela contida** — núcleo amarelo maior, envolto por 2 anéis de contenção metálicos cruzados e 4 pilares de
   energia apontando para ele.
3. **Gigante azul** — núcleo azul-claro brilhante, 3 anéis grossos girando em ângulos diferentes, placas de escudo
   hexagonais parciais.
4. **Coração do império** — núcleo branco-violeta intenso, estrutura de contenção completa e ornamentada com detalhes
   dourados, pequenas naves de manutenção em volta.

Nomes dos sprites: `mega-core-1` … `mega-core-4`.

## Pedido C — Anel orbital sem planeta  → `mega-ring.jpg`

**Um item só.** O mesmo anel-cidade do `mega-orbital-ring` atual (anexe ele), visto levemente de cima, **mas sem o
planeta no meio**: o miolo do anel é **magenta vazio**. O buraco do meio tem cerca de 40% da largura do anel,
porque o jogo coloca o planeta Aurora ali dentro. A metade de trás do anel fica mais escura e mais fina que a da
frente (perspectiva). Prédios e torres pequenas em cima do anel, luzes azuis ao longo da borda.

Nome do sprite: `mega-ring-empty`.

## Pedido D — Singularidade em 5 estágios  → `mega-singularity.jpg`

O megaprojeto final: **curvar o espaço-tempo em torno do império**. É **um único objeto** evoluindo, sempre no mesmo
tamanho e ângulo: um ponto escuro no centro, cercado por estruturas que o contêm.

1. **Anel de contenção** — um anel metálico grosso, roxo e cinza, com um pequeno ponto de luz violeta no centro.
2. **Motor de curvatura** — o mesmo anel, agora com 4 propulsores apontando para dentro e linhas de energia ciano
   ligando-os ao centro, que começa a escurecer.
3. **Cidade-anel** — um segundo anel externo com prédios e luzes, ligado ao primeiro por pontes; o centro é uma
   esfera escura com um aro de luz roxa.
4. **Núcleo de nêutrons** — no centro, uma esfera muito brilhante azul-branca com dois jatos de luz saindo dos polos,
   presa pelos anéis.
5. **Singularidade estável** — um buraco negro perfeito no centro, com disco de luz laranja e violeta girando em
   volta, a estrutura dos anéis completa e as estrelas próximas levemente distorcidas na borda do disco (a distorção
   fica colada ao disco, sem espalhar pelo fundo).

Nomes dos sprites: `mega-sing-1` … `mega-sing-5`.

## Pedido E (opcional) — os megaprojetos que não aparecem no mapa  → `mega-extras.jpg`

Só aparecem nos cards da aba Megaprojetos, mas o `mega-engine` atual veio **cortado nas bordas**. Mesmo tamanho dos
outros pedidos.

1. **Portal estelar** — anel de pedra e metal roxo, com o espaço dentro dele mostrando outra região estrelada.
2. **Estaleiro de grande escala** — doca espacial em forma de U com 3 naves em construção presas por braços mecânicos.
3. **Propulsor de nave-mundo** — bocal gigante de motor preso a um pedaço de rocha, jato de plasma ciano saindo para a
   direita (o jato inteiro dentro do quadro).

Nomes dos sprites: `mega-gate`, `mega-shipyard`, `mega-engine` (substituem os atuais).

---

## Depois de gerar (para quem integrar)

1. Salve cada imagem em `Assets/` com o nome indicado e acrescente a prancha em `scripts/keyed.manifest.json`
   (como as outras de fundo magenta), depois rode `npm run sprites`.
2. **Núcleo**: em `src/game/data/megaprojects.ts`, o `endless` do `core` passa a usar `mega-core-1` (estágios 1–3),
   `mega-core-2` (4–8), `mega-core-3` (9–15) e `mega-core-4` (16+).
3. **Singularidade**: troque os sprites de `singStage(0…4)` por `mega-sing-1` … `mega-sing-5`.
4. **Anel**: troque `mega-orbital-ring` por `mega-ring-empty` e apague a máscara `.map-ring img` em `src/theme.css`;
   em `src/ui/MapView.tsx` e `src/render/GameScene.ts`, o Aurora passa a ficar no **centro** da arte
   (âncora 0,5 × 0,5 em vez de 0,5 × 0,33) e com ~40% da largura do anel.
