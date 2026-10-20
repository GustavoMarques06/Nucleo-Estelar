import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import { usePrefs } from '../prefs';
import { t } from '../i18n';
import { useDialog } from './useDialog';

export const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: '1 – 9, 0', label: 'Ir para a aba (na ordem do menu lateral)' },
  { keys: 'E', label: 'Extrair minério (segure para repetir)' },
  { keys: 'V', label: 'Vender o ferro' },
  { keys: 'F', label: 'Ligar ou desligar o modo foco' },
  { keys: 'M', label: 'Silenciar ou religar o som' },
  { keys: '?', label: 'Mostrar esta lista de atalhos' },
  { keys: 'Esc', label: 'Fechar a janela aberta' },
  { keys: 'Tab', label: 'Navegar entre os botões' },
];

const typing = (el: EventTarget | null) => {
  const n = el as HTMLElement | null;
  return !!n && (n.tagName === 'INPUT' || n.tagName === 'SELECT' || n.tagName === 'TEXTAREA' || n.isContentEditable);
};

/** Atalhos globais do jogo (desligáveis nas Opções). `go(i)` troca para a i-ésima aba visível. */
export function useShortcuts(go: (index: number) => void, onHelp: () => void) {
  const enabled = usePrefs(p => p.shortcuts);
  const goRef = useRef(go), helpRef = useRef(onHelp);
  goRef.current = go; helpRef.current = onHelp;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      if (document.querySelector('.modal')) return;                      // janelas abertas têm os próprios atalhos
      const g = useGame.getState();
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k >= '0' && k <= '9') { goRef.current(k === '0' ? 9 : Number(k) - 1); e.preventDefault(); }
      else if (k === 'e') { g.mine(); e.preventDefault(); }
      else if (k === 'v' && !e.repeat) g.sell('iron');
      else if (k === 'f' && !e.repeat) g.setSetting('focus', !g.game.settings.focus);
      else if (k === 'm' && !e.repeat) { const on = !(g.game.settings.sound || g.game.settings.music); g.setSetting('sound', on); g.setSetting('music', on); }
      else if (k === '?' && !e.repeat) helpRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  const ref = useDialog<HTMLDivElement>(onClose);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="sc-title" onClick={onClose}>
      <div className="modal-box" ref={ref} tabIndex={-1} onClick={e => e.stopPropagation()}>
        <h2 id="sc-title">{t('Atalhos de teclado')}</h2>
        <ul className="shortcut-list big">
          {SHORTCUTS.map(s => <li key={s.keys}><kbd>{s.keys}</kbd> {t(s.label)}</li>)}
        </ul>
        <button className="btn primary big" onClick={onClose}>{t('Fechar')}</button>
      </div>
    </div>
  );
}
