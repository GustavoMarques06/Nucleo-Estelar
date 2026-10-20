// Tipos centrais do jogo. Os dados (recursos, estruturas, pesquisas, locais, megaprojetos, eventos) ficam
// em ./data e a lógica em ./engine — assim o balanceamento não exige mexer em sistemas.

export type ResId =
  | 'credits' | 'iron' | 'copper' | 'gold' | 'alloys' | 'components'
  | 'water' | 'food' | 'fuel' | 'science' | 'exotic' | 'ships' | 'population' | 'drones' | 'influence' | 'modules' | 'titanium' | 'crystals'
  | 'slag';
export type Amounts = Partial<Record<ResId, number>>;

export type BuildingId =
  | 'miner' | 'solar' | 'refinery' | 'storage' | 'factory' | 'fission'
  | 'observatory' | 'iceExtractor' | 'foundry' | 'crusher' | 'battery' | 'industrialComplex' | 'maintenance'
  | 'habitat' | 'hydroponics' | 'hospital' | 'university' | 'residential' | 'market'
  | 'orbitalCollector' | 'fusion' | 'chemicalPlant' | 'shipyard' | 'comms' | 'harbor'
  | 'cleanroom' | 'refineryComplex' | 'spaceport' | 'embassy' | 'moduleLine' | 'quantumLab' | 'arcology' | 'deepDrill' | 'titaniumForge' | 'crystalArray'
  | 'converter' | 'recycler' | 'silo' | 'tank' | 'depot'
  | 'geothermal' | 'flowBattery' | 'antimatter';
/** Grupos de armazenamento: armazéns especializados aumentam só a capacidade do seu grupo. */
export type StorageGroup = 'ore' | 'fluid' | 'goods';
/** Prioridade de uma indústria na disputa por insumos (1 = alta, −1 = baixa; ausente = normal). */
export type Priority = 1 | -1;
export type UpgradeId = string;
/** Cada estrutura pertence a exatamente uma categoria; cada categoria aparece numa única aba. */
export type Category = 'mining' | 'industry' | 'energy' | 'logistics' | 'science' | 'civilization' | 'commerce' | 'expansion' | 'diplomacy';

export interface ResourceDef {
  id: ResId;
  name: string;
  icon: string;          // nome do sprite em public/assets/sprites
  sellPrice?: number;    // créditos por unidade; ausente = não vendável
  stored: boolean;       // limitado pela capacidade do armazém
  mineral?: string;      // id no catálogo de minerais
  hidden?: boolean;      // não aparece como fichinha comum na barra (população tem a sua)
  group?: StorageGroup;  // grupo de armazenamento (só para os guardados no armazém)
}

/** Efeito que soma +`per` (fração) por unidade construída. Ex.: per 0.05 com 4 unidades = ×1,2. */
export type Boost =
  | { kind: 'energyAll'; per: number }
  | { kind: 'priceAll'; per: number }
  | { kind: 'popGrowth'; per: number }
  | { kind: 'tax'; per: number }
  | { kind: 'outputAll'; per: number }
  | { kind: 'outpost'; per: number }
  | { kind: 'expeditionSpeed'; per: number };

/** Receita alternativa de uma estrutura: troca insumos e produção, com outro gasto de energia. */
export interface Recipe { name: string; desc: string; inputs?: Amounts; outputs?: Amounts; energy: number }

export interface BuildingDef {
  id: BuildingId;
  name: string;
  desc: string;
  category: Category;
  sprite: string;
  cost: Amounts;
  growth: number;
  energyUse?: number;
  energyOut?: number;
  workers?: number;          // população necessária por unidade (mão de obra)
  housing?: number;          // moradia por unidade
  extract?: number;          // unidades/s retiradas da jazida (dividida pela composição)
  inputs?: Amounts;          // consumo por segundo por unidade
  outputs?: Amounts;         // produção por segundo por unidade
  storage?: number;          // capacidade da primeira unidade
  storageGrowth?: number;    // cada unidade seguinte guarda este múltiplo da anterior
  storageGroup?: StorageGroup; // armazém especializado: a capacidade vale só para este grupo
  byproducts?: Amounts;      // subprodutos por segundo por unidade (saem junto, sem travar a produção)
  battery?: number;          // carga de energia que cada unidade guarda (energia·segundo)
  surplus?: number;          // energia excedente que cada unidade consegue absorver por segundo (conversor)
  daylight?: boolean;        // geração varia com o dia e a noite do asteroide
  overclock?: boolean;       // pode entrar em sobrecarga (energia ×2 por um tempo, depois esfria)
  boost?: Boost;
  upkeep?: number;            // créditos/s de manutenção por unidade (calculado a partir do custo)
  alt?: Recipe;              // receita alternativa, escolhida pelo jogador
  requires?: UpgradeId;      // pesquisa que libera a estrutura
  unlock?: (s: GameState) => boolean;
}

