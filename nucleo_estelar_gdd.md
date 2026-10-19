# Núcleo Estelar

> **Documento de conceito e design (GDD inicial)**  
> Gênero: Space Tycoon / Idle / Incremental  
> Plataforma-alvo: navegador (desktop e celular)  
> Direção visual: pixel art 2D  
> Estado: conceito inicial — valores de economia ainda precisam ser balanceados

---

## 1. Visão geral

**Núcleo Estelar** é um tycoon espacial em pixel art no qual o jogador começa operando uma pequena instalação de mineração em um asteroide e evolui até administrar uma civilização interestelar.

A experiência central é construir uma economia que se sustenta cada vez mais sozinha: extrair recursos, processá-los, gerar energia, automatizar fábricas, desenvolver colônias e explorar novos sistemas solares. Não existe um final tradicional. Sempre há uma máquina mais eficiente, uma tecnologia a pesquisar, um planeta para colonizar ou um megaprojeto para construir.

### Fantasia do jogador

> “Comecei com uma broca enferrujada em um asteroide. Agora administro indústrias, reatores, cidades e sistemas solares inteiros.”

### Princípios de design

1. **Sempre existe um próximo objetivo:** o jogador deve enxergar uma melhoria alcançável ou um desbloqueio interessante.
2. **Cada recurso tem utilidade:** evitar recursos sem função clara ou que só ocupem espaço na interface.
3. **Automação é progresso:** tarefas inicialmente manuais tornam-se sistemas automáticos.
4. **Escolhas econômicas importam:** o jogador decide entre expandir, otimizar, vender ou investir em pesquisa.
5. **A progressão é visual:** a base deve mudar de aparência à medida que cresce.
6. **A complexidade é gradual:** a primeira sessão precisa ser simples; sistemas avançados só aparecem quando forem relevantes.

---

## 2. Ciclo principal de jogo

O ciclo que sustenta a experiência é:

1. **Extrair** matérias-primas de asteroides.
2. **Processar** minério em materiais utilizáveis.
3. **Produzir energia** para manter as instalações funcionando.
4. **Fabricar** componentes, máquinas e módulos.
5. **Vender ou reinvestir** a produção para obter créditos.
6. **Pesquisar** tecnologias para desbloquear novos sistemas.
7. **Expandir** a operação para novas regiões do espaço.
8. **Automatizar e otimizar** a economia para aumentar a produção por segundo.

O jogador deve conseguir perceber o efeito de uma compra imediatamente, por exemplo: construir uma refinaria aumenta a produção de ligas; instalar um reator permite manter mais fábricas ativas; pesquisar automação reduz custos ou aumenta a eficiência.

### Exemplo de progressão inicial

- O jogador clica para extrair minério.
- Compra uma mineradora automática.
- Compra uma refinaria que transforma minério em ligas.
- Vende ligas para ganhar créditos.
- Instala painéis solares para alimentar as máquinas.
- Desbloqueia uma fábrica de componentes.
- Constrói um reator para sustentar uma operação maior.
- Usa os lucros para criar o primeiro habitat e iniciar uma colônia.

---

## 3. Os quatro caminhos de desenvolvimento

Os caminhos podem ser combinados. Nenhum deve funcionar totalmente isolado: cada um fornece algo útil aos demais.

### 3.1 Mineração e indústria

**Função:** gerar matérias-primas e transformá-las em produtos de maior valor.

Exemplos de estruturas:
- Broca manual
- Mineradora automática
- Extrator de gelo
- Refinaria de minério
- Fundição de ligas
- Fábrica de componentes
- Estaleiro de drones e naves
- Complexo industrial automatizado

**Decisão interessante:** vender matéria-prima rapidamente ou processá-la para obter maior valor, usando mais energia e instalações.

### 3.2 Energia e reatores

**Função:** fornecer energia para fábricas, mineração, habitats e pesquisa.

Progressão sugerida:
- Painéis solares
- Baterias e armazenamento
- Reator de fissão
- Reator de fusão
- Coletores solares orbitais
- Rede energética planetária
- Enxame de Dyson como megaprojeto de fase avançada

