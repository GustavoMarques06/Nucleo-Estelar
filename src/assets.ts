// Sprites e imagens gerados por `npm run sprites` a partir das pranchas em /Assets.
export const spriteUrl = (name: string) => `${import.meta.env.BASE_URL}assets/sprites/${name}.png`;
export const artUrl = (name: string) => `${import.meta.env.BASE_URL}assets/art/${name}.jpg`;
