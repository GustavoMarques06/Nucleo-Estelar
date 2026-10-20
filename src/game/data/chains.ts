import type { EventDef } from './events';

// Histórias em vários capítulos: a escolha de um evento decide qual (e se) o próximo aparece, alguns minutos depois.
// Cada história só começa uma vez por jornada, e as escolhas ficam lembradas (flags) para as continuações reagirem.
// Só os começos entram no sorteio; as continuações (`followUp`) chegam pelas escolhas.
const once = (id: string) => `chain-${id}`;

export const CHAIN_EVENTS: EventDef[] = [
  // ---------- O sinal ----------
  {
    id: 'signal', name: 'Um sinal no cinturão', sprite: 'event-derelict-ship', part: [1, 3],
    text: 'Os sensores captam um sinal repetitivo vindo do cinturão: três pulsos, uma pausa, três pulsos. Não é natural.',
    minPhase: s => !!s.upgrades.lab && s.stats.earned >= 5000 && !s.flags.includes(once('signal')),
    choices: [
      { label: 'Decodificar o sinal (gasta ciência)', flag: once('signal'), pay: (_, k) => ({ science: Math.ceil(6 * k) }), chain: { event: 'signalCoords', delay: 150 } },
      { label: 'Amplificar e responder (gasta créditos)', flag: once('signal'), pay: (_, k) => ({ credits: Math.ceil(120 * k) }),
        chain: [{ event: 'signalGuest', delay: 120, p: 0.6 }, { event: 'signalCoords', delay: 200, p: 0.4 }] },
      { label: 'Ignorar', flag: once('signal') },
    ],
  },
  {
    id: 'signalGuest', name: 'Alguém respondeu', sprite: 'event-trader', followUp: true, part: [2, 3],
    text: 'Uma nave sem bandeira pede para atracar. O piloto diz que tem um mapa e quer algo em troca.',
    minPhase: () => false,
    choices: [
      { label: 'Receber o piloto (dá confiança)', flag: 'signal-friend', reward: (_, k) => ({ science: 5 * k }), chain: { event: 'signalCoords', delay: 100 } },
      { label: 'Comprar o mapa (gasta créditos)', pay: (_, k) => ({ credits: Math.ceil(200 * k) }), chain: { event: 'signalCoords', delay: 60 } },
      { label: 'Mandar embora', reputation: 0 },
    ],
  },
  {
    id: 'signalCoords', name: 'Coordenadas do cache', sprite: 'event-comet', followUp: true, part: [3, 3],
    text: 'O sinal era um mapa: coordenadas de um depósito de materiais antigos, a poucos dias de viagem. Dá para enviar alguém ou vender a informação.',
    minPhase: () => false,
    choices: [
      { label: 'Enviar uma equipe de escavação', flag: 'cache-dug', chain: { event: 'signalGuardian', delay: 180 }, reward: (s, k) => ({ components: (s.flags.includes('signal-friend') ? 14 : 8) * k, alloys: 30 * k }) },
      { label: 'Vender as coordenadas', reward: (s, k) => ({ credits: (s.flags.includes('signal-friend') ? 500 : 320) * k }), reputation: 1 },
    ],
  },
  {
    id: 'signalGuardian', name: 'O guardião do cache', sprite: 'event-derelict-ship', followUp: true, part: [3, 3],
    text: 'No fundo do depósito há uma sonda antiga, ainda armada. Ela pergunta, em dezenas de línguas, quem você é.',
    minPhase: () => false,
    choices: [
      { label: 'Responder com um presente (gasta componentes)', pay: (_, k) => ({ components: Math.ceil(4 * k) }), flag: 'ancient-friend', relation: { helix: 8 },
        reward: (s, k) => ({ science: 18 * k, exotic: s.upgrades.exploration ? 3 : 0 }) },
      { label: 'Desmontar a sonda', reward: (_, k) => ({ alloys: 60 * k, components: 14 * k }), relation: { helix: -6 } },
      { label: 'Deixá-la em paz', relation: { helix: 4 }, reward: (_, k) => ({ science: 8 * k }) },
    ],
  },

  // ---------- A greve ----------
  {
    id: 'strike', name: 'Greve na base', sprite: 'event-meteor-shower', part: [1, 3],
    text: 'Os trabalhadores cruzam os braços no pátio: querem melhores condições e mais tempo de descanso.',
    minPhase: s => s.resources.population >= 30 && !s.flags.includes(once('strike')),
    choices: [
      { label: 'Ceder às exigências (gasta créditos)', flag: once('strike'), pay: (_, k) => ({ credits: Math.ceil(100 * k) }),
        buff: { name: 'Moral alta', duration: 300, effects: [{ kind: 'tax', mult: 1.3 }, { kind: 'outputAll', mult: 1.05 }] } },
      { label: 'Chamar a segurança', flag: once('strike'), chain: [{ event: 'strikeRiot', delay: 90, p: 0.75 }] },
      { label: 'Prometer reformas para depois', flag: once('strike'), chain: { event: 'strikePromise', delay: 420 } },
    ],
  },
  {
    id: 'strikeRiot', name: 'A greve virou tumulto', sprite: 'event-meteor-shower', followUp: true, part: [2, 3],
    text: 'A segurança chegou, e a multidão não gostou. Há máquinas paradas e portas arrombadas.',
    minPhase: () => false,
    choices: [
      { label: 'Pagar os prejuízos e pedir desculpas (gasta créditos)', pay: (_, k) => ({ credits: Math.ceil(250 * k) }), reputation: 1,
        buff: { name: 'Moral recuperada', duration: 240, effects: [{ kind: 'tax', mult: 1.15 }] } },
      { label: 'Negociar com os líderes', chain: { event: 'strikeAccord', delay: 120 } },
    ],
  },
  {
    id: 'strikePromise', name: 'O prazo das reformas', sprite: 'event-trader', followUp: true, part: [2, 3],
    text: 'Chegou o dia em que você prometeu as reformas. Os trabalhadores se reuniram para ouvir.',
    minPhase: () => false,
    choices: [
      { label: 'Cumprir a promessa (gasta créditos)', pay: (_, k) => ({ credits: Math.ceil(200 * k) }), flag: 'workers-trust', reputation: 2,
        buff: { name: 'Reformas em vigor', duration: 900, effects: [{ kind: 'tax', mult: 1.4 }, { kind: 'outputAll', mult: 1.05 }] } },
      { label: 'Adiar mais uma vez', chain: { event: 'strikeRiot', delay: 60 } },
    ],
  },
  {
    id: 'strikeAccord', name: 'Um acordo possível', sprite: 'event-trader', followUp: true, part: [3, 3],
    text: 'Os líderes aceitam voltar ao trabalho se houver uma comissão de moradores com voz nas decisões.',
    minPhase: () => false,
    choices: [
      { label: 'Aceitar a comissão', flag: 'workers-trust', buff: { name: 'Comissão de moradores', duration: 600, effects: [{ kind: 'popGrowth', mult: 1.3 }, { kind: 'tax', mult: 1.15 }] } },
      { label: 'Recusar e trocar a gerência', reward: (_, k) => ({ credits: 40 * k }), reputation: -1 },
    ],
  },

  // ---------- A carga duvidosa ----------
  {
    id: 'shady', name: 'Uma oferta boa demais', sprite: 'event-trader', part: [1, 2],
    text: 'Um mercador sem registro oferece ligas por metade do preço, sem perguntas. A carga tem cara de ser contrabando.',
    minPhase: s => !!s.upgrades.commerce && (s.stats.produced.alloys ?? 0) > 200 && !s.flags.includes(once('shady')),
    choices: [
      { label: 'Comprar a carga (gasta créditos)', flag: once('shady'), pay: (_, k) => ({ credits: Math.ceil(60 * k) }), reward: (_, k) => ({ alloys: 140 * k }), chain: { event: 'inspection', delay: 200, p: 0.75 } },
      { label: 'Denunciar o mercador', flag: once('shady'), reputation: 3, relation: { ferrum: 5 } },
      { label: 'Recusar', flag: once('shady') },
    ],
  },
  {
    id: 'inspection', name: 'Fiscais à porta', sprite: 'event-derelict-ship', followUp: true, part: [2, 2],
    text: 'Fiscais da Guilda Ferrum encontram a carga no seu armazém e pedem explicações.',
    minPhase: () => false,
    choices: [
      { label: 'Pagar a multa (gasta créditos)', pay: (_, k) => ({ credits: Math.ceil(110 * k) }), reputation: -1 },
      { label: 'Subornar os fiscais (gasta créditos)', pay: (_, k) => ({ credits: Math.ceil(180 * k) }), relation: { ferrum: -6 } },
      { label: 'Devolver a carga', pay: (s) => ({ alloys: Math.floor(s.resources.alloys * 0.2) }), reputation: 2, relation: { ferrum: 4 } },
    ],
  },

  // ---------- O pirata arrependido ----------
  {
    id: 'pirate', name: 'Um pirata quer trocar de lado', sprite: 'event-trader', part: [1, 2],
    text: 'Um capitão pirata oferece largar a bandeira negra e escoltar suas rotas em troca de um soldo e um recomeço.',
    minPhase: s => s.routes.length >= 1 && !s.flags.includes(once('pirate')),
    choices: [
      { label: 'Contratar o capitão (gasta créditos)', flag: once('pirate'), pay: (_, k) => ({ credits: Math.ceil(120 * k) }),
        buff: { name: 'Escolta pirata', duration: 600, effects: [{ kind: 'outpost', mult: 1.15 }] },
        chain: [{ event: 'pirateLoyal', delay: 300, p: 0.65 }, { event: 'pirateBetrayal', delay: 300, p: 0.35 }] },
      { label: 'Recusar', flag: once('pirate'), reputation: 0 },
    ],
  },
  {
    id: 'pirateLoyal', name: 'O capitão cumpriu a palavra', sprite: 'event-trader', followUp: true, part: [2, 2],
    text: 'O capitão entregou um comboio inteiro intacto e trouxe de presente parte do espólio antigo.',
    minPhase: () => false,
    choices: [
      { label: 'Aceitar o presente', reward: (_, k) => ({ components: 10 * k, fuel: 20 * k }), reputation: 3 },
      { label: 'Promovê-lo a chefe de escolta', reputation: 4, buff: { name: 'Frota de escolta', duration: 900, effects: [{ kind: 'outpost', mult: 1.2 }] } },
    ],
  },
  {
    id: 'pirateBetrayal', name: 'O capitão sumiu', sprite: 'event-derelict-ship', followUp: true, part: [2, 2],
    text: 'O capitão desapareceu com um carregamento de combustível. Dá para tentar alcançá-lo.',
    minPhase: () => false,
    choices: [
      { label: 'Perseguir (gasta combustível)', pay: (s) => ({ fuel: Math.floor(s.resources.fuel * 0.15) }), reward: (_, k) => ({ components: 12 * k, credits: 150 * k }), reputation: 1 },
      { label: 'Aceitar o prejuízo', reputation: -1 },
    ],
  },

  // ---------- A chama pergunta (história principal, Ato V) ----------
  // A escolha fica lembrada para sempre (flag `ending-*`) e decide o epílogo depois da Transcendência.
  {
    id: 'coreChoice', name: 'A chama pergunta', sprite: 'event-solar-flare', priority: true,
    text: 'No coração do Núcleo a voz volta a falar, mais baixa: “Você leu os livros. Agora preciso saber o que quer ser para mim. Qualquer resposta é uma resposta.”',
    minPhase: s => (s.megaprojects.core ?? 0) >= 3 && !s.flags.some(f => f.startsWith('ending-')),
    choices: [
      { label: 'Ficar: manter a chama acesa como Guardião', flag: 'ending-keeper',
        buff: { name: 'Juramento do Guardião', duration: 300, effects: [{ kind: 'outputAll', mult: 1.1 }] } },
      { label: 'Libertar: deixar a chama descansar quando chegar a hora', flag: 'ending-free',
        reward: (s, k) => ({ exotic: s.upgrades.exploration ? 4 : 0, science: 40 * k }) },
      { label: 'Partilhar: abrir o Núcleo às três facções', flag: 'ending-share', relation: { helix: 10, ferrum: 10, vesper: 10 }, reputation: 2 },
    ],
  },
];