A energia pode funcionar como um limite de produção. Se a demanda exceder a geração, algumas estruturas operam abaixo da capacidade ou param. A interface deve deixar claro o motivo e sugerir opções para resolver o gargalo.

### 3.3 Civilização e colônias

**Função:** criar uma fonte de população, mão de obra especializada, ciência e receita.

Estruturas:
- Habitat pressurizado
- Estufa hidropônica
- Centro médico
- Distrito residencial
- Universidade ou centro de pesquisa
- Porto espacial
- Cidade planetária
- Colônia autossuficiente

A população só deve crescer de forma estável quando houver moradia, alimento e condições básicas. Em fases posteriores, colônias podem se especializar em ciência, agricultura, indústria ou comércio.

### 3.4 Pesquisa e automação

**Função:** melhorar os demais caminhos e desbloquear novas possibilidades.

Tecnologias iniciais:
- Brocas reforçadas
- Refinamento eficiente
- Logística automatizada
- Gestão inteligente de energia
- Robôs industriais
- Inteligência artificial operacional
- Reatores de alta eficiência
- Fabricação avançada
- Propulsão de longo alcance

A pesquisa consome ciência e, em alguns casos, créditos ou materiais raros. Tecnologias devem oferecer benefícios compreensíveis, não apenas bônus invisíveis.

---

## 4. Recursos e cadeias de produção

O jogo deve começar com poucos recursos e apresentar novos materiais conforme o jogador progride.

| Recurso | Como obter | Usos principais |
|---|---|---|
| **Créditos** | Vendas, contratos e economia das colônias | Comprar estruturas, melhorias e expansões |
| **Minério** | Mineradoras e asteroides | Matéria-prima para refino |
| **Ligas** | Refinarias e fundições | Construções e máquinas |
| **Energia** | Painéis e reatores | Manter as estruturas em operação |
| **Componentes** | Fábricas | Máquinas avançadas, robôs e módulos |
| **Alimentos** | Estufas e fazendas | Sustentar a população |
| **Ciência** | Laboratórios e colônias | Pesquisar tecnologias |
| **Materiais exóticos** | Planetas e regiões especiais | Tecnologias avançadas e megaprojetos |

### Cadeia de produção básica

```text
Asteroide
   ↓
Minério
   ↓ Refinaria + energia
Ligas
   ↓ Fábrica + ligas + energia
Componentes
   ↓ Pesquisa + materiais especiais
Máquinas avançadas / módulos / naves
```

### Regras de economia

- As estruturas devem mostrar **produção por segundo**, consumo e custo de operação.
- As fábricas não devem consumir recursos silenciosamente sem explicar o motivo.
- Quando uma linha de produção parar, mostrar uma mensagem clara, como `Sem minério`, `Energia insuficiente` ou `Armazém cheio`.
- Vender recursos deve ser uma opção simples, mas não precisa ser a única fonte de receita.
- Custos de compra e produção devem aumentar progressivamente, com balanceamento feito após testes.
- Números muito grandes podem usar abreviações legíveis, como `1,2 mil`, `3,4 mi` e, mais tarde, notação científica.

> **Nota de balanceamento:** custos, taxas de produção e multiplicadores ainda não são definitivos. Devem ser calibrados com testes de jogo para evitar que a progressão fique lenta ou trivial.

---

## 5. Produção automática e jogo idle

A maior parte da economia deve funcionar automaticamente depois de construída.

### Requisitos

- Cada estrutura define produção, consumo, custo e possíveis condições de operação.
- O jogo atualiza a economia em intervalos regulares, sem depender de um clique por recurso.
- O jogador pode comprar múltiplas unidades e visualizar o impacto total.
- Melhorias podem aumentar produção, reduzir consumo, diminuir custos ou desbloquear receitas.
- A interface deve destacar estruturas mais eficientes ou gargalos relevantes.

### Progresso offline

Ao voltar ao jogo, o jogador pode receber recursos gerados durante sua ausência.

- Registrar a data e hora do último salvamento.
- Calcular o tempo decorrido no retorno.
- Aplicar um limite de tempo offline configurável para manter a economia equilibrada.
- Exibir um resumo do que foi produzido e quanto foi recebido.
- Não depender de um servidor no protótipo inicial.

