# Arte para refazer — o que deu errado

Os pedidos anteriores foram apagados. Esta página lista **só o que veio com defeito**, o motivo, e o texto para
pedir de novo. O que não está aqui foi recortado e está em uso ou guardado (estruturas básicas, asteroides, logo,
naves, drones, personagens, ícones de recursos, animações de broca/raio/forja/fumaça/reator/obra/painel, lingotes,
itens, planetas e minerais).

## Por que os erros aconteceram (vale para todos os pedidos)

1. **A IA ignora grades e tamanhos exatos.** Pedi "4 colunas × 2 linhas de 128 px" e ela entregou o que quis:
   itens fora de ordem, repetidos, a mais ou a menos, e painéis misturados numa imagem só.
2. **A IA escreve texto na imagem** mesmo quando o pedido diz "sem texto": nomes de arquivo embaixo dos itens,
   "Normal/Hover" dentro de botões, legendas. Isso suja o recorte.
3. **Fundo sujo.** Parte veio com quadriculado de transparência desenhado, parte com magenta degradê, e brilhos
   (glow) que se misturam ao fundo.
4. **Prancha grande demais.** Quanto mais itens por imagem, mais erros. Pranchas de 40–50 ícones vieram desordenadas.

## Regras novas (cole no início de TODO pedido)

```
Pixel art 2D de ficção científica industrial para o jogo "Núcleo Estelar", no mesmo estilo das imagens anexadas:
contorno escuro grosso, sombreado em 3–4 tons, cores saturadas, luz do alto-esquerda.
REGRAS OBRIGATÓRIAS:
- Fundo: UMA cor sólida #FF00FF (magenta puro), sem degradê, sem quadriculado, sem textura.
- NENHUM texto, letra, número, legenda, nome ou rótulo em lugar nenhum da imagem.
- Cada item isolado, com pelo menos 24 px de espaço vazio magenta ao redor, sem encostar em outro item nem na borda.
- Brilhos e halos ficam DENTRO do contorno do item, nunca espalhados sobre o fundo.
- Sem sombra no chão. Sem anti-aliasing: pixels nítidos.
- No máximo 6 itens por imagem, em UMA linha horizontal (ou 2 linhas de 3). Nada de pranchas grandes.
- Entregue exatamente a quantidade pedida, na ordem pedida, sem repetir nem acrescentar itens.
```

Dica: se a IA continuar errando, peça **um item por imagem** (mais lento, mas sai certo).

---

## 1. Botões e interface — RESOLVIDO

Refeito em `refeito1.jpg` (molduras) e `refeito2.jpg` (6 botões) e já aplicado no jogo.
O que ainda falta da interface original: nada obrigatório. Opcional: barra de rolagem, abas e divisores.

## 2. Ícones (peça 04 antiga) — PRIORIDADE ALTA

**O que deu errado:** a prancha de 40 ícones veio com 50, fora da ordem pedida, e a primeira célula é uma
colagem (engrenagens + estrela + nave) inutilizável. Vieram duplicados (2 antenas, 2 chaves inglesas, 2 corações,
2 cadeados, 2 plantas) e **faltaram** vários que o jogo usa: oxigênio, água, população, vender/comprar bem
distintos, armazém cheio, sem matéria-prima, Dados de Ascensão, mapa, planeta.

**Peça (4 imagens de 6 ícones, uma linha, 128×128 px cada, vista frontal, silhueta simples):**
- Imagem 1 — menu: visão geral (asteroide), mineração (picareta), indústria (engrenagem), energia (raio),
  mercado (moeda), pesquisa (frasco).
- Imagem 2 — menu e recursos: civilização (cúpula com prédio), expansão (foguete), catálogo (livro),
  opções (engrenagem simples), combustível (galão), oxigênio (bolha azul).
- Imagem 3 — recursos e estados: água (gota), comida (maçã), população (duas silhuetas), cadeado,
  estrela, seta para cima verde.
