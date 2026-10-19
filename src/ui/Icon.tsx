import { spriteUrl } from '../assets';

export function Icon({ name, size = 24, alt = '', className = '' }: { name: string; size?: number; alt?: string; className?: string }) {
  return <img className={`px smooth ${className}`} src={spriteUrl(name)} width={size} height={size} alt={alt} draggable={false} />;
}