O cálculo offline deve usar as taxas de produção e as condições de operação salvas. Uma versão simples pode aplicar a produção líquida estimada durante o período ausente; sistemas com cadeias de produção complexas podem ser simulados em etapas.

---

## 6. Progressão e expansão

### Fase 1 — Sobrevivência industrial

- Um asteroide inicial
- Mineração manual e automática
- Minério, ligas e créditos
- Primeiras melhorias e refinaria

### Fase 2 — Autossuficiência energética

- Painéis solares e baterias
- Consumo de energia nas instalações
- Reator de fissão
- Otimização de produção

### Fase 3 — Indústria avançada

- Componentes e robôs
- Fábricas especializadas
- Pesquisa tecnológica
- Contratos ou comércio automatizado

### Fase 4 — Civilização

- Primeiro habitat
- Alimentos, moradia e população
- Ciência gerada pelas colônias
- Especializações planetárias

### Fase 5 — Expansão interestelar

- Naves de exploração
- Novos planetas e asteroides
- Recursos locais diferentes
- Colônias remotas e rotas de transporte

### Fase 6 — Megaprojetos

- Enxame de Dyson
- Estaleiros de grande escala
- Redes de portais ou propulsão avançada, se combinarem com o tom do jogo
- Projetos que exigem grandes quantidades de materiais e energia

Essas fases são marcos de progressão, não capítulos com final obrigatório. O jogador pode especializar sua economia em diferentes áreas e avançar em ritmos distintos.

---

## 7. Sistema de reinício: Projeto Ascensão

Para dar continuidade à progressão de longo prazo, o jogador pode desbloquear um reinício voluntário chamado **Projeto Ascensão**.

Ao ativá-lo:
- Parte das instalações e recursos da campanha atual é reiniciada.
- O jogador recebe uma moeda ou recurso permanente, como **Dados de Ascensão**.
- Os Dados de Ascensão desbloqueiam bônus permanentes ou novas opções iniciais.
- A próxima jornada começa mais rapidamente e permite alcançar tecnologias diferentes.

### Regras importantes

- O reinício deve ser opcional, nunca imposto em intervalos curtos.
- A tela de confirmação deve explicar exatamente o que será perdido e mantido.
- As melhorias permanentes devem oferecer escolhas, não apenas um único caminho obrigatório.
- O primeiro protótipo não precisa implementar Ascensão; pode entrar numa atualização posterior.

---

## 8. Mundo procedural e sensação de infinito

A expansão espacial deve criar variedade sem exigir que cada planeta seja desenhado manualmente.

Cada novo local pode receber atributos gerados por regras:
- Tipo de ambiente: rochoso, gelado, gasoso, oceânico ou desértico
- Abundância de minério
- Disponibilidade de energia solar
- Presença de materiais raros
- Capacidade populacional
- Bônus de pesquisa ou produção
- Risco operacional ou custo de transporte

Os locais podem ser gerados a partir de combinações controladas, com sementes aleatórias para que cada descoberta pareça distinta. A geração procedural deve respeitar limites para não criar combinações impossíveis ou recursos essenciais inacessíveis.

**Importante:** infinito não significa adicionar sistemas sem propósito. Cada nova região deve oferecer uma escolha econômica, um recurso novo ou uma oportunidade clara de otimização.

---

## 9. Direção de arte: pixel art

A identidade visual será baseada em **pixel art 2D**, com atmosfera de ficção científica industrial e leitura simples.

### Referências de estilo

- Sprites pequenos e bem definidos
- Silhuetas reconhecíveis mesmo em tamanhos reduzidos
- Paleta escura para o espaço e cores vivas para máquinas, energia e indicadores
- Animações curtas em loop
- Interface de jogo retrô, mas com espaçamento e legibilidade modernos
- Efeitos de brilho usados com moderação para destacar elementos importantes

### Paleta sugerida

| Uso | Direção de cor |
|---|---|
| Fundo espacial | Azul-marinho muito escuro e roxo profundo |
| Painéis e estruturas | Cinza-azulado e grafite |
| Energia | Ciano e azul elétrico |
| Indústria e calor | Laranja e amarelo quente |
| Ciência e tecnologia rara | Violeta e magenta |
| Vida e agricultura | Verde e verde-água |
| Alertas | Amarelo para atenção; vermelho para falhas críticas |
| Texto principal | Cinza muito claro, evitando branco puro em excesso |

