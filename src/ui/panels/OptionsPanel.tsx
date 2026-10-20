import { useMemo, useRef } from 'react';
import { useGame } from '../../game/store';
import { backupInfo } from '../../game/engine/save';
import { fmtDuration } from '../../game/engine/format';
import { offlineCap } from '../../game/engine/offline';
import { TEXT_SCALES, usePrefs, type Colorblind } from '../../prefs';
import { locale, t, type LangPref } from '../../i18n';
import { Tx } from '../../i18n/Tx';
import { SHORTCUTS } from '../Shortcuts';

export function OptionsPanel({ onShowShortcuts }: { onShowShortcuts?: () => void }) {
  const game = useGame(s => s.game);
  const setSetting = useGame(s => s.setSetting);
  const save = useGame(s => s.save);
  const reset = useGame(s => s.reset);
  const toast = useGame(s => s.toast);
  const saveError = useGame(s => s.saveError);
  const exportSave = useGame(s => s.exportSave);
  const importSave = useGame(s => s.importSave);
  const restoreBackup = useGame(s => s.restoreBackup);
  const prefs = usePrefs();
  const fileRef = useRef<HTMLInputElement>(null);
  // Ler e validar o backup é caro: refaz só a cada 10 s de jogo (o ritmo do salvamento automático).
  const saveTick = Math.floor(game.stats.playTime / 10);
  const backupAt = useMemo(() => backupInfo(), [saveTick]);

  const download = () => {
    const blob = new Blob([exportSave()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nucleo-estelar-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(t('Save exportado. Guarde o arquivo em um lugar seguro.'));
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(exportSave()); toast(t('Save copiado para a área de transferência.')); }
    catch { toast(t('Não foi possível copiar. Use “Exportar arquivo”.'), 'warn'); }
  };
  const load = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text().catch(() => '');
    if (!confirm(t('Substituir o progresso atual pelo do arquivo? O progresso de agora será perdido.'))) return;
    const ok = importSave(text);
    toast(ok ? t('Save importado com sucesso.') : t('Arquivo inválido ou de uma versão mais nova do jogo.'), ok ? 'info' : 'warn');
  };
  const hhmm = (ms: number) => new Date(ms).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="panel-body options">
      <h4 className="section">{t('Idioma')}</h4>
      <label className="field">
        <span>{t('Idioma do jogo')}</span>
        <select value={prefs.language} onChange={e => prefs.set('language', e.target.value as LangPref)}>
          <option value="auto">{t('Automático (idioma do navegador)')}</option>
          <option value="pt">Português</option>
          <option value="en">English</option>
        </select>
      </label>

      <h4 className="section">{t('Áudio')}</h4>
      <div className="audio-opts">
        <label className="range">{t('Volume geral: {n}%', { n: Math.round(game.settings.volume * 100) })}
          <input type="range" min={0} max={100} step={5} value={Math.round(game.settings.volume * 100)}
            onChange={e => setSetting('volume', Number(e.target.value) / 100)} aria-label={t('Volume geral')} />
        </label>
        <label className="toggle">
          <input type="checkbox" checked={game.settings.music} onChange={e => setSetting('music', e.target.checked)} />
          {t('Música ambiente (só toca com a aba visível)')}
        </label>
        <label className="toggle">
          <input type="checkbox" checked={game.settings.sound} onChange={e => setSetting('sound', e.target.checked)} />
          {t('Efeitos sonoros')}
        </label>
      </div>

      <h4 className="section">{t('Aparência e acessibilidade')}</h4>
      <div className="field" role="group" aria-label={t('Tamanho do texto')}>
        <span>{t('Tamanho do texto')}</span>
        <div className="seg">
          {TEXT_SCALES.map(sc => (
            <button key={sc} className={`btn small ${prefs.textScale === sc ? 'active' : ''}`} aria-pressed={prefs.textScale === sc}
              onClick={() => prefs.set('textScale', sc)}>{Math.round(sc * 100)}%</button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>{t('Cores para daltonismo')}</span>
        <select value={prefs.colorblind} onChange={e => prefs.set('colorblind', e.target.value as Colorblind)}>
          <option value="none">{t('Padrão')}</option>
          <option value="redgreen">{t('Vermelho-verde (azul e laranja)')}</option>
          <option value="blueyellow">{t('Azul-amarelo (turquesa e rosa)')}</option>
        </select>
      </label>
      <label className="toggle">
        <input type="checkbox" checked={prefs.highContrast} onChange={e => prefs.set('highContrast', e.target.checked)} />
        {t('Alto contraste')}
      </label>
      <label className="toggle">
        <input type="checkbox" checked={prefs.sceneLabels} onChange={e => prefs.set('sceneLabels', e.target.checked)} />
        {t('Mostrar a quantidade (×N) de cada estrutura no asteroide')}
      </label>
      <label className="toggle">
        <input type="checkbox" checked={game.settings.reduceMotion} onChange={e => setSetting('reduceMotion', e.target.checked)} />
        {t('Reduzir animações e efeitos')}
      </label>
      <label className="toggle">
        <input type="checkbox" checked={game.settings.focus} onChange={e => setSetting('focus', e.target.checked)} />
        {t('Modo foco (sem cena animada, atualização lenta, menos bateria)')}
      </label>

      <h4 className="section">{t('Teclado')}</h4>
      <label className="toggle">
        <input type="checkbox" checked={prefs.shortcuts} onChange={e => prefs.set('shortcuts', e.target.checked)} />
        {t('Atalhos de teclado')}
      </label>
      {prefs.shortcuts && (
        <>
          <ul className="shortcut-list">
            {SHORTCUTS.slice(0, 5).map(s => <li key={s.keys}><kbd>{s.keys}</kbd> {t(s.label)}</li>)}
          </ul>
          <button className="btn small" onClick={onShowShortcuts}>{t('Ver todos os atalhos')} (?)</button>
        </>
      )}

      <h4 className="section">{t('Seu progresso')}</h4>
      {saveError && <p className="status sev-bad">{t('O navegador está recusando o salvamento (modo privado ou sem espaço). Exporte o save agora para não perder o progresso.')}</p>}
      <div className="save-actions">
        <button className="btn" onClick={() => toast(save() ? t('Progresso salvo.') : t('Não foi possível salvar neste navegador.'), 'info')}>{t('Salvar agora')}</button>
        <button className="btn" onClick={download}>{t('Exportar arquivo')}</button>
        <button className="btn" onClick={() => fileRef.current?.click()}>{t('Importar arquivo')}</button>
        <button className="btn" onClick={copy}>{t('Copiar save')}</button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={e => { void load(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {backupAt && (
        <button className="btn" onClick={() => { if (confirm(t('Voltar ao backup de {data}? O progresso de agora será perdido.', { data: new Date(backupAt).toLocaleString(locale()) }))) toast(restoreBackup() ? t('Backup restaurado.') : t('Backup indisponível.'), 'info'); }}>
          {t('Restaurar backup ({hora})', { hora: hhmm(backupAt) })}
        </button>
      )}
      <button className="btn danger" onClick={() => { if (confirm(t('Apagar todo o progresso, inclusive Ascensões? Esta ação não pode ser desfeita.'))) reset(); }}>
        {t('Apagar todo o progresso')}
      </button>
      <p className="hint">
        <Tx k="O jogo salva automaticamente neste navegador a cada 10 segundos e guarda um backup a cada ~10 minutos. Exporte o save de vez em quando: limpar os dados do navegador apaga o progresso. A produção offline é limitada a {tempo}." v={{ tempo: fmtDuration(offlineCap(game)) }} />
      </p>
    </div>
  );
}
