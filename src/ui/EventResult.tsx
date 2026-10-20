import { useEffect, useMemo, useState } from 'react';
import type { ResId } from '../game/types';
import { useGame, type EventResult as Result } from '../game/store';
import { RESOURCES } from '../game/data/resources';
import { FACTION_BY_ID } from '../game/data/factions';
import { fmt, fmtDuration } from '../game/engine/format';
import { events } from '../game/events';
import { Icon } from './Icon';
import { t } from '../i18n';

const SCAN_MS = 1600;      // quanto dura o "investigando…"
const STEP_MS = 230;       // intervalo entre um item revelado e o próximo
const AUTO_CLOSE_MS = 12000;

interface Item { icon: string; text: string; good: boolean }

/** Lista do que a escolha rendeu, na ordem em que vai aparecer. */
function itemsOf(r: Result): Item[] {
  const out: Item[] = [];
  for (const [res, v] of Object.entries(r.reward) as [ResId, number][]) {
    out.push({ icon: RESOURCES[res].icon, text: `+${fmt(v)} ${t(RESOURCES[res].name)}`, good: true });
  }
  if (r.buff) out.push({ icon: 'icon-star', text: t('{nome} por {tempo}', { nome: t(r.buff.name), tempo: fmtDuration(r.buff.duration) }), good: true });
  for (const [id, n] of Object.entries(r.relation ?? {})) {
    const f = FACTION_BY_ID[id];
    if (f && n) out.push({ icon: f.sprite, text: t('{n} de relação com {faccao}', { n: n > 0 ? `+${n}` : `${n}`, faccao: t(f.name) }), good: n > 0 });
  }
  if (r.reputation) out.push({ icon: 'icon-trophy', text: t('{n} de reputação comercial', { n: r.reputation > 0 ? `+${r.reputation}` : `${r.reputation}` }), good: r.reputation > 0 });
  for (const [res, v] of Object.entries(r.paid) as [ResId, number][]) {
    if ((v ?? 0) > 0) out.push({ icon: RESOURCES[res].icon, text: `−${fmt(v)} ${t(RESOURCES[res].name)}`, good: false });
  }
  if (r.continues) out.push({ icon: 'event-comet', text: t('A história continua em breve…'), good: true });
  return out;
}

/** Resultado de um evento: varredura curta ("investigando…") e depois o que veio, item a item. */
export function EventResult() {
  const result = useGame(s => s.eventResult);
  const dismiss = useGame(s => s.dismissEventResult);
  const reduce = useGame(s => s.game.settings.reduceMotion);
  const [phase, setPhase] = useState<'scan' | 'reveal'>('scan');
  const items = useMemo(() => (result ? itemsOf(result) : []), [result]);

  useEffect(() => {
    if (!result) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const reveal = () => {
      setPhase('reveal');
      items.slice(0, 8).forEach((it, i) => timers.push(setTimeout(() => events.emit({ type: 'eventReveal', good: it.good }), i * STEP_MS)));
      timers.push(setTimeout(dismiss, AUTO_CLOSE_MS));
    };
    if (reduce) reveal();
    else {
      setPhase('scan');
      events.emit({ type: 'eventScan' });
      timers.push(setTimeout(reveal, SCAN_MS));
    }
    return () => timers.forEach(clearTimeout);
  }, [result?.key]);         // eslint-disable-line react-hooks/exhaustive-deps

  if (!result) return null;
  // "Investigar o computador de bordo (gasta ciência)" → "Investigar o computador de bordo…"
  const action = t(result.choice).replace(/\s*\([^)]*\)\s*$/, '');
  return (
    <div className={`event-result ${phase}`} role="dialog" aria-live="polite" aria-label={t(result.event)} onClick={phase === 'reveal' ? dismiss : undefined}>
      <div className="er-box" onClick={e => e.stopPropagation()}>
        <div className="er-scope">
          <Icon name={result.sprite} size={88} />
          {phase === 'scan' && <><i className="er-sweep" /><i className="er-line" /></>}
        </div>
        <p className="er-kicker">{t(result.event)}</p>
        {phase === 'scan' ? (
          <>
            <h3>{action}…</h3>
            <div className="bar er-bar"><div /></div>
          </>
        ) : (
          <>
            <h3>{t('Resultado')}</h3>
            {items.length ? (
              <ul className="er-items">
                {items.map((it, i) => (
                  <li key={i} className={it.good ? 'good' : 'bad'} style={{ animationDelay: `${i * STEP_MS}ms` }}>
                    <Icon name={it.icon} size={26} /><span>{it.text}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="er-empty">{t('Nada de especial desta vez.')}</p>}
            <button className="btn small" onClick={dismiss}>{t('Continuar')}</button>
          </>
        )}
      </div>
    </div>
  );
}
