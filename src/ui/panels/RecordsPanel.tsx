import { useState } from 'react';
import { useGame } from '../../game/store';
import { ACHIEVEMENTS, ACHIEVEMENT_BONUS } from '../../game/data/achievements';
import { MINERALS } from '../../game/data/minerals';
import { fmt, fmtDuration } from '../../game/engine/format';
import { GUIDE } from '../../game/data/guide';
import { STORY, STORY_BY_ID } from '../../game/data/story';
import { LORE } from '../../game/data/lore';
import { SPEAKER_ART, SPEAKER_ICON } from '../portraits';
import { EcoPortrait } from '../EcoPortrait';
import { artUrl } from '../../assets';
import { buildingCount, colonyCount } from '../../game/selectors';
import { Icon } from '../Icon';
import { Tx } from '../../i18n/Tx';
import { t } from '../../i18n';

type Section = 'guide' | 'diary' | 'archive' | 'achievements' | 'catalog' | 'stats';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'guide', label: 'Guia' },
  { id: 'diary', label: 'Diário' },
  { id: 'archive', label: 'Arquivo' },
  { id: 'achievements', label: 'Conquistas' },
  { id: 'catalog', label: 'Minerais' },
  { id: 'stats', label: 'Estatísticas' },
];

function Guide() {
  return (
    <div className="guide">
      <p className="hint">{t('Toque em um tópico para ler. Tudo o que o jogo faz está explicado aqui em poucas linhas.')}</p>
      {GUIDE.map((g, i) => (
        <details key={g.id} open={i === 0}>
          <summary><Icon name={g.icon} size={26} />{t(g.title)}</summary>
          <div className="guide-text">{g.text.map((x, k) => <p key={k}>{t(x)}</p>)}</div>
        </details>
      ))}
    </div>
  );
}

function Portrait({ speaker }: { speaker: string }) {
  const art = SPEAKER_ART[speaker], icon = SPEAKER_ICON[speaker];
  if (art) return <div className="portrait" role="img" aria-label={t(speaker)} style={{ backgroundImage: `url(${artUrl(art)})` }} />;
  if (speaker === 'ECO') return <div className="portrait icon"><EcoPortrait size={96} /></div>;
  if (icon) return <div className="portrait icon"><Icon name={icon} size={56} /></div>;
  return null;
}

/** Arquivo: fragmentos dos Acendedores e transmissões das vozes recorrentes. */
function Archive() {
  const read = useGame(s => s.game.story);
  const found = LORE.filter(e => read.includes(e.id)).length;
  return (
    <div className="guide diary archive">
      <p className="hint">{t('{a} de {b} registros do Arquivo. Fragmentos aparecem ao explorar; transmissões, ao conhecer as vozes do jogo.', { a: found, b: LORE.length })}</p>
      {LORE.map(e => read.includes(e.id) ? (
        <details key={e.id} className={e.kind}>
          <summary>{e.speaker && <small className="story-act">{t(e.speaker)} · </small>}{t(e.title)}</summary>
          <div className="guide-text">
            {e.speaker && <Portrait speaker={e.speaker} />}
            {e.text.map((x, k) => <p key={k}>{t(x)}</p>)}
          </div>
        </details>
      ) : (
        <div key={e.id} className="diary-locked">??? <small>{e.kind === 'fragment' ? t('fragmento ainda não encontrado') : t('transmissão ainda não recebida')}</small></div>
      ))}
    </div>
  );
}

function Diary() {
  const read = useGame(s => s.game.story);
  return (
    <div className="guide diary">
      <p className="hint">{t('{a} de {b} registros. Novos aparecem quando você cruza um marco grande da jornada.', { a: read.filter(id => STORY_BY_ID[id]).length, b: STORY.length })}</p>
      {STORY.map(e => read.includes(e.id) ? (
        <details key={e.id}>
          <summary>{e.act && <small className="story-act">{t(e.act)} · </small>}{t(e.title)}</summary>
          <div className="guide-text">
            <div className="story-art small" style={{ backgroundImage: `url(${artUrl(e.art)})` }} />
            {e.text.map((x, k) => <p key={k}>{t(x)}</p>)}
          </div>
        </details>
      ) : (
        <div key={e.id} className="diary-locked">??? <small>{t('registro ainda não liberado')}</small></div>
      ))}
    </div>
  );
}

function Achievements() {
  const got = useGame(s => s.game.achievements);
  return (
    <>
      <p className="hint">
        <Tx k="{a} de {b} conquistas · bônus permanente de <b>+{p}%</b> em toda a produção. Conquistas não se perdem na Ascensão." v={{ a: got.length, b: ACHIEVEMENTS.length, p: Math.round(got.length * ACHIEVEMENT_BONUS * 100) }} />
      </p>
      <div className="achievements">
        {ACHIEVEMENTS.map(a => {
          const done = got.includes(a.id);
          return (
            <div key={a.id} className={`achievement ${done ? 'done' : ''}`} title={t(a.desc)}>
              <Icon name={a.icon} size={44} />
              <div><b>{done ? t(a.name) : '???'}</b><small>{t(a.desc)}</small></div>
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
      <p className="hint">{t('{a} de {b} minerais descobertos. Novos minerais aparecem nos locais explorados.', { a: discovered.length, b: MINERALS.length })}</p>
      <div className="catalog">
        {MINERALS.map(x => {
          const known = discovered.includes(x.id);
          return (
            <div key={x.id} className={`mineral ${known ? '' : 'unknown'} r-${x.rarity}`} title={known ? `${t(x.name)} — ${t(x.use)}` : t('Não descoberto')}>
              <Icon name={x.sprite} size={56} />
              <b>{known ? t(x.name) : '???'}</b>
              <small>{known ? t(x.use) : t(x.rarity)}</small>
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
    ['Integridade do save', g.integrity.tampered ? t('Modificado fora do jogo') : t('Original')],
  ];
  return (
    <table className="stats-table">
      <tbody>{rows.map(([k, v]) => <tr key={k}><th>{t(k)}</th><td>{v}</td></tr>)}</tbody>
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
          <button key={s.id} role="tab" aria-selected={sec === s.id} className={`btn small ${sec === s.id ? 'active' : ''}`} onClick={() => setSec(s.id)}>{t(s.label)}</button>
        ))}
      </div>
      {sec === 'guide' && <Guide />}
      {sec === 'diary' && <Diary />}
      {sec === 'archive' && <Archive />}
      {sec === 'achievements' && <Achievements />}
      {sec === 'catalog' && <Catalog />}
      {sec === 'stats' && <Stats />}
    </div>
  );
}
