import type { GameState } from '../types';
import { colonyCount } from '../selectors';

export interface StoryDef {
  id: string;
  /** Ato da história a que o capítulo pertence (aparece acima do título). */
  act?: string;
  title: string;
  /** Ilustração em public/assets/art (sem extensão): diario-NN, recortada de Assets/diario.jpg. */
  art: string;
  text: string[];
  when: (s: GameState) => boolean;
}

// Diário de bordo: um registro curto a cada marco grande (aparece uma vez; fica salvo para reler no Registro).
// A ordem é a da jornada. Os textos são deliberadamente curtos: quem quer só jogar fecha em um clique.
export const STORY: StoryDef[] = [
  // ---------- Ato I · Silêncio ----------
  { id: 'start', act: 'Ato I · Silêncio', title: 'Diário 001: o asteroide', art: 'diario-01', when: () => true, text: [
    'Você acorda sozinho no K-17, um asteroide frio e cheio de metal. A nave que o trouxe está em pedaços, espalhada em órbita como ossos. Não há ninguém para perguntar o que aconteceu.',
    'O rádio só chia. Mas é um chiado estranho: dezessete pulsos longos, uma pausa, e dezessete de novo. Você anota o padrão sem saber por quê.',
    'Há uma broca velha, um pouco de energia e muito espaço. É o bastante para começar.',
  ] },
  { id: 'lab', act: 'Ato I · Silêncio', title: 'Diário 002: os dados falam', art: 'diario-02', when: s => s.buildings.observatory >= 1, text: [
    'O primeiro observatório liga e a tela se enche de números. As rochas ao redor não são só rochas: são um mapa do que existe lá fora.',
    'Os sensores confirmam o que o ouvido já suspeitava. O chiado do rádio não é ruído: é um sinal, e vem sempre do mesmo ponto do céu.',
    'Ciência é a moeda do que ainda não se sabe fazer. E há muito que você não sabe.',
  ] },
  { id: 'veins', act: 'Ato I · Silêncio', title: 'Diário 003: geometria sob a crosta', art: 'diario-02', when: s => s.deposit.found >= 1, text: [
    'A primeira sonda desce e encontra um veio de minério. Mas o veio é reto demais. Reto como uma galeria, com paredes lisas e uma abóbada que nenhuma erosão faria.',
    'Alguém escavou este asteroide muito antes de você. O K-17 não é uma rocha à deriva: é uma mina abandonada, ou um pedaço de algo muito maior.',
    'Você registra as coordenadas das galerias. Todas apontam para o mesmo lugar do céu que o rádio.',
  ] },
  { id: 'life', act: 'Ato I · Silêncio', title: 'Diário 004: os primeiros colonos', art: 'diario-03', when: s => s.resources.population >= 10, text: [
    'Dez pessoas. Dez vozes onde só havia o zumbido das máquinas. Chegaram em cápsulas, atraídas pela luz da base.',
    'Elas também ouviam o chiado. Algumas o chamam de o Chamado e dizem que o ouvem desde crianças, nos sonhos, em mundos que nunca conheceram uns aos outros.',
    'Elas precisam de teto, comida e um motivo para ficar. Em troca, trabalham, pagam impostos e fazem a base parecer um lugar.',
  ] },
  // ---------- Ato II · O Chamado ----------
  { id: 'stars', act: 'Ato II · O Chamado', title: 'Diário 005: olhar para fora', art: 'diario-04', when: s => !!s.upgrades.exploration, text: [
    'O estaleiro termina a primeira nave de exploração. Pela janela, o K-17 parece pequeno.',
    'Os mapas estelares mostram o que o sinal já sugeria: há mundos além do cinturão, e eles formam um arco, como contas de um colar que alguém espalhou.',
    'Alguns estão vazios. Outros nem sempre estão desocupados. O Chamado aponta para o centro do arco.',
  ] },
  { id: 'signal', act: 'Ato II · O Chamado', title: 'Diário 006: o eco', art: 'diario-04', when: s => s.locations.length >= 1, text: [
    'A primeira expedição volta com um local novo no mapa e um dado impossível: o mundo também emite o Chamado. Dezessete pulsos, uma pausa, dezessete.',
    'Não é coincidência. Cada ponto do arco repete o sinal, um passando ao outro, como faróis numa costa muito longa.',
    'Alguém montou uma rede de faróis para guiar quem estivesse perdido. Resta saber guiar até onde.',
  ] },
  { id: 'colony1', act: 'Ato II · O Chamado', title: 'Diário 007: um novo lar', art: 'diario-05', when: s => colonyCount(s) >= 1, text: [
    'A bandeira é fincada em solo que ninguém pisou antes. A colônia ainda é só um domo e um gerador, mas já manda carga de volta para a base.',
    'Sob o domo, os colonos encontram placas de metal cobertas de poeira, gravadas com o mesmo ritmo: dezessete marcas, um espaço, dezessete.',
    'Quem expande não perde o que tem: ganha mais lugares para produzir. E mais lugares para descobrir quem esteve aqui.',
  ] },
  { id: 'neighbors', act: 'Ato II · O Chamado', title: 'Diário 008: não estamos sozinhos', art: 'diario-06', when: s => !!s.upgrades.diplomacy, text: [
    'Três sinais respondem ao seu chamado: o Conclave Helix, a Guilda Ferrum e a Hegemonia Vesper. Cada um quer algo, e nenhum é inimigo por padrão.',
    'Eles também têm o Chamado. Os Helix o chamam de memória, a Ferrum de oportunidade, a Vesper de ordem. Todos concordam num ponto: antes de qualquer facção, houve os Acendedores.',
    'Ninguém sabe quem eles foram. Cada facção guarda um fragmento da história e nenhuma quer mostrá-lo às outras. Presentes abrem portas, alianças custam caro, e agradar a uma esfria a rival.',
  ] },
  // ---------- Ato III · Herança ----------
  { id: 'routes', act: 'Ato III · Herança', title: 'Diário 009: o primeiro comboio', art: 'diario-07', when: s => s.routes.length >= 1, text: [
    'Duas colônias, uma rota. Quem tem água manda para quem tem ferro, e de repente as duas produzem mais.',
    'Os pilotos notam que as melhores rotas seguem, sem querer, o desenho do arco de faróis. Os Acendedores já tinham traçado este comércio, milênios atrás.',
    'Piratas também sabem contar: rotas valem seguro.',
  ] },
  { id: 'garden', act: 'Ato III · Herança', title: 'Diário 010: o deserto floresce', art: 'diario-08', when: s => s.locations.some(l => (l.outpost?.terra ?? 0) >= 1), text: [
    'Terraformar leva anos de planejamento e minutos de jogo. Mas a primeira chuva cai, e ela é de verdade.',
    'Ao revolver o solo, as máquinas expõem canais de irrigação enterrados, retos como as galerias do K-17. Este mundo já foi um jardim. Alguém o cuidou e depois o deixou.',
    'Mundos terraformados produzem mais, abrigam mais gente e resistem melhor às crises. E guardam, sob a terra nova, os restos de quem plantou a primeira.',
  ] },
  { id: 'fusion', act: 'Ato III · Herança', title: 'Diário 011: uma estrela em um anel', art: 'diario-09', when: s => s.buildings.fusion >= 1, text: [
    'O reator de fusão acende. Água pesada entra, luz sai. A base inteira passa a funcionar com a folga de quem não precisa mais contar cada watt.',
    'Os engenheiros param diante do projeto concluído. O anel é idêntico ao desenho numa das placas achadas nas colônias. Vocês não o inventaram: lembraram dele.',
    'Mais energia significa que o próximo passo pode ser enorme. A placa mostra qual é.',
  ] },
  // ---------- Ato IV · Reacender ----------
  { id: 'dyson1', act: 'Ato IV · Reacender', title: 'Diário 012: a estrela escuta', art: 'diario-10', when: s => (s.megaprojects.dyson ?? 0) >= 1, text: [
    'Os primeiros coletores se abrem em volta da estrela e a luz muda de cor. Não é mais só uma estrela: é uma fonte.',
    'Quando o Enxame fecha o primeiro anel, o Chamado muda. Dezessete pulsos, uma pausa, e então uma sequência nova, devagar, como alguém aprendendo a falar: “mantenham… acesa”.',
    'O Enxame é só o começo. Com ele, o Projeto Ascensão fica ao alcance.',
  ] },
  { id: 'ascension', act: 'Ato IV · Reacender', title: 'Diário 013: renascimento', art: 'diario-11', when: s => s.ascension.count >= 1, text: [
    'Tudo recomeça: o mesmo asteroide, a mesma broca. Mas agora você sabe o que fazer, e o que fica gravado em você não se perde.',
    'No silêncio do recomeço você entende o que viu nas placas: não é a primeira vez. Entre as galerias do K-17 há marcas de contagem, e a última tem o seu traço.',
    'Cada jornada é mais rápida que a anterior. A pergunta é até onde dá para ir, e quantos já foram antes.',
  ] },
  { id: 'core', act: 'Ato IV · Reacender', title: 'Diário 014: o Núcleo', art: 'diario-12', when: s => (s.megaprojects.core ?? 0) >= 1, text: [
    'Uma estrela artificial acende no centro do império. Ela não tem teto: cada estágio custa mais e rende mais.',
    'Pela primeira vez o Chamado não é pulso: é voz. Cansada, mas não hostil. Ela agradece e diz que esperou muito tempo por mãos que soubessem construir.',
    'Quem a mantém crescendo descobre que o fim do jogo não é um lugar, é uma escolha.',
  ] },
  // ---------- Ato V · O Núcleo ----------
  { id: 'truth', act: 'Ato V · O Núcleo', title: 'Diário 015: os Acendedores', art: 'diario-12', when: s => (s.megaprojects.core ?? 0) >= 3, text: [
    'O Núcleo finalmente conta a história. Há muito tempo, as estrelas da galáxia começaram a morrer, uma a uma. Os Acendedores construíram o Núcleo para mantê-la acesa.',
    'Mas uma estrela não se cuida sozinha. Eles se derramaram dentro dele, até o último, para que a luz nunca falhasse. Não sumiram: viraram a chama.',
    'A chama, porém, só queima: não escolhe nem constrói. Por isso espalhou o Chamado, para despertar quem tivesse mãos. A nave em pedaços ao redor do K-17 foi de um Guardião antes de você. E de outro antes dele.',
    'Você não é o primeiro a manter o Núcleo. A pergunta que resta é se será o último.',
  ] },
  { id: 'transcend', act: 'Ato V · O Núcleo', title: 'Diário 016: além do fim', art: 'diario-13', when: s => s.transcendence.count >= 1 && !s.flags.some(f => f.startsWith('ending-')), text: [
    'A Singularidade se fecha atrás de você e ainda assim há um amanhã. Sementes estelares, pequenas e quentes, esperam para brotar.',
    'O Núcleo, enfim, descansa. Ele nunca quis ser eterno: quis dar a alguém a chance de acender o que viesse depois. Cada semente é uma estrela que ainda não nasceu.',
    'Recomeçar nunca foi perder. Foi sempre escolher o que levar.',
  ] },
  // Epílogos: um para cada resposta dada ao Núcleo (evento “A chama pergunta”).
  { id: 'epilogue-keeper', act: 'Ato V · O Núcleo', title: 'Epílogo: o Primeiro', art: 'diario-13', when: s => s.transcendence.count >= 1 && s.flags.includes('ending-keeper'), text: [
    'Você escolheu ficar. Quando as Sementes brotam, o Núcleo não se apaga: você ensina outros a cuidar dele. Já não se chama Guardião. Chama-se Primeiro.',
    'A chama agradece. Pela primeira vez em muito tempo, tem companhia.',
  ] },
  { id: 'epilogue-free', act: 'Ato V · O Núcleo', title: 'Epílogo: o descanso', art: 'diario-13', when: s => s.transcendence.count >= 1 && s.flags.includes('ending-free'), text: [
    'Você escolheu libertar a chama. Na última Semente, o Núcleo se apaga devagar, como quem dorme depois de um dia longo. As estrelas que ele acendeu continuam.',
    'Em algum lugar, dezessete pulsos tocam uma última vez. Depois, silêncio. Um silêncio bom.',
  ] },
  { id: 'epilogue-share', act: 'Ato V · O Núcleo', title: 'Epílogo: a mesa', art: 'diario-13', when: s => s.transcendence.count >= 1 && s.flags.includes('ending-share'), text: [
    'Você escolheu partilhar. Helix, Ferrum e Vesper se sentam à mesma mesa pela primeira vez, ao redor do Núcleo. Brigam, é claro. Mas brigam por turnos.',
    'A chama passa a ser de todos, e todos passam a ter motivo para mantê-la.',
  ] },
];

