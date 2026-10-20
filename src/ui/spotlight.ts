import { useEffect } from 'react';
import { create } from 'zustand';

// Holofote: "Ir" leva à aba certa e destaca o card exato (estrutura ou pesquisa) por alguns segundos.
export type SpotKind = 'building' | 'upgrade';

interface Spotlight { kind: SpotKind | null; id: string | null; show(kind: SpotKind, id: string): void; clear(): void }

let timer: ReturnType<typeof setTimeout> | undefined;
const SPOT_MS = 9000;

export const useSpotlight = create<Spotlight>()(set => ({
  kind: null,
  id: null,
  show(kind, id) {
    if (timer) clearTimeout(timer);
    set({ kind, id });
    timer = setTimeout(() => set({ kind: null, id: null }), SPOT_MS);
  },
  clear() { if (timer) clearTimeout(timer); set({ kind: null, id: null }); },
}));

/** O card (kind, id) é o destacado agora? Quando passa a ser, rola até ele. Use `data-spot` no elemento do card. */
export function useSpotTarget(kind: SpotKind, dep: unknown = null) {
  const id = useSpotlight(s => (s.kind === kind ? s.id : null));
  useEffect(() => {
    if (!id) return;
    // Espera a aba trocar e desenhar: o card pode nem existir ainda neste instante.
    const h = setTimeout(() => document.querySelector(`[data-spot="${kind}:${id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 80);
    return () => clearTimeout(h);
  }, [kind, id, dep]);
  return id;
}
