import { describe, expect, it } from 'vitest';
import { playBot } from './bot';
import { ascend, buyPerk } from './progression';
import { ascensionGain } from '../data/ascension';

const H = 3600;

// Teste de balanceamento: um jogador automático razoável precisa atravessar todas as fases do GDD
// em tempos plausíveis para um idle (com o jogo aberto). Se um ajuste de números travar a progressão,
// este teste falha e mostra onde parou.
describe('progressão completa', () => {
  it('chega à Ascensão passando por todas as fases', () => {
    const { milestones, state } = playBot(80 * H);
    const at = Object.fromEntries(milestones.map(m => [m.id, m.at]));
    const timeline = milestones.map(m => `${m.id}: ${(m.at / 60).toFixed(1)} min`).join('\n');
    console.log(timeline);
    console.log('estruturas:', JSON.stringify(Object.fromEntries(Object.entries(state.buildings).filter(([, n]) => n > 0))));
    console.log('colônias:', state.locations.filter(l => l.outpost).length, '| megaprojetos:', JSON.stringify(state.megaprojects));

    for (const id of ['miner', 'refinery', 'lab', 'factory', 'habitats', 'population10', 'exploration', 'outpost', 'megaEngineering', 'ascension']) {
      expect(at[id], `não chegou em "${id}"\n${timeline}`).toBeDefined();
    }
    // Ritmo: as primeiras fases são rápidas; a jornada inteira leva horas, não minutos nem semanas.
    // Ritmo-alvo (jogador eficiente; uma pessoa leva mais): civilização ~40 min, colônias ~4 h, Ascensão ~1 dia.
    expect(at.miner).toBeLessThan(60);
    expect(at.refinery).toBeLessThan(10 * 60);
    expect(at.habitats).toBeGreaterThan(25 * 60);
    expect(at.habitats).toBeLessThan(1.5 * H);
    expect(at.exploration).toBeGreaterThan(2.5 * H);
    expect(at.exploration).toBeLessThan(8 * H);
    expect(at.dyson1).toBeDefined();
    expect(at.ascension).toBeGreaterThan(18 * H);
    expect(at.ascension).toBeLessThan(60 * H);
  }, 120_000);

  it('a segunda jornada, com melhorias permanentes, é mais rápida', () => {
    const first = playBot(80 * H);
    let s = ascend(first.state, 0)!;
    expect(s.ascension.points).toBeGreaterThan(0);
    // Gasta os dados como um jogador faria: produção primeiro, depois o resto que couber.
    for (const id of ['research', 'production', 'production', 'start', 'cheap', 'science', 'production']) s = buyPerk(s, id) ?? s;
    const second = playBot(80 * H, { start: s });
    const t1 = Object.fromEntries(first.milestones.map(m => [m.id, m.at]));
    const t2 = Object.fromEntries(second.milestones.map(m => [m.id, m.at]));
    console.log(`dados: ${first.state.ascension.points + ascensionGain(first.state.stats.earned)} | exploração ${(t1.exploration / 60).toFixed(0)} → ${(t2.exploration / 60).toFixed(0)} min | ascensão ${(t1.ascension / H).toFixed(1)} → ${(t2.ascension / H).toFixed(1)} h`);
    expect(s.achievements.length).toBeGreaterThan(5);           // conquistas sobrevivem à Ascensão
    expect(t2.exploration).toBeLessThan(t1.exploration);
    expect(t2.ascension).toBeLessThan(t1.ascension);
  }, 120_000);
});
