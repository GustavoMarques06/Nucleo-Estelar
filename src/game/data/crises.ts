import type { CrisisKind, Location, ResId } from '../types';

export interface CrisisDef {
  kind: CrisisKind;
  name: string;
  icon: string;
  text: string;
  /** Fração da produção que a colônia mantém por recurso durante a crise (p = penalidade geral). */
  hit: (res: ResId, p: number) => number;
  /** Facção que ajuda a resolver (precisa de tratado) e o que o jogador paga em créditos/recursos. */
  helper: string;
  fixLabel: string;
  /** Peso de sorteio conforme o local. */
  weight: (loc: Location, claimedHostile: boolean, uninsuredRoutes: number) => number;
}

const ARID: Location['type'][] = ['desert', 'rocky', 'volcanic'];
const WET: Location['type'][] = ['ocean', 'jungle', 'alien'];

// Crises de colônia (GDD, seção 15): oportunidades de escolha, nunca perdas permanentes.
// A colônia só produz menos durante o prazo — nada é destruído.
export const CRISES: CrisisDef[] = [
  { kind: 'drought', name: 'Seca', icon: 'planet-desert',
    text: 'Os reservatórios secaram. A colônia produz menos até a água voltar.',
    hit: (r, p) => (r === 'food' || r === 'water' ? p * 0.5 : p * 1.5), helper: 'helix', fixLabel: 'Enviar água',
    weight: l => (ARID.includes(l.type) ? 2 : 1) },
  { kind: 'unrest', name: 'Agitação', icon: 'char-colonist-wave',
    text: 'Os colonos exigem melhores condições e reduziram o ritmo de trabalho.',
    hit: (_, p) => p, helper: 'ferrum', fixLabel: 'Negociar melhorias',
    weight: l => (l.outpost && l.outpost.level >= 5 ? 2 : 1) },
  { kind: 'raid', name: 'Ataque pirata', icon: 'ship-fighter',
    text: 'Piratas cercam a colônia e interceptam os carregamentos.',
    hit: (_, p) => p * 1.25, helper: 'vesper', fixLabel: 'Reforçar a defesa',
    weight: (l, hostile) => (hostile || l.distance >= 5 ? 2 : 1) },
  { kind: 'plague', name: 'Praga', icon: 'building-hospital',
    text: 'Uma doença se espalha e afasta os trabalhadores.',
    hit: (r, p) => (r === 'science' || r === 'food' ? p * 0.6 : p * 1.25), helper: 'helix', fixLabel: 'Enviar suprimentos médicos',
    weight: l => (WET.includes(l.type) ? 2 : 1) },
  { kind: 'blockade', name: 'Bloqueio de rota', icon: 'icon-blockade',
    text: 'Piratas fecham as rotas comerciais desta colônia: os bônus de rota ficam suspensos até a passagem ser liberada. Rotas seguradas não são afetadas.',
    hit: () => 1, helper: 'vesper', fixLabel: 'Escoltar as rotas',
    weight: (_, hostile, uninsured) => (uninsured > 0 ? (hostile ? 3 : 2) : 0) },
];

export const CRISIS_BY_KIND = Object.fromEntries(CRISES.map(c => [c.kind, c])) as Record<CrisisKind, CrisisDef>;
