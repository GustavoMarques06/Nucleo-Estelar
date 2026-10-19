import type { GameState } from '../types';
import { colonyCount } from '../selectors';

export interface StoryDef {
  id: string;
  title: string;
  /** Ilustração em public/assets/art (sem extensão): diario-NN, recortada de Assets/diario.jpg. */
  art: string;
  text: string[];
  when: (s: GameState) => boolean;
}

// Diário de bordo: um registro curto a cada marco grande (aparece uma vez; fica salvo para reler no Registro).
// A ordem é a da jornada. Os textos são deliberadamente curtos: quem quer só jogar fecha em um clique.
export const STORY: StoryDef[] = [
  { id: 'start', title: 'Diário de bordo 001: o asteroide', art: 'diario-01', when: () => true, text: [
    'Você acorda sozinho no K-17, um asteroide frio e cheio de metal. O rádio só chia. A nave que o trouxe está em pedaços.',
    'Há uma broca velha, um pouco de energia e muito espaço. É o bastante para começar.',
  ] },
  { id: 'lab', title: 'Diário 002: os dados falam', art: 'diario-02', when: s => s.buildings.observatory >= 1, text: [
    'O primeiro observatório liga e a tela se enche de números. As rochas ao redor não são só rochas: são um mapa do que existe lá fora.',
    'Ciência é a moeda do que ainda não se sabe fazer.',
  ] },
  { id: 'life', title: 'Diário 003: os primeiros colonos', art: 'diario-03', when: s => s.resources.population >= 10, text: [
    'Dez pessoas. Dez vozes onde só havia o zumbido das máquinas. Chegaram em cápsulas, atraídas pela luz da base.',
    'Elas precisam de teto, comida e um motivo para ficar. Em troca, trabalham, pagam impostos e fazem a base parecer um lugar.',
  ] },
  { id: 'stars', title: 'Diário 004: olhar para fora', art: 'diario-04', when: s => !!s.upgrades.exploration, text: [
    'O estaleiro termina a primeira nave de exploração. Pela janela, o K-17 parece pequeno.',
    'Existem mundos além do cinturão, e alguns deles nem sempre estão desocupados.',
  ] },
  { id: 'colony1', title: 'Diário 005: um novo lar', art: 'diario-05', when: s => colonyCount(s) >= 1, text: [
    'A bandeira é fincada em solo que ninguém pisou antes. A colônia ainda é só um domo e um gerador, mas já manda carga de volta para a base.',
    'Quem expande não perde o que tem: ganha mais lugares para produzir.',
  ] },
  { id: 'neighbors', title: 'Diário 006: não estamos sozinhos', art: 'diario-06', when: s => !!s.upgrades.diplomacy, text: [
    'Três sinais respondem ao seu chamado: o Conclave Helix, a Guilda Ferrum e a Hegemonia Vesper. Cada um quer algo, e nenhum é inimigo por padrão.',
    'Presentes abrem portas. Alianças custam caro e valem mais ainda. Mas agradar a um esfria o outro.',
  ] },
  { id: 'routes', title: 'Diário 007: o primeiro comboio', art: 'diario-07', when: s => s.routes.length >= 1, text: [
    'Duas colônias, uma rota. Quem tem água manda para quem tem ferro, e de repente as duas produzem mais.',
    'Piratas também sabem contar: rotas valem seguro.',
  ] },
  { id: 'garden', title: 'Diário 008: o deserto floresce', art: 'diario-08', when: s => s.locations.some(l => (l.outpost?.terra ?? 0) >= 1), text: [
    'Terraformar leva anos de planejamento e minutos de jogo. Mas a primeira chuva cai, e ela é de verdade.',
    'Mundos terraformados produzem mais, abrigam mais gente e resistem melhor às crises.',
  ] },
  { id: 'fusion', title: 'Diário 009: uma estrela em um anel', art: 'diario-09', when: s => s.buildings.fusion >= 1, text: [
    'O reator de fusão acende. Água pesada entra, luz sai. A base inteira passa a funcionar com a folga de quem não precisa mais contar cada watt.',
    'Mais energia significa que o próximo passo pode ser enorme.',
  ] },
  { id: 'dyson1', title: 'Diário 010: a estrela escuta', art: 'diario-10', when: s => (s.megaprojects.dyson ?? 0) >= 1, text: [
    'Os primeiros coletores se abrem em volta da estrela e a luz muda de cor. Não é mais só uma estrela: é uma fonte.',
    'O Enxame é só o começo. Com ele, o Projeto Ascensão fica ao alcance.',
  ] },
  { id: 'ascension', title: 'Diário 011: renascimento', art: 'diario-11', when: s => s.ascension.count >= 1, text: [
    'Tudo recomeça: o mesmo asteroide, a mesma broca. Mas agora você sabe o que fazer, e o que fica gravado em você não se perde.',
    'Cada jornada é mais rápida que a anterior. A pergunta é até onde dá para ir.',
  ] },
  { id: 'core', title: 'Diário 012: o Núcleo', art: 'diario-12', when: s => (s.megaprojects.core ?? 0) >= 1, text: [
    'Uma estrela artificial acende no centro do império. Ela não tem teto: cada estágio custa mais e rende mais.',
    'Quem a mantém crescendo descobre que o fim do jogo não é um lugar, é uma escolha.',
  ] },
  { id: 'transcend', title: 'Diário 013: além do fim', art: 'diario-13', when: s => s.transcendence.count >= 1, text: [
    'A Singularidade se fecha atrás de você e ainda assim há um amanhã. Sementes estelares, pequenas e quentes, esperam para brotar.',
    'Recomeçar nunca foi perder. Foi sempre escolher o que levar.',
  ] },
];

export const STORY_BY_ID = Object.fromEntries(STORY.map(e => [e.id, e]));
