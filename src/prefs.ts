import { create } from 'zustand';
import { resolveLang, setLang, type LangPref } from './i18n';

// Preferências da interface (idioma, tamanho do texto, daltonismo, contraste, atalhos): ficam fora do save do jogo,
// então "apagar o progresso" não desfaz a acessibilidade que a pessoa escolheu.
export type Colorblind = 'none' | 'redgreen' | 'blueyellow';
export interface Prefs { language: LangPref; textScale: number; colorblind: Colorblind; highContrast: boolean; shortcuts: boolean; sceneLabels: boolean }

const KEY = 'nucleo-estelar/prefs';
export const DEFAULT_PREFS: Prefs = { language: 'auto', textScale: 1, colorblind: 'none', highContrast: false, shortcuts: true, sceneLabels: false };
export const TEXT_SCALES = [0.9, 1, 1.15, 1.3, 1.5] as const;

/** Valida o que veio do armazenamento: nada é confiado. */
export function parsePrefs(raw: unknown): Prefs {
  const d = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const scale = typeof d.textScale === 'number' && Number.isFinite(d.textScale) ? d.textScale : 1;
  return {
    language: d.language === 'pt' || d.language === 'en' ? d.language : 'auto',
    textScale: (TEXT_SCALES as readonly number[]).includes(scale) ? scale : 1,
    colorblind: d.colorblind === 'redgreen' || d.colorblind === 'blueyellow' ? d.colorblind : 'none',
    highContrast: d.highContrast === true,
    shortcuts: d.shortcuts !== false,
    sceneLabels: d.sceneLabels === true,
  };
}

function load(): Prefs {
  try { const raw = localStorage.getItem(KEY); return parsePrefs(raw ? JSON.parse(raw) : null); } catch { return DEFAULT_PREFS; }
}

/** Aplica as preferências à página: idioma, escala, paleta e contraste. */
export function applyPrefs(p: Prefs) {
  const lang = resolveLang(p.language);
  setLang(lang);
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.lang = lang === 'pt' ? 'pt-BR' : 'en';
  root.style.setProperty('--ts', String(p.textScale));
  root.dataset.cb = p.colorblind;
  root.dataset.contrast = p.highContrast ? 'high' : 'normal';
}

interface PrefsStore extends Prefs { set<K extends keyof Prefs>(k: K, v: Prefs[K]): void }

export const usePrefs = create<PrefsStore>()((set, get) => ({
  ...load(),
  set(k, v) {
    set({ [k]: v } as Partial<Prefs>);
    const { language, textScale, colorblind, highContrast, shortcuts, sceneLabels } = get();
    const next = { language, textScale, colorblind, highContrast, shortcuts, sceneLabels };
    applyPrefs(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* indisponível */ }
  },
}));

// A página abre já no idioma e na paleta certos.
{ const { language, textScale, colorblind, highContrast, shortcuts, sceneLabels } = usePrefs.getState(); applyPrefs({ language, textScale, colorblind, highContrast, shortcuts, sceneLabels }); }
