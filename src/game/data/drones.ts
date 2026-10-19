import type { DroneRole } from '../types';

export interface DroneRoleDef {
  id: DroneRole;
  name: string;
  icon: string;
  desc: string;
  auto: string;            // o que o primeiro drone liga
  bonus: string;           // o que os demais acrescentam
  max: number;             // limite do bônus em fração (assintótico)
  half: number;            // quantidade de drones que dá metade do limite
}

// Bônus com retornos decrescentes: f(n) = max · n / (n + half). Nunca passa de `max`, então mais
// drones sempre ajudam mas nenhuma função domina o jogo.
export const DRONE_ROLES: DroneRoleDef[] = [
  { id: 'courier', name: 'Entregadores', icon: 'ship-cargo',
    desc: 'Cumprem sozinhos os contratos comerciais quando o estoque permite (sem esvaziar o armazém).',
    auto: 'Contratos entregues automaticamente', bonus: 'Recompensa dos contratos', max: 0.5, half: 40 },
  { id: 'scout', name: 'Batedores', icon: 'ship-explorer',
    desc: 'Lançam expedições sozinhos, mas só enquanto houver menos de 3 locais sem colônia.',
    auto: 'Expedições lançadas automaticamente', bonus: 'Velocidade das expedições', max: 0.6, half: 30 },
  { id: 'hauler', name: 'Transportadores', icon: 'drone-transport',
    desc: 'Levam a produção das colônias até a base.',
    auto: '—', bonus: 'Produção das colônias', max: 0.5, half: 60 },
  { id: 'mechanic', name: 'Mecânicos', icon: 'drone-mining',
    desc: 'Mantêm todas as máquinas em ordem.',
    auto: '—', bonus: 'Toda a produção', max: 0.3, half: 50 },
  { id: 'terraformer', name: 'Terraformadores', icon: 'drone-drill',
    desc: 'Aceleram a terraformação das colônias.',
    auto: '—', bonus: 'Velocidade da terraformação', max: 0.8, half: 30 },
];

export const DRONE_BY_ID = Object.fromEntries(DRONE_ROLES.map(r => [r.id, r]));

export const droneBonus = (role: DroneRoleDef, n: number, boost = 1) => (role.max * boost * n) / (n + role.half);
