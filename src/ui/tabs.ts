import type { Category } from '../game/types';

export type TabId = 'mining' | 'industry' | 'energy' | 'logistics' | 'research' | 'civilization' | 'commerce' | 'finance'
  | 'expansion' | 'map' | 'diplomacy' | 'megaprojects' | 'ascension' | 'records' | 'options';

/** Aba onde cada categoria de estruturas aparece. */
export const CATEGORY_TAB: Record<Category, TabId> = {
  mining: 'mining', industry: 'industry', energy: 'energy', logistics: 'logistics', science: 'research',
  civilization: 'civilization', commerce: 'commerce', expansion: 'expansion', diplomacy: 'diplomacy',
};
