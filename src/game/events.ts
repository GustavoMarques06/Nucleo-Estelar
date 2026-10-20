import type { Amounts, BuildingId, ResId } from './types';

// Barramento simples de eventos para efeitos visuais/sonoros, fora do estado do React.
export type GameEvent =
  | { type: 'mined'; gained: Amounts; x?: number; y?: number }
  | { type: 'sold'; res: ResId; earned: number }
  | { type: 'built'; id: BuildingId; amount: number }
  | { type: 'upgraded'; id: string }
  | { type: 'expeditionLaunched' }
  | { type: 'discovered'; count: number }
  | { type: 'outpost' }
  | { type: 'mega'; id: string }
  | { type: 'ascended' }
  | { type: 'spaceEvent'; id: string }
  | { type: 'eventChosen' }
  | { type: 'eventScan' }                                     // começou a "investigar" o resultado de um evento
  | { type: 'eventReveal'; good: boolean }                    // um item do resultado apareceu
  | { type: 'achievement'; id: string }
  | { type: 'contract' }
  | { type: 'goal' }
  | { type: 'crisis' }
  | { type: 'crisisSolved' }
  | { type: 'route' }
  | { type: 'terraformed' }
  | { type: 'gift' }
  | { type: 'ending' }
  | { type: 'transcended' }
  | { type: 'milestone'; id: BuildingId; special: boolean }   // estrutura atingiu um marco de quantidade
  | { type: 'layer'; index: number }                          // a extração chegou a uma camada mais funda
  | { type: 'golden'; x?: number; y?: number }                // ponto brilhante coletado
  | { type: 'overclock'; id: BuildingId }
  | { type: 'prospect' }                                      // veio de minério descoberto
  | { type: 'veinDepleted' }                                  // o veio em foco acabou
  | { type: 'decree'; id: string }
  | { type: 'challenge'; done: boolean }                       // desafio de Ascensão iniciado ou concluído
  | { type: 'territory' }                                     // uma facção reivindicou ou liberou um local
  | { type: 'nav' }                                           // troca de aba
  | { type: 'denied' };

type Listener = (e: GameEvent) => void;
const listeners = new Set<Listener>();

export const events = {
  on(fn: Listener) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  emit(e: GameEvent) { listeners.forEach(fn => fn(e)); },
};
