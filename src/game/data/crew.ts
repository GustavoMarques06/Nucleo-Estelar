import type { Effect } from '../types';
import { t } from '../../i18n';
import { fmtNum } from '../engine/format';

export interface CrewDef {
  id: string;
  name: string;              // o mesmo nome das transmissões (liga ao retrato)
  role: string;
  joins: string;             // registro do Arquivo que traz o conselheiro para a base
  joinsText: string;         // como liberar, enquanto não chegou
  desc: (level: number) => string;
  effects: (level: number) => Effect[];
}

// Conselho: as vozes do Arquivo viram conselheiros. Só os que estão na ativa ajudam, e as vagas são poucas;
// cada um ganha experiência enquanto está na ativa (também offline) e o nível nunca se perde, nem na Ascensão.
export const CREW: CrewDef[] = [
  { id: 'eco', name: 'ECO', role: 'Sistema da base', joins: 'tx-eco-1', joinsText: 'Chega com os primeiros 10 colonos.',
    desc: l => t('Energia +2% por nível (atual: +{n}%).', { n: 2 * l }),
    effects: l => [{ kind: 'energyOut', mult: 1 + 0.02 * l }] },
  { id: 'mira', name: 'Mira Vael', role: 'Arquivista do Conclave Helix', joins: 'tx-mira-1', joinsText: 'Chega com relação 10 com o Conclave Helix.',
    desc: l => t('Ciência +2,5% por nível (atual: +{n}%).', { n: fmtNum(2.5 * l, 1) }),
    effects: l => [{ kind: 'resource', res: 'science', mult: 1 + 0.025 * l }] },
  { id: 'brokk', name: 'Brokk Tarn', role: 'Mercador da Guilda Ferrum', joins: 'tx-brokk-1', joinsText: 'Chega com relação 10 com a Guilda Ferrum.',
    desc: l => t('Preço de venda +1,5% e contratos +2% por nível (atual: +{a}% e +{b}%).', { a: fmtNum(1.5 * l, 1), b: 2 * l }),
    effects: l => [{ kind: 'price', mult: 1 + 0.015 * l }, { kind: 'contract', mult: 1 + 0.02 * l }] },
  { id: 'sera', name: 'Almirante Sera Oss', role: 'Almirante da Hegemonia Vesper', joins: 'tx-sera-1', joinsText: 'Chega com relação 10 com a Hegemonia Vesper.',
    desc: l => t('Colônias +2% e expedições 1% mais baratas e rápidas por nível (atual: +{a}% e −{b}%).', { a: 2 * l, b: l }),
    effects: l => [{ kind: 'outpost', mult: 1 + 0.02 * l }, { kind: 'expedition', mult: 1 - 0.01 * l }] },
];

export const CREW_BY_ID = Object.fromEntries(CREW.map(c => [c.id, c]));
export const CREW_MAX_LEVEL = 25;
/**
 * Segundos na ativa para chegar ao nível `level` desde o zero: o primeiro nível leva 30 min e cada um 15 min a mais
 * que o anterior (nível 25 ≈ 87 h na ativa).
 */
export const crewXpFor = (level: number) => 1800 * (level + 0.25 * level * (level - 1));
