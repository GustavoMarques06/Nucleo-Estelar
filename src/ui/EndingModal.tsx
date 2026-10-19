import { useGame } from '../game/store';
import { fmt, fmtDuration } from '../game/engine/format';
import { artUrl } from '../assets';
import { buildingCount, colonyCount } from '../game/selectors';

/** Desfecho da história: aparece uma vez, ao concluir a Singularidade. */
export function EndingModal({ onTranscend }: { onTranscend: () => void }) {
  const ending = useGame(s => s.ending);
  const dismiss = useGame(s => s.dismissEnding);
  const g = useGame(s => s.game);
  if (!ending) return null;
  return (
    <div className="modal ending" role="dialog" aria-modal="true" aria-labelledby="end-title">
      <div className="ending-box" style={{ backgroundImage: `linear-gradient(rgba(4,6,16,.82), rgba(4,6,16,.94)), url(${artUrl('scene-galaxy-map')})` }}>
        <h2 id="end-title">A Singularidade</h2>
        <p className="ending-text">
          Começou com uma broca enferrujada em um asteroide esquecido. Agora o espaço-tempo curva-se ao redor do seu império:
          {` ${fmt(colonyCount(g))} colônias, ${fmt(g.resources.population)} cidadãos e uma estrela feita à mão.`}
        </p>
        <p className="ending-text dim">Mas o Núcleo Estelar nunca se apaga. Sempre há uma máquina mais eficiente, um mundo para terraformar, uma nova era.</p>
        <table className="stats-table ending-stats">
          <tbody>
            <tr><th>Tempo nesta jornada</th><td>{fmtDuration(g.stats.playTime)}</td></tr>
            <tr><th>Estruturas</th><td>{fmt(buildingCount(g))}</td></tr>
            <tr><th>Créditos ganhos</th><td>{fmt(g.stats.earned)}</td></tr>
            <tr><th>Ascensões</th><td>{fmt(g.ascension.count)}</td></tr>
          </tbody>
        </table>
        <div className="row ending-actions">
          <button className="btn" onClick={dismiss}>Continuar jogando</button>
          <button className="btn primary" onClick={() => { dismiss(); onTranscend(); }}>Ver a Transcendência</button>
        </div>
      </div>
    </div>
  );
}
