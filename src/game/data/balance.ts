// Todos os números de balanceamento do jogo, num lugar só. Valores maiores = jogo mais lento ou mais caro.
// O teste de progressão (engine/progression.test.ts) joga a partida inteira e falha se algum ajuste travar
// o jogo ou sair do ritmo esperado: rode `npm test` depois de mexer aqui.
export const BALANCE = {
  // ----- Geral -----
  baseStorage: 100,
  baseEnergy: 2,              // gerador de emergência
  clickAmount: 1,
  offlineCapSeconds: 8 * 3600,
  simulationHz: 4,
  // Indústrias não consomem os últimos 10% do armazém: sobra material para construir (evita travar a base)
  constructionReserve: 0.1,

  // ----- Ritmo (o que torna o jogo mais lento ou mais rápido) -----
  buildingGrowthAdd: 0.05,    // somado ao crescimento de custo de toda estrutura (1,15 → 1,20)
  // Recalibrados com os marcos de quantidade (que multiplicam a produção): ritmo-alvo igual ao de antes.
  scienceScale: { 3: 21, 4: 66, 5: 1040, 6: 20000 } as Record<number, number>,   // custo em ciência por fase
  megaCostScale: 100,
  repeatableCostScale: 4,

  // ----- População -----
  foodPerPerson: 0.1,         // alimento consumido por pessoa por segundo
  growthRate: 0.03,           // fração da moradia livre ocupada por segundo
  growthFlat: 0.05,           // pessoas/s mínimas enquanto houver moradia e comida
  starveRate: 0.02,           // fração da população perdida por segundo sem comida
  taxPerPerson: 0.05,         // créditos/s por pessoa

  // ----- Expansão -----
  expeditionFuel: 40,
  expeditionTime: 90,
  expeditionMax: 3,           // expedições simultâneas
  disputeMult: 2.5,           // custo de fundar em local reivindicado por facção sem tratado
  disputePenalty: 15,         // relação perdida ao pagar a disputa

  // ----- Contratos comerciais -----
  contractMax: 3,
  contractDuration: 600,      // segundos até expirar
  contractGap: 180,           // segundos entre ofertas
  contractPayMult: 1.6,       // contratos pagam este múltiplo do preço base

  // ----- Jazida: veios de minério -----
  veinSeconds: 900,           // a reserva de um veio dura cerca de 15 min de extração no ritmo de agora
  veinMinReserve: 300,
  veinMaxActive: 6,           // veios com reserva ao mesmo tempo
  prospectFactor: 0.25,       // custo da prospecção = reserva nominal × este fator (em créditos)
  prospectMin: 150,

  // ----- Manutenção e custo de vida (sumidouros de créditos) -----
  upkeepRate: 0.0003,         // créditos/s por crédito do custo-base de cada estrutura grande
  upkeepMinCost: 2000,        // estruturas mais baratas que isso não cobram manutenção
  upkeepGrace: 120,           // segundos de manutenção que podem ficar em atraso sem punir a produção
  upkeepFloor: 0.25,          // com a dívida alta, as estruturas caras nunca caem abaixo desta fração
  colonyUpkeep: 6,            // créditos/s por colônia no nível 1 (cresce com nível^1,2 e terraformação)
  insuranceUpkeep: 4,         // créditos/s por rota segurada
  insuranceCost: 0.5,         // fração do custo da rota para segurá-la
  inflation: 0.04,            // alta do custo das estruturas a cada dez vezes mais créditos ganhos...
  inflationScale: 20000,      // ...contados a partir deste total

  // ----- Mercado: a demanda satura quando se vende demais e se recupera com o tempo -----
  marketRecovery: 240,        // segundos para a saturação cair pela metade (aprox.)
  marketValue: 4000,          // créditos que a demanda de cada recurso absorve pela metade do preço (cresce com a economia)

  // ----- Influência e reputação -----
  influenceTreaty: 0.01,      // influência/s por facção com tratado
  influenceAlliance: 0.03,    // influência/s por facção aliada (no lugar do tratado)
  repStep: 6,                 // reputação para o nível 1 (o nível sobe com a raiz quadrada)
  repContract: 3,
  repRiskContract: 8,
  repRiskFail: 4,
  contractRiskAfter: 3,       // contratos urgentes só aparecem depois deste número de contratos cumpridos
  contractRiskChance: 0.25,
  contractRiskDuration: 300,
  contractRiskMult: 1.55,     // pagamento extra do contrato urgente

  // ----- Crises de colônia (só surgem com o jogo aberto) -----
  crisisFirstDelay: 300,
  crisisMinGap: 480,
  crisisMaxGap: 900,
  crisisDuration: 600,
  crisisMax: 2,
  crisisPenalty: 0.4,         // fração da produção que a colônia mantém durante a crise

  // ----- Eventos espaciais -----
  eventMinGap: 150,
  eventMaxGap: 300,
  eventDuration: 60,

  // ----- Marcos de quantidade: cada marco atingido multiplica a função principal da estrutura -----
  milestoneMult: 1.5,

  // ----- Mineração ativa -----
  strikeMinGap: 50,           // segundos entre pontos brilhantes no asteroide (com o jogo aberto)
  strikeMaxGap: 120,
  strikeLife: 12,             // segundos que o ponto fica disponível
  strikeClicks: 20,           // um ponto brilhante vale pelo menos este número de cliques...
  strikeSeconds: 15,          // ...ou este tempo de extração automática, o que for maior

  // ----- Energia: dia e noite do asteroide, baterias, sobrecarga -----
  dayPeriod: 360,             // segundos de uma volta completa do asteroide (dia + noite)
  dayAmplitude: 0.3,          // painéis solares rendem de 70% (meia-noite) a 130% (meio-dia); média 100%
  batteryEfficiency: 0.9,     // fração da sobra que chega a ser guardada
  overclockMult: 2,
  overclockTime: 60,
  overclockCooldown: 240,
};
