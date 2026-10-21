import type { Amounts, ResId, ResourceDef, StorageGroup } from '../types';

// `group` = grupo de armazenamento: o Armazém aumenta todos; Silos, Tanques e Galpões só o seu.
export const RESOURCES: Record<ResId, ResourceDef> = {
  credits: { id: 'credits', name: 'Créditos', icon: 'icon-credits', stored: false },
  iron: { id: 'iron', name: 'Ferro', icon: 'ore-iron', sellPrice: 1, stored: true, mineral: 'iron', group: 'ore' },
  copper: { id: 'copper', name: 'Cobre', icon: 'ore-copper', sellPrice: 2, stored: true, mineral: 'copper', group: 'ore' },
  gold: { id: 'gold', name: 'Ouro', icon: 'ore-gold', sellPrice: 25, stored: true, mineral: 'gold', group: 'ore' },
  alloys: { id: 'alloys', name: 'Ligas', icon: 'item-alloy', sellPrice: 5, stored: true, group: 'goods' },
  components: { id: 'components', name: 'Componentes', icon: 'item-advanced-component', sellPrice: 30, stored: true, group: 'goods' },
  water: { id: 'water', name: 'Água', icon: 'icon-water', sellPrice: 1, stored: true, group: 'fluid' },
  food: { id: 'food', name: 'Alimentos', icon: 'icon-food', sellPrice: 3, stored: true, group: 'goods' },
  fuel: { id: 'fuel', name: 'Combustível', icon: 'icon-fuel', sellPrice: 6, stored: true, group: 'fluid' },
  science: { id: 'science', name: 'Ciência', icon: 'icon-science', stored: false },
  exotic: { id: 'exotic', name: 'Materiais exóticos', icon: 'icon-exotic', sellPrice: 400, stored: true, group: 'goods' },
  ships: { id: 'ships', name: 'Naves', icon: 'icon-jet', stored: false },
  population: { id: 'population', name: 'População', icon: 'icon-astronaut', stored: false, hidden: true },
  drones: { id: 'drones', name: 'Drones', icon: 'drone-mining', stored: false, hidden: true },
  influence: { id: 'influence', name: 'Influência', icon: 'icon-influence', stored: false },
  titanium: { id: 'titanium', name: 'Titânio', icon: 'ingot-titanium', sellPrice: 18, stored: true, mineral: 'titanium', group: 'ore' },
  crystals: { id: 'crystals', name: 'Cristais', icon: 'crystal-cyan', sellPrice: 90, stored: true, mineral: 'cyan-crystal', group: 'ore' },
  modules: { id: 'modules', name: 'Módulos avançados', icon: 'item-module', sellPrice: 260, stored: true, group: 'goods' },
  slag: { id: 'slag', name: 'Escória', icon: 'icon-slag', sellPrice: 0.4, stored: true, group: 'ore' },
};

export const RES_IDS = Object.keys(RESOURCES) as ResId[];

export const STORAGE_GROUPS: Record<StorageGroup, { name: string; short: string }> = {
  ore: { name: 'Minérios', short: 'minérios' },
  fluid: { name: 'Fluidos', short: 'fluidos' },
  goods: { name: 'Produtos', short: 'produtos' },
};

/** Composição da jazida do asteroide inicial (pesos relativos). */
export const STARTER_DEPOSIT: Amounts = { iron: 0.68, copper: 0.3, gold: 0.02 };
