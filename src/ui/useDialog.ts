import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Acessibilidade das janelas modais: leva o foco para dentro, mantém o Tab dentro dela, fecha com Esc
 * e devolve o foco ao elemento que a abriu.
 */
export function useDialog<T extends HTMLElement>(onClose?: () => void) {
  const ref = useRef<T>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const before = document.activeElement as HTMLElement | null;
    (node.querySelector<HTMLElement>('[autofocus], ' + FOCUSABLE) ?? node).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && close.current) { e.preventDefault(); e.stopPropagation(); close.current(); return; }
      if (e.key !== 'Tab') return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    node.addEventListener('keydown', onKey);
    return () => { node.removeEventListener('keydown', onKey); before?.focus?.(); };
  }, []);
  return ref;
}
