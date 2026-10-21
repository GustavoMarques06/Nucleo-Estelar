# Arte do planeta dos colonos — 3 pedidos

A civilização agora mora num planeta à parte (o **Aurora**), e a base do asteroide é só mineração. Hoje o planeta usa
sprites emprestados (`planet-desert`, `planet-habitable`, `planet-terra-garden`, `planet-capital`). Esta lista traz
a arte própria: o **mesmo planeta crescendo em 7 fases**, uma para cada era da civilização, mais as estruturas que
ficam em órbita. Anexe 2–3 imagens que já existem (ex.: `planet-terra-garden`, `planet-capital`,
`building-arcology`) para a IA copiar o estilo.

## Regras para sprites (cole no início de cada pedido)

```
Pixel art 2D de ficção científica para o jogo "Núcleo Estelar", no mesmo estilo das imagens anexadas:
contorno escuro grosso, sombreado em 3–4 tons, cores saturadas, luz do alto-esquerda.
REGRAS OBRIGATÓRIAS:
- Fundo: UMA cor sólida #FF00FF (magenta puro), sem degradê, sem quadriculado, sem textura, sem estrelas.
- NENHUM texto, letra, número, legenda, nome ou rótulo em lugar nenhum da imagem.
- Cada item isolado, com pelo menos 24 px de espaço vazio magenta ao redor, sem encostar em outro item nem na borda.
- Brilhos e halos ficam DENTRO do contorno do item, nunca espalhados sobre o fundo.
- Sem sombra projetada. Sem anti-aliasing: pixels nítidos.
- Respeite exatamente a quantidade de itens e a ordem pedidas (esquerda para a direita). Sem repetir nem acrescentar.
```

Dica: se a IA errar a ordem ou a quantidade, peça **um item por imagem**.

---

## Pedido A — o planeta em 7 fases  → `planeta-fases.jpg`

O **mesmo planeta**, visto do espaço, **sempre com o mesmo tamanho, o mesmo ângulo e a mesma posição dos continentes**,
para que a troca de uma fase para a seguinte pareça crescimento e não um planeta novo. Cerca de 512 × 512 px cada,
**uma linha, da esquerda para a direita, na ordem**. O planeta é uma esfera inteira e centralizada (sem anel nas
fases 1 a 5). A parte da frente (o hemisfério voltado para a câmera) fica **calma e legível**, porque o jogo coloca
ícones de construção por cima dela.

Planeta: um mundo rochoso e árido que pode virar um mundo verde. Continentes marrom-avermelhados, oceanos pequenos
em azul-petróleo, calotas de gelo discretas nos polos.

1. **Acampamento** — planeta ainda quase virgem. Só **2 ou 3 minúsculos pontos de luz** laranja num continente, e
   uma pequena clareira cinza. Nenhuma estrada.
2. **Vila** — a clareira cresce; **manchas verdes** de cultivo ao redor de 4 ou 5 aglomerados de luz amarela,
   ligados por linhas finas (estradas).
3. **Cidade** — **uma cidade grande** com luzes brancas e douradas no continente principal, malha de estradas,
   a vegetação verde se espalhando e os oceanos mais azuis.
4. **Metrópole** — várias cidades ligadas por **faixas de luz** (rodovias), o continente principal quase todo
   urbanizado, **uma estação pequena** (um ponto brilhante) em órbita colada ao planeta.
5. **Arcologia** — o continente principal vira uma **mancha contínua de cidade** com pontos altos mais brilhantes
   (as torres), as luzes passam para ciano e dourado, o resto do planeta verde.
6. **Ecumenópole** — o planeta **inteiro coberto de cidade**, sem terra visível, luzes ciano e dourado em padrão de
   circuito; **um anel fino de estruturas orbitais** (anel de plataformas) ao redor.
7. **Civilização Estelar** — o mesmo planeta coberto de cidade, agora com **brilho dourado e violeta** por dentro
   das linhas de luz, **dois anéis** de estruturas orbitais e pequenos pontos de luz (naves) ligando-o a estrelas.
   É a era do legado e da Transcendência.

## Pedido B — estruturas em órbita  → `planeta-orbita.jpg`

Oito itens soltos, cerca de 256 × 256 px, **uma linha, esquerda para direita**, vista 3/4 de cima, que orbitam o
planeta e aparecem conforme o jogador constrói:

1. **Estação de comunicação** — antena parabólica e painéis solares pequenos.
2. **Porto espacial orbital** — um anel de atracação com 2 naves encaixadas.
3. **Estaleiro orbital** — uma carcaça de nave em construção dentro de um andaime.
4. **Coletor solar** — uma grande asa de painéis solares dourados.
5. **Plataforma habitacional** — um cilindro giratório com janelas acesas.
6. **Fazenda orbital** — um anel com estufas verdes visíveis.
7. **Elevador espacial** — um cabo fino com uma cabine no meio (item vertical, cerca de 128 × 256 px).
8. **Embaixada flutuante** — uma esfera de metal com três bandeiras luminosas em cores diferentes (ciano, laranja,
   violeta).

## Pedido C — distritos flutuantes  → `planeta-distritos.jpg`

Sete itens de **cerca de 384 × 320 px**, uma linha, esquerda para direita. São os "pedaços de cidade" que flutuam
ao redor do planeta: cada um é uma **ilha de rocha leve com uma parte da cidade em cima**, vista isométrica, com
luzes de janela acesas. Os sete já existem hoje (`era-camp` … `era-stellar`); este pedido é para **refazê-los no
mesmo estilo do planeta**, mantendo a silhueta de cada era para o jogador reconhecer:

1. **Acampamento** — 4 tendas pressurizadas, um gerador e uma antena.
2. **Vila** — casas baixas de metal, uma horta com estufa e um poço de gelo.
3. **Cidade** — ruas, escola, mercado coberto, prédios de 4 a 6 andares.
4. **Metrópole** — arranha-céus, trilhos suspensos, painéis luminosos.
5. **Arcologia** — uma torre-cidade larga, varandas com jardins verdes.
6. **Ecumenópole** — uma cúpula inteira de cidade com anéis de órbita.
7. **Civilização Estelar** — cidade com brilho dourado e violeta e pontes de luz saindo dela.

---

### Como entregar

Salve cada arquivo em `Assets/` (o mesmo lugar das outras pranchas). Depois me peça para cortar e registrar os
sprites: o jogo usa `npm run sprites` e os recortes ficam descritos em `scripts/*.manifest.json`. Se a IA não
conseguir manter o planeta idêntico entre as fases, o plano B é gerar **a fase 7 primeiro** e pedir "remova as luzes
e as estruturas" para chegar às anteriores.
