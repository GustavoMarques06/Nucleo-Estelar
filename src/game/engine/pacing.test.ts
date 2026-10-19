import { describe, expect, it } from 'vitest';
import { PROFILES, playBot } from './bot';

const H = 3600;
const LABEL: Record<string, string> = {
  habitats: 'Habitats', exploration: 'Exploração', outpost: '1ª colônia', diplomacy: 'Diplomacia', route: '1ª rota', terraform1: 'Terraformação',
  fusion: 'Fusão', dyson1: 'Dyson 1', ascension: 'Ascensão',
};

// Ritmo por tipo de jogador: o mesmo jogo, mas com quem abre o programa o tempo todo, algumas vezes por hora
// ou só de vez em quando. Serve para enxergar quanto o jogo exige de atenção (e se o ocioso ainda chega lá).
describe('ritmo por perfil de jogador', () => {
  const runs = (['ideal', 'casual', 'idle'] as const).map(name => ({ name, ...playBot(400 * H, { profile: PROFILES[name] }) }));

  it('todos chegam à Ascensão; quanto menos atenção, mais tempo', () => {
    const table = runs.map(r => {
      const at = Object.fromEntries(r.milestones.map(m => [m.id, m.at]));
      return `${r.name.padEnd(7)} ${Object.keys(LABEL).map(k => `${LABEL[k]} ${at[k] !== undefined ? (at[k] / H).toFixed(1) + 'h' : '—'}`).join(' · ')}`;
    });
    console.log('\n' + table.join('\n'));
    const asc = Object.fromEntries(runs.map(r => [r.name, r.milestones.find(m => m.id === 'ascension')?.at]));
    for (const r of runs) expect(asc[r.name], `${r.name} não chegou à Ascensão`).toBeDefined();
    expect(asc.casual!).toBeGreaterThan(asc.ideal!);
    expect(asc.idle!).toBeGreaterThan(asc.casual!);
    // O jogo recompensa atenção, mas não a exige: o casual leva até ~2,5× e o ocioso até ~6× o tempo do ideal.
    expect(asc.casual! / asc.ideal!).toBeLessThan(2.5);
    expect(asc.idle! / asc.ideal!).toBeLessThan(6);
  }, 300_000);
});
