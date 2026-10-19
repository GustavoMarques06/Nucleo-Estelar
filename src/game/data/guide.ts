export interface GuideEntry { id: string; title: string; icon: string; text: string[] }

// Guia rápido (aba Registro): explica em poucas linhas cada número e sistema do jogo.
export const GUIDE: GuideEntry[] = [
  { id: 'basics', title: 'Como o jogo funciona', icon: 'nav-mining', text: [
    'Você começa com uma broca num asteroide. Extraia minério, venda, compre máquinas e deixe-as trabalhar sozinhas.',
    'O painel “Telemetria” sempre diz o que você produz, o que limita o crescimento e o próximo passo. O “Objetivo” abaixo dele guia as primeiras horas.',
  ] },
  { id: 'energy', title: 'Energia', icon: 'nav-energy', text: [
    'Quase toda máquina consome energia. “Em uso / gerada” aparece no topo; “sobra” é a folga para ligar mais máquinas.',
    'Se o uso passar do que é gerado, todas as máquinas ficam mais lentas na mesma proporção. Construa geradores antes de novas fábricas.',
  ] },
  { id: 'storage', title: 'Armazém e capacidade', icon: 'icon-crate', text: [
    'Cada material tem um limite de estoque. A barrinha na base de cada cartão do topo mostra o quanto está cheio; vermelha = cheio.',
    'Com o estoque cheio, quem produz aquele material para. Venda, gaste ou construa Armazéns (cada novo guarda mais que o anterior).',
    'As indústrias nunca consomem os últimos 10% do armazém: sobra sempre material para construir.',
  ] },
  { id: 'deposit', title: 'Jazida: crosta e veios', icon: 'ore-gold', text: [
    'A crosta do asteroide é infinita, mas rende pouco. Depois de pesquisar Geologia você pode prospectar veios: reservas finitas que rendem de 20% a 100% mais e trazem minérios novos (titânio, cristais).',
    'Escolha de qual veio perfurar na aba Mineração. Um veio dura cerca de 15 minutos de extração; esgotado, a extração volta sozinha para a crosta. Quanto mais máquinas, mais rápido ele acaba, e mais caro fica prospectar um novo.',
    'As Sondas autônomas (pesquisa) escolhem o melhor veio e prospectam sozinhas. Titânio e cristais abrem estruturas novas: Perfuratriz profunda, Forja de titânio e Matriz de cristais.',
  ] },
  { id: 'chain', title: 'Cadeias de produção', icon: 'building-refinery', text: [
    'Minério vira liga (refinaria/fundição), liga + cobre vira componente (fábrica). Quanto mais processado, mais vale.',
    'Cada estrutura mostra o motivo quando para: “Sem ferro”, “Energia insuficiente”, “Armazém cheio” ou “Falta mão de obra”.',
  ] },
  { id: 'research', title: 'Pesquisa e ciência', icon: 'nav-research', text: [
    'As primeiras pesquisas custam créditos. Depois entra a ciência, produzida por Observatórios, Universidades e colônias.',
    'A aba Pesquisa pisca quando há algo para pesquisar. As pesquisas contínuas não têm nível máximo.',
  ] },
  { id: 'people', title: 'População e trabalhadores', icon: 'nav-civilization', text: [
    'Colonos precisam de moradia e comida. Pagam impostos e ocupam as vagas das estruturas grandes: sem gente, elas rendem menos.',
    'Sem comida a população diminui, mas nunca some de vez.',
  ] },
  { id: 'trade', title: 'Mercado, contratos e rotas', icon: 'nav-market', text: [
    'Depois de Entrepostos comerciais os preços oscilam: o gráfico mostra os próximos 15 minutos. Segure na baixa, venda na alta.',
    'Contratos pagam bem acima do preço base e não variam. Rotas comerciais ligam colônias: quem recebe o que precisa produz mais.',
  ] },
  { id: 'colonies', title: 'Colônias, crises e terraformação', icon: 'nav-map', text: [
    'Expedições descobrem locais; no Mapa você funda colônias e escolhe a especialização. Locais reivindicados por facções custam mais sem tratado.',
    'Uma crise (seca, agitação, ataque, praga) só reduz a produção por alguns minutos: pague, peça ajuda a uma facção ou espere. Nada é destruído.',
    'Terraformar sobe a produção e a moradia da colônia até o nível 5.',
  ] },
  { id: 'market', title: 'Mercado e demanda', icon: 'nav-market', text: [
    'Depois de pesquisar Entrepostos comerciais, o preço de cada recurso oscila e também reage ao que você vende: vender muito de uma vez satura a demanda e o preço cai. A barra “Demanda” em cada cartão mostra o quanto ela está saturada.',
    'A demanda se recupera sozinha (metade a cada 4 minutos) e cresce com o tamanho da sua economia, com Entrepostos, colônias, reputação e pesquisas. Itens diferentes têm demandas separadas: diversificar rende mais que despejar um só.',
    'Na venda automática você escolhe um preço mínimo e uma reserva do armazém que ela não toca.',
  ] },
  { id: 'upkeep', title: 'Manutenção e custo de vida', icon: 'icon-tool', text: [
    'Estruturas grandes, colônias e rotas seguradas custam créditos por segundo. O que não puder ser pago vira dívida, paga primeiro com os próximos créditos; se a dívida passar de 2 minutos de manutenção, as estruturas caras perdem ritmo (nunca param de vez).',
    'Conforme você ganha mais créditos, as estruturas também ficam mais caras (inflação suave que zera na Ascensão). A aba Finanças mostra de onde vem cada recurso e para onde vai.',
  ] },
  { id: 'influence', title: 'Influência e reputação', icon: 'icon-influence', text: [
    'Embaixadas geram Influência. Ela compra decretos temporários (produção, preços, austeridade), campanhas diplomáticas (+relação sem presentes) e resolve disputas por locais sem taxa nem desgaste.',
    'Cumprir contratos sobe a Reputação comercial: cada nível baixa o custo das rotas, aumenta o pagamento dos contratos e a demanda do mercado. Contratos urgentes pagam mais, mas falhar custa reputação.',
    'Rotas podem sofrer bloqueios de piratas. Segurar uma rota a deixa imune, ao custo de manutenção.',
  ] },
  { id: 'factions', title: 'Facções, pedidos e rivalidade', icon: 'region-system', text: [
    'Cada facção faz um pedido por vez (um material que valoriza), com prazo de 15 minutos. Cumprir rende +10 de relação, influência e uma recompensa própria: mais barato que presentes, e sem esfriar a rival.',
    'Relação 25 = tratado, 60 = aliança, 90 = irmandade (bônus ainda maior). Quem é aliado de uma facção esfria a rival dela aos poucos, e a rival pode cobrar uma prova de boa-fé (evento).',
    'Vesper é rival da Ferrum e da Helix: escolher um lado é uma decisão de verdade.',
  ] },
  { id: 'drones', title: 'Drones', icon: 'drone-transport', text: [
    'O Hangar monta drones. Na aba Logística você designa cada um a uma função. O primeiro drone de uma função liga a automação dela; os demais dão bônus com retornos decrescentes.',
  ] },
  { id: 'legacy', title: 'Ascensão e Transcendência', icon: 'icon-star', text: [
    'A Ascensão recomeça a jornada em troca de Dados de Ascensão, que compram melhorias permanentes. Cada jornada fica mais rápida.',
    'A Singularidade encerra a história e libera a Transcendência: um segundo recomeço, que também zera a Ascensão, em troca de Sementes Estelares.',
    'Conquistas e o catálogo de minerais nunca se perdem.',
  ] },
  { id: 'focus', title: 'Modo foco e bateria', icon: 'icon-radar', text: [
    'Para deixar o jogo aberto em segundo plano, ligue o Modo foco: a cena animada sai, um painel de alertas entra e o jogo atualiza mais devagar. O título da aba mostra quantos alertas pedem atenção.',
    'O jogo salva sozinho a cada 10 segundos, e a produção continua por até 8 horas com a aba fechada.',
  ] },
];
