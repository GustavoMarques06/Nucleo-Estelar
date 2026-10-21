import { SPEAKER_ART, SPEAKER_ICON } from './portraits';
import { EcoPortrait } from './EcoPortrait';
import { artUrl } from '../assets';
import { Icon } from './Icon';
import { t } from '../i18n';

/** Retrato de uma voz do Arquivo (arte pintada, o visor do ECO ou um ícone). */
export function Portrait({ speaker }: { speaker: string }) {
  const art = SPEAKER_ART[speaker], icon = SPEAKER_ICON[speaker];
  if (art) return <div className="portrait" role="img" aria-label={t(speaker)} style={{ backgroundImage: `url(${artUrl(art)})` }} />;
  if (speaker === 'ECO') return <div className="portrait icon"><EcoPortrait size={96} /></div>;
  if (icon) return <div className="portrait icon"><Icon name={icon} size={56} /></div>;
  return null;
}
