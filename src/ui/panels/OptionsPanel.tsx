import { useMemo, useRef } from 'react';
import { useGame } from '../../game/store';
import { backupInfo } from '../../game/engine/save';
import { fmtDuration } from '../../game/engine/format';
import { offlineCap } from '../../game/engine/offline';

export function OptionsPanel() {
  const game = useGame(s => s.game);
  const setSetting = useGame(s => s.setSetting);
  const save = useGame(s => s.save);
  const reset = useGame(s => s.reset);
  const toast = useGame(s => s.toast);
  const saveError = useGame(s => s.saveError);
  const exportSave = useGame(s => s.exportSave);
  const importSave = useGame(s => s.importSave);
  const restoreBackup = useGame(s => s.restoreBackup);
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
    toast('Save exportado. Guarde o arquivo em um lugar seguro.');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(exportSave()); toast('Save copiado para a área de transferência.'); }
    catch { toast('Não foi possível copiar. Use “Exportar arquivo”.', 'warn'); }
  };
  const load = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text().catch(() => '');
    if (!confirm('Substituir o progresso atual pelo do arquivo? O progresso de agora será perdido.')) return;
    const ok = importSave(text);
    toast(ok ? 'Save importado com sucesso.' : 'Arquivo inválido ou de uma versão mais nova do jogo.', ok ? 'info' : 'warn');
  };

  return (
    <div className="panel-body options">
      <div className="audio-opts">
        <label className="range">Volume geral: {Math.round(game.settings.volume * 100)}%
          <input type="range" min={0} max={100} step={5} value={Math.round(game.settings.volume * 100)}
            onChange={e => setSetting('volume', Number(e.target.value) / 100)} aria-label="Volume geral" />
        </label>
        <label className="toggle">
          <input type="checkbox" checked={game.settings.music} onChange={e => setSetting('music', e.target.checked)} />
          Música ambiente (só toca com a aba visível)
        </label>
        <label className="toggle">
          <input type="checkbox" checked={game.settings.sound} onChange={e => setSetting('sound', e.target.checked)} />
          Efeitos sonoros
        </label>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={game.settings.focus} onChange={e => setSetting('focus', e.target.checked)} />
        Modo foco (sem cena animada, atualização lenta, menos bateria)
      </label>
      <label className="toggle">
        <input type="checkbox" checked={game.settings.reduceMotion} onChange={e => setSetting('reduceMotion', e.target.checked)} />
        Reduzir animações e efeitos
      </label>
      <h4 className="section">Seu progresso</h4>
      {saveError && <p className="status sev-bad">O navegador está recusando o salvamento (modo privado ou sem espaço). Exporte o save agora para não perder o progresso.</p>}
      <div className="save-actions">
        <button className="btn" onClick={() => toast(save() ? 'Progresso salvo.' : 'Não foi possível salvar neste navegador.', 'info')}>Salvar agora</button>
        <button className="btn" onClick={download}>Exportar arquivo</button>
        <button className="btn" onClick={() => fileRef.current?.click()}>Importar arquivo</button>
        <button className="btn" onClick={copy}>Copiar save</button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={e => { void load(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {backupAt && (
        <button className="btn" onClick={() => { if (confirm('Voltar ao backup de ' + new Date(backupAt).toLocaleString('pt-BR') + '? O progresso de agora será perdido.')) toast(restoreBackup() ? 'Backup restaurado.' : 'Backup indisponível.', 'info'); }}>
          Restaurar backup ({new Date(backupAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
        </button>
      )}
      <button className="btn danger" onClick={() => { if (confirm('Apagar todo o progresso, inclusive Ascensões? Esta ação não pode ser desfeita.')) reset(); }}>
        Apagar todo o progresso
      </button>
      <p className="hint">
        O jogo salva automaticamente neste navegador a cada 10 segundos e guarda um backup a cada ~10 minutos. Exporte o save de vez em quando: limpar os dados do navegador apaga o progresso. A produção offline é limitada a {fmtDuration(offlineCap(game))}.
      </p>
    </div>
  );
}
