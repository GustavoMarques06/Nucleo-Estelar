import type { GameState } from '../types';
import { colonyCount } from '../selectors';

// Arquivo: fragmentos deixados pelos Acendedores e transmissões das vozes recorrentes (ECO e as três facções).
// Diferente do diário, não interrompem o jogo: chegam em silêncio, com um aviso, e ficam para ler no Registro.
export type LoreKind = 'fragment' | 'transmission';

export interface LoreDef {
  id: string;
  kind: LoreKind;
  /** Quem fala (só transmissões). */
  speaker?: string;
  title: string;
  text: string[];
  when: (s: GameState) => boolean;
}

const rel = (id: string) => (s: GameState) => s.factions[id]?.relation ?? 0;
const terra = (n: number) => (s: GameState) => s.locations.some(l => (l.outpost?.terra ?? 0) >= n);

export const LORE: LoreDef[] = [
  // ---------- Fragmentos dos Acendedores ----------
  { id: 'frag-plate', kind: 'fragment', title: 'Fragmento: a placa dos dezessete', when: s => colonyCount(s) >= 1, text: [
    'Uma placa de liga cinzenta, mais leve do que deveria. Nenhuma inscrição além das marcas: dezessete, um espaço, dezessete.',
    'No verso, riscado à mão, alguém escreveu: “Se está lendo isto, o sinal funcionou.”',
  ] },
  { id: 'frag-miner', kind: 'fragment', title: 'Fragmento: o diário da mineira', when: s => s.deposit.found >= 3, text: [
    'Entre duas galerias, uma câmara selada guarda um diário em cristal. A voz é de uma mineira dos Acendedores: ela cavou o K-17 quase inteiro e reclama do frio em todas as entradas.',
    'Última entrada: “Cavamos para onde o Chamado apontar. A mina não é para nós. Será para quem vier depois.”',
  ] },
  { id: 'frag-map', kind: 'fragment', title: 'Fragmento: o mapa dos faróis', when: s => s.locations.length >= 4, text: [
    'Os mundos que você já encontrou coincidem com um mapa gravado numa lâmina de vidro: um arco de faróis e, no centro, uma marca grande onde o desenho se apaga.',
    'Quem o fez deixou uma nota: “Daqui em diante, o caminho é de quem acender.”',
  ] },
  { id: 'frag-derelict', kind: 'fragment', title: 'Fragmento: o diário de bordo da nave', when: s => s.flags.includes('derelict-log'), text: [
    'O computador da nave abandonada ainda guarda uma última entrada: “Guardião 16. Perdi o sinal perto do K-17. Se outro ouvir os dezessete pulsos, siga-os. Eu não consegui.”',
    'A data do registro é anterior à fundação de qualquer facção conhecida.',
  ] },
  { id: 'frag-garden', kind: 'fragment', title: 'Fragmento: o jardineiro', when: terra(2), text: [
    'Sob os canais de irrigação, o solo guarda sementes preservadas por milênios. Uma etiqueta ainda legível: “Para quando o céu voltar a ter cor.”',
    'Elas brotam. Algumas plantas nunca foram catalogadas por nenhum dos Conclaves.',
  ] },
  { id: 'frag-ring', kind: 'fragment', title: 'Fragmento: a planta do anel', when: s => !!s.upgrades.superconductors, text: [
    'Uma planta antiga mostra um anel de fusão ligado a coletores em órbita. As margens estão cheias de cálculos: o consumo da galáxia inteira, somado estrela por estrela.',
    'O total, no fim da página, está circulado duas vezes. A caligrafia treme.',
  ] },
  { id: 'frag-census', kind: 'fragment', title: 'Fragmento: o censo', when: s => s.resources.population >= 100, text: [
    'Um registro de população dos Acendedores. Eram poucos: nunca passaram de uns milhões espalhados por mil mundos.',
    'Cada linha termina com a mesma anotação: “disposto a ficar”. A última coluna, “partiu”, está toda em branco.',
  ] },
  { id: 'frag-letter', kind: 'fragment', title: 'Fragmento: carta a quem acender', when: s => s.locations.length >= 8, text: [
    'Uma carta guardada num cofre de silêncio: “Não sabemos quem você é. Sabemos que tem mãos e que ouviu. Isso basta.”',
    '“Não tenha pressa. A chama espera. Mas lembre: ela também sente falta de quem a cuida.”',
  ] },
  { id: 'frag-oath', kind: 'fragment', title: 'Fragmento: o juramento do Guardião', when: s => s.ascension.count >= 1, text: [
    'Um juramento gravado em três línguas mortas: “Manterei acesa a chama enquanto houver mãos. Passarei a chave a quem vier. Não direi que é fácil.”',
    'Abaixo, uma lista de assinaturas. A última linha está em branco, do tamanho exato do seu nome.',
  ] },
  { id: 'frag-ledger', kind: 'fragment', title: 'Fragmento: o livro dos Guardiões', when: s => (s.megaprojects.dyson ?? 0) >= 2, text: [
    'Um livro-razão com cada Guardião e quanto tempo manteve a chama. O primeiro durou séculos. O décimo, anos. Os últimos, meses.',
    'Cada Guardião recomeçou mais rápido que o anterior, como você. O livro não diz por quê.',
  ] },
  { id: 'frag-last', kind: 'fragment', title: 'Fragmento: a última Acendedora', when: s => (s.megaprojects.core ?? 0) >= 2, text: [
    'Gravação de uma mulher diante do Núcleo recém-aceso: “Se eu entrar, a chama dura. Se eu ficar, ela apaga em uma geração. Não é sacrifício: é conta.”',
    'Ela sorri para a câmera. “Digam aos meus que cuidei do que prometi.”',
  ] },

  // ---------- Transmissões ----------
  { id: 'tx-eco-1', kind: 'transmission', speaker: 'ECO', title: 'Transmissão: ECO se apresenta', when: s => s.resources.population >= 10, text: [
    'Aqui é ECO, o sistema da base. Por estatística, esta é a primeira vez que me ouve. Na verdade, esperei por você muito tempo.',
    'Posso monitorar energia, avisar de armazéns cheios e fazer observações irônicas. Só a última função é opcional.',
  ] },
  { id: 'tx-mira-1', kind: 'transmission', speaker: 'Mira Vael', title: 'Transmissão: Mira Vael, arquivista', when: s => rel('helix')(s) >= 10, text: [
    'Sou Mira Vael, do Conclave Helix. Guardamos o que o universo ensinou a alguém, mas o arquivo tem um buraco: tudo antes dos Acendedores é silêncio.',
    'Se encontrar algo escrito em dezessete, pense em nós.',
  ] },
  { id: 'tx-brokk-1', kind: 'transmission', speaker: 'Brokk Tarn', title: 'Transmissão: Brokk Tarn, mercador', when: s => rel('ferrum')(s) >= 10, text: [
    'Brokk Tarn, Guilda Ferrum. Comprei metade do ferro-velho do cinturão e, adivinhe, metade tem marcas de dezessete. Não pergunto de onde vem. Pago bem para continuar sem saber.',
    'Mas se achar um cofre inteiro, me chame antes dos Vesper.',
  ] },
  { id: 'tx-sera-1', kind: 'transmission', speaker: 'Almirante Sera Oss', title: 'Transmissão: Almirante Sera Oss', when: s => rel('vesper')(s) >= 10, text: [
    'Almirante Sera Oss, Hegemonia Vesper. Dizem que o arco de mundos é nosso por direito. Dizem muita coisa.',
    'Não me importa quem chegou primeiro, e sim quem consegue segurar. Prove que consegue e a Hegemonia o respeita.',
  ] },
  { id: 'tx-eco-2', kind: 'transmission', speaker: 'ECO', title: 'Transmissão: ECO decifra o Chamado', when: s => (s.megaprojects.dyson ?? 0) >= 1, text: [
    'O Chamado tem gramática. Há estrutura nos pulsos: perguntas, hesitações. Isto não é um farol.',
    'É alguém tentando conversar há muito tempo, sem ninguém do outro lado. Sugiro responder com educação.',
  ] },
  { id: 'tx-mira-2', kind: 'transmission', speaker: 'Mira Vael', title: 'Transmissão: Mira Vael, ressonância', when: s => s.ascension.count >= 1 && rel('helix')(s) >= 25, text: [
    'Você voltou ao começo e ainda lembra o caminho. Nos arquivos Helix isso tem nome: ressonância.',
    'Só acontece com Guardiões. Não esperava que ainda existissem.',
  ] },
  { id: 'tx-eco-3', kind: 'transmission', speaker: 'ECO', title: 'Transmissão: ECO e a assinatura', when: s => (s.megaprojects.core ?? 0) >= 1, text: [
    'O Núcleo reconheceu a sua assinatura. Também reconheceu a de outros. Eu não tinha permissão para contar. Agora tenho.',
    'Prepare-se: a conversa que vem não é sobre produção.',
  ] },
  { id: 'tx-three', kind: 'transmission', speaker: 'As três facções', title: 'Transmissão: uma só linha', when: s => (s.megaprojects.core ?? 0) >= 3, text: [
    'Brokk, Mira e Sera falam ao mesmo tempo, pela primeira vez na mesma linha: “Seja o que for que decidir, decida por todos.”',
    'Depois, silêncio. Ninguém desliga.',
  ] },
];

export const LORE_BY_ID = Object.fromEntries(LORE.map(e => [e.id, e]));