export type Effect =
  | { kind: 'click'; mult: number }
  | { kind: 'output'; building: BuildingId; mult: number }
  | { kind: 'outputAll'; mult: number }
  | { kind: 'resource'; res: ResId; mult: number }        // multiplica toda a produção de um recurso
  | { kind: 'energyOut'; building?: BuildingId; mult: number }
  | { kind: 'energyUse'; mult: number }
  | { kind: 'storage'; mult: number }
  | { kind: 'price'; res?: ResId; mult: number }
  | { kind: 'deposit'; res: ResId; mult: number }
  | { kind: 'popGrowth'; mult: number }
  | { kind: 'popCap'; mult: number }
  | { kind: 'tax'; mult: number }
  | { kind: 'outpost'; mult: number }
  | { kind: 'expedition'; mult: number }                   // custo e duração das expedições
  | { kind: 'richness'; mult: number }                     // riqueza dos novos locais
  | { kind: 'cost'; mult: number }                         // custo das estruturas
  | { kind: 'contract'; mult: number }                     // recompensa dos contratos
  | { kind: 'megaCost'; mult: number }                     // custo dos megaprojetos
  | { kind: 'droneBoost'; mult: number }                   // força dos bônus dos drones
  | { kind: 'depth'; mult: number }                        // profundidade do mercado (aguenta mais vendas sem baixar o preço)
  | { kind: 'upkeep'; mult: number }                       // manutenção das estruturas e colônias
  | { kind: 'offline'; seconds: number }
  | { kind: 'autosell' };

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  icon: string;
  cost: Amounts;
  effects: Effect[];
  requires?: UpgradeId[];
  unlock?: (s: GameState) => boolean;
  phase: number;             // fase do GDD, para agrupar a árvore
}

export interface MineralDef {
  id: string;
  name: string;
  use: string;
  rarity: 'comum' | 'raro' | 'exótico';
  sprite: string;
}

export interface Settings {
  reduceMotion: boolean;
  sound: boolean;            // efeitos sonoros
  music: boolean;            // música ambiente
  volume: number;            // volume geral (0–1)
  focus: boolean;            // modo foco: sem cena animada, atualização lenta (economiza bateria)
}

// ---------- Expansão ----------
export type LocationType = 'rocky' | 'ice' | 'desert' | 'ocean' | 'jungle' | 'volcanic' | 'alien' | 'gas' | 'metallic' | 'crystal';
export type Specialization = 'mining' | 'agriculture' | 'science' | 'industry' | 'commerce';

export interface Outpost {
  level: number;
  spec: Specialization;
  terra: number;             // nível de terraformação (0–5)
  terraRemaining: number;    // segundos até concluir o nível em andamento (0 = nada em andamento)
  terraTotal: number;
  link?: boolean;            // ligada à rede de energia da base (rende mais, mas consome energia)
}

export interface Location {
  id: string;
  seed: number;
  name: string;
  type: LocationType;
  sprite: string;
  richness: number;          // multiplicador de produção (0,6–1,8)
  distance: number;          // influi no custo de fundar e no tempo de viagem
  mineral: string;           // mineral do catálogo encontrado aqui
  claimedBy: string | null;  // facção que reivindica o local (exige tratado ou taxa de disputa)
  outpost: Outpost | null;
}

/** Veio de minério: reserva finita que rende mais que a crosta do asteroide. */
export interface Vein { id: string; kind: string; name: string; mix: Amounts; yield: number; reserve: number; total: number }
export interface DepositState {
  veins: Vein[];
  focus: string;             // 'crust' ou o id do veio de onde sai a extração
  auto: boolean;             // escolhe o veio e prospecta sozinho (pesquisa Sondas autônomas)
  found: number;             // quantos veios já foram descobertos nesta jornada
}

