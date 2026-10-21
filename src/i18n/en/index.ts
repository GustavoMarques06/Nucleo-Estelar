import { UI } from './ui';
import { DATA } from './data';
import { CONTENT } from './content';
import { STORY_EN } from './story';
import { LORE_EN } from './lore';
import { CIV_EN } from './civ';
import { FEATURES_EN } from './features';

/** Dicionário português → inglês (o português é a chave). */
export const EN: Record<string, string> = { ...UI, ...DATA, ...CONTENT, ...STORY_EN, ...LORE_EN, ...CIV_EN, ...FEATURES_EN };
