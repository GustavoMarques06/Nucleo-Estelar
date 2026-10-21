/** Textos que chegam ao `t()` por variável (tabelas e listas), por isso o varredor de código não os enxerga. */
export const EXTRA_KEYS: string[] = [
  // Abas e grupos
  'Produção', 'Sociedade', 'Galáxia', 'Legado', 'Mineração', 'Indústria', 'Energia', 'Logística', 'Pesquisa', 'Civilização', 'Comércio',
  'Finanças', 'Expansão', 'Mapa', 'Diplomacia', 'Megaprojetos', 'Ascensão', 'Transcendência', 'Registro', 'Opções',
  // Registro
  'Guia', 'Diário', 'Conquistas', 'Minerais', 'Estatísticas', 'Tempo nesta jornada', 'Estruturas construídas', 'Pesquisas concluídas',
  'Minério extraído', 'Créditos ganhos nesta jornada', 'Créditos ganhos em todas as jornadas', 'Colônias · locais descobertos',
  'Contratos cumpridos', 'Eventos respondidos', 'Ascensões', 'Integridade do save',
  // Pesquisa
  'Fase 1 · Sobrevivência industrial', 'Fase 2 · Autossuficiência energética', 'Fase 3 · Indústria avançada', 'Fase 4 · Civilização',
  'Fase 5 · Expansão interestelar', 'Fase 6 · Megaprojetos',
  // Tutorial
  'Clique em “Extrair minério” (ou no asteroide) para tirar ferro da rocha.', 'Venda o ferro: os créditos compram as máquinas.',
  'Compre uma Mineradora: ela extrai sozinha, mesmo sem você clicar.', 'Máquinas gastam energia. Construa um Painel solar na aba Energia.',
  'Pronto! A bússola no topo sempre mostra o próximo objetivo e para onde a jornada vai.',
  // Civilização (medidas de bem-estar e suas dicas)
  'Comida', 'Moradia', 'Trabalho', 'Saúde',
  'Reserva de comida para 1 minuto de consumo. Estufas hidropônicas resolvem.',
  'Moradia para todos. Habitats e torres residenciais abrigam mais gente.',
  'Pessoas para ocupar as vagas das estruturas. Mais moradia e comida trazem mais colonos.',
  'Um centro médico para cada 500 pessoas.',
  'A energia da base precisa dar conta da demanda. Veja a aba Energia.',
  // Bússola da jornada (nomes e metas das fases)
  'Base', 'Sociedade', 'Império', 'Além',
  'Monte uma base que trabalha sozinha: mineradoras, energia e uma refinaria.',
  'Faça a base crescer: ciência, fábricas e os primeiros colonos (pesquise Habitats pressurizados).',
  'Olhe para fora: pesquise Exploração estelar e mande a primeira expedição.',
  'Funde colônias e conheça as facções: pesquise Diplomacia estelar.',
  'Ligue colônias por rotas, cresça em influência e pesquise Fusão nuclear para chegar aos megaprojetos.',
  'Construa o Enxame de Dyson e o Núcleo Estelar até a Singularidade; depois Ascenda para recomeçar mais forte.',
  'Transcenda: recomece num nível acima, com melhorias permanentes, e vá mais longe.',
  // Finanças
  'Geradores', 'Ciência', 'Estruturas comerciais', 'Diplomacia', 'População e impostos', 'Colônias', 'Venda automática',
  'Contratos automáticos', 'Manutenção',
  // Estruturas
  'em toda a energia', 'no preço de venda', 'no crescimento populacional', 'nos impostos', 'em toda a produção', 'na produção das colônias',
  'na velocidade das expedições',
  // Civilização
  'Sem colonos ainda', 'Crescendo', 'Estável', 'Moradia lotada', 'Fome: a população está diminuindo',
  // Barra superior
  'Créditos: a moeda do jogo. Compram estruturas, pesquisas e expansões.',
  'Ciência: paga as pesquisas avançadas. Vem de Observatórios, Universidades e colônias.',
  'Naves: necessárias para expedições e para fundar colônias. O Estaleiro as monta.',
  // Frases escolhidas por condição (o varredor só enxerga t('literal'))
  'Dia no asteroide: o pôr do sol em {tempo} (painéis solares rendem mais de dia).',
  'Noite no asteroide: o nascer do sol em {tempo} (painéis solares rendem mais de dia).',
  'Baterias: {a} de {b} de carga, descarregando agora.', 'Baterias: {a} de {b} de carga.',
  'Energia insuficiente (noite) — máquinas a {n}%', 'Energia insuficiente — máquinas a {n}%',
  // Atalhos
  'Ir para a aba (na ordem do menu lateral)', 'Extrair minério (segure para repetir)', 'Vender o ferro', 'Ligar ou desligar o modo foco',
  'Silenciar ou religar o som', 'Mostrar esta lista de atalhos', 'Fechar a janela aberta', 'Navegar entre os botões',
  // Motivos de ações negadas (engine)
  'Pesquise Corpo diplomático.', 'Falta influência.', 'Faltam créditos.', 'Pesquise Exploração estelar.', 'Faltam naves ou combustível.',
  'Pesquise Terraformação.', 'Funde uma colônia primeiro.', 'Gigantes gasosos e asteroides não podem ser terraformados.',
  'Já é um mundo-jardim.', 'Terraformação em andamento.', 'Relação máxima.', 'Aguarde para enviar outro presente.',
  'Pesquise Geologia.', 'Pesquise Rotas de transporte.', 'Escolha duas colônias diferentes.', 'Essas colônias já estão ligadas.',
  'Faltam créditos ou combustível.',
  // Avisos (toasts) sem variáveis
  'O save principal estava ilegível: restauramos o backup mais recente.', 'Armazém cheio — venda ou processe o minério.',
  'Armazém cheio — o ponto brilhante se perdeu.', 'Energia insuficiente: construa geradores para manter as máquinas a 100%.',
  'Colônia fundada!', 'Terraformação iniciada.', 'Transcendência concluída. Uma nova era começa.',
  'Recursos insuficientes para essa escolha.', 'Não foi possível salvar neste navegador. Exporte o save em Opções.',
  'Rota segurada: imune a bloqueios.', 'Crise resolvida.', 'Rota comercial aberta.', 'Contrato cumprido!',
  // Registro (abas novas), diretivas, corrida, sítios e motivos de ações negadas
  'Relíquias', 'Jornadas',
  'estoque acima de', 'estoque abaixo de', 'falta energia', 'sobra energia (20% ou mais)', 'vender o excedente de', 'mudar o ritmo de',
  'Colônias +15% e preço de venda +5% até a Ascensão, e +250 de influência.',
  'Pedágio no portal da rival: expedições 15% mais caras e lentas até a Ascensão.',
  'Ruínas dos Acendedores', 'Câmara de cristal', 'Destroço antigo', 'Farol apagado',
  'Este sítio já foi escavado.', 'Etapa em andamento.', 'Faltam créditos, combustível ou naves.',
  'A rival já está atenta: não dá para atrasar mais.',
  'O {faccao} também constrói um portal. Termine o seu Portal estelar primeiro.', 'A {faccao} também constrói um portal. Termine o seu Portal estelar primeiro.',
];
