import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { t } from '../i18n';
import { useDialog } from './useDialog';

/** Janela flutuante por cima do jogo, para o que precisa de largura (Pesquisa, Mapa). Esc ou clicar fora fecha. */
export function FloatWindow({ title, icon, className = '', onClose, children }: {
  title: string; icon: string; className?: string; onClose: () => void; children: ReactNode;
}) {
  const ref = useDialog<HTMLDivElement>(onClose);
  return (
    <div className="modal fwin-backdrop" onClick={onClose}>
      <div className={`fwin ${className}`} ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="fwin-title" onClick={e => e.stopPropagation()}>
        <header className="fwin-head">
          <h2 id="fwin-title" className="panel-title"><Icon name={icon} size={28} />{title}</h2>
          <button className="btn small" onClick={onClose} aria-label={t('Fechar')}>{t('Fechar')} ✕</button>
        </header>
        {children}
      </div>
    </div>
  );
}
