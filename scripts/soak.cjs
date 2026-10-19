// Teste de resistência completo: joga até a Singularidade e a Transcendência (leva vários minutos).
// Uso: npm run soak
const { spawnSync } = require('child_process');
const r = spawnSync('npx', ['vitest', 'run', 'src/game/engine/soak.test.ts', '--reporter=verbose'], { stdio: 'inherit', shell: true, env: { ...process.env, SOAK: 'full' } });
process.exit(r.status ?? 1);
