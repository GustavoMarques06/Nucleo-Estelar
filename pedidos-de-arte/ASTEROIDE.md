# Arte do asteroide-base melhorado — 4 pedidos

Hoje o asteroide é um sprite de 246 px esticado para uns 500 px (fica borrado) e **não tem lugar pronto para as
construções**: elas são coladas por cima da rocha, em posições soltas. Esta lista traz um asteroide em alta
resolução, com **plataformas planas já desenhadas** onde as construções sentam, mais as peças que ligam tudo
(túneis, esteiras, cabos) e a cena crescendo junto com a mineração.

Anexe 2–3 imagens que já existem (ex.: `asteroid-main-big`, `building-crusher`, `building-deep-drill`) para a IA
copiar o estilo. Os pedidos A e D devem ser feitos **na mesma conversa**, porque o D precisa repetir o A com
exatidão.

## Regras para sprites (cole no início de cada pedido)

```
Pixel art 2D de ficção científica industrial para o jogo "Núcleo Estelar", no mesmo estilo das imagens anexadas:
contorno escuro grosso, sombreado em 3–4 tons, cores saturadas, luz do alto-esquerda.
REGRAS OBRIGATÓRIAS:
- Fundo: UMA cor sólida #FF00FF (magenta puro), sem degradê, sem quadriculado, sem textura, sem estrelas.
- NENHUM texto, letra, número, legenda, nome ou rótulo em lugar nenhum da imagem.
- Cada item isolado, com pelo menos 24 px de espaço vazio magenta ao redor, sem encostar em outro item nem na borda.
- Brilhos e halos ficam DENTRO do contorno do item, nunca espalhados sobre o fundo.
- Sem sombra projetada no fundo. Sem anti-aliasing: pixels nítidos.
- Vista isométrica / 3-4 de cima, a mesma em todos os itens.
- Respeite exatamente a quantidade de itens e a ordem pedidas (esquerda para a direita, de cima para baixo).
```

Dica: se a IA errar a ordem ou a quantidade, peça **um item por imagem**.

---

## Pedido A — o asteroide em 6 camadas, com plataformas  → `asteroide-camadas.jpg`

O **mesmo asteroide**, seis vezes, **sempre com a mesma silhueta, o mesmo tamanho (cerca de 640 × 640 px cada) e o
mesmo ângulo**, para a troca de uma camada para a seguinte parecer escavação e não um asteroide novo. Três
colunas, duas linhas, na ordem. A rocha é um bloco irregular e largo, quase redondo, visto de 3/4 de cima, com a
**parte de cima achatada em terraços** para a base.

**Em todas as seis:** a face de cima tem **12 plataformas planas e vazias** (losangos isométricos de metal cinza,
cerca de 90 × 50 px cada, bem separadas umas das outras), distribuídas pelo terraço e pelas bordas. **NÃO desenhe
nenhuma construção, máquina, pessoa ou nave em cima**: as plataformas ficam vazias, o jogo coloca as construções
depois.

1. **Regolito** — poeira e cascalho marrom-acinzentado, poucas rachaduras, quase intacto.
2. **Crosta fraturada** — a mesma rocha com **rachaduras grandes**, pedaços soltos e veios finos de ouro.
3. **Manto metálico** — a crosta já aberta: faixas de metal escuro e cobre, **um poço grande** de mineração com
   andaime, a rocha mais densa.
4. **Veios profundos** — **veios de titânio azul-prateado** brilhando nas rachaduras, dois poços e túneis abertos
   na lateral.
5. **Núcleo externo** — a lateral aberta mostra **camadas de cristal ciano**, brilho laranja de magma nas fendas,
   poços fundos.
6. **Núcleo** — o coração aberto: **cristais ciano e violeta**, veios de ouro e magma incandescente, a rocha toda
   cortada por galerias iluminadas.

## Pedido B — a infraestrutura que liga as construções  → `asteroide-infra.jpg`

Dezesseis peças soltas, cerca de 192 × 192 px, **quatro colunas por quatro linhas**, para o jogo desenhar entre
as plataformas:

1. Trecho de **esteira** reto, na diagonal para baixo à direita.
2. Trecho de esteira reto, na diagonal para baixo à esquerda.
3. **Curva** de esteira (cotovelo).
4. **Cruzamento** de esteiras em T.
5. **Escada de metal** com corrimão, descendo um terraço.
6. **Elevador de carga** aberto, com cabine amarela.
7. **Tubulação** reta com válvula.
8. **Cabos de energia** grossos, com 3 luzes ciano.
9. **Poste de luz** industrial acesa.
10. **Entrada de túnel** na rocha, com arco de metal e luz laranja dentro.
11. **Boca de poço** circular com guarda-corpo e uma roldana.
12. **Pilha de minério** misturado (ferro, cobre, ouro).
13. **Caixas de carga** empilhadas com uma lona.
14. **Bandeira** da base num mastro.
15. **Pista de pouso** pequena, com marcação luminosa e uma nave estacionada.
16. **Antena de rádio** com luz vermelha piscante.

## Pedido C — a mineração acontecendo  → `asteroide-efeitos.jpg`

Doze efeitos soltos, cerca de 128 × 128 px, **quatro colunas por três linhas**, para ficarem sobre a rocha:

1. **Rachadura** nova de impacto, brilhando em laranja.
2. **Veio de ferro** (cinza-azulado) aparecendo na superfície.
3. **Veio de cobre** (laranja-esverdeado).
4. **Veio de ouro** (amarelo brilhante).
5. **Veio de titânio** (azul-prateado).
6. **Bolsão de cristal ciano**, com 3 pontas.
7. **Bolsão de cristal violeta**, com 3 pontas.
8. **Buraco esgotado** (cratera escura vazia, com restos de andaime).
9. **Nuvem de poeira** de uma explosão pequena.
10. **Feixe de laser** de perfuração, de cima para baixo.
11. **Fagulhas** de solda, laranja.
12. **Ponto brilhante** dourado (o "ponto brilhante" que o jogador clica), com uma estrela de 4 pontas.

## Pedido D — o mapa de encaixe (mesma conversa do pedido A)  → `asteroide-encaixe.jpg`

Repita **exatamente** o pedido A, mas pinte as 12 plataformas de **ciano sólido #00FFFF**, sem contorno e sem
sombreado, e deixe o resto idêntico. Com isso o jogo descobre sozinho onde ficam as plataformas de cada camada e
posiciona as construções em cima delas, sem eu precisar medir à mão. Se a IA não conseguir repetir a imagem
idêntica, peça "**use a imagem do pedido A como base e apenas pinte as plataformas de ciano**".

---

### Como entregar

Salve cada arquivo em `Assets/`. Depois me peça para recortar: o jogo usa `npm run sprites`, e eu cuido de trocar os
sprites antigos, de ler as plataformas do mapa de encaixe e de reposicionar as construções em cima delas.
Se a IA não conseguir manter a silhueta idêntica entre as camadas, o plano B é gerar **a camada 6 primeiro** e pedir
"feche as galerias e os cristais" para chegar às anteriores.