### Escala e resolução

- Usar uma grade consistente para sprites e elementos do cenário.
- Começar com sprites pequenos, por exemplo, 16×16, 24×24 ou 32×32 pixels, conforme a complexidade do objeto.
- Renderizar a pixel art sem suavização para preservar bordas nítidas.
- Em telas de alta resolução, ampliar os sprites por múltiplos inteiros sempre que possível.
- Evitar misturar arte pixelada com ícones vetoriais excessivamente detalhados.

### Elementos visuais essenciais

- Asteroides com variações de formato e minerais visíveis
- Drones ou brocas com animação de extração
- Refinarias com esteiras, luzes e pequenos ciclos de produção
- Reatores com núcleo luminoso pulsante
- Habitats com janelas acesas e sinais de atividade
- Naves que entram e saem de estações
- Estrelas, poeira cósmica e planetas no plano de fundo

### Animações simples de alto impacto

- Broca oscilando enquanto extrai minério
- Faíscas na fundição
- Tubos de energia pulsando
- Luzes de edifícios piscando lentamente
- Pequenos drones atravessando a tela
- Número de recursos subindo ao concluir uma produção
- Breve efeito visual ao desbloquear uma tecnologia

As animações devem ser decorativas e econômicas em desempenho. A interface precisa continuar responsiva quando houver muitas estruturas.

---

## 10. Interface e experiência do usuário

A interface precisa manter os números visíveis sem esconder o mundo do jogo.

### Layout sugerido

**Barra superior**
- Créditos
- Minério
- Ligas
- Energia disponível / consumo
- Ciência
- População, quando desbloqueada

**Menu lateral**
- Visão geral
- Mineração
- Indústria
- Energia
- Civilização
- Pesquisa
- Expansão

**Área central**
- Cena em pixel art mostrando o local atual
- Edifícios e unidades em atividade
- Animações de produção e construção

**Painel de gestão**
- Lista de estruturas disponíveis
- Custo de compra
- Quantidade construída
- Produção por segundo
- Consumo e condições de funcionamento
- Próxima melhoria

### Regras de UX

- Cada botão deve deixar claro o que compra e qual será o efeito.
- Exibir custos indisponíveis em estado visual diferente, sem tornar o texto ilegível.
- Mostrar dicas curtas para explicar novas mecânicas na primeira utilização.
- Dar feedback imediato para compras, melhorias, produção e desbloqueios.
- Oferecer uma opção de reduzir animações e efeitos visuais.
- Criar uma interface adaptável a telas pequenas: menus podem virar abas ou painéis recolhíveis no celular.
- Não usar animações longas que atrasem compras repetidas.

---

## 11. Áudio

O áudio é opcional no primeiro protótipo, mas pode reforçar a sensação de atividade.

Sugestões:
- Ambiência espacial discreta
- Ruído curto de broca e máquina
- Som de confirmação para compras
- Pulso grave ao ligar um reator
- Efeito suave para concluir pesquisas
- Tema musical eletrônico relaxante, sem competir com a interface

Todos os sons devem poder ser silenciados. O jogo não deve depender de áudio para comunicar um estado importante.

---

## 12. Escopo do MVP

O MVP (primeira versão jogável) deve validar se o ciclo de mineração, produção e reinvestimento é divertido antes de implementar civilizações complexas ou expansão galáctica.

### Obrigatório

- [ ] Interface em pixel art com tema espacial
- [ ] Créditos e minério
- [ ] Extração manual de minério
- [ ] Mineradora automática
- [ ] Refinaria que transforma minério em ligas
- [ ] Venda de ligas por créditos
- [ ] Painel solar ou fonte simples de energia
- [ ] Pelo menos 5 melhorias compráveis
- [ ] Produção automática por segundo
- [ ] Custos crescentes para estruturas e melhorias
- [ ] Salvamento local no navegador
- [ ] Retomar progresso após recarregar a página
- [ ] Layout funcional em desktop e celular
- [ ] Mensagens claras quando faltar recurso ou energia

### Não incluir na primeira versão