- Imagem 4 — alertas e ações: aviso (triângulo amarelo), erro (X vermelho), vender (moeda saindo),
  comprar (carrinho), caixa transbordando (armazém cheio), raio riscado (sem energia).
- Imagem 5 (reserva) — caixa vazia (sem matéria-prima), cristal em espiral (Dados de Ascensão), mapa,
  planeta, troféu, relógio.

## 3. Animações (peça 06 antiga)

**O que deu errado:** as 9 animações vieram misturadas numa prancha só, fora de grade. Quatro delas
(**entulho/rochas saltando** e **fumaça roxa**) saíram com restos de fundo rosa/roxo nos quadros e uma linha repetida.
O raio de mineração e a forja vieram dentro de retângulos de fundo (cena inteira), não só o efeito.

**Peça (uma animação por imagem, 6 quadros lado a lado, cada quadro 128×128 px, objeto fixo no mesmo lugar):**
1 fragmentos de rocha saltando e caindo (clique de mineração), 2 raio de mineração ciano batendo numa rocha
(só o raio e as faíscas, sem fundo de cena), 3 faíscas de fundição saindo de um ponto (só as faíscas),
4 anel de luz dourada expandindo com estrelinhas, 5 fumaça cinza subindo e se dissolvendo (sem chaminé).

## 4. Fundos do espaço (peça 12 antiga)

**O que deu errado:** os fundos **não se repetem sem emenda** (a borda direita não encaixa na esquerda),
então não servem para fundo com rolagem. A "poeira cósmica" ficou quase invisível. A imagem misturou fundos
completos e fundos magenta, e as estrelas pequenas têm brilho que se mistura ao magenta.

**Peça (4 imagens separadas, 1024×512 px, SEM magenta, sem texto, sem planetas):**
cada uma deve ser **perfeitamente repetível na horizontal** (o que sai pela direita entra pela esquerda sem
corte visível): 1 estrelas distantes sobre azul quase preto, 2 nebulosa azul/ciano, 3 nebulosa violeta,
4 nebulosa laranja/vermelha. Pedido separado: 1 imagem de **estrelas grandes e brilhantes** (poucas, ~10)
sobre magenta #FF00FF puro, com cada estrela com seu brilho DENTRO do desenho.

## 5. Paisagens de planetas (peça 13 antiga)

**O que deu errado:** vieram 6 paisagens em vez das 7 pedidas: **vulcânico e alienígena fundidos numa imagem só**
(lava à esquerda, cristais roxos à direita), duas paisagens (rochosa e gelo) **repetidas** no canto da prancha
com pedaços magenta, e **quadriculado de transparência desenhado** entre as imagens. Os tamanhos também não
são os pedidos (512×288).

**Peça (7 imagens separadas, 512×288 px cada, cena completa, sem magenta, sem texto, sem construções):**
1 rochoso (crateras marrons), 2 gelo (planícies brancas e azuis), 3 deserto (dunas e dois sóis),
4 oceano (mar com ilhas), 5 selva (floresta e rio), 6 vulcânico (lava e fumaça), 7 alienígena (vegetação
violeta e cristais brilhantes) — **vulcânico e alienígena em imagens diferentes**.

## 6. Megaprojetos e mapas (peça 14 antiga)

**O que deu errado:** o **motor de longo alcance** e o **estaleiro de grande escala** vieram **cortados nas bordas**
da prancha (partes fora da imagem). O mapa do sistema solar veio **duplicado** em duas versões e o desenho do
enxame de Dyson nível 2 ficou muito fraco (só pontos soltos). O portal e o anel orbital vieram bons.

**Peça (4 imagens separadas, 512×512 px, item centralizado com 48 px de folga em todos os lados):**
1 estaleiro de grande escala (estrutura com várias naves em construção), 2 motor de nave-mundo com chama
ciano, 3 Dyson nível 2 (anéis de coletores solares em órbita visíveis e conectados à estrela amarela),
4 Dyson nível 3 (casca parcial, estrela brilhando pelas frestas).