export interface Expedition { id: string; seed: number; remaining: number; total: number }

// ---------- Eventos e efeitos temporários ----------
export interface Buff { id: string; name: string; effects: Effect[]; remaining: number }
export interface ActiveEvent { id: string; remaining: number; seed: number }

export interface Contract {
  id: string;
  res: ResId;
  amount: number;
  reward: Amounts;
  remaining: number;         // segundos até expirar
  risk?: boolean;            // contrato urgente: paga mais, mas falhar custa reputação
}

// ---------- Colônias: crises, rotas e mercado ----------
export type CrisisKind = 'drought' | 'unrest' | 'raid' | 'plague' | 'blockade' | 'blackout';
export interface Crisis { id: string; locId: string; kind: CrisisKind; remaining: number; total: number }
export interface TradeRoute { id: string; a: string; b: string; insured?: boolean }   // ids dos dois locais ligados; segurada = imune a bloqueios
export interface MarketState {
  clock: number;                                                        // segundos de mercado (nunca zera)
  sat: Partial<Record<ResId, number>>;                                  // saturação da demanda por recurso (0 = preço cheio)
}

// ---------- Facções e drones ----------
export interface FactionState { relation: number; cooldown: number; questTimer: number; done?: number }   // relação 0–100; cooldown do próximo presente; segundos até o próximo pedido
/** Pedido de uma facção: entregar material em troca de relação e recompensas. */
export interface FactionQuest { id: string; faction: string; res: ResId; amount: number; reward: Amounts; remaining: number; total: number; honor?: boolean }
export type DroneRole = 'courier' | 'scout' | 'hauler' | 'mechanic' | 'terraformer' | 'loader';

/** Sobrecarga de um reator: `left` segundos a mais de energia; depois `cool` segundos esfriando. */
export interface Overclock { left: number; cool: number; fault?: boolean }   // fault: pane — esfria mais tempo e gera menos

// ---------- Fim de jogo ----------
export interface TranscendenceState {
  seeds: number;             // Sementes Estelares disponíveis
  total: number;             // total já recebido
  count: number;             // quantas vezes transcendeu
  perks: Record<string, number>;
  unlocked: boolean;         // o desfecho (Singularidade) já foi alcançado
}

export interface AscensionState {
  points: number;            // Dados de Ascensão disponíveis
  total: number;             // total já recebido
  count: number;             // quantas vezes ascendeu
  perks: Record<string, number>;
}

