import { useEffect } from 'react';

// Textos longos nos painéis (dicas e descrições de cards) aparecem em 2 linhas; um clique abre o texto inteiro.
// Funciona por delegação no painel: nenhum painel precisa saber disso, e os textos novos que aparecem são tratados sozinhos.
const RULES: { sel: string; min: number }[] = [
  { sel: 'p.hint', min: 110 },
  { sel: '.card-main > p.desc', min: 100 },
  { sel: '.compass-phase', min: 70 },
];

const mark = (el: HTMLElement) => {
  if (el.dataset.fold) return;
  el.dataset.fold = 'closed';
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-expanded', 'false');
};

const toggle = (el: HTMLElement) => {
  const open = el.dataset.fold === 'closed';
  el.dataset.fold = open ? 'open' : 'closed';
  el.setAttribute('aria-expanded', String(open));
};

function scan(root: HTMLElement) {
  for (const { sel, min } of RULES) {
    root.querySelectorAll<HTMLElement>(sel).forEach(el => { if ((el.textContent?.length ?? 0) > min) mark(el); });
  }
}

/** Liga o recolhimento de textos longos ao painel com este id. */
export function useFoldText(id: string) {
  useEffect(() => {
    const root = document.getElementById(id);
    if (!root) return;
    scan(root);
    const obs = new MutationObserver(() => scan(root));
    obs.observe(root, { childList: true, subtree: true });
    const onClick = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t.closest('button, a, select, input')) return;
      const el = t.closest<HTMLElement>('[data-fold]');
      if (el && root.contains(el)) toggle(el);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== 'Enter' && e.key !== ' ') || !(e.target as HTMLElement).dataset?.fold) return;
      e.preventDefault();
      toggle(e.target as HTMLElement);
    };
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);
    return () => { obs.disconnect(); root.removeEventListener('click', onClick); root.removeEventListener('keydown', onKey); };
  }, [id]);
}
