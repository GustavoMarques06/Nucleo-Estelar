import { useGame } from '../game/store';
import { RESOURCES } from '../game/data/resources';
import type { ResId } from '../game/types';
import { fmt, fmtDuration } from '../game/engine/format';
import { STORY_BY_ID } from '../game/data/story';
import { artUrl } from '../assets';
import { t, tp } from '../i18n';
import { BALANCE } from '../game/data/balance';
import { Icon } from './Icon';
import { useDialog } from './useDialog';

export function Toasts() {
  const toasts = useGame(s => s.toasts);
  const dismiss = useGame(s => s.dismissToast);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map(x => (
        <div key={x.id} className={`toast ${x.kind}`} onClick={() => dismiss(x.id)} title={t('Clique para dispensar')}>
          <span>{x.text}</span>{x.count > 1 && <span className="n">{x.count}×</span>}
        </div>
      ))}
    </div>
  );
}

export function OfflineModal() {
  const offline = useGame(s => s.offline);
  const dismiss = useGame(s => s.dismissOffline);
  const ref = useDialog<HTMLDivElement>(dismiss);
  if (!offline) return null;
  // O que mais valeu a pena primeiro: créditos, depois o resto por valor de mercado.
  const worth = (r: ResId, v: number) => (r === 'credits' ? 1e18 : v * (RESOURCES[r].sellPrice ?? 1));
  const gains = (Object.entries(offline.gained) as [ResId, number][]).sort((a, b) => worth(b[0], b[1]) - worth(a[0], a[1]));
  const notes: string[] = [];
  if (offline.discoveries > 0) notes.push(tp(offline.discoveries, '1 novo local descoberto', '{n} novos locais descobertos'));
  if (offline.terraforms > 0) notes.push(tp(offline.terraforms, '1 nível de terraformação concluído', '{n} níveis de terraformação concluídos'));
  if (offline.crisesCleared > 0) notes.push(t('as crises de colônia foram resolvidas sozinhas: ficar fora nunca é punido'));
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="offline-title">
      <div className="modal-box offline-box" ref={ref} tabIndex={-1}>
        <h2 id="offline-title">{t('Bem-vindo de volta!')}</h2>
        <p className="away">
          {t('Você ficou fora por')} <b>{fmtDuration(offline.seconds)}</b>{offline.capped ? ` ${t('(limite de produção offline atingido)')}` : ''}. {t('Sua base continuou trabalhando, em ritmo reduzido ({n}% do normal):', { n: Math.round(BALANCE.offlineRate * 100) })}
        </p>
        <div className="gain-grid">
          {gains.map(([r, v], i) => (
            <div key={r} className={`gain-tile ${i === 0 ? 'top' : ''}`} title={t(RESOURCES[r].name)}>
              <Icon name={RESOURCES[r].icon} size={i === 0 ? 40 : 30} />
              <b>+{fmt(v)}</b>
              <small>{t(RESOURCES[r].name)}</small>
            </div>
          ))}
        </div>
        {notes.length > 0 && <ul className="away-notes">{notes.map(n => <li key={n}>{n}</li>)}</ul>}
        {offline.fullStorage.length > 0 && (
          <p className="status sev-warn">
            {t('O armazém ficou cheio de {lista}: a produção parou ali. Venda, ligue a venda automática ou construa armazéns.', { lista: offline.fullStorage.map(r => t(RESOURCES[r].name).toLowerCase()).join(', ') })}
          </p>
        )}
        <button className="btn primary big" onClick={dismiss}>{t('Continuar')}</button>
      </div>
    </div>
  );
}

/** Diário de bordo: mostra um registro por vez, na ordem em que foram liberados. */
export function StoryModal() {
  const id = useGame(s => s.storyQueue[0]);
  const offline = useGame(s => s.offline);
  const dismiss = useGame(s => s.dismissStory);
  const entry = id ? STORY_BY_ID[id] : null;
  const ref = useDialog<HTMLDivElement>(dismiss);
  if (!entry || offline) return null;
  return (
    <div className="modal story" role="dialog" aria-modal="true" aria-labelledby="story-title">
      <div className="modal-box story-box" ref={ref} tabIndex={-1} key={entry.id}>
        <div className="story-art" role="img" aria-label={t(entry.title)} style={{ backgroundImage: `url(${artUrl(entry.art)})` }} />
        {entry.act && <p className="story-act">{t(entry.act)}</p>}
        <h2 id="story-title">{t(entry.title)}</h2>
        {entry.text.map((line, i) => <p key={i}>{t(line)}</p>)}
        <button className="btn primary big" onClick={dismiss}>{t('Continuar')}</button>
      </div>
    </div>
  );
}