/** Estado persistente (o que vai para o salvamento). */
export interface GameState {
  version: number;
  resources: Record<ResId, number>;
  buildings: Record<BuildingId, number>;
  upgrades: Record<UpgradeId, true>;
  autosell: Partial<Record<ResId, boolean>>;
  discovered: string[];            // ids de minerais descobertos (permanente)
  locations: Location[];
  deposit: DepositState;
  expeditions: Expedition[];
  nextSeed: number;
  megaprojects: Record<string, number>;   // estágios concluídos
  megaprogress: Record<string, Amounts>;  // materiais já entregues ao estágio em andamento
  repeatables: Record<string, number>;    // níveis das pesquisas contínuas (infinitas)
  contracts: Contract[];
  contractTimer: number;                   // segundos até a próxima oferta de contrato
  achievements: string[];                  // conquistas (permanentes, sobrevivem à Ascensão)
  tips: string[];                          // dicas já vistas (permanentes)
  goals: string[];                         // objetivos guiados concluídos (permanentes)
  story: string[];                         // registros do diário de bordo já lidos (permanentes)
  factions: Record<string, FactionState>;
  claimTimer: number;                      // segundos até a próxima movimentação de território das facções
  quests: FactionQuest[];                  // pedidos abertos das facções (no máximo um por facção)
  crises: Crisis[];
  crisisTimer: number;                     // segundos até a próxima crise (só conta com colônias)
  routes: TradeRoute[];
  market: MarketState;
  autosellFloor: number;                   // venda automática só acima deste múltiplo do preço base (0 = sempre)
  keep: Partial<Record<ResId, number>>;    // reserva (fração do armazém) que a venda automática não toca
  recipes: Partial<Record<BuildingId, true>>;   // estruturas usando a receita alternativa
  throttle: Partial<Record<BuildingId, number>>; // ritmo escolhido (0–1; ausente = 100%)
  priority: Partial<Record<BuildingId, Priority>>; // prioridade na disputa por insumos (ausente = normal)
  overclock: Partial<Record<BuildingId, Overclock>>; // reatores em sobrecarga ou esfriando
  protect: Category[];                     // categorias protegidas no racionamento: só perdem energia depois das outras
  energyCharge: number;                    // energia guardada nas baterias (energia·segundo)
  debt: number;                            // manutenção em atraso (créditos)
  drones: Record<DroneRole, number>;       // drones designados a cada função
  transcendence: TranscendenceState;
  buffs: Buff[];
  event: ActiveEvent | null;
  chain: { event: string; remaining: number }[];           // continuações de eventos que ainda vão acontecer (segundos para surgirem)
  flags: string[];                                         // escolhas lembradas nesta jornada (as continuações reagem a elas)
  eventTimer: number;              // segundos até o próximo evento
  ascension: AscensionState;
  challenges: { active: string | null; done: string[] };   // desafio da jornada atual e os já concluídos (permanentes)
  stats: {
    totalMined: number;
    produced: Partial<Record<ResId, number>>;
    earned: number;                // créditos ganhos nesta jornada
    lifetimeEarned: number;        // todas as jornadas
    playTime: number;              // segundos de simulação nesta jornada
    contractsDone: number;         // contratos cumpridos (todas as jornadas)
    eventsSeen: number;            // eventos respondidos (todas as jornadas)
    crisesSolved: number;          // crises resolvidas (todas as jornadas)
    highSales: number;             // vendas feitas com preço 25% acima da base (todas as jornadas)
    chains: number;                // histórias de eventos levadas até o fim (todas as jornadas)
    reputation: number;            // reputação comercial (todas as jornadas)
    questsDone: number;            // pedidos de facção cumpridos (todas as jornadas)
  };
  settings: Settings;
  savedAt: number;
}

export type BuildingStatus =
  | { kind: 'idle' }
  | { kind: 'ok' }
  | { kind: 'power'; ratio: number }
  | { kind: 'workers'; ratio: number }
  | { kind: 'input'; res: ResId }
  | { kind: 'full'; res: ResId }
  | { kind: 'paused' }                      // ritmo em 0%
  | { kind: 'surplus'; ratio: number };     // conversor: pouca energia sobrando para absorver

export type PopStatus = 'none' | 'growing' | 'stable' | 'housing' | 'starving';

/** Resultado de um passo de simulação — usado pela UI e pelos testes. */
/** De onde vem cada variação de estoque, por segundo (só calculado quando a interface pede). */
export type FlowSource = 'mining' | 'industry' | 'energy' | 'logistics' | 'science' | 'civilization' | 'commerce' | 'expansion' | 'diplomacy'
  | 'population' | 'colonies' | 'trade' | 'contracts' | 'upkeep';
export type Flows = Record<FlowSource, Partial<Record<ResId, number>>>;

export interface TickReport {
  delta: Record<ResId, number>;
  flows?: Flows;
  upkeep: { rate: number; debt: number; ratio: number };   // manutenção por segundo, dívida e fração que as estruturas conseguem manter
  status: Partial<Record<BuildingId, BuildingStatus>>;
  /**
   * `supply` já inclui `fromBattery` (o que as baterias devolveram por segundo); `charge`/`chargeCap` = carga das baterias;
   * `day` = fator solar agora; `converted` = energia por segundo absorvida pelos conversores.
   */
  energy: { supply: number; demand: number; ratio: number; charge: number; chargeCap: number; fromBattery: number; day: number; converted: number };
  workforce: { supply: number; demand: number; ratio: number };
  population: { cap: number; status: PopStatus; foodNeed: number };
  finishedExpeditions: string[];   // ids de locais descobertos neste passo
  finishedTerraforms: string[];    // ids de locais cuja terraformação subiu de nível neste passo
}
