import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { newGame } from './state';
import { backupInfo, clearSave, loadBackup, loadGame, parseSave, saveGame, serialize } from './save';
import { useGame } from '../store';

// localStorage simples para o ambiente de teste (Node), com limite de tamanho opcional para simular "sem espaço".
function fakeStorage() {
  const data = new Map<string, string>();
  let full = false;
  const api = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { if (full) throw new Error('QuotaExceededError'); data.set(k, v); },
    removeItem: (k: string) => { data.delete(k); },
    setFull: (b: boolean) => { full = b; },
    keys: () => [...data.keys()],
  };
  return api;
}
let store: ReturnType<typeof fakeStorage>;
beforeEach(() => { store = fakeStorage(); (globalThis as unknown as { localStorage: unknown }).localStorage = store; });
afterEach(() => { delete (globalThis as unknown as { localStorage?: unknown }).localStorage; });

describe('salvamento seguro', () => {
  it('salva e carrega; sem save devolve null', () => {
    expect(loadGame()).toBeNull();
    const s = newGame(0); s.resources.credits = 123;
    expect(saveGame(s)).toBe(true);
    const back = loadGame()!;
    expect(back.recovered).toBe(false);
    expect(back.state.resources.credits).toBe(123);
  });

  it('o primeiro backup nasce no segundo salvamento e só se renova depois de ~10 minutos', () => {
    const a = newGame(0); a.resources.credits = 1;
    saveGame(a);
    expect(backupInfo()).toBeNull();                 // nada para guardar ainda
    const b = newGame(0); b.resources.credits = 2;
    saveGame(b);                                      // guarda "a" como backup
    expect(loadBackup()!.resources.credits).toBe(1);
    const c = newGame(0); c.resources.credits = 3;
    saveGame(c);                                      // dentro dos 10 min: backup não muda
    expect(loadBackup()!.resources.credits).toBe(1);
    expect(backupInfo()).toBeGreaterThan(0);
  });

  it('save principal corrompido: usa o backup e guarda a cópia ilegível', () => {
    const a = newGame(0); a.resources.credits = 7;
    saveGame(a); saveGame(a);                         // cria o backup
    store.setItem('nucleo-estelar/save', '{isso nao e json');
    const r = loadGame()!;
    expect(r.recovered).toBe(true);
    expect(r.state.resources.credits).toBe(7);
    expect(store.getItem('nucleo-estelar/save.corrupt')).toBe('{isso nao e json');
  });

  it('save de uma versão futura nunca é sobrescrito sem deixar cópia', () => {
    const future = JSON.stringify({ ...JSON.parse(serialize(newGame(0))), version: 999 });
    store.setItem('nucleo-estelar/save', future);
    expect(loadGame()).toBeNull();
    expect(store.getItem('nucleo-estelar/save.corrupt')).toBe(future);
  });

  it('quando o navegador recusa gravar, devolve false e não perde o que já estava salvo', () => {
    const a = newGame(0); a.resources.credits = 5;
    saveGame(a);
    store.setFull(true);
    const b = newGame(0); b.resources.credits = 9;
    expect(saveGame(b)).toBe(false);
    store.setFull(false);
    expect(loadGame()!.state.resources.credits).toBe(5);
  });

  it('apagar o progresso remove save, backup e cópia ilegível', () => {
    saveGame(newGame(0)); saveGame(newGame(0));
    store.setItem('nucleo-estelar/save.corrupt', 'x');
    clearSave();
    expect(store.keys()).toEqual([]);
  });
});

describe('exportar e importar', () => {
  it('o texto exportado reabre igual; lixo e versões futuras são recusados sem mexer no jogo', () => {
    const g = useGame.getState();
    useGame.setState({ game: { ...newGame(0), resources: { ...newGame(0).resources, credits: 4242 } } });
    const text = g.exportSave();
    expect(parseSave(text)!.resources.credits).toBe(4242);
    useGame.setState({ game: newGame(0) });
    expect(useGame.getState().importSave('isso não é um save')).toBe('invalid');
    expect(useGame.getState().importSave(JSON.stringify({ ...JSON.parse(text), version: 999 }))).toBe('invalid');
    expect(useGame.getState().game.resources.credits).toBe(0);
    expect(useGame.getState().importSave(text.replace('4242', '9999'))).toBe('tampered');   // editado fora do jogo: recusado
    expect(useGame.getState().game.resources.credits).toBe(0);
    expect(useGame.getState().importSave(text)).toBe('ok');
    expect(useGame.getState().game.resources.credits).toBeGreaterThanOrEqual(4242);
  });

  it('falha de gravação acende o aviso e some quando volta a gravar', () => {
    useGame.setState({ game: newGame(0), saveError: false });
    store.setFull(true);
    expect(useGame.getState().save()).toBe(false);
    expect(useGame.getState().saveError).toBe(true);
    store.setFull(false);
    expect(useGame.getState().save()).toBe(true);
    expect(useGame.getState().saveError).toBe(false);
  });
});
