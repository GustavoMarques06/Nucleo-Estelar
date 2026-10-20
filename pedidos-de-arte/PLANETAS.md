# Arte dos planetas — 4 pedidos

Hoje cada local do mapa usa um sprite do seu tipo de mundo, mas há duas lacunas:
- deserto, mundo alienígena, asteroide metálico e asteroide de cristais têm **uma aparência só** (todos iguais no mapa);
- **todo** mundo terraformado vira o mesmo planeta azul-e-verde (`planet-habitable`), perdendo a identidade do tipo.

Cole as **regras** no início de cada pedido e anexe 2–3 planetas que já existem (ex.: `planet-ocean`, `planet-volcanic`,
`planet-jungle`) para a IA copiar o estilo.

## Regras (cole no início de TODO pedido)

```
Pixel art 2D de ficção científica para o jogo "Núcleo Estelar", no mesmo estilo dos planetas anexados:
planeta visto de frente, esfera perfeita, contorno escuro, sombreado em 3–4 tons com luz vindo do alto-esquerda
e a metade direita em sombra, cores saturadas.
REGRAS OBRIGATÓRIAS:
- Fundo: UMA cor sólida #FF00FF (magenta puro), sem degradê, sem estrelas, sem quadriculado, sem textura.
- NENHUM texto, letra, número, legenda ou rótulo em lugar nenhum da imagem.
- Cada planeta isolado, com pelo menos 24 px de espaço magenta ao redor, sem encostar em outro nem na borda.
- Atmosfera e brilho ficam colados à borda do planeta (no máximo 6 px para fora), nunca espalhados pelo fundo.
- Sem anéis, a menos que o item peça. Sem anti-aliasing: pixels nítidos.
- UMA linha horizontal com exatamente 4 planetas, do mesmo tamanho (cerca de 256 × 256 px cada), na ordem pedida.
```

Dica: se a IA errar a ordem ou a quantidade, peça **um planeta por imagem**.

---

## Pedido A — variações dos mundos que só têm uma aparência  → `planetas-a.jpg`

1. **Deserto com cânions** — areia laranja-avermelhada, cânions escuros cortando a superfície, calotas pequenas de gelo nos polos.
2. **Deserto de dunas claras** — tons bege e dourado, faixas de dunas, uma tempestade de areia em espiral.
3. **Mundo alienígena bioluminescente** — superfície roxa-escura com manchas e veios verde-ciano brilhantes, como fungos luminosos.
4. **Mundo alienígena de cristal orgânico** — tons magenta e turquesa, placas hexagonais e um oceano rosado.

## Pedido B — mais variações  → `planetas-b.jpg`

1. **Asteroide metálico denso** — rocha cinza-azulada com veios prateados brilhando e crateras quadradas (aparência minerada).
2. **Asteroide metálico partido** — dois blocos de metal unidos por uma ponte de rocha, com faíscas laranja nas fendas.
3. **Asteroide de cristais azuis** — rocha escura coberta de cristais ciano pontudos, alguns brilhando.
4. **Asteroide de cristais rosados** — cristais magenta e violeta saindo de dentro da rocha rachada.

## Pedido C — mundos terraformados que mantêm a cara do tipo (parte 1)  → `planetas-terra-a.jpg`

Cada um é a versão **jardim** de um tipo de mundo: oceanos, florestas e nuvens brancas, mas mantendo a cor e o relevo do original.

1. **Rochoso terraformado** — continentes cinzentos com vales verdes, mares pequenos, nuvens finas.
2. **Gelado terraformado** — calotas de gelo grandes, faixa verde e azul no equador, nuvens brancas.
3. **Deserto terraformado** — continentes ainda alaranjados mas com oásis e rios verdes, mares rasos turquesa.
4. **Oceânico terraformado** — quase todo oceano azul profundo, arquipélagos verdes, recifes turquesa, nuvens em espiral.

## Pedido D — mundos terraformados (parte 2)  → `planetas-terra-b.jpg`

1. **Selva terraformada** — floresta densa verde-escura, rios brilhantes, muitas nuvens e névoa.
2. **Vulcânico terraformado** — rochas escuras com lagos de lava já apagados e cobertos de verde, oceanos novos, vapor branco.
3. **Alienígena terraformado** — mistura de vegetação verde da colônia com manchas roxas e ciano nativas, céu levemente rosado.
4. **Mundo-capital** — um planeta terraformado com luzes de cidade espalhadas no lado escuro e um anel fino de estações orbitais
   (o anel é permitido só neste item).

---

## Quando as imagens chegarem

Salve em `Assets/` com os nomes acima. Eu recorto e ligo no jogo assim: as variações (A e B) entram no sorteio
de aparência de cada tipo, e o mundo terraformado passa a mostrar a versão jardim **do seu tipo** em vez do planeta
genérico. O "mundo-capital" pode ficar para a colônia de nível mais alto.