## 7. Estruturas novas (peça 08 antiga)

**O que deu errado:** vieram **duas imagens que repetem as mesmas 5 estruturas** (extrator de gelo, fundição,
estaleiro, complexo industrial, bateria), bateria e antena em **duas versões quase iguais**, e as construções
têm **escalas diferentes** entre si (o prédio de sede é muito maior que a fábrica). Ficou bom o estilo, mas a
consistência de tamanho não.

**Peça (2 imagens de 6 construções, uma linha, cada uma ocupando 160×160 px, mesma altura de câmera e mesmo
tamanho de base em losango):**
Imagem 1: extrator de gelo, fundição, estaleiro, complexo industrial, bateria, coletor solar orbital.
Imagem 2: torre de rede energética, centro médico, universidade, entreposto comercial, centro de comunicação,
doca de drones. **Sem repetir nada.**

## 8. Evolução das estruturas (peça 09 antiga)

**O que deu errado:** a imagem veio com o **nome de cada arquivo escrito embaixo** ("building-miner-t3") e
o nome da primeira estrutura da linha 1 está **errado** (diz t3, mas é o nível 2). Os desenhos estão bons.

**Peça:** repetir a regra "sem nenhum texto". Mesmo conteúdo: nível 2 e nível 3 das 6 estruturas (mineradora,
painel solar, refinaria, armazém, fábrica, reator de fissão), 2 linhas de 6, anexando as estruturas atuais como
referência. Só precisa refazer se quiser imagem limpa; hoje já foi recortada e funciona.

## 9. Peças da cena e lingotes (peças 10 e 11 antigas)

**O que deu errado:** os dois vieram com **o nome de cada item escrito embaixo** (inclusive o nome em português
entre parênteses nos lingotes), que invadiu o recorte (fiapos de texto na válvula decorativa). Os nódulos
brilhantes têm **halo roxo/azul que vaza para o fundo** (o nódulo violeta ficou ruim). Os lingotes de ferro e
titânio são quase **idênticos**.

**Peça:** refazer só os **6 nódulos brilhantes** (ciano, âmbar, violeta, verde, vermelho, prata) numa linha,
sem texto e com brilho dentro do contorno; e os **6 lingotes** (ferro, cobre, ouro, alumínio, titânio, aço)
com cores claramente diferentes entre si (ferro cinza escuro, titânio azul-prateado claro).

## 10. Identidade (peça 05 antiga)

**O que deu errado:** o **ícone do jogo 192×192** (núcleo com órbitas) veio **ruidoso e borrado**, com pixels
soltos espalhados pelo fundo, e não se lê pequeno. O logo horizontal e o vertical têm **brilho azul que se mistura
ao magenta**, deixando uma franja rosada nas bordas.

**Peça (3 imagens, uma por arquivo):** 1 ícone quadrado 256×256, só o núcleo (esfera ciano/laranja com um anel),
formas grandes e limpas, legível a 32 px; 2 logo horizontal "NÚCLEO ESTELAR" com contorno escuro grosso e **sem
brilho externo**; 3 logo vertical com o mesmo cuidado.

## 11. Drones (peça 07, imagem B)

**O que deu errado:** vieram 6 drones em vez de 4 (duas versões de broca e duas de transporte), o que não
atrapalhou, mas o "drone de mineração com raio" e o "de manutenção" estão com muito detalhe para o tamanho
pequeno em que aparecem no jogo (64 px). Só refazer se quiser versões mais simples.

---

## Ordem de prioridade para refazer

1. **Ícones** (item 2) — o menu hoje reaproveita alguns desenhos.
2. **Fundos repetíveis** (item 4) — se o jogo ganhar rolagem.
3. **Paisagens, megaprojetos, estruturas novas** (itens 5 a 7) — só quando essas fases entrarem no jogo.
4. O resto é opcional (funciona como está).

Quando as imagens chegarem, coloque em `Assets/` e me avise o nome; eu confiro e recorto.
