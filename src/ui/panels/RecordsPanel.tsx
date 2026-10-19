import { useState } from 'react';
import { useGame } from '../../game/store';
import { ACHIEVEMENTS, ACHIEVEMENT_BONUS } from '../../game/data/achievements';
import { MINERALS } from '../../game/data/minerals';
import { fmt, fmtDuration } from '../../game/engine/format';
import { GUIDE } from '../../game/data/guide';
import { STORY } from '../../game/data/story';
import { artUrl } from '../../assets';
import { buildingCount, colonyCount } from '../../game/selectors';
import { Icon } from '../Icon';

type Section = 'guide' | 'diary' | 'achievements' | 'catalog' | 'stats';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'guide', label: 'Guia' },
  { id: 'diary', label: 'Diário' },
  { id: 'achievements', label: 'Conquistas' },
  { id: 'catalog', label: 'Minerais' },
  { id: 'stats', label: 'Estatísticas' },
];

function Guide() {
  return (
    <div className="guide">
      <p className="hint">Toque em um tópico para ler. Tudo o que o jogo faz está explicado aqui em poucas linhas.</p>
      {GUIDE.map((g, i) => (
        <details key={g.id} open={i === 0}>
          <summary><Icon name={g.icon} size={26} />{g.title}</summary>
          <div className="guide-text">{g.text.map((t, k) => <p key={k}>{t}</p>)}</div>
        </details>
      ))}
    </div>
  );
}

function Diary() {
  const read = useGame(s => s.game.story);
  return (
    <div className="guide diary">
      <p className="hint">{read.length} de {STORY.length} registros. Novos aparecem quando você cruza um marco grande da jornada.</p>
      {STORY.map(e => read.includes(e.id) ? (
        <details key={e.id}>
          <summary>{e.title}</summary>
          <div className="guide-text">
            <div className="story-art small" style={{ backgroundImage: `url(${artUrl(e.art)})` }} />
            {e.text.map((t, k) => <p key={k}>{t}</p>)}
          </div>
        </details>
      ) : (
        <div key={e.id} className="diary-locked">??? <small>registro ainda não liberado</small></div>
      ))}
    </div>
  );
}

function Achievements() {
  const got = useGame(s => s.game.achievements);
  return (
    <>
      <p className="hint">
        {got.length} de {ACHIEVEMENTS.length} conquistas · bônus permanente de <b className="sev-ok">+{Math.round(got.length * ACHIEVEMENT_BONUS * 100)}%</b> em toda
        a produção. Conquistas não se perdem na Ascensão.
      </p>
      <div className="achievements">
        {ACHIEVEMENTS.map(a => {
          const done = got.includes(a.id);
          return (
            <div key={a.id} className={`achievement ${done ? 'done' : ''}`} title={a.desc}>
              <Icon name={a.icon} size={44} />
              <div><b>{done ? a.name : '???'}</b><small>{a.desc}</small></div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Catalog() {
  const discovered = useGame(s => s.game.discovered);
  return (
    <>
      <p className="hint">{discovered.length} de {MINERALS.length} minerais descobertos. Novos minerais aparecem nos locais explorados.</p>
      <div className="catalog">
        {MINERALS.map(x => {
          const known = discovered.includes(x.id);
          return (
            <div key={x.id} className={`mineral ${known ? '' : 'unknown'} r-${x.rarity}`} title={known ? `${x.name} — ${x.use}` : 'Não descoberto'}>
              <Icon name={x.sprite} size={56} />
              <b>{known ? x.name : '???'}</b>
              <small>{known ? x.use : x.rarity}</small>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Stats() {
  const g = useGame(s => s.game);
  const rows: [string, string][] = [
    ['Tempo nesta jornada', fmtDuration(g.stats.playTime)],
    ['Estruturas construídas', fmt(buildingCount(g))],
    ['Pesquisas concluídas', fmt(Object.keys(g.upgrades).length)],
    ['Minério extraído', fmt(g.stats.totalMined)],
    ['Créditos ganhos nesta jornada', fmt(g.stats.earned)],
    ['Créditos ganhos em todas as jornadas', fmt(g.stats.lifetimeEarned + g.stats.earned)],
    ['Colônias · locais descobertos', `${colonyCount(g)} · ${g.locations.length}`],
    ['Contratos cumpridos', fmt(g.stats.contractsDone)],
    ['Eventos respondidos', fmt(g.stats.eventsSeen)],
    ['Ascensões', fmt(g.ascension.count)],
  ];
  return (
    <table className="stats-table">
      <tbody>{rows.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody>
    </table>
  );
}

/** Registro: tudo que mede o progresso, sem ações de jogo. */
export function RecordsPanel() {
  const [sec, setSec] = useState<Section>('guide');
  return (
    <div className="panel-body">
      <div className="subtabs" role="tablist">
        {SECTIONS.map(s => (
          <button key={s.id} role="tab" aria-selected={sec === s.id} className={`btn small ${sec === s.id ? 'active' : ''}`} onClick={() => setSec(s.id)}>{s.label}</button>
        ))}
      </div>
      {sec === 'guide' && <Guide />}
      {sec === 'diary' && <Diary />}
      {sec === 'achievements' && <Achievements />}
      {sec === 'catalog' && <Catalog />}
      {sec === 'stats' && <Stats />}
    </div>
  );
}