const rel = (id: string) => (s: GameState) => s.factions[id]?.relation ?? 0;
const lore = (id: string, art: string, lines: [string, string][]): StoryDef[] =>
  [10, 25, 60, 90].map((at, i) => ({ id: `lore-${id}-${i + 1}`, title: lines[i][0], art, text: [lines[i][1]], when: (s: GameState) => rel(id)(s) >= at }));

// Cada facção tem a sua história, contada em quatro capítulos conforme a relação sobe.
STORY.push(
  ...lore('helix', 'diario-06', [
    ['Conclave Helix: o primeiro contato', 'Uma voz calma responde em dezenas de idiomas: o Conclave Helix guarda o que o universo já ensinou a alguém. Eles perguntam o que você quer saber.'],
    ['Conclave Helix: o tratado', 'Os arquivistas abrem uma biblioteca em órbita. Em troca de materiais avançados, deixam você ler.'],
    ['Conclave Helix: a aliança', 'Os Helix compartilham o que ainda não publicaram. A Vesper olha de longe, desconfiada, e muda de rota.'],
    ['Conclave Helix: a irmandade', 'Um arquivista idoso entrega a você a chave de um cofre que ninguém abre há mil anos. “Para quem pergunta como você pergunta.”'],
  ]),
  ...lore('ferrum', 'diario-07', [
    ['Guilda Ferrum: o primeiro contato', 'Um cargueiro sem nome atraca sem avisar. A Guilda Ferrum vende, compra e mede tudo em ligas: eles querem saber quanto você produz.'],
    ['Guilda Ferrum: o tratado', 'Os mercadores abatem uma taxa e passam a pagar mais pelo que você vende. A Vesper nota e cobra mais caro em outro lugar.'],
    ['Guilda Ferrum: a aliança', 'Os estaleiros da Guilda constroem para você com desconto. Em troca, esperam contratos e pontualidade.'],
    ['Guilda Ferrum: a irmandade', 'O chefe da Guilda manda gravar o seu nome no casco do maior cargueiro da frota. É a maior honra que um mercador conhece.'],
  ]),
  ...lore('vesper', 'diario-04', [
    ['Hegemonia Vesper: o primeiro contato', 'Frotas de colonização cruzam o seu cinturão sem pedir licença. A Hegemonia Vesper acha que o espaço pertence a quem chega primeiro.'],
    ['Hegemonia Vesper: o tratado', 'Depois de combustível e boa vontade, a Hegemonia aceita dividir rotas. Por enquanto.'],
    ['Hegemonia Vesper: a aliança', 'Os almirantes Vesper compartilham mapas de mundos que ninguém reivindicou. A Ferrum e a Helix escolhem seus lados.'],
    ['Hegemonia Vesper: a irmandade', 'A Hegemonia convida você ao salão dos fundadores. Pela primeira vez, alguém de fora se senta à mesa onde se decide para onde vai a próxima frota.'],
  ]),
);

export const STORY_BY_ID = Object.fromEntries(STORY.map(e => [e.id, e]));