- Multiplayer
- Contas de usuário
- Servidor e economia compartilhada
- Combate tático
- Árvore tecnológica extensa
- Civilização completa
- Simulação física orbital complexa
- Megaprojetos e reinício por Ascensão

O conteúdo avançado pode ser adicionado depois que o núcleo econômico estiver testado.

---

## 13. Tecnologia sugerida

Para um protótipo simples, a implementação pode utilizar:

- **HTML** para a estrutura
- **CSS** para o layout responsivo e os painéis
- **JavaScript** para a economia, lógica de jogo e salvamento
- **Canvas 2D** para desenhar o cenário pixelado, se for útil manter tudo em uma área de jogo
- **LocalStorage** para o salvamento inicial

Uma biblioteca como **PixiJS** pode ser considerada se a cena passar a ter muitos sprites, efeitos e animações. Não é necessário escolher uma biblioteca mais complexa antes de confirmar os requisitos visuais.

### Separação lógica recomendada

- `economy`: recursos, produção, consumo e vendas
- `buildings`: definições e níveis das estruturas
- `research`: tecnologias e requisitos
- `progression`: desbloqueios e expansão
- `save`: persistência e recuperação
- `ui`: atualização dos painéis e mensagens
- `renderer`: sprites e animações do cenário

Os dados de estruturas e melhorias devem ficar em configurações separadas da lógica sempre que possível. Isso facilita balancear preços e produção sem reescrever sistemas.

### Cuidados técnicos

- Não atualizar a economia uma vez por quadro gráfico; separar a simulação da renderização.
- Usar o tempo decorrido entre atualizações para calcular produção com estabilidade.
- Validar os dados carregados do salvamento antes de usá-los.
- Tratar o relógio do dispositivo com cuidado ao calcular progresso offline.
- Evitar números infinitos ou `NaN` em produções e custos muito elevados.
- Manter a pixel art nítida, desativando suavização na renderização quando apropriado.

---

## 14. Critérios de sucesso do protótipo

O protótipo estará pronto para expandir quando:

- O jogador entender o objetivo nos primeiros minutos sem precisar consultar um manual.
- A primeira compra automática mudar claramente o ritmo do jogo.
- A refinaria criar uma decisão compreensível entre vender matéria-prima e processá-la.
- Os recursos e custos forem legíveis em telas pequenas.
- O progresso continuar após fechar e reabrir a página.
- Houver pelo menos duas melhorias que o jogador considere úteis em qualquer momento da primeira sessão.
- A economia não ficar travada silenciosamente por falta de energia ou matéria-prima.
- O visual pixelado for coerente entre cenário, estruturas, ícones e interface.

---

## 15. Ideias para atualizações futuras

- Especializações e bônus por tipo de planeta
- Contratos comerciais e mercado dinâmico simples
- Rotas automatizadas entre colônias
- Drones de manutenção e logística
- Árvores de pesquisa alternativas
- Eventos espaciais que criem oportunidades temporárias
- Colônias especializadas em agricultura, ciência ou indústria
- Personalização visual de estações e reatores
- Projeto Ascensão e bônus permanentes
- Enxames de Dyson e outras megaconstruções
- Estatísticas históricas de produção e gráficos

Eventos aleatórios não devem destruir horas de progresso. Devem criar escolhas, objetivos adicionais ou oportunidades de otimização.

---

## 16. Resumo de direção

**Núcleo Estelar** deve ser um tycoon idle de ficção científica em pixel art, focado em cadeias de produção e expansão gradual. O início é pequeno e concreto: minerar um asteroide, instalar máquinas e vender ligas. A complexidade surge quando as máquinas exigem energia, as fábricas precisam de componentes e as colônias passam a gerar população e ciência.

A prioridade de desenvolvimento é:

1. Fazer a economia básica ser satisfatória.
2. Tornar a produção automática e fácil de compreender.
3. Definir uma identidade visual pixel art consistente.
4. Adicionar energia e pesquisa.
5. Expandir para civilizações, novos planetas e megaprojetos.

**Regra de ouro:** o jogador deve conseguir responder a qualquer momento: *o que estou produzindo, o que está limitando meu crescimento e qual investimento vai melhorar minha economia agora?*
