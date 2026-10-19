import { useGame } from '../game/store';
import { RESOURCES } from '../game/data/resources';
import type { ResId } from '../game/types';
import { fmt, fmtDuration } from '../game/engine/format';
import { STORY_BY_ID } from '../game/data/story';
import { artUrl } from '../assets';
import { Icon } from './Icon';

export function Toasts() {
  const toasts = useGame(s => s.toasts);
  const dismiss = useGame(s => s.dismissToast);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.kind}`} onClick={() => dismiss(t.id)} title="Clique para dispensar">
          <span>{t.text}</span>{t.count > 1 && <span className="n">{t.count}×</span>}
        </div>
      ))}
    </div>
  );
}

export function OfflineModal() {
  const offline = useGame(s => s.offline);
  const dismiss = useGame(s => s.dismissOffline);
  if (!offline) return null;
  // O que mais valeu a pena primeiro: créditos, depois o resto por valor de mercado.
  const worth = (r: ResId, v: number) => (r === 'credits' ? 1e18 : v * (RESOURCES[r].sellPrice ?? 1));
  const gains = (Object.entries(offline.gained) as [ResId, number][]).sort((a, b) => worth(b[0], b[1]) - worth(a[0], a[1]));
  const notes: string[] = [];
  if (offline.discoveries > 0) notes.push(`${offline.discoveries} ${offline.discoveries === 1 ? 'novo local descoberto' : 'novos locais descobertos'}`);
  if (offline.terraforms > 0) notes.push(`${offline.terraforms} ${offline.terraforms === 1 ? 'nível de terraformação concluído' : 'níveis de terraformação concluídos'}`);
  if (offline.crisesCleared > 0) notes.push('as crises de colônia foram resolvidas sozinhas: ficar fora nunca é punido');
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="offline-title">
      <div className="modal-box offline-box">
        <h2 id="offline-title">Bem-vindo de volta!</h2>
        <p className="away">Você ficou fora por <b>{fmtDuration(offline.seconds)}</b>{offline.capped ? ' (limite de produção offline atingido)' : ''}. Sua base continuou trabalhando:</p>
        <div className="gain-grid">
          {gains.map(([r, v], i) => (
            <div key={r} className={`gain-tile ${i === 0 ? 'top' : ''}`} title={RESOURCES[r].name}>
              <Icon name={RESOURCES[r].icon} size={i === 0 ? 40 : 30} />
              <b>+{fmt(v)}</b>
              <small>{RESOURCES[r].name}</small>
            </div>
          ))}
        </div>
        {notes.length > 0 && <ul className="away-notes">{notes.map(n => <li key={n}>{n}</li>)}</ul>}
        {offline.fullStorage.length > 0 && (
          <p className="status sev-warn">
            O armazém ficou cheio de {offline.fullStorage.map(r => RESOURCES[r].name.toLowerCase()).join(', ')}: a produção parou ali. Venda, ligue a venda automática ou construa armazéns.
          </p>
        )}
        <button className="btn primary big" onClick={dismiss} autoFocus>Continuar</button>
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
  if (!entry || offline) return null;
  return (
    <div className="modal story" role="dialog" aria-modal="true" aria-labelledby="story-title">
      <div className="modal-box story-box">
        <div className="story-art" style={{ backgroundImage: `url(${artUrl(entry.art)})` }} />
        <h2 id="story-title">{entry.title}</h2>
        {entry.text.map((t, i) => <p key={i}>{t}</p>)}
        <button className="btn primary big" onClick={dismiss} autoFocus>Continuar</button>
      </div>
    </div>
  );
}
