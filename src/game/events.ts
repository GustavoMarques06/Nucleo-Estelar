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
  | { type: 'denied' };

type Listener = (e: GameEvent) => void;
const listeners = new Set<Listener>();

export const events = {
  on(fn: Listener) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  emit(e: GameEvent) { listeners.forEach(fn => fn(e)); },
};
